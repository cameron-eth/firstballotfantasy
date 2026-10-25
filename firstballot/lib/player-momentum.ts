export function playerMomentum(
  history: { scraped_date: string; value_sf: number }[] = [],
  games: { week: number; points: number }[] = [],
  now = Date.now()
) {
  const sorted = history
    .filter((p) => Number.isFinite(p.value_sf))
    .slice()
    .sort((a, b) => a.scraped_date.localeCompare(b.scraped_date))
  const last = sorted.at(-1)
  const target = last ? Date.parse(last.scraped_date) - 7 * 86400000 : 0
  const first = sorted.filter((p) => Date.parse(p.scraped_date) <= target).at(-1)
  const ktc =
    last &&
    first &&
    first.value_sf > 0 &&
    now - Date.parse(last.scraped_date) < 3 * 86400000 &&
    target - Date.parse(first.scraped_date) <= 3 * 86400000
      ? (last.value_sf - first.value_sf) / first.value_sf
      : null
  const played = games
    .filter((g) => Number.isFinite(g.points))
    .slice()
    .sort((a, b) => a.week - b.week)
  const mean = (rows: typeof played) => rows.reduce((s, g) => s + g.points, 0) / rows.length
  const recent = played.length >= 4 ? mean(played.slice(-2)) : null
  const prior = played.length >= 4 ? mean(played.slice(0, -2)) : null
  const fppg =
    recent != null && prior != null ? (recent - prior) / Math.max(5, Math.abs(prior)) : null
  // Explicitly require both inputs; missing history must never look neutral.
  const score =
    ktc != null && fppg != null
      ? Math.round(
          50 +
            25 * Math.max(-1, Math.min(1, ktc / 0.1)) +
            25 * Math.max(-1, Math.min(1, fppg / 0.5))
        )
      : null
  return { score, ktc, recent, prior, from: first?.scraped_date, to: last?.scraped_date }
}
