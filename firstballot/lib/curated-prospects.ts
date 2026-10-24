/**
 * A source-checked 2029 watchlist. These records live on the server so
 * the class remains visible until the database import in sql/add_2029_prospects.sql
 * is applied. Keep the negative IDs in that import: saved board references then
 * survive the move from this fallback to database rows.
 *
 * Draft year is an early projection for the 2026 freshman class, not a claim
 * that a player has declared. No scouting scores are invented for this class.
 */
export const curated2029Prospects = [
  {
    id: -2029001, rank: 1, position_rank: 1, name: 'Jesse Legree',
    college_stats: { receiving_yards: 1040, receiving_tds: 14 }, first_name: 'Jesse', last_name: 'Legree',
    position: 'WR', school: 'Oregon State', draft_year: 2029, class: 'Freshman',
    height: 70, weight: 172, hometown: 'Baltimore, Maryland', jersey: 12,
    headshot_url: '/prospects/2029/jesse-legree.png',
    source_url: 'https://osubeavers.com/sports/football/roster/jesse-legree/12214',
  },
  {
    id: -2029002, rank: 2, position_rank: 2, name: 'Chris Henry Jr.',
    college_stats: { receptions: 6, receiving_yards: 202, receiving_tds: 2 }, first_name: 'Chris', last_name: 'Henry Jr.',
    position: 'WR', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 77, weight: 211, hometown: 'Charlotte, North Carolina', jersey: 15,
    headshot_url: '/prospects/2029/chris-henry-jr.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/chris-henry%20jr./13356',
  },
  {
    id: -2029003, rank: 6, position_rank: 3, name: 'Legend Bey',
    college_stats: { rushing_attempts: 14, rushing_yards: 56, receptions: 2, receiving_yards: 37, receiving_tds: 1 }, first_name: 'Legend', last_name: 'Bey',
    position: 'RB', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 70, weight: 195, hometown: 'Forney, Texas', jersey: 2,
    headshot_url: '/prospects/2029/legend-bey.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/legend-bey/13346',
  },
  {
    id: -2029004, rank: 7, position_rank: 3, name: 'Brock Boyd',
    college_stats: { receptions: 6, receiving_yards: 110 }, first_name: 'Brock', last_name: 'Boyd',
    position: 'WR', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 73, weight: 196, hometown: 'Southlake, Texas', jersey: 11,
    headshot_url: '/prospects/2029/brock-boyd.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/brock-boyd/13353',
  },
  {
    id: -2029005, rank: 3, position_rank: 1, name: 'Savion Hiter',
    college_stats: { rushing_attempts: 57, rushing_yards: 223, rushing_tds: 2, receptions: 7, receiving_yards: 61 }, first_name: 'Savion', last_name: 'Hiter',
    position: 'RB', school: 'Michigan', draft_year: 2029, class: 'Freshman',
    height: 71, weight: 212, hometown: 'Louisa, Virginia', jersey: 5,
    headshot_url: '/prospects/2029/savion-hiter.png',
    source_url: 'https://mgoblue.com/sports/football/roster/savion-hiter/28100',
  },
  {
    id: -2029006, rank: 4, position_rank: 1, name: 'Dia Bell', first_name: 'Dia', last_name: 'Bell',
    position: 'QB', school: 'Texas', draft_year: 2029, class: 'Freshman',
    height: 75, weight: 206, hometown: 'Fort Lauderdale, Florida', jersey: 6,
    headshot_url: '/prospects/2029/dia-bell.png',
    source_url: 'https://texaslonghorns.com/sports/football/roster/dia-bell/16947',
  },
  {
    id: -2029007, rank: 5, position_rank: 2, name: 'Derrek Cooper',
    college_stats: { rushing_attempts: 28, rushing_yards: 98, rushing_tds: 1, receptions: 1, receiving_yards: 6 }, first_name: 'Derrek', last_name: 'Cooper',
    position: 'RB', school: 'Texas', draft_year: 2029, class: 'Freshman',
    height: 73, weight: 212, hometown: 'Lauderhill, Florida', jersey: 5,
    headshot_url: '/prospects/2029/derrek-cooper.png',
    source_url: 'https://texaslonghorns.com/sports/football/roster/derrek-cooper/16945',
  },
  {
    id: -2029008, rank: 8, position_rank: 2, name: 'Brady Smigiel', first_name: 'Brady', last_name: 'Smigiel',
    position: 'QB', school: 'Michigan', draft_year: 2029, class: 'Freshman',
    height: 76, weight: 217, hometown: 'Thousand Oaks, California', jersey: 17,
    headshot_url: '/prospects/2029/brady-smigiel.png',
    source_url: 'https://mgoblue.com/sports/football/roster/brady-smigiel/28104',
  },
  {
    id: -2029009, rank: 9, position_rank: 4, name: 'Jaeden Ricketts', first_name: 'Jaeden', last_name: 'Ricketts',
    position: 'WR', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 71, weight: 202, hometown: 'Pataskala, Ohio', jersey: 80,
    headshot_url: '/prospects/2029/jaeden-ricketts.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/jaeden-ricketts/13384',
  },
] as const

export function missingCurated2029(records: { name: string; draft_year: number | null }[]) {
  const known = new Set(records.map((record) => `${record.draft_year}:${record.name.toLowerCase()}`))
  return curated2029Prospects.filter((record) => !known.has(`${record.draft_year}:${record.name.toLowerCase()}`))
}
