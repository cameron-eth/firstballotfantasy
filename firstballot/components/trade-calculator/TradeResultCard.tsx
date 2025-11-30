'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react'
import Link from 'next/link'

interface TradeItem {
  name: string
  type: 'player' | 'pick'
  position?: string
  total_score: number
  tier: string
  rank?: number | null
}

interface TradeResult {
  side1: TradeItem[]
  side1_total: number
  side1_rank?: number
  side1_not_found: string[]
  side2: TradeItem[]
  side2_total: number
  side2_rank?: number
  side2_not_found: string[]
  difference: number
  difference_pct: number
  fairness: string
  winner: string
}

interface TradeResultCardProps {
  result: TradeResult
}

export function TradeResultCard({ result }: TradeResultCardProps) {
  const getFairnessColor = (fairness: string) => {
    if (fairness === 'FAIR') return 'text-green-400 bg-green-500/20 border-green-500/30'
    if (fairness.includes('SLIGHTLY'))
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
    if (fairness === 'UNEVEN') return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
    return 'text-red-400 bg-red-500/20 border-red-500/30'
  }

  const getTierColor = (tier: string): string => {
    const tierMatch = tier.match(/Tier (\d+)/)
    const tierNum = tierMatch ? parseInt(tierMatch[1]) : 5
    const colors: Record<number, string> = {
      1: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      2: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      3: 'bg-green-500/20 text-green-300 border-green-500/30',
      4: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      5: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    }
    return colors[tierNum] || colors[5]
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Trade Evaluation
            </CardTitle>
            <Badge variant="outline" className={getFairnessColor(result.fairness)}>
              {result.fairness}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Side 1 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">Side 1 Total</h4>
                {result.side1_rank && (
                  <Link
                    href={`/rankings?player=${encodeURIComponent(result.side1[0]?.name || '')}`}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Rank #{result.side1_rank}
                  </Link>
                )}
              </div>
              <div className="text-2xl font-bold text-white">
                {result.side1_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            {/* Side 2 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">Side 2 Total</h4>
                {result.side2_rank && (
                  <Link
                    href={`/rankings?player=${encodeURIComponent(result.side2[0]?.name || '')}`}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Rank #{result.side2_rank}
                  </Link>
                )}
              </div>
              <div className="text-2xl font-bold text-white">
                {result.side2_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Difference</span>
              <div className="flex items-center gap-2">
                {result.winner === 'SIDE 1' && <TrendingUp className="h-4 w-4 text-green-400" />}
                {result.winner === 'SIDE 2' && <TrendingDown className="h-4 w-4 text-red-400" />}
                {result.winner === 'EVEN' && <Minus className="h-4 w-4 text-gray-400" />}
                <span className="text-white font-semibold">
                  {result.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })} (
                  {result.difference_pct.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-400">
              Winner: <span className="text-white font-semibold">{result.winner}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side 1 Details */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Side 1 Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {result.side1.length > 0 ? (
            <div className="space-y-3">
              {result.side1.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded border border-slate-600"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{item.name}</span>
                      {item.rank && (
                        <Link
                          href={`/rankings?player=${encodeURIComponent(item.name)}`}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          #{item.rank}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.position && (
                        <Badge
                          variant="outline"
                          className="bg-slate-600/30 text-slate-300 border-slate-500/30 text-xs"
                        >
                          {item.position}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`${getTierColor(item.tier)} text-xs`}>
                        {item.tier}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono font-semibold">
                      {item.total_score.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-gray-400 text-xs">Value</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No assets added</p>
          )}
          {result.side1_not_found.length > 0 && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded">
              <p className="text-red-400 text-sm font-semibold mb-1">Not Found:</p>
              <p className="text-red-300 text-sm">{result.side1_not_found.join(', ')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side 2 Details */}
      <Card className="bg-slate-800 border border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Side 2 Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {result.side2.length > 0 ? (
            <div className="space-y-3">
              {result.side2.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded border border-slate-600"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{item.name}</span>
                      {item.rank && (
                        <Link
                          href={`/rankings?player=${encodeURIComponent(item.name)}`}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          #{item.rank}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.position && (
                        <Badge
                          variant="outline"
                          className="bg-slate-600/30 text-slate-300 border-slate-500/30 text-xs"
                        >
                          {item.position}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`${getTierColor(item.tier)} text-xs`}>
                        {item.tier}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono font-semibold">
                      {item.total_score.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-gray-400 text-xs">Value</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No assets added</p>
          )}
          {result.side2_not_found.length > 0 && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded">
              <p className="text-red-400 text-sm font-semibold mb-1">Not Found:</p>
              <p className="text-red-300 text-sm">{result.side2_not_found.join(', ')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
