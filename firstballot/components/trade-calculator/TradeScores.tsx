'use client'

import useSWR from 'swr'
import type { TradeResult } from '@/types/trade-calculator'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { PlayerHeadshot } from '@/components/ui/player-headshot'

interface TradeScoresProps {
  result: TradeResult
}

export function TradeScores({ result }: TradeScoresProps) {
  const totalValue = result.side1_total + result.side2_total
  const side1Pct = totalValue > 0 ? (result.side1_total / totalValue) * 100 : 50
  const side2Pct = totalValue > 0 ? (result.side2_total / totalValue) * 100 : 50
  const isEven = result.winner === 'EVEN'
  const side1Wins = result.winner === 'SIDE 1'
  const side2Wins = result.winner === 'SIDE 2'
  const side1TopAssets = result.side1.slice(0, 4)
  const side2TopAssets = result.side2.slice(0, 4)
  const candidateNames = Array.from(
    new Set(
      [...result.side1, ...result.side2]
        .filter((item) => !/^\d{4}\s+\d+\.\d+$/.test(item.name) && !item.headshot_url && !item.espn_id)
        .map((item) => item.name)
    )
  )

  const { data: hydratedHeadshots = {} } = useSWR<
    Record<string, { headshot_url?: string | null; espn_id?: string | number | null }>
  >(
    candidateNames.length > 0 ? candidateNames.join('|') : null,
    async (namesKey: string) => {
      const names = namesKey.split('|')
      const responses = await Promise.all(
        names.map(async (name) => {
          try {
            const res = await fetch(`/api/rankings?player=${encodeURIComponent(name)}`, {
              cache: 'no-store',
            })
            if (!res.ok) return { name, data: null as null | any }
            return { name, data: await res.json() }
          } catch {
            return { name, data: null as null | any }
          }
        })
      )
      return responses.reduce(
        (acc, entry) => {
          const headshot = entry.data?.headshot_url ?? null
          const espn = entry.data?.espn_id ?? null
          if (headshot || espn) acc[entry.name] = { headshot_url: headshot, espn_id: espn }
          return acc
        },
        {} as Record<string, { headshot_url?: string | null; espn_id?: string | number | null }>
      )
    }
  )

  return (
    <div className="mb-4 md:mb-10 relative group">
      <div className="bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-xl md:rounded-3xl p-3 md:p-8 shadow-2xl overflow-hidden">
        {/* Animated background glow */}
        <div
          className="absolute inset-0 opacity-10 blur-3xl transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at ${side1Pct}%, rgba(59, 130, 246, 0.4), rgba(168, 85, 247, 0.4))`,
          }}
        />

        <div className="relative z-10">
          {/* Result Header */}
          <div className="text-center mb-3 md:mb-6">
            <span className="text-[9px] md:text-[10px] text-slate-500 font-mono font-black uppercase tracking-[0.28em]">
              Result
            </span>
            <div className="mt-0.5 text-xl md:text-3xl font-black text-white font-mono tracking-tighter uppercase">
              {isEven ? (
                <span className="text-slate-300">EVEN</span>
              ) : (
                <>
                  <span className="text-slate-300">SIDE </span>
                  <span className="text-yellow-400">{result.winner.split(' ')[1]}</span>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              {side1Wins && <TrendingUp className="h-3.5 w-3.5 text-blue-400" />}
              {side2Wins && <TrendingUp className="h-3.5 w-3.5 text-purple-400" />}
              {isEven && <Minus className="h-3.5 w-3.5 text-slate-400" />}
              <span className="text-xs font-mono text-yellow-300">
                {result.difference_pct.toFixed(1)}%
              </span>
              <span className="text-[9px] font-mono text-slate-600">
                ({result.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })} Δ)
              </span>
            </div>
          </div>

          {/* ── Mobile: compact inline face-off ── */}
          <div className="md:hidden">
            <div className="flex items-stretch gap-2 mb-3">
              {/* Side 1 */}
              <div
                className={`flex-1 rounded-lg border p-2.5 ${
                  side1Wins ? 'border-blue-400/50 bg-blue-500/10' : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[8px] font-black font-mono text-slate-500 uppercase">S1</span>
                  </div>
                  {side1Wins && (
                    <Badge className="bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[8px] px-1 py-0 leading-tight">
                      WIN
                    </Badge>
                  )}
                </div>
                <div className="text-xl font-black text-white font-mono tracking-tighter leading-none">
                  {result.side1_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {result.side1_rank && (
                    <Badge
                      variant="outline"
                      className="bg-blue-500/5 text-blue-400 border-blue-500/20 font-mono text-[7px] px-1 py-0"
                    >
                      #{result.side1_rank}
                    </Badge>
                  )}
                  <span className="text-[8px] font-mono text-blue-300/80">{side1Pct.toFixed(1)}%</span>
                </div>
                {side1TopAssets.length > 0 && (
                  <div className="mt-1.5 flex items-center">
                    {side1TopAssets.map((item) => (
                      <div
                        key={`side1-m-${item.name}-${item.total_score}`}
                        className="-mr-2 first:mr-0"
                        title={item.name}
                      >
                        <PlayerHeadshot
                          playerName={item.name}
                          headshotUrl={item.headshot_url ?? hydratedHeadshots[item.name]?.headshot_url}
                          espnId={item.espn_id ?? hydratedHeadshots[item.name]?.espn_id}
                          size={32}
                          className="ring-2 ring-slate-900 shadow-[0_0_0_1px_rgba(59,130,246,0.45)]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Side 2 */}
              <div
                className={`flex-1 rounded-lg border p-2.5 text-right ${
                  side2Wins ? 'border-purple-400/50 bg-purple-500/10' : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  {side2Wins && (
                    <Badge className="bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[8px] px-1 py-0 leading-tight">
                      WIN
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[8px] font-black font-mono text-slate-500 uppercase">S2</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  </div>
                </div>
                <div className="text-xl font-black text-white font-mono tracking-tighter leading-none">
                  {result.side2_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <span className="text-[8px] font-mono text-purple-300/80">{side2Pct.toFixed(1)}%</span>
                  {result.side2_rank && (
                    <Badge
                      variant="outline"
                      className="bg-purple-500/5 text-purple-400 border-purple-500/20 font-mono text-[7px] px-1 py-0"
                    >
                      #{result.side2_rank}
                    </Badge>
                  )}
                </div>
                {side2TopAssets.length > 0 && (
                  <div className="mt-1.5 flex items-center justify-end">
                    {side2TopAssets.map((item) => (
                      <div
                        key={`side2-m-${item.name}-${item.total_score}`}
                        className="-ml-2 first:ml-0"
                        title={item.name}
                      >
                        <PlayerHeadshot
                          playerName={item.name}
                          headshotUrl={item.headshot_url ?? hydratedHeadshots[item.name]?.headshot_url}
                          espnId={item.espn_id ?? hydratedHeadshots[item.name]?.espn_id}
                          size={32}
                          className="ring-2 ring-slate-900 shadow-[0_0_0_1px_rgba(168,85,247,0.5)]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Desktop: 3-column layout ── */}
          <div className="hidden md:grid grid-cols-[1fr_auto_1fr] gap-6 items-center mb-6">
            {/* Side 1 */}
            <div
              className={`rounded-2xl border p-4 ${
                side1Wins
                  ? 'border-blue-400/50 bg-blue-500/10'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">
                    Side 1
                  </span>
                </div>
                {side1Wins && (
                  <Badge className="bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[9px] px-1.5 py-0">
                    WIN
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-white font-mono tracking-tighter">
                  {result.side1_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-blue-500/50 font-mono text-[9px] font-bold">IDX</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {result.side1_rank && (
                  <Badge
                    variant="outline"
                    className="w-fit bg-blue-500/5 text-blue-400 border-blue-500/20 font-mono text-[8px] uppercase px-1.5 py-0"
                  >
                    #{result.side1_rank}
                  </Badge>
                )}
                <span className="text-[9px] font-mono text-blue-300/80">{side1Pct.toFixed(1)}%</span>
              </div>
              {side1TopAssets.length > 0 && (
                <div className="mt-4 flex items-center">
                  {side1TopAssets.map((item) => (
                    <div
                      key={`side1-${item.name}-${item.position ?? 'asset'}-${item.rank ?? 'na'}-${item.total_score}`}
                      className="-mr-3 first:mr-0"
                      title={item.name}
                    >
                      <PlayerHeadshot
                        playerName={item.name}
                        headshotUrl={item.headshot_url ?? hydratedHeadshots[item.name]?.headshot_url}
                        espnId={item.espn_id ?? hydratedHeadshots[item.name]?.espn_id}
                        size={40}
                        className="ring-2 ring-slate-900 shadow-[0_0_0_2px_rgba(59,130,246,0.45)]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Center spacer (decision is above on desktop too) */}
            <div className="w-px" />

            {/* Side 2 */}
            <div
              className={`rounded-2xl border p-4 text-right ${
                side2Wins
                  ? 'border-purple-400/50 bg-purple-500/10'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                {side2Wins && (
                  <Badge className="bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[9px] px-1.5 py-0">
                    WIN
                  </Badge>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">
                    Side 2
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 justify-end">
                <span className="text-purple-500/50 font-mono text-[9px] font-bold">IDX</span>
                <span className="text-4xl font-black text-white font-mono tracking-tighter">
                  {result.side2_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-end gap-2">
                <span className="text-[9px] font-mono text-purple-300/80">{side2Pct.toFixed(1)}%</span>
                {result.side2_rank && (
                  <Badge
                    variant="outline"
                    className="w-fit bg-purple-500/5 text-purple-400 border-purple-500/20 font-mono text-[8px] uppercase px-1.5 py-0"
                  >
                    #{result.side2_rank}
                  </Badge>
                )}
              </div>
              {side2TopAssets.length > 0 && (
                <div className="mt-4 flex items-center justify-end">
                  {side2TopAssets.map((item) => (
                    <div
                      key={`side2-${item.name}-${item.position ?? 'asset'}-${item.rank ?? 'na'}-${item.total_score}`}
                      className="-ml-3 first:ml-0"
                      title={item.name}
                    >
                      <PlayerHeadshot
                        playerName={item.name}
                        headshotUrl={item.headshot_url ?? hydratedHeadshots[item.name]?.headshot_url}
                        espnId={item.espn_id ?? hydratedHeadshots[item.name]?.espn_id}
                        size={40}
                        className="ring-2 ring-slate-900 shadow-[0_0_0_2px_rgba(168,85,247,0.5)]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Unified Value Meter */}
          <div className="relative h-2.5 md:h-4 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden shadow-inner">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 z-20" />
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out"
              style={{ width: `${side1Pct}%` }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-purple-600 to-purple-400 transition-all duration-1000 ease-out"
              style={{ width: `${side2Pct}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 md:w-1 bg-white z-30 transition-all duration-1000 ease-out"
              style={{ left: `${side1Pct}%`, transform: 'translateX(-50%)' }}
            />
          </div>

          <div className="flex justify-between mt-1 md:mt-3 px-1">
            <span className="text-[9px] md:text-[10px] font-black font-mono text-blue-400 uppercase tracking-tighter">
              {side1Pct.toFixed(1)}%
            </span>
            <span className="text-[9px] md:text-[10px] font-black font-mono text-purple-400 uppercase tracking-tighter">
              {side2Pct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
