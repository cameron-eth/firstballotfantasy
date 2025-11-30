import React from 'react'
import { Gem, Crown, Star, Award, Trophy, Medal, Shield } from 'lucide-react'

export function getTierIcon(tier: string, isDiamond: boolean): React.ReactNode {
  if (isDiamond) {
    return <Gem className="h-3 w-3 mr-1" />
  }

  const extractTierNumber = (tier: string): number => {
    const match = tier.match(/Tier (\d+)/)
    return match ? parseInt(match[1]) : 5
  }

  const tierNum = extractTierNumber(tier)
  const icons: Record<number, React.ReactNode> = {
    1: <Crown className="h-3 w-3 mr-1" />,
    2: <Star className="h-3 w-3 mr-1" />,
    3: <Award className="h-3 w-3 mr-1" />,
    4: <Trophy className="h-3 w-3 mr-1" />,
    5: <Medal className="h-3 w-3 mr-1" />,
  }
  return icons[tierNum] || <Shield className="h-3 w-3 mr-1" />
}
