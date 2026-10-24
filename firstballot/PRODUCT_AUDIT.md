# Product audit and implementation plan

Audit date: 2026-10-24. Source reviewed: this repository; no First Ballot environment file was present in the local workspace.

## Findings

1. Scouting had the richest product depth (prospect profiles, personal grades, draft board, class history), but the homepage and navigation gave equal or greater weight to the trade calculator. Multiple routes lead to the same scouting experience.
2. The homepage called a database-backed ticker “live”, hard-coded specific draft classes, and showed an old featured NFL player. The prospect API caches rows for five minutes and allows stale delivery for another hour, but this repository contains no ingestion job or source-update timestamp to prove the rows themselves are current.
3. Personal grades and the draft board were already stored in Supabase. Prospect report notes were only kept in React state and disappeared on reload. Selected league preference is local. League discovery fetched Sleeper in each browser.
4. Some paths targeted `/draft-buddy`, which does not exist. A few seasons and class references are fixed to 2025/2026/2027.
5. The trade calculator occupied a standalone page and API with dedicated components, hook, types, and utility.

## Executed plan

- Make the primary path Scout prospects → build a board → manage my team → inspect my league. Give these actions the main navigation and homepage positions.
- Remove the trade calculator surface and implementation. Keep historical trade-market data outside the main path.
- Save private prospect notes through an authenticated API and RLS-protected table. Apply `sql/add_user_prospect_notes.sql` in the First Ballot Supabase project before using this feature.
- Fetch the linked user's league list through a server route and cache the upstream Sleeper request for five minutes. Keep selected-league preference local until account-level preference storage is designed.
- Derive upcoming board years from the clock and show a manual prospect refresh. Describe the page check time accurately; it is not a claim about source freshness.

## Remaining data work

The app can refresh its copy of prospect rows, but true freshness depends on the upstream import into `dynasty_prospects`. Add an ingestion job with a recorded `source_updated_at`, source name, class coverage, and health alert. Surface that timestamp in the prospect API and UI only after the importer writes it. Verify live row counts, newest class, and source timestamps using the First Ballot environment or production data access. No credentials for this repository were found locally, so those checks and applying the SQL migration remain deployment steps.
