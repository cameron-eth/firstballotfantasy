'use client'
import type { TradeSignal } from '@/lib/trade-signals'
import { describeTier, isCold, isHot, plainTierName } from '@/lib/player-signals'
import { useCacheVersion } from '@/lib/cache-version'
import { playerImageSrc } from '@/lib/player-image'
import { useState, type ReactNode } from 'react'
import { ArrowUpRight, LoaderCircle } from 'lucide-react'
import { COLLEGE_LOGOS } from '@/lib/college-logos'
import { positionPalette, neutralPalette } from '@/lib/player-card-palette'

export function PlayerTradingCard({
  name,
  position,
  team,
  image,
  label,
  action,
  onAction,
  outgoing = false,
  rookie = false,
  disabled = false,
  selected,
  busy = false,
  children,
  badge,
  imageHeight = 'h-48',
  compact = false,
  shoulderBadge,
  tier,
  signal,
  choice,
}: {
  name: string
  position: string
  team: string
  image?: string | null
  children?: ReactNode
  badge?: string
  imageHeight?: string
  shoulderBadge?: { label: string; description: string }
  tier?: {
    number: number
    name: string
    emphasis: string
    score?: number
    rank?: number
    positionRank?: number | null
    delta30?: number | null
  }
  choice?: { checked: boolean; onToggle: () => void }
  signal?: Pick<TradeSignal, 'headline' | 'reasons' | 'partners'>
  compact?: boolean
  label?: string
  action?: string
  onAction?: () => void
  outgoing?: boolean
  rookie?: boolean
  disabled?: boolean
  selected?: boolean
  busy?: boolean
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const cacheVersion = useCacheVersion()
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const [showWhy, setShowWhy] = useState(false)
  const standing = tier
    ? describeTier({ tierNumber: tier.number, position, positionRank: tier.positionRank })
    : null
  const hot = isHot(tier?.delta30)
  const cold = isCold(tier?.delta30)
  const color = positionPalette[position] ?? neutralPalette
  const identity = team.split(' · ')[0]
  const logo =
    COLLEGE_LOGOS[identity] ??
    (/^[A-Z]{2,3}$/.test(identity)
      ? `https://a.espncdn.com/i/teamlogos/nfl/500/${identity.toLowerCase()}.png`
      : null)
  return (
    <article
      className={`group/card relative isolate flex ${compact ? 'min-h-0' : 'min-h-[350px]'} flex-col overflow-hidden rounded-[20px] border shadow-[0_16px_40px_-20px_#000] transition duration-300 motion-safe:hover:-translate-y-1 ${choice?.checked ? 'border-violet-300 ring-2 ring-violet-300/70' : selected ? 'border-emerald-300 ring-2 ring-emerald-300/60' : rookie ? 'border-lime-300 ring-1 ring-lime-300/60' : outgoing ? 'border-orange-300/40' : cold ? 'border-sky-200 ring-2 ring-sky-200/60 shadow-[0_0_30px_-6px_rgba(186,230,253,0.6)]' : hot ? 'border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_30px_-6px_rgba(52,211,153,0.65)]' : tier?.number === 1 ? 'border-amber-300 ring-2 ring-amber-300/60 shadow-[0_0_28px_-6px_rgba(252,211,77,0.55)]' : tier?.number === 2 ? 'border-amber-300/75 ring-1 ring-amber-300/40' : tier?.number === 3 ? 'border-emerald-400/70 ring-1 ring-emerald-400/30' : standing?.tone === 'bad' ? 'border-rose-400/55' : 'border-white/20 hover:border-white/40'} ${outgoing ? 'saturate-50' : ''}`}
      style={{ background: `linear-gradient(155deg, ${color.wash}, #10141e 70%)` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(ellipse at 60% 30%, ${color.glow}99, transparent 65%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 rounded-[14px] border border-white/10"
      />
      <span
        className="absolute left-4 top-4 z-20 rounded border px-2 py-1 text-[10px] font-semibold"
        style={{ color: color.ink, borderColor: `${color.ink}55`, backgroundColor: color.wash }}
      >
        {position}
        {rookie && <span className="ml-2 border-l border-white/20 pl-2 text-lime-300">Rookie</span>}
      </span>
      <div className={`relative ${imageHeight} shrink-0`}>
        {logo && failedLogo !== logo && (
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            onError={() => setFailedLogo(logo)}
            className={`pointer-events-none absolute top-3 h-16 w-16 object-contain opacity-40 ${hot || cold ? 'right-14' : 'right-5'}`}
          />
        )}
        {image && failedImage !== image ? (
          <img
            src={playerImageSrc(image, cacheVersion)}
            alt=""
            onError={() => setFailedImage(image)}
            className="absolute inset-0 h-full w-full object-contain object-bottom px-3 pt-2 drop-shadow-[0_12px_20px_rgba(0,0,0,0.4)] transition-transform duration-700 motion-safe:group-hover/card:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Photo unavailable
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#090e18] to-transparent"
        />
        {hot && (
          <span
            role="img"
            aria-label={`KTC value up ${Math.round(tier!.delta30!)} in 30 days`}
            title={`KTC value up ${Math.round(tier!.delta30!)} in the last 30 days`}
            className="absolute right-3 top-3 z-30 rounded-full border border-emerald-300/60 bg-slate-950/80 px-1.5 py-0.5 text-base leading-none"
          >
            🔥
          </span>
        )}
        {cold && (
          <span
            role="img"
            aria-label={`KTC value down ${Math.abs(Math.round(tier!.delta30!))} in 30 days`}
            title={`KTC value down ${Math.abs(Math.round(tier!.delta30!))} in the last 30 days`}
            className="absolute right-3 top-3 z-30 rounded-full border border-sky-200/60 bg-slate-950/80 px-1.5 py-0.5 text-base leading-none"
          >
            ❄️
          </span>
        )}
        {tier && (
          <span
            title={`${tier.name}${tier.rank ? ` · overall rank #${tier.rank}` : ''}`}
            className={`absolute bottom-3 left-4 z-20 rounded-md border bg-slate-950/90 px-2 py-1 text-xs font-semibold ${standing?.tone === 'bad' ? 'border-rose-400/50 text-rose-300' : standing?.tone === 'elite' ? 'border-amber-300/60 text-amber-200' : standing?.tone === 'good' ? 'border-emerald-400/50 text-emerald-200' : 'border-white/15 text-slate-400'}`}
          >
            {standing?.label ?? plainTierName(tier.name)}
          </span>
        )}
        {shoulderBadge && (
          <span
            tabIndex={0}
            title={shoulderBadge.description}
            aria-label={shoulderBadge.description}
            className="absolute bottom-3 right-4 z-20 rounded-md border border-sky-300/50 bg-slate-950/90 px-2 py-1 text-xs font-semibold tabular-nums text-sky-200"
          >
            {shoulderBadge.label}
          </span>
        )}
      </div>
      <div className="relative z-20 flex flex-1 flex-col bg-[#090e18] px-4 pb-4">
        <p
          className="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: color.ink }}
        >
          {identity}
        </p>
        <h3
          className={`mt-1 break-words ${compact ? 'text-sm' : 'text-xl'} font-bold leading-tight tracking-tight text-white`}
        >
          {name}
        </h3>
        {team.includes(' · ') && (
          <p className="mt-1 break-words text-[11px] text-slate-400">
            {team.slice(team.indexOf(' · ') + 3)}
          </p>
        )}
        {badge && <p className="mt-2 text-[11px] font-medium text-slate-300">{badge}</p>}
        {choice && (
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={choice.checked}
              onChange={choice.onToggle}
              className="h-3.5 w-3.5 accent-violet-400"
            />
            Include in a trade
          </label>
        )}
        {signal && (
          <div className="mt-2">
            <button
              type="button"
              aria-expanded={showWhy}
              onClick={() => setShowWhy(!showWhy)}
              className="w-full rounded-md border border-orange-300/40 bg-orange-400/10 px-2 py-1 text-left text-[11px] font-semibold text-orange-200 hover:bg-orange-400/20"
            >
              Consider trading · {signal.headline}
            </button>
            {showWhy && (
              <div className="mt-2 space-y-2 rounded-md border border-white/10 bg-slate-900/80 p-2 text-[11px] text-slate-300">
                <p className="font-semibold text-slate-200">Why</p>
                <ul className="list-disc space-y-1 pl-4">
                  {signal.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                {signal.partners.length > 0 && (
                  <>
                    <p className="font-semibold text-slate-200">Who to call</p>
                    <ul className="space-y-1">
                      {signal.partners.map((partner) => (
                        <li key={partner.rosterId}>
                          <span className="font-medium text-white">{partner.teamName}</span> ·{' '}
                          {partner.why}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {children && <div className="mt-3 text-xs text-slate-300">{children}</div>}
        <div className="mt-auto pt-4">
          {label && (
            <p
              className={`mb-3 border-t border-white/15 pt-3 text-xs ${outgoing ? 'text-orange-300' : 'text-slate-400'}`}
            >
              {label}
            </p>
          )}
          {action && onAction && (
            <button
              onClick={onAction}
              disabled={disabled}
              aria-pressed={selected}
              aria-busy={busy}
              aria-label={`${action} ${name}`}
              className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              style={{ color: color.ink, borderColor: `${color.ink}40` }}
            >
              {action}
              <>
                {busy ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                )}
              </>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
