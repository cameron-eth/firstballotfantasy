import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { DraftPositionDataPoint } from '@/types/charts'

export function useCharts() {
  const [draftPositionData, setDraftPositionData] = useState<DraftPositionDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDraftPositionData() {
      try {
        setLoading(true)
        const { data } = await supabase
          .from('master_player_dataset')
          .select('draft_pick, fantasy_ppg')
          .not('draft_pick', 'is', null)
          .not('fantasy_ppg', 'is', null)
          .gte('fantasy_ppg', 0)
          .lte('draft_pick', 300)
          .order('draft_pick')
          .limit(500)

        if (data) {
          setDraftPositionData(
            data.map((row) => ({
              draftPick: row.draft_pick,
              fantasyPPG: row.fantasy_ppg,
            }))
          )
        }
      } catch (error) {
        console.error('Error fetching draft position data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDraftPositionData()
  }, [])

  return {
    draftPositionData,
    loading,
  }
}
