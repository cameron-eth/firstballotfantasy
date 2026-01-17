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
    <div className="space-y-10">
      {/* Dossier Style Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Side 1 Detailed Breakdown */}
        <div className="relative group">
          <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-900 border border-white/5 rounded text-[10px] font-black font-mono text-blue-400 uppercase tracking-widest z-10 shadow-xl">
            Asset Dossier: Side 1
          </div>
          <Card className="bg-slate-950/40 backdrop-blur-sm border border-blue-500/20 rounded-2xl shadow-none overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-blue-500/5 p-6 border-b border-white/5 flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">
                    Cumulative Index
                  </div>
                  <div className="text-4xl font-black text-white font-mono tracking-tighter">
                    {result.side1_total.toLocaleString()}
                  </div>
                </div>
                {result.side1_rank && (
                  <div className="text-right">
                    <div className="text-[9px] text-slate-600 font-mono uppercase mb-1">
                      Primary Rank
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-[10px] px-2"
                    >
                      #{result.side1_rank}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="p-6 space-y-3">
                {result.side1.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all group/asset"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center overflow-hidden grayscale group-hover/asset:grayscale-0 transition-all">
                          <PlayerHeadshot playerName={item.name} size={40} />
                        </div>
                        {item.rank && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded bg-blue-500 text-[8px] font-black font-mono flex items-center justify-center text-slate-900 shadow-lg">
                            #{item.rank}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white font-mono uppercase tracking-tight group-hover/asset:text-blue-400 transition-colors">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-500 font-mono font-bold">
                            {item.position}
                          </span>
                          <span className="text-[9px] text-slate-700 font-mono">•</span>
                          <span
                            className={`text-[9px] font-black font-mono uppercase tracking-tighter ${getTierColor(item.tier).split(' ')[1]}`}
                          >
                            {item.tier}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-white font-mono">
                        {item.total_score.toLocaleString()}
                      </div>
                      <div className="text-[8px] text-slate-600 font-mono uppercase">Value</div>
                    </div>
                  </div>
                ))}
                {result.side1_not_found.map((name, i) => (
                  <div
                    key={i}
                    className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-between"
                  >
                    <span className="text-[10px] text-red-400 font-mono italic">
                      Missing Data: {name}
                    </span>
                    <Minus className="h-3 w-3 text-red-900" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side 2 Detailed Breakdown */}
        <div className="relative group">
          <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-900 border border-white/5 rounded text-[10px] font-black font-mono text-purple-400 uppercase tracking-widest z-10 shadow-xl">
            Asset Dossier: Side 2
          </div>
          <Card className="bg-slate-950/40 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-none overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-purple-500/5 p-6 border-b border-white/5 flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">
                    Cumulative Index
                  </div>
                  <div className="text-4xl font-black text-white font-mono tracking-tighter">
                    {result.side2_total.toLocaleString()}
                  </div>
                </div>
                {result.side2_rank && (
                  <div className="text-right">
                    <div className="text-[9px] text-slate-600 font-mono uppercase mb-1">
                      Primary Rank
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono text-[10px] px-2"
                    >
                      #{result.side2_rank}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="p-6 space-y-3">
                {result.side2.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-white/5 hover:border-purple-500/20 transition-all group/asset"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center overflow-hidden grayscale group-hover/asset:grayscale-0 transition-all">
                          <PlayerHeadshot playerName={item.name} size={40} />
                        </div>
                        {item.rank && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded bg-purple-500 text-[8px] font-black font-mono flex items-center justify-center text-slate-900 shadow-lg">
                            #{item.rank}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white font-mono uppercase tracking-tight group-hover/asset:text-purple-400 transition-colors">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-500 font-mono font-bold">
                            {item.position}
                          </span>
                          <span className="text-[9px] text-slate-700 font-mono">•</span>
                          <span
                            className={`text-[9px] font-black font-mono uppercase tracking-tighter ${getTierColor(item.tier).split(' ')[1]}`}
                          >
                            {item.tier}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-white font-mono">
                        {item.total_score.toLocaleString()}
                      </div>
                      <div className="text-[8px] text-slate-600 font-mono uppercase">Value</div>
                    </div>
                  </div>
                ))}
                {result.side2_not_found.map((name, i) => (
                  <div
                    key={i}
                    className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-between"
                  >
                    <span className="text-[10px] text-red-400 font-mono italic">
                      Missing Data: {name}
                    </span>
                    <Minus className="h-3 w-3 text-red-900" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fairness Status Footnote */}
      <div className="flex justify-center pt-4">
        <Badge
          variant="outline"
          className={`${getFairnessColor(result.fairness)} px-6 py-2 rounded-full font-black font-mono text-[10px] uppercase tracking-[0.3em] shadow-2xl animate-pulse`}
        >
          {result.fairness}
        </Badge>
      </div>
    </div>
  )
}
