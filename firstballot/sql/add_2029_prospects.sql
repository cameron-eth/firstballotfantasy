-- Apply in the Supabase SQL editor after reviewing the four 2026 roster sources
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
   'https://images.sidearmdev.com/resize?url=https%3A%2F%2Fdxbhsrqyrr690.cloudfront.net%2Fsidearm.nextgen.sites%2Foregonstate.sidearmsports.com%2Fimages%2F2026%2F3%2F9%2F02112026_FB_Headshot_LegreeJesse_0691.jpg&width=480&type=webp'),
  (-2029002, 2, 'Chris Henry Jr.', 'Chris', 'Henry Jr.', 'WR', 'Ohio State', 77, 211, 'Charlotte, North Carolina', 15,
   'https://images.sidearmdev.com/resize?url=https%3A%2F%2Fdxbhsrqyrr690.cloudfront.net%2Fsidearm.nextgen.sites%2Fohiostatebuckeyes.com%2Fimages%2F2026%2F8%2F3%2F15_Henry_Jr__Chris.jpg&width=480&type=webp'),
  (-2029003, 3, 'Legend Bey', 'Legend', 'Bey', 'RB', 'Ohio State', 70, 195, 'Forney, Texas', 2,
   'https://images.sidearmdev.com/resize?url=https%3A%2F%2Fdxbhsrqyrr690.cloudfront.net%2Fsidearm.nextgen.sites%2Fohiostatebuckeyes.com%2Fimages%2F2026%2F8%2F3%2F02_Bey__Legend.jpg&width=480&type=webp'),
  (-2029004, 4, 'Brock Boyd', 'Brock', 'Boyd', 'WR', 'Ohio State', 73, 196, 'Southlake, Texas', 11,
   'https://images.sidearmdev.com/resize?url=https%3A%2F%2Fdxbhsrqyrr690.cloudfront.net%2Fsidearm.nextgen.sites%2Fohiostatebuckeyes.com%2Fimages%2F2026%2F8%2F3%2F11_Boyd__Brock.jpg&width=480&type=webp')
) AS seed(id, rank, name, first_name, last_name, position, school, height, weight, hometown, jersey, headshot_url)
WHERE NOT EXISTS (
  SELECT 1 FROM public.dynasty_prospects existing
  WHERE existing.draft_year = 2029 AND lower(existing.name) = lower(seed.name)
)
ON CONFLICT (id) DO NOTHING;
