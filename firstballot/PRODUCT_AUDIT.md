# Product audit and implementation plan

Audit date: 2026-10-24. Source reviewed: this repository and, after a later Vercel Development env pull, a read-only query of the linked Supabase database.

## Findings

1. Scouting had the richest product depth (prospect profiles, personal grades, draft board, class history), but the homepage and navigation gave equal or greater weight to the trade calculator. Multiple routes lead to the same scouting experience.
2. The homepage called a database-backed ticker “live”, hard-coded specific draft classes, and showed an old featured NFL player. The prospect API cached rows for five minutes and allowed stale delivery for another hour. The table has `updated_at` row timestamps, but this repository has no ingestion job or source-specific timestamp.
3. Personal grades and the draft board were already stored in Supabase. Prospect report notes were only kept in React state and disappeared on reload. Selected league preference is local. League discovery fetched Sleeper in each browser.
4. Some paths targeted `/draft-buddy`, which does not exist. A few seasons and class references are fixed to 2025/2026/2027.
5. The trade calculator occupied a standalone page and API with dedicated components, hook, types, and utility.

## Executed plan

- Make the primary path Scout prospects → build a board → manage my team → inspect my league. Give these actions the main navigation and homepage positions.
- Remove the trade calculator surface and implementation. Keep historical trade-market data outside the main path.
- Save private prospect notes through an authenticated API and RLS-protected table. Apply `sql/add_user_prospect_notes.sql` in the First Ballot Supabase project before using this feature.
- Fetch the linked user's league list through a server route and cache the upstream Sleeper request for five minutes. Keep selected-league preference local until account-level preference storage is designed.
- Derive upcoming board years from the clock and show a manual prospect refresh. Describe the page check time accurately; it is not a claim about source freshness.
- Surface the newest `dynasty_prospects.updated_at` time and warn when the scouting data is older than 14 days.

## Development database check

The Vercel Development environment was pulled into the ignored `firstballot/.env.local`. A read-only query on 2026-10-24 found 86 rows for 2025, 86 for 2026, 75 for 2027, 25 for 2028, and none for 2029–2030. The newest row `updated_at` is 2026-08-15 08:21:56 UTC. This is a row edit time, not proof of when source data was collected. The Development anon key can read the table; the pulled Development service-role key is rejected by Supabase as `Invalid API key` and needs to be corrected in Vercel.

## Remaining data work

The app can refresh its copy of prospect rows, but true freshness depends on the upstream import into `dynasty_prospects`. Locate or add an ingestion job with a recorded `source_updated_at`, source name, class coverage, and health alert. The newest row is over two months old, so the underlying data needs a new import. Verify whether Production uses the same database before concluding that Production has the same counts. Apply `sql/add_user_prospect_notes.sql` before deploying the notes feature. The invalid Development service-role key also needs correction; do not copy the working anon key into that variable.

## 2029 watchlist follow-up

The Development table has no 2029 rows and none of Jesse Legree, Legend Bey, Brock Boyd, or Chris Henry Jr. Their 2026 freshman status, school, position, and headshots were checked against the official [Oregon State roster](https://osubeavers.com/sports/football/roster/jesse-legree/12214) and [Ohio State roster](https://ohiostatebuckeyes.com/sports/football/roster/). `lib/curated-prospects.ts` supplies four server-side watchlist records to the prospect API until `sql/add_2029_prospects.sql` is applied. The SQL preserves the fallback IDs so saved board references remain stable. The 2029 year is a draft projection; no model grade, production score, or draft round is assigned. Personal notes and film/talent grade saving for fallback records are disabled until their database rows exist. The homepage uses roster photos for the 2029 watchlist and player photos for the existing upcoming classes.

After applying the SQL, verify all four rows in `dynasty_prospects`, test authenticated notes and grades, and run the normal scouting ingestion for the rest of the class. The freshness warning now checks each upcoming class separately, so a freshly inserted 2029 row cannot hide older 2027 and 2028 records.
