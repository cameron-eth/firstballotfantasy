"use client"

import { ReactNode } from 'react'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, CheckCircle } from "lucide-react"
import { UpgradePrompt } from "./upgrade-prompt"

interface LeagueAccessControlProps {
  leagueIndex: number
  canAccess: boolean
  isMember: boolean
  children: ReactNode
  className?: string
  onClick?: () => void
  leagueName?: string
}

export function LeagueAccessControl({
  leagueIndex,
  canAccess,
  isMember,
  children,
  className = "",
  onClick,
  leagueName
}: LeagueAccessControlProps) {
  const handleClick = () => {
    if (canAccess && onClick) {
      onClick()
    }
  }

  const baseClasses = `p-6 transition-all duration-200 backdrop-blur-sm border ${
    canAccess 
      ? 'cursor-pointer hover:border-yellow-400/50 hover:bg-slate-700/80 hover:shadow-lg hover:shadow-yellow-400/10' 
      : 'cursor-not-allowed opacity-50 grayscale'
  } ${className}`

  return (
    <Card className={baseClasses} onClick={handleClick}>
      {/* PRO Badge for restricted leagues */}
      {!canAccess && leagueIndex > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-yellow-400 text-slate-900 text-xs px-2 py-1">
            <Crown className="h-3 w-3 mr-1" />
            PRO
          </Badge>
        </div>
      )}

      {/* UNLOCKED Badge for accessible leagues (members only) */}
      {canAccess && isMember && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-green-400 text-slate-900 text-xs px-2 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            UNLOCKED
          </Badge>
        </div>
      )}



      {/* League Content */}
      <div className="relative">
        {children}
      </div>
    </Card>
  )
}

// Helper component for league cards with built-in access control
interface LeagueCardProps {
  league: any
  leagueIndex: number
  canAccess: boolean
  isMember: boolean
  isSelected?: boolean
  onClick?: () => void
}

export function LeagueCard({
  league,
  leagueIndex,
  canAccess,
  isMember,
  isSelected = false,
  onClick
}: LeagueCardProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-400/20 text-green-400 border-green-400'
      case 'pre_draft': return 'bg-blue-400/20 text-blue-400 border-blue-400'
      default: return 'bg-gray-400/20 text-gray-400 border-gray-400'
    }
  }

  return (
    <LeagueAccessControl
      leagueIndex={leagueIndex}
      canAccess={canAccess}
      isMember={isMember}
      onClick={onClick}
      className={`${
        isSelected ? 'border-yellow-400/50 ring-2 ring-yellow-400/50 bg-slate-700/80' : 'bg-slate-800/50 border-slate-700/50'
      }`}
      leagueName={league.name}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-400/10 rounded-xl border border-yellow-400/20 backdrop-blur-sm">
            <span className="text-yellow-400 font-bold text-lg">#{league.league_id.slice(-2)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-100 text-lg truncate">{league.name}</h3>
            <p className="text-sm text-slate-400 font-mono">
              {league.season} • {league.status}
            </p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={`text-xs px-3 py-1 font-mono ${getStatusColor(league.status)}`}
        >
          {league.status}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
          <div className="text-slate-400 text-xs font-mono mb-1">Teams</div>
          <div className="text-slate-100 font-semibold">{league.total_rosters || 'N/A'}</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
          <div className="text-slate-400 text-xs font-mono mb-1">Sport</div>
          <div className="text-slate-100 font-semibold">{league.sport?.toUpperCase() || 'NFL'}</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
          <div className="text-slate-400 text-xs font-mono mb-1">Season</div>
          <div className="text-slate-100 font-semibold">{league.season}</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
          <div className="text-slate-400 text-xs font-mono mb-1">Draft ID</div>
          <div className="text-slate-100 font-semibold">{league.draft_id ? 'Available' : 'N/A'}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-600/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">League ID:</span>
          <span className="text-slate-300 font-mono bg-slate-700/50 px-2 py-1 rounded border border-slate-600/30">{league.league_id}</span>
        </div>
      </div>
    </LeagueAccessControl>
  )
} 