/** Grades a user assigns by hand. Same 0–100 scale as the model's overall_grade. */
export const USER_GRADE_MIN = 0
export const USER_GRADE_MAX = 100

/**
 * MY GRADE — a 50/50 blend of the user's film and talent grades, or whichever
 * single grade they have entered so far.
 *
 * Mirrors the `my_grade` generated column in
 * firstballotetl/sql/add_user_prospect_grades.sql. The database owns the stored
 * value; this exists so the board can render the new number immediately instead
 * of waiting for the round trip. Change both together.
 */
export function computeMyGrade(
  film: number | null | undefined,
  talent: number | null | undefined
): number | null {
  const f = film ?? null
  const t = talent ?? null
  if (f !== null && t !== null) return (f + t) / 2
  return f ?? t
}

/**
 * Parses a grade typed into a board cell. Returns `null` for an empty field
 * (meaning "clear this grade") and `undefined` when the text is not a usable
 * number, so callers can tell the two apart. Valid numbers are clamped to 0–100.
 */
export function parseUserGrade(raw: string): number | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const value = Number(trimmed)
  if (!Number.isFinite(value)) return undefined

  const clamped = Math.min(USER_GRADE_MAX, Math.max(USER_GRADE_MIN, value))
  // One decimal place, matching how the model grade renders on the board.
  return Math.round(clamped * 10) / 10
}

/** True when a value is a number the API will accept as a grade. */
export function isValidUserGrade(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= USER_GRADE_MIN &&
    value <= USER_GRADE_MAX
  )
}
