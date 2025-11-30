'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TeamArchetype } from '@/types/team-builder'

interface TeamArchetypeCardProps {
  archetype: TeamArchetype
  getProbabilityColor: (probability: string) => string
  getRiskColor: (risk: string) => string
}

export function TeamArchetypeCard({
  archetype,
  getProbabilityColor,
  getRiskColor,
}: TeamArchetypeCardProps) {
  const IconComponent = archetype.icon

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {IconComponent && <IconComponent className="h-6 w-6 text-yellow-400" />}
            <CardTitle className="text-white font-mono">{archetype.name}</CardTitle>
          </div>
          <div className="flex space-x-2">
            <Badge className={`${getProbabilityColor(archetype.probability)} text-white`}>
              {archetype.probability}
            </Badge>
            <Badge className={`${getRiskColor(archetype.riskLevel)} text-white`}>
              {archetype.riskLevel}
            </Badge>
          </div>
        </div>
        <p className="text-gray-400 font-mono text-sm">{archetype.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-white font-mono mb-2">STRATEGY</h4>
          <p className="text-gray-300 text-sm">{archetype.strategy}</p>
        </div>

        <div>
          <h4 className="text-white font-mono mb-2">EXPECTED ROSTER</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(archetype.roster).map(([position, player]) => (
              <div key={position} className="flex justify-between">
                <span className="text-gray-400 font-mono">{position}:</span>
                <span className="text-white font-mono">
                  {player.tier} ({player.ppg} PPG)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-white font-mono mb-2">PROS</h4>
            <ul className="text-sm text-green-400 space-y-1">
              {archetype.pros.map((pro, index) => (
                <li key={index} className="font-mono">
                  • {pro}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-mono mb-2">CONS</h4>
            <ul className="text-sm text-red-400 space-y-1">
              {archetype.cons.map((con, index) => (
                <li key={index} className="font-mono">
                  • {con}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h4 className="text-white font-mono mb-2">DRAFT STRATEGY</h4>
          <ul className="text-sm text-yellow-400 space-y-1">
            {archetype.draftStrategy.map((strategy, index) => (
              <li key={index} className="font-mono">
                • {strategy}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-white font-mono">Expected PPG:</span>
            <span className="text-yellow-400 font-mono text-lg">{archetype.expectedPPG}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
