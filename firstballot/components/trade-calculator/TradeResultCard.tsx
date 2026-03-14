'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react'
import Link from 'next/link'
import type { TradeResult } from '@/types/trade-calculator'

interface TradeResultCardProps {
  result: TradeResult
}

export function TradeResultCard({ result }: TradeResultCardProps) {
  const getFairnessColor = (fairness: string) => {
    if (fairness === 'FAIR') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (fairness.includes('SLIGHTLY'))
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    if (fairness === 'UNEVEN') return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  const getTierColor = (tier: string): string => {
    const tierMatch = tier.match(/Tier (\d+)/)
    const tierNum = tierMatch ? parseInt(tierMatch[1]) : 5
    const colors: Record<number, string> = {
      1: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      2: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      3: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      4: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      5: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    }
    return colors[tierNum] || colors[5]
  }

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Dossier Style Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-8">
        {/* Side 1 Detailed Breakdown */}
        <div className="relative group">
          <div className="absolute -top-2.5 left-4 md:left-6 px-2 py-0.5 md:px-3 md:py-1 bg-slate-900 border border-white/5 rounded text-[9px] md:text-[10px] font-black font-mono text-blue-400 uppercase tracking-widest z-10">
            Side 1
          </div>
          <Card className="bg-slate-950/40 backdrop-blur-sm border border-blue-500/20 rounded-xl md:rounded-2xl shadow-none overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-blue-500/5 p-3 md:p-6 border-b border-white/5 flex justify-between items-end">
                <div>
                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-0.5">
                    Total
                  </div>
                  <div className="text-2xl md:text-4xl font-black text-white font-mono tracking-tighter">
                    {result.side1_total.toLocaleString()}
                  </div>
                </div>
                {result.side1_rank && (
                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-[9px] px-1.5"
                  >
                    #{result.side1_rank}
                  </Badge>
                )}
              </div>
              <div className="p-3 md:p-6 space-y-1.5 md:space-y-3">
                {result.side1.map((item) => (
                  <div
                    key={`${item.name}-${item.position ?? 'asset'}-${item.rank ?? 'na'}-${item.total_score}`}
                    className="flex items-center justify-between p-2 md:p-4 bg-slate-900/40 rounded-lg md:rounded-xl border border-white/5 group/asset"
                  >
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="relative">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-md md:rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center overflow-hidden">
                          <PlayerHeadshot
                            playerName={item.name}
                            headshotUrl={item.headshot_url}
                            espnId={item.espn_id}
                            size={32}
                          />
                        </div>
                        {item.rank && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 rounded bg-blue-500 text-[7px] md:text-[8px] font-black font-mono flex items-center justify-center text-slate-900">
                            {item.rank}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] md:text-xs font-black text-white font-mono uppercase tracking-tight">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] md:text-[9px] text-slate-500 font-mono font-bold">
                            {item.position}
                          </span>
                          <span
                            className={`text-[8px] md:text-[9px] font-black font-mono uppercase ${getTierColor(item.tier).split(' ')[1]}`}
                          >
                            {item.tier}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs md:text-sm font-black text-white font-mono">
                        {item.total_score.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {result.side1_not_found.map((name) => (
                  <div
                    key={`missing-side1-${name}`}
                    className="p-2 bg-red-500/5 border border-red-500/10 rounded-lg flex items-center justify-between"
                  >
                    <span className="text-[9px] text-red-400 font-mono italic">{name}</span>
                    <Minus className="h-3 w-3 text-red-900" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side 2 Detailed Breakdown */}
        <div className="relative group">
          <div className="absolute -top-2.5 left-4 md:left-6 px-2 py-0.5 md:px-3 md:py-1 bg-slate-900 border border-white/5 rounded text-[9px] md:text-[10px] font-black font-mono text-purple-400 uppercase tracking-widest z-10">
            Side 2
          </div>
          <Card className="bg-slate-950/40 backdrop-blur-sm border border-purple-500/20 rounded-xl md:rounded-2xl shadow-none overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-purple-500/5 p-3 md:p-6 border-b border-white/5 flex justify-between items-end">
                <div>
                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-0.5">
                    Total
                  </div>
                  <div className="text-2xl md:text-4xl font-black text-white font-mono tracking-tighter">
                    {result.side2_total.toLocaleString()}
                  </div>
                </div>
                {result.side2_rank && (
                  <Badge
                    variant="outline"
                    className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono text-[9px] px-1.5"
                  >
                    #{result.side2_rank}
                  </Badge>
                )}
              </div>
              <div className="p-3 md:p-6 space-y-1.5 md:space-y-3">
                {result.side2.map((item) => (
                  <div
                    key={`${item.name}-${item.position ?? 'asset'}-${item.rank ?? 'na'}-${item.total_score}`}
                    className="flex items-center justify-between p-2 md:p-4 bg-slate-900/40 rounded-lg md:rounded-xl border border-white/5 group/asset"
                  >
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="relative">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-md md:rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center overflow-hidden">
                          <PlayerHeadshot
                            playerName={item.name}
                            headshotUrl={item.headshot_url}
                            espnId={item.espn_id}
                            size={32}
                          />
                        </div>
                        {item.rank && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 rounded bg-purple-500 text-[7px] md:text-[8px] font-black font-mono flex items-center justify-center text-slate-900">
                            {item.rank}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] md:text-xs font-black text-white font-mono uppercase tracking-tight">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] md:text-[9px] text-slate-500 font-mono font-bold">
                            {item.position}
                          </span>
                          <span
                            className={`text-[8px] md:text-[9px] font-black font-mono uppercase ${getTierColor(item.tier).split(' ')[1]}`}
                          >
                            {item.tier}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs md:text-sm font-black text-white font-mono">
                        {item.total_score.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {result.side2_not_found.map((name) => (
                  <div
                    key={`missing-side2-${name}`}
                    className="p-2 bg-red-500/5 border border-red-500/10 rounded-lg flex items-center justify-between"
                  >
                    <span className="text-[9px] text-red-400 font-mono italic">{name}</span>
                    <Minus className="h-3 w-3 text-red-900" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fairness Status Footnote */}
      <div className="flex justify-center pt-2 md:pt-4">
        <Badge
          variant="outline"
          className={`${getFairnessColor(result.fairness)} px-4 md:px-6 py-1.5 md:py-2 rounded-full font-black font-mono text-[9px] md:text-[10px] uppercase tracking-[0.3em]`}
        >
          {result.fairness}
        </Badge>
      </div>
    </div>
  )
}
