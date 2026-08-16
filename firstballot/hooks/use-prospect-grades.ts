import { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { computeMyGrade } from '@/lib/user-grade'
import type { UserProspectGrade } from '@/types/prospect-grades'

const GRADES_KEY = '/api/scouting-grades'

/** A change to one prospect's grades. Omit a field to leave it as it was. */
export interface ProspectGradePatch {
  film_grade?: number | null
  talent_grade?: number | null
}

interface UseProspectGradesReturn {
  gradesByProspectId: Map<number, UserProspectGrade>
  loading: boolean
  /** Last save failure, already rolled back on screen. Null once dismissed. */
  saveError: string | null
  dismissSaveError: () => void
  setGrade: (prospectId: number, patch: ProspectGradePatch) => Promise<void>
}

async function fetchGrades(url: string): Promise<UserProspectGrade[]> {
  const response = await fetch(url)

  // Straight after login the session has not always reached the API yet.
  // use-draftboard.ts treats 401 the same way — "nothing saved" is the honest
  // answer here, and a thrown error would surface as a spurious failure.
  if (response.status === 401) return []

  if (!response.ok) {
    throw new Error(`Failed to fetch grades (${response.status})`)
  }

  const data = await response.json()
  return (data.grades || []) as UserProspectGrade[]
}

/** Replaces one prospect's row in the list, or appends it if it is new. */
function withGrade(
  list: UserProspectGrade[],
  grade: UserProspectGrade
): UserProspectGrade[] {
  const index = list.findIndex((g) => g.prospect_id === grade.prospect_id)
  if (index === -1) return [...list, grade]
  const next = [...list]
  next[index] = grade
  return next
}

export function useProspectGrades(): UseProspectGradesReturn {
  const { user } = useAuth()
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR<UserProspectGrade[]>(
    user ? GRADES_KEY : null,
    fetchGrades,
    { revalidateOnFocus: false }
  )

  const gradesByProspectId = useMemo(() => {
    const map = new Map<number, UserProspectGrade>()
    for (const grade of data ?? []) {
      map.set(Number(grade.prospect_id), grade)
    }
    return map
  }, [data])

  const setGrade = useCallback(
    async (prospectId: number, patch: ProspectGradePatch) => {
      if (!user) return

      const current = data ?? []
      const existing = current.find((g) => g.prospect_id === prospectId)

      const nextFilm =
        patch.film_grade === undefined ? (existing?.film_grade ?? null) : patch.film_grade
      const nextTalent =
        patch.talent_grade === undefined
          ? (existing?.talent_grade ?? null)
          : patch.talent_grade

      if (nextFilm === existing?.film_grade && nextTalent === existing?.talent_grade) {
        return
      }

      // A row with neither grade is not a row — the table rejects it, so an
      // emptied pair means delete.
      const clearing = nextFilm === null && nextTalent === null
      if (clearing && !existing) return

      const now = new Date().toISOString()
      const optimistic: UserProspectGrade[] = clearing
        ? current.filter((g) => g.prospect_id !== prospectId)
        : withGrade(current, {
            user_id: user.id,
            prospect_id: prospectId,
            film_grade: nextFilm,
            talent_grade: nextTalent,
            my_grade: computeMyGrade(nextFilm, nextTalent),
            created_at: existing?.created_at ?? now,
            updated_at: now,
          })

      setSaveError(null)

      try {
        await mutate(
          async () => {
            const response = clearing
              ? await fetch(`${GRADES_KEY}?prospect_id=${prospectId}`, { method: 'DELETE' })
              : await fetch(GRADES_KEY, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    prospect_id: prospectId,
                    film_grade: nextFilm,
                    talent_grade: nextTalent,
                  }),
                })

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.error || 'Failed to save grade')
            }

            if (clearing) return optimistic

            const { grade } = await response.json()
            return withGrade(current, grade as UserProspectGrade)
          },
          {
            optimisticData: optimistic,
            rollbackOnError: true,
            revalidate: false,
            populateCache: true,
          }
        )
      } catch (err) {
        // SWR has already restored the previous value on screen; say why.
        console.error('Error saving prospect grade:', err)
        setSaveError(err instanceof Error ? err.message : 'Failed to save grade')
      }
    },
    [user, data, mutate]
  )

  const dismissSaveError = useCallback(() => setSaveError(null), [])

  return {
    gradesByProspectId,
    loading: isLoading,
    saveError,
    dismissSaveError,
    setGrade,
  }
}
