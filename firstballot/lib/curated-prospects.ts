/**
 * A small, source-checked 2029 watchlist. These records live on the server so
 * the class remains visible until the database import in sql/add_2029_prospects.sql
 * is applied. Keep the negative IDs in that import: saved board references then
 * survive the move from this fallback to database rows.
 *
 * Draft year is an early projection for the 2026 freshman class, not a claim
 * that a player has declared. No scouting scores are invented for this class.
 */
export const curated2029Prospects = [
  {
    id: -2029001, rank: 1, position_rank: 1, name: 'Jesse Legree', first_name: 'Jesse', last_name: 'Legree',
    position: 'WR', school: 'Oregon State', draft_year: 2029, class: 'Freshman',
    height: 70, weight: 172, hometown: 'Baltimore, Maryland', jersey: 12,
    headshot_url: '/prospects/2029/jesse-legree.png',
    source_url: 'https://osubeavers.com/sports/football/roster/jesse-legree/12214',
  },
  {
    id: -2029002, rank: 2, position_rank: 2, name: 'Chris Henry Jr.', first_name: 'Chris', last_name: 'Henry Jr.',
    position: 'WR', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 77, weight: 211, hometown: 'Charlotte, North Carolina', jersey: 15,
    headshot_url: '/prospects/2029/chris-henry-jr.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/chris-henry%20jr./13356',
  },
  {
    id: -2029003, rank: 3, position_rank: 1, name: 'Legend Bey', first_name: 'Legend', last_name: 'Bey',
    position: 'RB', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 70, weight: 195, hometown: 'Forney, Texas', jersey: 2,
    headshot_url: '/prospects/2029/legend-bey.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/legend-bey/13346',
  },
  {
    id: -2029004, rank: 4, position_rank: 3, name: 'Brock Boyd', first_name: 'Brock', last_name: 'Boyd',
    position: 'WR', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 73, weight: 196, hometown: 'Southlake, Texas', jersey: 11,
    headshot_url: '/prospects/2029/brock-boyd.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/brock-boyd/13353',
  },
] as const

export function missingCurated2029(records: { name: string; draft_year: number | null }[]) {
  const known = new Set(records.map((record) => `${record.draft_year}:${record.name.toLowerCase()}`))
  return curated2029Prospects.filter((record) => !known.has(`${record.draft_year}:${record.name.toLowerCase()}`))
}
