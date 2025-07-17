"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { PlayerHeadshot } from "./player-headshot"

interface Player {
  name: string
  tier: string
  ppg: number
  predicted: number
  error: string
  team: string
  playerId?: string
}

interface PlayerCardProps {
  player: Player
}

const tierColors = {
  Elite: "bg-purple-500",
  "Tier 1": "bg-green-500",
  "Tier 2": "bg-yellow-500",
  Startable: "bg-orange-500",
  Flex: "bg-gray-500",
  Streamer: "bg-gray-400",
  // Legacy tier names for backward compatibility
  QB1: "bg-green-500",
  RB1: "bg-green-500",
  WR1: "bg-green-500",
  TE1: "bg-green-500",
  QB2: "bg-yellow-500",
  RB2: "bg-yellow-500",
  WR2: "bg-yellow-500",
  TE2: "bg-yellow-500",
}

export function PlayerCard({ player }: PlayerCardProps) {
  const isPositive = player.error.startsWith("+")
  const tierColor = tierColors[player.tier as keyof typeof tierColors] || "bg-gray-500"

  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <PlayerHeadshot
              playerId={player.playerId}
              playerName={player.name}
              teamLogo={player.team}
              size={48}
              className="flex-shrink-0"
              player={player}
            />
            <div>
              <h3 className="font-mono font-bold text-white">{player.name}</h3>
              <p className="text-sm text-gray-400">{player.team}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-mono text-white ${tierColor}`}>{player.tier}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">ACTUAL PPG</p>
            <p className="font-mono text-lg text-white">{player.ppg.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">PREDICTED PPG</p>
            <p className="font-mono text-lg text-gray-300">{player.predicted.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">PREDICTION ERROR</span>
            <div className="flex items-center space-x-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className={`font-mono text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {player.error}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
