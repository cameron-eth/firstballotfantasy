"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user-avatar"
import { TrendingUp, TrendingDown, Trophy, Users, Target, BarChart3 } from "lucide-react"
import { TraderStats, GRADE_COLORS, formatValue } from "@/lib/trade-utils"

interface TradeChartsProps {
  traderStats: TraderStats[]
  teams: any[]
}

export function TradeCharts({ traderStats, teams }: TradeChartsProps) {
  if (!traderStats || traderStats.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No trade data available for charts</p>
        </CardContent>
      </Card>
    )
  }

  // Find max values for scaling
  const maxValueGained = Math.max(...traderStats.map(t => t.totalValueGained))
  const maxValueMoved = Math.max(...traderStats.map(t => t.totalValueMoved))
  const maxTrades = Math.max(...traderStats.map(t => t.totalTrades))

  return (
    <div className="space-y-6">
      {/* Total Value Gained Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-green-400 font-mono text-lg flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>TOTAL VALUE GAINED</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {traderStats.map((trader, index) => {
              const team = teams.find(t => t.rosterId === trader.rosterId)
              const percentage = maxValueGained > 0 ? (trader.totalValueGained / maxValueGained) * 100 : 0
              const isPositive = trader.totalValueGained >= 0
              
              return (
                <div key={trader.rosterId} className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="text-lg font-bold text-yellow-400 min-w-[2rem]">#{index + 1}</div>
                    <UserAvatar
                      avatarId={team?.ownerAvatar}
                      displayName={trader.ownerName}
                      username={trader.ownerName}
                      size={32}
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-100 truncate">{trader.teamName}</div>
                      <div className="text-sm text-gray-400 truncate">{trader.ownerName}</div>
                    </div>
                  </div>
                  
                                     <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 min-w-0">
                     <div className="text-right min-w-0">
                       <div className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                         {formatValue(trader.totalValueGained)}
                       </div>
                       <div className="text-xs text-gray-400">{trader.totalTrades} trades</div>
                     </div>
                     
                     <div className="w-full sm:w-32 h-6 bg-slate-700 rounded-full overflow-hidden">
                       <div 
                         className={`h-full rounded-full transition-all duration-500 ${
                           isPositive ? 'bg-green-400' : 'bg-red-400'
                         }`}
                         style={{ 
                           width: `${Math.abs(percentage)}%`,
                           maxWidth: '100%'
                         }}
                       />
                     </div>
                     
                     <Badge variant="outline" className={`text-xs px-2 py-1 ${GRADE_COLORS[trader.grade as keyof typeof GRADE_COLORS]}`}>
                       {trader.grade}
                     </Badge>
                   </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Trade Volume Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-blue-400 font-mono text-lg flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>TRADE VOLUME</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {traderStats.map((trader, index) => {
              const team = teams.find(t => t.rosterId === trader.rosterId)
              const percentage = maxValueMoved > 0 ? (trader.totalValueMoved / maxValueMoved) * 100 : 0
              
              return (
                <div key={trader.rosterId} className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="text-lg font-bold text-yellow-400 min-w-[2rem]">#{index + 1}</div>
                    <UserAvatar
                      avatarId={team?.ownerAvatar}
                      displayName={trader.ownerName}
                      username={trader.ownerName}
                      size={32}
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-100 truncate">{trader.teamName}</div>
                      <div className="text-sm text-gray-400 truncate">{trader.ownerName}</div>
                    </div>
                  </div>
                  
                                     <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 min-w-0">
                     <div className="text-right min-w-0">
                       <div className="font-semibold text-blue-400">
                         {Math.round(trader.totalValueMoved)}
                       </div>
                       <div className="text-xs text-gray-400">value moved</div>
                     </div>
                     
                     <div className="w-full sm:w-32 h-6 bg-slate-700 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-blue-400 rounded-full transition-all duration-500"
                         style={{ 
                           width: `${percentage}%`,
                           maxWidth: '100%'
                         }}
                       />
                     </div>
                     
                     <div className="text-xs text-gray-400 min-w-[3rem]">
                       {trader.totalTrades} trades
                     </div>
                   </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Average Value Per Trade Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-purple-400 font-mono text-lg flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>AVERAGE VALUE PER TRADE</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {traderStats
              .filter(trader => trader.totalTrades > 0)
              .sort((a, b) => b.avgValuePerTrade - a.avgValuePerTrade)
              .map((trader, index) => {
                const team = teams.find(t => t.rosterId === trader.rosterId)
                const maxAvg = Math.max(...traderStats.filter(t => t.totalTrades > 0).map(t => t.avgValuePerTrade))
                const percentage = maxAvg > 0 ? (trader.avgValuePerTrade / maxAvg) * 100 : 0
                const isPositive = trader.avgValuePerTrade >= 0
                
                return (
                  <div key={trader.rosterId} className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="text-lg font-bold text-yellow-400 min-w-[2rem]">#{index + 1}</div>
                      <UserAvatar
                        avatarId={team?.ownerAvatar}
                        displayName={trader.ownerName}
                        username={trader.ownerName}
                        size={32}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-100 truncate">{trader.teamName}</div>
                        <div className="text-sm text-gray-400 truncate">{trader.ownerName}</div>
                      </div>
                    </div>
                    
                                         <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 min-w-0">
                       <div className="text-right min-w-0">
                         <div className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                           {formatValue(trader.avgValuePerTrade)}
                         </div>
                         <div className="text-xs text-gray-400">per trade</div>
                       </div>
                       
                       <div className="w-full sm:w-32 h-6 bg-slate-700 rounded-full overflow-hidden">
                         <div 
                           className={`h-full rounded-full transition-all duration-500 ${
                             isPositive ? 'bg-green-400' : 'bg-red-400'
                           }`}
                           style={{ 
                             width: `${Math.abs(percentage)}%`,
                             maxWidth: '100%'
                           }}
                         />
                       </div>
                       
                       <div className="text-xs text-gray-400 min-w-[3rem]">
                         {trader.totalTrades} trades
                       </div>
                     </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Trade Activity Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-yellow-400 font-mono text-lg flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>TRADE ACTIVITY</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {traderStats
              .sort((a, b) => b.totalTrades - a.totalTrades)
              .map((trader, index) => {
                const team = teams.find(t => t.rosterId === trader.rosterId)
                const percentage = maxTrades > 0 ? (trader.totalTrades / maxTrades) * 100 : 0
                
                return (
                  <div key={trader.rosterId} className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="text-lg font-bold text-yellow-400 min-w-[2rem]">#{index + 1}</div>
                      <UserAvatar
                        avatarId={team?.ownerAvatar}
                        displayName={trader.ownerName}
                        username={trader.ownerName}
                        size={32}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-100 truncate">{trader.teamName}</div>
                        <div className="text-sm text-gray-400 truncate">{trader.ownerName}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 min-w-0">
                      <div className="text-right min-w-0">
                        <div className="font-semibold text-yellow-400">
                          {trader.totalTrades}
                        </div>
                        <div className="text-xs text-gray-400">trades</div>
                      </div>
                      
                      <div className="w-full sm:w-32 h-6 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percentage}%`,
                            maxWidth: '100%'
                          }}
                        />
                      </div>
                      
                      <div className="text-xs text-gray-400 min-w-[4rem]">
                        {formatValue(trader.totalValueGained)}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 