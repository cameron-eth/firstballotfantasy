-- Community tally pair keys compare in byte order, as the app sorts them (fix for PR-17).
--
-- The app orders each pair with JavaScript's sort (UTF-16 code units). The database's
-- default collation (en_US) skips punctuation, so 'prospect:-2029006' < 'prospect:12' in
-- the app but not in Postgres, and the check (a < b) rejected those pairs: the tally
-- rebuild failed and every read fell back to downloading the ballots. "C" collation is
-- byte order, which matches the app for these ASCII keys.
--
-- Rollback:
--   alter table public.community_ballot_tallies
--     alter column a type text collate "default", alter column b type text collate "default";

alter table public.community_ballot_tallies
  alter column a type text collate "C",
  alter column b type text collate "C";
