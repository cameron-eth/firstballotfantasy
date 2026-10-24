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

Jesse Legree, Legend Bey, Brock Boyd, and Chris Henry Jr. were checked against the official [Oregon State roster](https://osubeavers.com/sports/football/roster/jesse-legree/12214) and [Ohio State roster](https://ohiostatebuckeyes.com/sports/football/roster/). Their official portraits were edited into transparent cutouts and stored in `public/prospects/2029/`. The 2029 year is an early draft projection; no model grade, production score, or draft round is assigned.

On 2026-10-24, all four rows were inserted into the Supabase project used by the Vercel Development environment and read back by ID, name, year, and local image path. The stable negative IDs match the server-side fallback, so saved board references survive. `sql/add_2029_prospects.sql` remains an idempotent record of the import. The fallback still covers deployments connected to a database without these rows. The freshness warning checks each upcoming class separately, so a freshly inserted 2029 row cannot hide older 2027 and 2028 records.

The insert succeeded with the public anon key. Review the `dynasty_prospects` write policy: catalog writes should be restricted to the ingestion process. The currently authenticated Supabase CLI lists a different project from the Vercel target, and the pulled service-role key is rejected as `Invalid API key`; correct that credential for future imports. Run the normal scouting ingestion for the rest of the 2029 class and add a source timestamp before claiming the catalog is fresh.

## Internal experience follow-up

The homepage was not the main usability problem. A follow-up audit found that the “My Team” links carried `?tab=roster`, but the league dashboard always opened Overview; scouting also waited for a linked roster request before showing its independent prospect catalog. League quick links malformed URLs that already had query parameters, and connecting Sleeper forced a full page reload.

The scouting workspace now exposes board and team actions, quick class filters, an “On my board” view, and a clear recovery state for empty results. Prospect browsing stays available while team needs load or fail. A profile no longer labels a position “critical” when no roster is connected, and guest notes clearly require login. League section links now open the requested tab and keep the URL in sync; the league dashboard remains accessible when a saved league exists but Sleeper identity is unavailable. Connecting Sleeper refreshes leagues in place.

## Community rankings and season flow audit (2026-10-24)

- Current rankings are model output; the product has no user opinion signal. Asking visitors to complete a long list or blocking the home page would slow the core scouting path. A compact pairwise choice can collect one useful vote in seconds, with a visible “Not now” exit. Dismissal should survive repeat visits on that browser; no dark pattern re-prompt during the same session.
- Keep NFL and college votes in separate pools and compare the same position and, for prospects, the same draft class. Store authenticated votes on the server with one current selection per user and pair. Show vote counts and treat small samples as early community opinion, not a definitive rank. Guests may browse and dismiss; sign-in precedes saving a vote.
- Sleeper username already has a server-side `user_profiles.sleeper_username` field and a PATCH endpoint. The league connection flow should reuse this identity and validate the field rather than add another local-only username state.
- Scouting has a much larger title/control panel than the nearby board and history surfaces. Use one compact shared section header with consistent title, control and filter sizing. Keep prospect portraits/cards; they make the class legible.
- The league season needs a college bridge: from roster needs to position-filtered prospects and a near-term class watchlist. Make this a route into scouting rather than another standalone dashboard.
- Remove duplicate or non-core navigation destinations from the top-level journey. Keep the existing ranking page as model context but put community opinions next to scouting and the homepage contribution flow.

Implementation sequence: source-check and import eight missing 2028/2029 prospects and portraits; add the community voting table, authenticated API and homepage prompt; link roster needs to relevant college prospects; compact the shared scouting header and navigation; verify responsive UI, data round-trip, and update PR screenshots.

### Import and deployment status

The eight additions were verified against the [Tennessee](https://utsports.com/sports/football/roster/faizon-brandon/23058), [Vanderbilt](https://vucommodores.com/sports/football/roster/player/jared-curtis-2/), [USC](https://usctrojans.com/news/2026/10/21/football-uscs-mark-bowman-trent-mosley-and-luke-wafle-named-midseason-true-freshman-all-americans), [Nebraska](https://huskers.com/sports/football/roster/player/jamal-rule), [Florida State](https://seminoles.com/sports/football/roster/ousmane-kromah/8356), and [Maryland](https://umterps.com/sports/football/roster/washington-malik/15660) official rosters and updates. Stats in the import are dated 2026-10-24 snapshots; no model grades were invented. All eight rows were written to and read back from the Vercel Development Supabase project. Transparent portraits are local and sized for cards.

The community vote SQL is in `sql/add_community_rank_votes.sql`. The current Supabase dashboard login reports “You do not have access to this project,” and the pulled Development service-role key is invalid. The API detects the missing aggregate function and keeps the contribution prompt hidden until the SQL is applied. This avoids asking for a vote that cannot be saved. A project owner must run the SQL in the linked Supabase project, then verify an authenticated vote and public aggregate. The existing Sleeper username field requires no migration.
