-- Snapshot: completed games through 2026-10-17, researched 2026-10-24.
-- Rankings are a preliminary editorial watchlist using observed college production
-- and published recruiting pedigree. They are not model grades or NFL projections.
-- NULL college stats mean no verified college production, not zero ability.
-- See docs/prospect-research-2028-2029.md for each source and rationale.
UPDATE public.dynasty_prospects AS player
SET rank = evidence.rank,
    college_stats = evidence.college_stats,
    college_games = evidence.college_games,
    hs_stars = evidence.hs_stars,
    hs_rank = evidence.hs_rank,
    updated_at = now()
FROM (VALUES
  (-2029001, 1, '{"receiving_yards":1040,"receiving_tds":14}'::jsonb, 7, NULL::integer, NULL::integer),
  (-2029002, 2, '{"receptions":6,"receiving_yards":202,"receiving_tds":2}'::jsonb, 7, 5, 10),
  (-2029005, 3, '{"rushing_attempts":57,"rushing_yards":223,"rushing_tds":2,"receptions":7,"receiving_yards":61}'::jsonb, 6, 5, 8),
  (-2029006, 4, NULL::jsonb, NULL::integer, 5, 27),
  (-2029007, 5, '{"rushing_attempts":28,"rushing_yards":98,"rushing_tds":1,"receptions":1,"receiving_yards":6}'::jsonb, 4, 4, 74),
  (-2029003, 6, '{"rushing_attempts":14,"rushing_yards":56,"receptions":2,"receiving_yards":37,"receiving_tds":1}'::jsonb, 5, 4, NULL::integer),
  (-2029004, 7, '{"receptions":6,"receiving_yards":110}'::jsonb, 6, 3, NULL::integer),
  (-2029008, 8, NULL::jsonb, NULL::integer, NULL::integer, NULL::integer),
  (-2029009, 9, NULL::jsonb, NULL::integer, NULL::integer, NULL::integer)
) AS evidence(id, rank, college_stats, college_games, hs_stars, hs_rank)
WHERE player.id = evidence.id AND player.draft_year = 2029;

-- The remaining five roster portraits were cut out and stored in the app.
UPDATE public.dynasty_prospects AS player
SET headshot_url = portraits.headshot_url, updated_at = now()
FROM (VALUES
  (-2029005, '/prospects/2029/savion-hiter.png'),
  (-2029006, '/prospects/2029/dia-bell.png'),
  (-2029007, '/prospects/2029/derrek-cooper.png'),
  (-2029008, '/prospects/2029/brady-smigiel.png'),
  (-2029009, '/prospects/2029/jaeden-ricketts.png')
) AS portraits(id, headshot_url)
WHERE player.id = portraits.id AND player.draft_year = 2029;
