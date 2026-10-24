-- Apply in the Supabase SQL editor after reviewing the 2026 roster sources
-- in lib/curated-prospects.ts. 2029 is an early draft-year projection.
-- Stable negative IDs match the server fallback, preserving saved board IDs.
-- Grades, college production, and draft projection remain NULL until evaluated.

INSERT INTO public.dynasty_prospects
  (id, rank, name, first_name, last_name, position, school, draft_year,
   class, height, weight, hometown, jersey, headshot_url, created_at, updated_at)
OVERRIDING SYSTEM VALUE
SELECT seed.id, seed.rank, seed.name, seed.first_name, seed.last_name,
       seed.position, seed.school, 2029, 'Freshman', seed.height,
       seed.weight, seed.hometown, seed.jersey, seed.headshot_url, now(), now()
FROM (VALUES
  (-2029001, 1, 'Jesse Legree', 'Jesse', 'Legree', 'WR', 'Oregon State', 70, 172, 'Baltimore, Maryland', 12,
   '/prospects/2029/jesse-legree.png'),
  (-2029002, 2, 'Chris Henry Jr.', 'Chris', 'Henry Jr.', 'WR', 'Ohio State', 77, 211, 'Charlotte, North Carolina', 15,
   '/prospects/2029/chris-henry-jr.png'),
  (-2029003, 6, 'Legend Bey', 'Legend', 'Bey', 'RB', 'Ohio State', 70, 195, 'Forney, Texas', 2,
   '/prospects/2029/legend-bey.png'),
  (-2029004, 7, 'Brock Boyd', 'Brock', 'Boyd', 'WR', 'Ohio State', 73, 196, 'Southlake, Texas', 11,
   '/prospects/2029/brock-boyd.png'),
  (-2029005, 3, 'Savion Hiter', 'Savion', 'Hiter', 'RB', 'Michigan', 71, 212, 'Louisa, Virginia', 5, NULL),
  (-2029006, 4, 'Dia Bell', 'Dia', 'Bell', 'QB', 'Texas', 75, 206, 'Fort Lauderdale, Florida', 6, NULL),
  (-2029007, 5, 'Derrek Cooper', 'Derrek', 'Cooper', 'RB', 'Texas', 73, 212, 'Lauderhill, Florida', 5, NULL),
  (-2029008, 8, 'Brady Smigiel', 'Brady', 'Smigiel', 'QB', 'Michigan', 76, 217, 'Thousand Oaks, California', 17, NULL),
  (-2029009, 9, 'Jaeden Ricketts', 'Jaeden', 'Ricketts', 'WR', 'Ohio State', 71, 202, 'Pataskala, Ohio', 80, NULL)
) AS seed(id, rank, name, first_name, last_name, position, school, height, weight, hometown, jersey, headshot_url)
WHERE NOT EXISTS (
  SELECT 1 FROM public.dynasty_prospects existing
  WHERE existing.draft_year = 2029 AND lower(existing.name) = lower(seed.name)
)
ON CONFLICT (id) DO NOTHING;

-- Apply sql/update_2029_preliminary_data.sql after this import.
