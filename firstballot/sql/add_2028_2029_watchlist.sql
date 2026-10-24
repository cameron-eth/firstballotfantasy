-- Source-checked roster additions as of 2026-10-24. Draft years are eligibility projections.
-- Keep these IDs in sync with lib/curated-prospects.ts for stable saved-board references.
INSERT INTO public.dynasty_prospects
 (id, rank, name, first_name, last_name, position, school, draft_year, class,
  height, weight, hometown, jersey, headshot_url, college_stats, created_at, updated_at)
OVERRIDING SYSTEM VALUE
SELECT seed.id, seed.rank, seed.name, seed.first_name, seed.last_name, seed.position,
 seed.school, seed.draft_year, seed.class, seed.height, seed.weight, seed.hometown,
 seed.jersey, seed.headshot_url, seed.college_stats::jsonb, now(), now()
FROM (VALUES
 (-2029011, 11, 'Faizon Brandon', 'Faizon', 'Brandon', 'QB', 'Tennessee', 2029, 'Freshman', 76, 225, 'Greensboro, North Carolina', 11, '/prospects/2029/faizon-brandon.png', '{"passing_yards":697,"passing_tds":7,"interceptions":1,"rushing_attempts":53,"rushing_yards":130,"rushing_tds":3}'),
 (-2029012, 12, 'Jared Curtis', 'Jared', 'Curtis', 'QB', 'Vanderbilt', 2029, 'Freshman', 75, 230, 'Dickson, Tennessee', 2, '/prospects/2029/jared-curtis.png', NULL),
 (-2029013, 13, 'Trent Mosley', 'Trent', 'Mosley', 'WR', 'USC', 2029, 'Freshman', 70, 180, 'Chicago, Illinois', 4, '/prospects/2029/trent-mosley.png', '{"receptions":22,"receiving_yards":366,"receiving_tds":5}'),
 (-2029014, 14, 'Mark Bowman', 'Mark', 'Bowman', 'TE', 'USC', 2029, 'Freshman', 77, 245, 'Castle Rock, Colorado', 19, '/prospects/2029/mark-bowman.png', '{"receptions":21,"receiving_yards":204,"receiving_tds":2}'),
 (-2029015, 15, 'Kayden Dixon-Wyatt', 'Kayden', 'Dixon-Wyatt', 'WR', 'USC', 2029, 'Freshman', 74, 200, 'Hayward, California', 17, '/prospects/2029/kayden-dixon-wyatt.png', '{"receptions":27,"receiving_yards":400,"receiving_tds":4}'),
 (-2029016, 16, 'Jamal Rule', 'Jamal', 'Rule', 'RB', 'Nebraska', 2029, 'Freshman', 72, 215, 'Salisbury, North Carolina', 25, '/prospects/2029/jamal-rule.png', '{"rushing_yards":386,"rushing_tds":5,"receptions":4,"receiving_yards":82,"receiving_tds":1}'),
 (-2028001, 31, 'Ousmane Kromah', 'Ousmane', 'Kromah', 'RB', 'Florida State', 2028, 'Sophomore', 73, 216, 'Leesburg, Georgia', 32, '/prospects/2028/ousmane-kromah.png', '{"rushing_attempts":100,"rushing_yards":565,"rushing_tds":5,"receptions":11,"receiving_yards":97}'),
 (-2028002, 32, 'Malik Washington', 'Malik', 'Washington', 'QB', 'Maryland', 2028, 'Sophomore', 77, 227, 'Glen Burnie, Maryland', 7, '/prospects/2028/malik-washington.png', NULL)
) AS seed(id, rank, name, first_name, last_name, position, school, draft_year, class, height, weight, hometown, jersey, headshot_url, college_stats)
WHERE NOT EXISTS (
 SELECT 1 FROM public.dynasty_prospects existing WHERE existing.draft_year = seed.draft_year AND lower(existing.name) = lower(seed.name)
)
ON CONFLICT (id) DO NOTHING;
