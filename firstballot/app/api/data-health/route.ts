import { supabaseAdmin } from '@/lib/supabase-server'
import { freshness, KTC_MAX_AGE_MS, sourceWithinBudget } from '@/lib/platform/policy'
import { failure, json } from '@/lib/platform/http'
import ktcArchive from '@/data/ktc-history.json'
import { FIRST_ESPN_SEASON } from '@/lib/platform/player-data'
import {
  DRAFT_CAPITAL_KEY,
  ESPN_PPR_PREFIX,
  espnSeasonKey,
  HISTORY_OUTCOMES_PREFIX,
  IDENTITIES_KEY,
  PROJECTIONS_PREFIX,
  projectionsKey,
  PROSPECT_STATS_PATTERN,
  TIER_KEY,
} from '@/lib/platform/snapshot-keys'

/** Completed ESPN seasons behind career FPPG; an expired one hides career badges. */
const isCareerSeason = (key: string, currentSeason: number | null) => {
  const year = key.startsWith(ESPN_PPR_PREFIX) ? Number(key.slice(ESPN_PPR_PREFIX.length)) : NaN
  return currentSeason != null && year >= FIRST_ESPN_SEASON && year < currentSeason
}

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [snapshotResult, stateResponse, ktcResult, prospectResult, prospectSyncResult] =
      await Promise.all([
        supabaseAdmin
          .from('data_snapshots')
          .select('key,source,fetched_at,source_observed_at,expires_at,quality,season,week')
          // Only publish shared provider datasets. Per-league roster cache keys are private.
          .or(
            [
              `key.like.${ESPN_PPR_PREFIX}%`,
              `key.like.${PROJECTIONS_PREFIX}%`,
              `key.eq.${TIER_KEY}`,
              `key.eq.${DRAFT_CAPITAL_KEY}`,
              `key.eq.${IDENTITIES_KEY}`,
              `key.like.${HISTORY_OUTCOMES_PREFIX}%`,
            ].join(',')
          )
          .order('key')
          .limit(100),
        fetch('https://api.sleeper.app/v1/state/nfl', {
          next: { revalidate: 600 },
          signal: AbortSignal.timeout(10000),
        }).catch(() => null),
        supabaseAdmin
          .from('ktc_player_values')
          .select('scraped_date')
          .order('scraped_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('dynasty_prospects')
          .select('draft_year,updated_at')
          .not('updated_at', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(5000),
        supabaseAdmin
          .from('data_snapshots')
          .select('key,source,fetched_at,source_observed_at,expires_at,season,payload')
          .like('key', PROSPECT_STATS_PATTERN)
          .limit(20),
      ])
    if (snapshotResult.error) throw snapshotResult.error
    if (prospectSyncResult.error) throw prospectSyncResult.error

    const state = stateResponse?.ok ? await stateResponse.json().catch(() => null) : null
    const currentSeason = Number(state?.season) || null
    const week = Number(state?.week)
    const currentWeek = Number.isInteger(week) && week >= 1 && week <= 18 ? week : null
    const now = Date.now()
    const ktcDate = ktcResult.data?.scraped_date ?? ktcArchive.dates.at(-1) ?? null
    const ktcSource = ktcResult.data?.scraped_date ? 'supabase' : 'sdk-archive'
    const ktcExpiresAt = ktcDate
      ? new Date(Date.parse(`${ktcDate}T00:00:00Z`) + KTC_MAX_AGE_MS).toISOString()
      : null
    const snapshots = (snapshotResult.data ?? []).map((dataset) => ({
      ...dataset,
      status: freshness(dataset.expires_at, dataset.source_observed_at, now),
      currentSeason: currentSeason !== null && dataset.season === currentSeason,
    }))
    const ktc = {
      key: 'ktc:player-values',
      source: ktcSource,
      sourceObservedAt: ktcDate,
      expiresAt: ktcExpiresAt,
      status: ktcDate && sourceWithinBudget(ktcDate, KTC_MAX_AGE_MS, now) ? 'current' : 'expired',
    }
    const prospectRowsByYear = new Map<number, string[]>()
    const prospectSyncByYear = new Map<number, (typeof prospectSyncResult.data)[number]>()
    for (const snapshot of prospectSyncResult.data ?? []) {
      const year = Number(snapshot.key.split(':')[1])
      if (Number.isInteger(year)) prospectSyncByYear.set(year, snapshot)
    }
    for (const row of prospectResult.data ?? []) {
      const year = Number(row.draft_year)
      if (!Number.isInteger(year) || !row.updated_at) continue
      prospectRowsByYear.set(year, [...(prospectRowsByYear.get(year) ?? []), row.updated_at])
    }
    const prospectYears: Array<{
      key: string
      source: string
      draftYear: number | null
      recordCount: number
      latestRecordUpdatedAt: string | null
      recordAgeDays: number | null
      recordUpdateWarning: boolean
      status: string
      sourceTimeAvailable: boolean
      lastCheckedAt: string | null
      verifiedCount: number | null
      currentSeasonStatCount: number | null
      providerSeason: number | null
    }> = [...prospectRowsByYear.entries()]
      .filter(([year]) => currentSeason === null || year > currentSeason)
      .map(([year, timestamps]) => {
        const sourceCheck = prospectSyncByYear.get(year)
        const coverage = sourceCheck?.payload as {
          verifiedCount?: number
          currentSeasonStatCount?: number
        } | null
        const latestRecordUpdatedAt = timestamps
          .map((timestamp) => Date.parse(timestamp))
          .filter(Number.isFinite)
          .sort((a, b) => b - a)[0]
        const recordAgeDays = Number.isFinite(latestRecordUpdatedAt)
          ? Math.floor((now - latestRecordUpdatedAt) / (24 * 60 * 60 * 1000))
          : null
        return {
          key: `prospects:${year}`,
          source: sourceCheck?.source ?? 'Supabase dynasty_prospects',
          draftYear: year,
          recordCount: timestamps.length,
          latestRecordUpdatedAt: Number.isFinite(latestRecordUpdatedAt)
            ? new Date(latestRecordUpdatedAt).toISOString()
            : null,
          recordAgeDays,
          recordUpdateWarning: recordAgeDays === null || recordAgeDays > 14,
          // ESPN does not publish an observation timestamp. A recent verified
          // fetch is recorded separately from a provider freshness claim.
          status:
            sourceCheck && Date.parse(sourceCheck.expires_at) <= now
              ? 'expired'
              : 'source-time-unknown',
          sourceTimeAvailable: false,
          lastCheckedAt: sourceCheck?.fetched_at ?? null,
          verifiedCount: coverage?.verifiedCount ?? null,
          currentSeasonStatCount: coverage?.currentSeasonStatCount ?? null,
          providerSeason: sourceCheck?.season ?? null,
        }
      })
    if (!prospectYears.length) {
      prospectYears.push({
        key: 'prospects:future-classes',
        source: 'Supabase dynasty_prospects',
        draftYear: currentSeason === null ? null : currentSeason + 1,
        recordCount: 0,
        latestRecordUpdatedAt: null,
        recordAgeDays: null,
        recordUpdateWarning: true,
        status: 'source-time-unknown',
        sourceTimeAvailable: false,
        lastCheckedAt: null,
        verifiedCount: null,
        currentSeasonStatCount: null,
        providerSeason: null,
      })
    }
    if (ktcResult.error && !ktcArchive.dates.length) throw ktcResult.error
    if (prospectResult.error) throw prospectResult.error

    // Identities and career outcomes come from the weekly history job (PR-13).
    const newestOutcomes = snapshots
      .map((dataset) => dataset.key)
      .filter((key) => key.startsWith(HISTORY_OUTCOMES_PREFIX))
      .sort()
      .at(-1)
    const monitored = [
      ...snapshots.filter(
        (dataset) =>
          (currentSeason != null && dataset.key === espnSeasonKey(currentSeason)) ||
          isCareerSeason(dataset.key, currentSeason) ||
          dataset.key === TIER_KEY ||
          dataset.key === IDENTITIES_KEY ||
          dataset.key === newestOutcomes ||
          (currentSeason != null && dataset.key === projectionsKey(currentSeason, 'season')) ||
          (currentWeek !== null &&
            currentSeason != null &&
            dataset.key === projectionsKey(currentSeason, currentWeek))
      ),
      ktc,
      ...prospectYears,
    ]
    const status = monitored.some((dataset) => dataset.status === 'expired')
      ? 'degraded'
      : monitored.some((dataset) => dataset.status === 'source-time-unknown')
        ? 'unverified'
        : 'current'
    return json({
      status,
      currentSeason,
      currentWeek,
      datasets: [...snapshots, ktc, ...prospectYears],
      monitored,
      checkedAt: new Date().toISOString(),
    })
  } catch (e) {
    return failure(e)
  }
}
