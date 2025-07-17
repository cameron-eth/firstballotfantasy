"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TierDefinition {
  name: string
  color: string
  description: string
}

const tierDefinitions: TierDefinition[] = [
  {
    name: "Elite",
    color: "bg-purple-500",
    description: "League Winners"
  },
  {
    name: "Tier 1",
    color: "bg-green-500", 
    description: "Top Starters"
  },
  {
    name: "Tier 2",
    color: "bg-yellow-500",
    description: "Solid Options"
  },
  {
    name: "Startable",
    color: "bg-orange-500",
    description: "Reliable"
  },
  {
    name: "Flex",
    color: "bg-gray-500",
    description: "Situational"
  },
  {
    name: "Streamer",
    color: "bg-gray-400",
    description: "Matchup Based"
  }
]

interface TierLegendProps {
  className?: string
  compact?: boolean
}

export function TierLegend({ className = "", compact = false }: TierLegendProps) {
  return (
    <Card className={`bg-slate-800 border-slate-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-yellow-400 font-mono text-sm">TIER DEFINITIONS</CardTitle>
        <p className="text-green-400 text-xs">Performance classifications based on fantasy PPG</p>
      </CardHeader>
      <CardContent>
        <div className={`grid ${compact ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'} gap-3`}>
          {tierDefinitions.map((tier) => (
            <div key={tier.name} className="text-center">
              <div className={`w-3 h-3 ${tier.color} rounded-full mx-auto mb-1`}></div>
              <p className="font-mono text-xs text-white font-medium">{tier.name}</p>
              <p className="text-xs text-gray-400">{tier.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 