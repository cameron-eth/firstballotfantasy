# First Ballot application

Next.js 16 App Router, React 19, TypeScript, Tailwind/Radix, SWR and Supabase. Vercel runs the frontend and server routes.

## Local development

Use Node 22 and pnpm 8, matching CI. The repository also contains a legacy Bun lockfile; CI uses pnpm.

```sh
cd firstballot
pnpm install --no-frozen-lockfile
pnpm exec next dev -p 3100
```

`npm run dev` invokes Bun; the command above does not require Bun. Run checks from this directory:

```sh
npm run ci       # TypeScript, repository React Doctor, node:test suite
npm run build
npm run start -- --port 3100
```

React Doctor here is the dependency-free repository check in `scripts/react-doctor.mjs`. CI also runs frontend guard tests. A successful build alone does not prove TypeScript passed; the Next configuration skips build-time type validation, so run `npm run ci` too.

### Environment

Use an ignored `.env.local`. For an already linked Vercel project, `vercel env pull .env.local` retrieves the selected environment's configuration. Confirm the project/environment before replacing a local file.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Public client key; database access still needs RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Private storage and administrative data access |
| `SLEEPER_TOKEN_ENCRYPTION_KEY` | Server only | 32 random bytes encoded as 64 hex characters, for saved Sleeper connections |

`lib/supabase-config.ts` also accepts legacy aliases such as `NEXT_PUBLIC_PROJECT_URL`, `NEXT_PUBLIC_ANON_KEY`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Prefer the canonical names above. Billing has separate Stripe configuration; inspect its routes before enabling billing in a new deployment.

Database/storage provisioning is separate from environment setup. SQL is in `sql/` and `supabase/migrations/`; review and apply the required migrations for the target project. Merely pulling environment variables does not create tables, policies or private buckets.

## What runs where

| Concern | Browser | Server / persistent source |
| --- | --- | --- |
| League identity and public roster state | League context/SWR fetch public Sleeper data, schedule and app endpoints | Sleeper remains authoritative for league settings, rosters and ownership |
| Actual FPPG and positional rank | Displays normalized values and shoulder badge | `/api/roster-stats` resolves current season, fetches ESPN actual totals, ranks full NFL position pools, caches normalized results for 15 minutes |
| Weekly/season projections | Requests a small normalized map | `/api/projections` scores Sleeper projection components with league settings; weekly cache 15 min, season 6 h |
| Prospects and grades | Search/filter/card rendering | `/api/prospects` reads `dynasty_prospects`; shared response cache 5 min; curated watchlist fallback for missing future rows |
| Historical outcomes | Grade-first cards and signal-bar disclosure | `/api/history-outcomes` computes from versioned ADP/production snapshot; raw weekly archive remains server-side |
| KTC and Heat | Sparkline and heat display | KTC DB/archive normalization and cached completed-week production; see source guide |
| Planning map | Scenario editing, lineup placement, zoom, deterministic suggestions and simulation | Saved scenarios in private `team-scenarios` bucket, scoped to account/league/roster |
| Standings/playoff odds | Shared league state, MaxPF and simulation utilities | Inputs originate in public league settings, matchups and standings; estimates are not Sleeper guarantees |
| Community comparisons | Pair display, immediate saving feedback, daily invitation dismissal | Server reconstructs valid pairs, stores immutable ballots and fits the regularized Bradley–Terry model |
| Sleeper mutations | Review/confirmation UI | Fixed server action handlers validate account, token, roster and asset ownership; no arbitrary client GraphQL |

Not every public-data read is proxied through Next.js. `useLeagueData.ts` still fetches public Sleeper rosters/users/player metadata and ESPN schedules from the browser. Private data writes and Sleeper credentials belong on the server.

### Persistence and privacy boundaries

- Draft boards: `user_draftboards`, scoped to the authenticated account; boards are separated by class.
- Personal scouting grades/notes: user-specific Supabase tables, including `user_prospect_notes`. A missing notes table produces an unavailable state, not a successful save.
- Scenarios: private Storage JSON at `<account>/<league>/<roster>.json`. Unsaved edits and guest plans are only in memory. Server save failures preserve the working view and report failure.
- Community ballots: private `community-ballots` bucket. Account/day/round defines an immutable vote; rating updates do not overwrite scouting grades or KTC.
- Sleeper connections: AES-256-GCM ciphertext in private `sleeper-connections` Storage, readable only by server service-role code. Credentials are encrypted, not hashed, because the app must use them for authorized requests. Disconnect removes the app's saved copy; it does not revoke the token at Sleeper. [Connection details](docs/sleeper-connections.md).
- Browser persistence: selected league/username caches, Supabase authentication session management, trade-suggestion dismissals (24-hour TTL), and the daily ballot invitation marker. These are distinct from the saved Sleeper authorization credential.
- Map zoom and open suggestion state are transient. Gesture frames write a canvas transform through refs/requestAnimationFrame; React's zoom state updates after settling.

## Main code paths

| Area | Entry points |
| --- | --- |
| Shared player appearance | `components/players/PlayerTradingCard.tsx` |
| League workspace | `components/LeagueBuddy.tsx`, `components/league-buddy/useLeagueData.ts` |
| Planning and funding | `components/league-buddy/builder/`, `lib/team-timeline.ts`, `lib/draft-funding.ts` |
| Trade/pick inventory | `lib/sleeper-sdk/`, `app/api/trade-inventory/`, `app/api/sleeper/actions/` |
| History | `components/scouting/HistoricalRankingsTab.tsx`, `lib/history-outcomes.ts` |
| Current-season stats | `lib/current-season-stats.ts`, `app/api/roster-stats/` |
| Standings and MaxPF | `components/league-buddy/LeagueStandingsSection.tsx`, `components/league-buddy/draft-order/` |

## Data meanings and limitations

- Current actual FPPG = ESPN current regular-season actual PPR points / games played. Positional rank is calculated before filtering to requested roster IDs, across all supplied NFL players with at least one game. Ties share rank. No prior-season or projection fallback is presented as current actual production.
- A one-game sample can rank highly. The shoulder badge description exposes the games-played criterion. No production means unavailable, not an invented zero rank.
- Weekly projections can differ from actual PPR because league scoring differs. Projection coverage reports unsupported scoring keys.
- Historical bars compare cumulative production against similar rookie ADP from earlier classes, at an equal career stage. Gray means missing/sparse evidence. The first two seasons carry an early-signal label. [Full methodology](docs/history-outcomes-plan.md).
- Future pick slots follow shared projected MaxPF and the original roster of a traded pick. League playoff/draft rules can change final order. Rookie production and future roster-driven MaxPF changes are not forecast.
- Trade suggestions are heuristics, not predicted acceptance. Sending requires review/confirmation and a valid saved Sleeper connection. Do not send real player/pick trades as tests.

## Operations

See [`data/README.md`](data/README.md) for authoritative sources, cache intervals, snapshot refresh commands and GitHub Actions dependencies. Scheduled workflows run from the default branch; refresh PRs must be merged/deployed before bundled snapshots change in production.

For UI changes, include desktop/mobile evidence as applicable and screenshots in the PR body. Verify API identity/season/scoring alongside screenshots; a plausible number is not sufficient evidence that the data is correct.
