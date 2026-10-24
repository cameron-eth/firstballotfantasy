-- Source-checked additions to the 2028 watchlist. The 2025 college entrants
-- are earliest-eligible in 2028; no declaration or scouting grade is implied.
-- Sources and review date: docs/prospect-research-2028-2029.md.
-- Ranks append to the existing class as display order, not talent grades.

INSERT INTO public.dynasty_prospects
  (id, rank, name, first_name, last_name, position, school, draft_year,
   class, height, weight, hometown, jersey, headshot_url, created_at, updated_at)
OVERRIDING SYSTEM VALUE
SELECT seed.id, seed.rank, seed.name, seed.first_name, seed.last_name,
       seed.position, seed.school, 2028, seed.class, seed.height,
       seed.weight, seed.hometown, seed.jersey, NULL, now(), now()
FROM (VALUES
  (-2028001, 26, 'Husan Longstreet', 'Husan', 'Longstreet', 'QB', 'LSU', 'Redshirt Freshman', 73, 200, 'Corona, California', 8),
  (-2028002, 27, 'Tavien St. Clair', 'Tavien', 'St. Clair', 'QB', 'Ohio State', 'Sophomore', 76, 235, 'Bellefontaine, Ohio', 9),
  (-2028003, 28, 'Ryan Montgomery', 'Ryan', 'Montgomery', 'QB', 'Georgia', 'Sophomore', 75, 215, 'Findlay, Ohio', 15),
  (-2028004, 29, 'Jaime Ffrench Jr.', 'Jaime', 'Ffrench Jr.', 'WR', 'Michigan', 'Sophomore', 74, 185, 'Jacksonville, Florida', 10),
  (-2028005, 30, 'Nate Roberts', 'Nate', 'Roberts', 'TE', 'Ohio State', 'Sophomore', 77, 240, 'Washington, Oklahoma', 83)
) AS seed(id, rank, name, first_name, last_name, position, school, class, height, weight, hometown, jersey)
WHERE NOT EXISTS (
  SELECT 1 FROM public.dynasty_prospects existing
  WHERE existing.draft_year = 2028 AND lower(existing.name) = lower(seed.name)
)
ON CONFLICT (id) DO NOTHING;
