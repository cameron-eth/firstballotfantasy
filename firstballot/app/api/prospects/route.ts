import { NextRequest, NextResponse } from 'next/server'

interface Prospect {
  rank: number
  name: string
  position: string
  school: string
  espn_id: number | null
  projectedRound?: string
}

export async function GET(request: NextRequest) {
  try {
    // Complete prospect data with proper ranking
    const prospects: Prospect[] = [
      { rank: 1, name: "Arch Manning", position: "QB", school: "Texas", espn_id: 4870906, projectedRound: "1st" },
      { rank: 2, name: "Cade Klubnik", position: "QB", school: "Clemson", espn_id: 4685413, projectedRound: "1st" },
      { rank: 3, name: "Jeremiyah Love", position: "RB", school: "Notre Dame", espn_id: 4870808, projectedRound: "1st" },
      { rank: 4, name: "Carnell Tate", position: "WR", school: "Ohio State", espn_id: 4871023, projectedRound: "1st" },
      { rank: 5, name: "Drew Allar", position: "QB", school: "Penn State", espn_id: 4714771, projectedRound: "1st" },
      { rank: 6, name: "Nicholas Singleton", position: "RB", school: "Penn State", espn_id: 4685555, projectedRound: "1st" },
      { rank: 7, name: "Evan Stewart", position: "WR", school: "Oregon", espn_id: 4685565, projectedRound: "1st" },
      { rank: 8, name: "Jordyn Tyson", position: "WR", school: "Arizona State", espn_id: 3133875, projectedRound: "1st" },
      { rank: 9, name: "Eric Singleton Jr.", position: "WR", school: "Auburn", espn_id: 5095360, projectedRound: "1st" },
      { rank: 10, name: "Garrett Nussmeier", position: "QB", school: "LSU", espn_id: null, projectedRound: "1st" },
      { rank: 11, name: "Justice Haynes", position: "RB", school: "Michigan", espn_id: null, projectedRound: "1st" },
      { rank: 12, name: "Antonio Williams", position: "WR", school: "Clemson", espn_id: 5081432, projectedRound: "1st" },
      { rank: 13, name: "LaNorris Sellers", position: "QB", school: "South Carolina", espn_id: null, projectedRound: "2nd" },
      { rank: 14, name: "Darius Taylor", position: "RB", school: "Minnesota", espn_id: null, projectedRound: "2nd" },
      { rank: 15, name: "Eugene Wilson III", position: "WR", school: "Florida", espn_id: null, projectedRound: "2nd" },
      { rank: 16, name: "Makai Lemon", position: "WR", school: "USC", espn_id: null, projectedRound: "2nd" },
      { rank: 17, name: "Jonah Coleman", position: "RB", school: "Washington", espn_id: null, projectedRound: "2nd" },
      { rank: 18, name: "Zachariah Branch", position: "WR", school: "Georgia", espn_id: null, projectedRound: "2nd" },
      { rank: 19, name: "Barion Brown", position: "WR", school: "LSU", espn_id: null, projectedRound: "2nd" },
      { rank: 20, name: "Desmond Reid", position: "RB", school: "Pittsburgh", espn_id: null, projectedRound: "2nd" },
      { rank: 21, name: "Dante Moore", position: "QB", school: "Oregon", espn_id: null, projectedRound: "2nd" },
      { rank: 22, name: "Carson Beck", position: "QB", school: "Miami", espn_id: null, projectedRound: "2nd" },
      { rank: 23, name: "Sam Leavitt", position: "QB", school: "Arizona State", espn_id: null, projectedRound: "3rd" },
      { rank: 24, name: "Nico Iamaleava", position: "QB", school: "UCLA", espn_id: null, projectedRound: "3rd" }
    ]

    // TODO: Replace with actual database query
    // const { data, error } = await supabase
    //   .from('dynasty_sf_2026_rookie_rankings')
    //   .select('*')
    //   .order('rank', { ascending: true })

    return NextResponse.json(prospects)
  } catch (error) {
    console.error('Error fetching prospects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prospects' },
      { status: 500 }
    )
  }
} 