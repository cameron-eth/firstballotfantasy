export interface PlayerRanking {
  RK: number
  TIERS: number
  "PLAYER NAME": string
  TEAM: string
  POS: string
  AGE: string
  BEST: number
  WORST: number
  "AVG.": number
  "STD.DEV": number
  "ECR VS. ADP": string
}

export const playerRankings: PlayerRanking[] = [
  {
    "RK": 1,
    "TIERS": 1,
    "PLAYER NAME": "Josh Allen",
    "TEAM": "BUF",
    "POS": "QB1",
    "AGE": "29",
    "BEST": 1,
    "WORST": 3,
    "AVG.": 1.6,
    "STD.DEV": 0.7,
    "ECR VS. ADP": "-"
  },
  {
    "RK": 2,
    "TIERS": 1,
    "PLAYER NAME": "Lamar Jackson",
    "TEAM": "BAL",
    "POS": "QB2",
    "AGE": "28",
    "BEST": 1,
    "WORST": 4,
    "AVG.": 2.2,
    "STD.DEV": 0.7,
    "ECR VS. ADP": "-"
  },
  {
    "RK": 3,
    "TIERS": 1,
    "PLAYER NAME": "Jayden Daniels",
    "TEAM": "WAS",
    "POS": "QB3",
    "AGE": "24",
    "BEST": 1,
    "WORST": 3,
    "AVG.": 2.3,
    "STD.DEV": 0.9,
    "ECR VS. ADP": "-"
  },
  {
    "RK": 4,
    "TIERS": 1,
    "PLAYER NAME": "Joe Burrow",
    "TEAM": "CIN",
    "POS": "QB4",
    "AGE": "28",
    "BEST": 4,
    "WORST": 7,
    "AVG.": 4.8,
    "STD.DEV": 1.1,
    "ECR VS. ADP": "-"
  },
  {
    "RK": 5,
    "TIERS": 1,
    "PLAYER NAME": "Jalen Hurts",
    "TEAM": "PHI",
    "POS": "QB5",
    "AGE": "26",
    "BEST": 3,
    "WORST": 9,
    "AVG.": 5.2,
    "STD.DEV": 1.3,
    "ECR VS. ADP": "-"
  },
  {
    "RK": 6,
    "TIERS": 2,
    "PLAYER NAME": "Ja'Marr Chase",
    "TEAM": "CIN",
    "POS": "WR1",
    "AGE": "25",
    "BEST": 4,
    "WORST": 8,
    "AVG.": 6.6,
    "STD.DEV": 1.4,
    "ECR VS. ADP": "-"
  },
  {
    "RK": 7,
    "TIERS": 2,
    "PLAYER NAME": "Justin Jefferson",
    "TEAM": "MIN",
    "POS": "WR2",
    "AGE": "26",
    "BEST": 5,
    "WORST": 10,
    "AVG.": 7.7,
    "STD.DEV": 1.4,
    "ECR VS. ADP": "-"
  },
  {
    "RK": 8,
    "TIERS": 2,
    "PLAYER NAME": "Patrick Mahomes II",
    "TEAM": "KC",
    "POS": "QB6",
    "AGE": "29",
    "BEST": 5,
    "WORST": 21,
    "AVG.": 9.6,
    "STD.DEV": 4.7,
    "ECR VS. ADP": "-"
  },
  {
    "RK": 9,
    "TIERS": 2,
    "PLAYER NAME": "CeeDee Lamb",
    "TEAM": "DAL",
    "POS": "WR3",
    "AGE": "26",
    "BEST": 8,
    "WORST": 18,
    "AVG.": 11.5,
    "STD.DEV": 3,
    "ECR VS. ADP": "-"
  },
  {
    "RK": 10,
    "TIERS": 2,
    "PLAYER NAME": "Bijan Robinson",
    "TEAM": "ATL",
    "POS": "RB1",
    "AGE": "23",
    "BEST": 7,
    "WORST": 18,
    "AVG.": 12.7,
    "STD.DEV": 3.8,
    "ECR VS. ADP": "-"
  }
]

// Utility function to find player rank by name
export function findPlayerRank(playerName: string): number | null {
  const player = playerRankings.find(p => 
    p["PLAYER NAME"].toLowerCase() === playerName.toLowerCase()
  )
  return player ? player.RK : null
}

// Utility function to get pick value color based on difference
export function getPickValueColor(diff: number): string {
  if (diff >= 30) return "bg-green-600/80"
  if (diff >= 20) return "bg-green-600/70"
  if (diff >= 10) return "bg-green-600/60"
  if (diff >= 5) return "bg-green-600/50"
  if (diff >= -4) return "bg-yellow-600/60"
  if (diff >= -9) return "bg-red-600/50"
  if (diff >= -19) return "bg-red-600/60"
  if (diff >= -29) return "bg-red-600/70"
  return "bg-red-600/80"
}

// Utility function to get pick value label
export function getPickValueLabel(diff: number): string {
  if (diff >= 30) return "Great Steal"
  if (diff >= 20) return "Big Steal"
  if (diff >= 10) return "Steal"
  if (diff >= 5) return "Slight Steal"
  if (diff >= -4) return "Fair"
  if (diff >= -9) return "Slight Reach"
  if (diff >= -19) return "Reach"
  if (diff >= -29) return "Big Reach"
  return "Terrible Reach"
} 