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
    id: -2029010, rank: 3, position_rank: 3, name: 'Legend Glasker', first_name: 'Legend', last_name: 'Glasker',
    college_stats: { receptions: 24, receiving_yards: 444, receiving_tds: 3, rushing_attempts: 13, rushing_yards: 92, rushing_tds: 2 },
    position: 'WR', school: 'BYU', draft_year: 2029, class: 'Freshman',
    height: 73, weight: 175, hometown: 'Lehi, Utah', jersey: 1,
    headshot_url: '/prospects/2029/legend-glasker.png',
    source_url: 'https://byucougars.com/sports/football/roster/player/legend-glasker',
  },
  {
    id: -2029003, rank: 7, position_rank: 3, name: 'Legend Bey',
    college_stats: { rushing_attempts: 14, rushing_yards: 56, receptions: 2, receiving_yards: 37, receiving_tds: 1 }, first_name: 'Legend', last_name: 'Bey',
    position: 'RB', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 70, weight: 195, hometown: 'Forney, Texas', jersey: 2,
    headshot_url: '/prospects/2029/legend-bey.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/legend-bey/13346',
  },
  {
    id: -2029004, rank: 8, position_rank: 4, name: 'Brock Boyd',
    college_stats: { receptions: 6, receiving_yards: 110 }, first_name: 'Brock', last_name: 'Boyd',
    position: 'WR', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 73, weight: 196, hometown: 'Southlake, Texas', jersey: 11,
    headshot_url: '/prospects/2029/brock-boyd.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/brock-boyd/13353',
  },
  {
    id: -2029005, rank: 4, position_rank: 1, name: 'Savion Hiter',
    college_stats: { rushing_attempts: 57, rushing_yards: 223, rushing_tds: 2, receptions: 7, receiving_yards: 61 }, first_name: 'Savion', last_name: 'Hiter',
    position: 'RB', school: 'Michigan', draft_year: 2029, class: 'Freshman',
    height: 71, weight: 212, hometown: 'Louisa, Virginia', jersey: 5,
    headshot_url: '/prospects/2029/savion-hiter.png',
    source_url: 'https://mgoblue.com/sports/football/roster/savion-hiter/28100',
  },
  {
    id: -2029006, rank: 5, position_rank: 1, name: 'Dia Bell', first_name: 'Dia', last_name: 'Bell',
    position: 'QB', school: 'Texas', draft_year: 2029, class: 'Freshman',
    height: 75, weight: 206, hometown: 'Fort Lauderdale, Florida', jersey: 6,
    headshot_url: '/prospects/2029/dia-bell.png',
    source_url: 'https://texaslonghorns.com/sports/football/roster/dia-bell/16947',
  },
  {
    id: -2029007, rank: 6, position_rank: 2, name: 'Derrek Cooper',
    college_stats: { rushing_attempts: 28, rushing_yards: 98, rushing_tds: 1, receptions: 1, receiving_yards: 6 }, first_name: 'Derrek', last_name: 'Cooper',
    position: 'RB', school: 'Texas', draft_year: 2029, class: 'Freshman',
    height: 73, weight: 212, hometown: 'Lauderhill, Florida', jersey: 5,
    headshot_url: '/prospects/2029/derrek-cooper.png',
    source_url: 'https://texaslonghorns.com/sports/football/roster/derrek-cooper/16945',
  },
  {
    id: -2029008, rank: 9, position_rank: 2, name: 'Brady Smigiel', first_name: 'Brady', last_name: 'Smigiel',
    position: 'QB', school: 'Michigan', draft_year: 2029, class: 'Freshman',
    height: 76, weight: 217, hometown: 'Thousand Oaks, California', jersey: 17,
    headshot_url: '/prospects/2029/brady-smigiel.png',
    source_url: 'https://mgoblue.com/sports/football/roster/brady-smigiel/28104',
  },
  {
    id: -2029009, rank: 10, position_rank: 5, name: 'Jaeden Ricketts', first_name: 'Jaeden', last_name: 'Ricketts',
    position: 'WR', school: 'Ohio State', draft_year: 2029, class: 'Freshman',
    height: 71, weight: 202, hometown: 'Pataskala, Ohio', jersey: 80,
    headshot_url: '/prospects/2029/jaeden-ricketts.png',
    source_url: 'https://ohiostatebuckeyes.com/sports/football/roster/jaeden-ricketts/13384',
  },
  { id: -2029011, rank: 11, position_rank: 3, name: 'Faizon Brandon', first_name: 'Faizon', last_name: 'Brandon',
    position: 'QB', school: 'Tennessee', draft_year: 2029, class: 'Freshman', height: 76, weight: 225, hometown: 'Greensboro, North Carolina', jersey: 11,
    college_stats: { passing_yards: 697, passing_tds: 7, interceptions: 1, rushing_attempts: 53, rushing_yards: 130, rushing_tds: 3 },
    headshot_url: '/prospects/2029/faizon-brandon.png', source_url: 'https://utsports.com/sports/football/roster/faizon-brandon/23058' },
  { id: -2029012, rank: 12, position_rank: 4, name: 'Jared Curtis', first_name: 'Jared', last_name: 'Curtis',
    position: 'QB', school: 'Vanderbilt', draft_year: 2029, class: 'Freshman', height: 75, weight: 230, hometown: 'Dickson, Tennessee', jersey: 2,
    headshot_url: '/prospects/2029/jared-curtis.png', source_url: 'https://vucommodores.com/sports/football/roster/player/jared-curtis-2/' },
  { id: -2029013, rank: 13, position_rank: 6, name: 'Trent Mosley', first_name: 'Trent', last_name: 'Mosley',
    position: 'WR', school: 'USC', draft_year: 2029, class: 'Freshman', height: 70, weight: 180, hometown: 'Chicago, Illinois', jersey: 4,
    college_stats: { receptions: 22, receiving_yards: 366, receiving_tds: 5 },
    headshot_url: '/prospects/2029/trent-mosley.png', source_url: 'https://usctrojans.com/sports/football/roster/trent-mosley/18843' },
  { id: -2029014, rank: 14, position_rank: 1, name: 'Mark Bowman', first_name: 'Mark', last_name: 'Bowman',
    position: 'TE', school: 'USC', draft_year: 2029, class: 'Freshman', height: 77, weight: 245, hometown: 'Castle Rock, Colorado', jersey: 19,
    college_stats: { receptions: 21, receiving_yards: 204, receiving_tds: 2 },
    headshot_url: '/prospects/2029/mark-bowman.png', source_url: 'https://usctrojans.com/sports/football/roster/mark-bowman/18796' },
  { id: -2029015, rank: 15, position_rank: 7, name: 'Kayden Dixon-Wyatt', first_name: 'Kayden', last_name: 'Dixon-Wyatt',
    position: 'WR', school: 'USC', draft_year: 2029, class: 'Freshman', height: 74, weight: 200, hometown: 'Hayward, California', jersey: 17,
    college_stats: { receptions: 27, receiving_yards: 400, receiving_tds: 4 },
    headshot_url: '/prospects/2029/kayden-dixon-wyatt.png', source_url: 'https://usctrojans.com/sports/football/roster/kayden-dixonwyatt/18706' },
  { id: -2029016, rank: 16, position_rank: 5, name: 'Jamal Rule', first_name: 'Jamal', last_name: 'Rule',
    position: 'RB', school: 'Nebraska', draft_year: 2029, class: 'Freshman', height: 72, weight: 215, hometown: 'Salisbury, North Carolina', jersey: 25,
    college_stats: { rushing_yards: 386, rushing_tds: 5, receptions: 4, receiving_yards: 82, receiving_tds: 1 },
    headshot_url: '/prospects/2029/jamal-rule.png', source_url: 'https://huskers.com/sports/football/roster/player/jamal-rule' },
] as const

export const curated2028Prospects = [
  { id: -2028001, rank: 31, position_rank: 1, name: 'Ousmane Kromah', first_name: 'Ousmane', last_name: 'Kromah',
    position: 'RB', school: 'Florida State', draft_year: 2028, class: 'Sophomore', height: 73, weight: 216, hometown: 'Leesburg, Georgia', jersey: 32,
    college_stats: { rushing_attempts: 100, rushing_yards: 565, rushing_tds: 5, receptions: 11, receiving_yards: 97 },
    headshot_url: '/prospects/2028/ousmane-kromah.png', source_url: 'https://seminoles.com/sports/football/roster/ousmane-kromah/8356' },
  { id: -2028002, rank: 32, position_rank: 1, name: 'Malik Washington', first_name: 'Malik', last_name: 'Washington',
    position: 'QB', school: 'Maryland', draft_year: 2028, class: 'Sophomore', height: 77, weight: 227, hometown: 'Glen Burnie, Maryland', jersey: 7,
    headshot_url: '/prospects/2028/malik-washington.png', source_url: 'https://umterps.com/sports/football/roster/washington-malik/15660' },
] as const

export function missingCurated2029(records: { name: string; draft_year: number | null }[]) {
  const known = new Set(records.map((record) => `${record.draft_year}:${record.name.toLowerCase()}`))
  return curated2029Prospects.filter((record) => !known.has(`${record.draft_year}:${record.name.toLowerCase()}`))
}

export function missingCurated2028(records: { name: string; draft_year: number | null }[]) {
  const known = new Set(records.map((record) => `${record.draft_year}:${record.name.toLowerCase()}`))
  return curated2028Prospects.filter((record) => !known.has(`${record.draft_year}:${record.name.toLowerCase()}`))
}
