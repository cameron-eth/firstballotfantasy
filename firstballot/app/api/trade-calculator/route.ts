import { NextRequest, NextResponse } from 'next/server'
import { evaluateTrade } from '@/lib/trade-calculator'

export const dynamic = 'force-dynamic'

interface TradeCalculatorRequest {
  side1: string[]
  side2: string[]
  season?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: TradeCalculatorRequest = await request.json()
    const { side1, side2, season = 2025 } = body

    if (!side1 || !side2 || !Array.isArray(side1) || !Array.isArray(side2)) {
      return NextResponse.json(
        { error: 'Invalid request: side1 and side2 must be arrays' },
        { status: 400 }
      )
    }

    if (side1.length === 0 && side2.length === 0) {
      return NextResponse.json({ error: 'At least one side must have items' }, { status: 400 })
    }

    // Fetch rankings to get player values
    const rankingsResponse = await fetch(`${request.nextUrl.origin}/api/rankings`, {
      cache: 'no-store',
    })
    const rankingsData = await rankingsResponse.json()

    if (!rankingsData.rankingsMap) {
      return NextResponse.json({ error: 'Failed to fetch player rankings' }, { status: 500 })
    }

    // Use local trade calculator with existing database values
    const tradeResult = await evaluateTrade(side1, side2, rankingsData.rankingsMap, season)

    // Add rank information to each player in the trade result
    if (tradeResult.side1) {
      tradeResult.side1 = tradeResult.side1.map((item: any) => {
        if (item.type === 'player' && item.name) {
          const playerRank = rankingsData.rankingsMap?.[item.name]
          return {
            ...item,
            rank: playerRank?.rank || null,
          }
        }
        return item
      })
    }

    if (tradeResult.side2) {
      tradeResult.side2 = tradeResult.side2.map((item: any) => {
        if (item.type === 'player' && item.name) {
          const playerRank = rankingsData.rankingsMap?.[item.name]
          return {
            ...item,
            rank: playerRank?.rank || null,
          }
        }
        return item
      })
    }

    // Calculate where the total scores would rank
    try {
      if (tradeResult.side1_total) {
        const side1RankResponse = await fetch(
          `${request.nextUrl.origin}/api/rankings?score=${tradeResult.side1_total}`,
          { cache: 'no-store' }
        )
        const side1RankData = await side1RankResponse.json()
        tradeResult.side1_rank = side1RankData.rank
      }

      if (tradeResult.side2_total) {
        const side2RankResponse = await fetch(
          `${request.nextUrl.origin}/api/rankings?score=${tradeResult.side2_total}`,
          { cache: 'no-store' }
        )
        const side2RankData = await side2RankResponse.json()
        tradeResult.side2_rank = side2RankData.rank
      }
    } catch (rankingsError) {
      console.warn('Failed to calculate rank positions:', rankingsError)
      // Continue without rank positions
    }

    return NextResponse.json(tradeResult)
  } catch (error: any) {
    console.error('Error in trade calculator API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate trade' },
      { status: 500 }
    )
  }
}
