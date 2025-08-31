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

  const baseClasses = `p-4 transition-all ${
    canAccess 
      ? 'cursor-pointer hover:border-yellow-400 hover:bg-slate-700' 
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
        isSelected ? 'border-yellow-400 ring-2 ring-yellow-400 bg-slate-700' : 'bg-slate-800 border-slate-700'
      }`}
      leagueName={league.name}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-2xl font-bold text-yellow-400">
            #{league.league_id.slice(-2)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">{league.name}</h3>
            <p className="text-sm text-gray-400">
              {league.season} • {league.status}
            </p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={`text-xs px-2 py-1 ${getStatusColor(league.status)}`}
        >
          {league.status}
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm text-slate-200">
        <div className="flex justify-between">
          <span>Teams:</span>
          <span className="text-slate-100">{league.total_rosters || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Sport:</span>
          <span className="text-slate-100">{league.sport?.toUpperCase() || 'NFL'}</span>
        </div>
        <div className="flex justify-between">
          <span>Season:</span>
          <span className="text-slate-100">{league.season}</span>
        </div>
        <div className="flex justify-between">
          <span>Draft ID:</span>
          <span className="text-slate-100">{league.draft_id ? 'Available' : 'N/A'}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-600">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">League ID:</span>
          <span className="text-slate-300 font-mono">{league.league_id}</span>
        </div>
      </div>
    </LeagueAccessControl>
  )
} 