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
    <div className="mb-10 relative group">
      <div className="bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Animated background glow */}
        <div
          className="absolute inset-0 opacity-10 blur-3xl transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at ${side1Pct}%, rgba(59, 130, 246, 0.4), rgba(168, 85, 247, 0.4))`,
          }}
        />

        <div className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-6">
            {/* Side 1 */}
            <div
              className={`rounded-2xl border p-4 ${
                side1Wins
                  ? 'border-blue-400/50 bg-blue-500/10 shadow-[0_0_26px_rgba(59,130,246,0.25)]'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">
                    Side 1
                  </span>
                </div>
                {side1Wins && (
                  <Badge className="bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px]">
                    WINNER
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white font-mono tracking-tighter">
                  {result.side1_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-blue-500/50 font-mono text-[10px] font-bold">INDEX</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                {result.side1_rank && (
                  <Badge
                    variant="outline"
                    className="w-fit bg-blue-500/5 text-blue-400 border-blue-500/20 font-mono text-[9px] uppercase px-2 py-0"
                  >
                    Top Rank #{result.side1_rank}
                  </Badge>
                )}
                <span className="text-[10px] font-mono text-blue-300/80 uppercase">
                  {side1Pct.toFixed(1)}%
                </span>
              </div>
              {side1TopAssets.length > 0 && (
                <div className="mt-4 flex items-center">
                  {side1TopAssets.map((item) => (
                    <div
                      key={`side1-${item.name}-${item.position ?? 'asset'}-${item.rank ?? 'na'}-${item.total_score}`}
                      className="-mr-4 first:mr-0"
                      title={item.name}
                    >
                      <PlayerHeadshot
                        playerName={item.name}
                        headshotUrl={
                          item.headshot_url ?? hydratedHeadshots[item.name]?.headshot_url
                        }
                        espnId={item.espn_id ?? hydratedHeadshots[item.name]?.espn_id}
                        size={54}
                        className="ring-2 ring-slate-900 shadow-[0_0_0_2px_rgba(59,130,246,0.45)]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Center Decision */}
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-500 font-mono font-black uppercase tracking-[0.28em]">
                Analysis Decision
              </span>
              <div className="mt-2 text-3xl font-black text-white font-mono tracking-tighter uppercase">
                {isEven ? (
                  <span className="text-slate-300">EVEN</span>
                ) : (
                  <>
                    <span className="text-slate-300">SIDE </span>
                    <span className="text-yellow-400">{result.winner.split(' ')[1]}</span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                {side1Wins && <TrendingUp className="h-4 w-4 text-blue-400" />}
                {side2Wins && <TrendingUp className="h-4 w-4 text-purple-400" />}
                {isEven && <Minus className="h-4 w-4 text-slate-400" />}
                <span className="text-xs font-mono text-yellow-300">
                  {result.difference_pct.toFixed(1)}%
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                {result.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })} value
                delta
              </div>
            </div>

            {/* Side 2 */}
            <div
              className={`rounded-2xl border p-4 text-right ${
                side2Wins
                  ? 'border-purple-400/50 bg-purple-500/10 shadow-[0_0_26px_rgba(168,85,247,0.25)]'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                {side2Wins && (
                  <Badge className="bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px]">
                    WINNER
                  </Badge>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">
                    Side 2
                  </span>
                  <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-purple-500/50 font-mono text-[10px] font-bold">INDEX</span>
                <span className="text-4xl font-black text-white font-mono tracking-tighter">
                  {result.side2_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-3">
                <span className="text-[10px] font-mono text-purple-300/80 uppercase">
                  {side2Pct.toFixed(1)}%
                </span>
                {result.side2_rank && (
                  <Badge
                    variant="outline"
                    className="w-fit bg-purple-500/5 text-purple-400 border-purple-500/20 font-mono text-[9px] uppercase px-2 py-0"
                  >
                    Top Rank #{result.side2_rank}
                  </Badge>
                )}
              </div>
              {side2TopAssets.length > 0 && (
                <div className="mt-4 flex items-center justify-end">
                  {side2TopAssets.map((item) => (
                    <div
                      key={`side2-${item.name}-${item.position ?? 'asset'}-${item.rank ?? 'na'}-${item.total_score}`}
                      className="-ml-4 first:ml-0"
                      title={item.name}
                    >
                      <PlayerHeadshot
                        playerName={item.name}
                        headshotUrl={
                          item.headshot_url ?? hydratedHeadshots[item.name]?.headshot_url
                        }
                        espnId={item.espn_id ?? hydratedHeadshots[item.name]?.espn_id}
                        size={54}
                        className="ring-2 ring-slate-900 shadow-[0_0_0_2px_rgba(168,85,247,0.5)]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Unified Value Meter */}
          <div className="relative h-4 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden shadow-inner">
            {/* Center Balance Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 z-20" />

            {/* Side 1 Bar */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              style={{ width: `${side1Pct}%` }}
            />

            {/* Side 2 Bar */}
            <div
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-purple-600 to-purple-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              style={{ width: `${side2Pct}%` }}
            />

            {/* Splitter Notch */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white z-30 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              style={{ left: `${side1Pct}%`, transform: 'translateX(-50%)' }}
            />
          </div>

          {/* Percentage Labels */}
          <div className="flex justify-between mt-3 px-1">
            <span className="text-[10px] font-black font-mono text-blue-400 uppercase tracking-tighter">
              {side1Pct.toFixed(1)}% Weight
            </span>
            <span className="text-[10px] font-black font-mono text-purple-400 uppercase tracking-tighter">
              {side2Pct.toFixed(1)}% Weight
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
