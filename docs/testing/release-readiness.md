# Release readiness — 2026-10-25 (US Eastern)

## Decision

A small, explicitly free invitation beta is reasonable after the onboarding PR is deployed. Do not announce paid availability or an all-source data-freshness guarantee yet. This is a scoped smoke test, not a complete security, load or disaster-recovery audit.

## Production evidence

Verified in the real signed-in production browser against the production Supabase database:

- Membership loads the authenticated account and its discovered Sleeper leagues.
- One team (Ball Knowers) connects and activates without a payment or new Sleeper authorization token.
- A second team (GUTS) connects as archived; the first team remains active.
- Attempting to activate that second team returns the server-enforced capacity error. No extra access is granted.
- Switching to the active league opens the dashboard. A separate desktop browser tab loads Team Builder, its existing plan, year controls, owned draft picks, starter cards, current-season FPPG and positional ranks.
- The public current-season stats endpoint returned 200 with ESPN source metadata, expiration, 2026 season and actual FPPG data. Source publication time remains unknown and is explicitly marked unverified.
- Paid checkout displays the disabled “Paid membership opens soon” control. No production Checkout session, charge, subscription or paid entitlement was created.
- Testing leaves Ball Knowers active and GUTS archived; no roster moves, trade sends or saved plan edits were performed.

A display issue found in the smoke test was fixed: remaining team capacity now subtracts active teams rather than showing the total allowance as “available.”

## Blocking paid release

The Vercel production environment listing has legacy Stripe variables and lacks:

- `STRIPE_TEAM_MONTHLY_PRICE_ID`
- `STRIPE_TEAM_YEARLY_PRICE_ID`
- `STRIPE_PORTAL_CONFIGURATION_ID`
- `STRIPE_RETENTION_COUPON_ID`

The application supports the legacy `NEXT_STRIPE_SECRET_KEY` fallback, but its live-mode/account suitability and the existing webhook endpoint/secret must still be verified. An old webhook secret alone is not proof of a correctly configured endpoint. Do not replace production configuration with sandbox values.

Required acceptance: configure verified live Unlimited prices ($12 monthly / $70 annual), portal, retention coupon and signed webhook; user completes a live Checkout; verify the event is acknowledged, account entitlement is persisted, return page shows unlocked membership, and a second team activates. Then verify billing portal access and scheduled cancellation retain access until period end. Real payment details and final purchase are handled by the user. Renewals, failures, retention amounts and replay scenarios already have separate sandbox evidence.

## Other launch boundaries

- Freshness workflow remains opt-in; configure refresh credentials, schedule and failure alerts. College provenance/backfill, all-source health, retention and distributed refresh coalescing are unfinished. Do not sell a freshness SLA.
- Supabase OAuth MCP remains disabled pending provider/audience/PKCE acceptance. Existing personal-token MCP is a separate read-only path.
- Two-account authenticated isolation, load and backup/restore acceptance are still outstanding for a broader launch; local RLS/RPC regression tests are not substitutes.

## Onboarding verification

- 134 tests pass, including tour next/back/finish, skip without navigation, mobile copy, account-scoped/versioned dismissal and existing billing regressions.
- TypeScript, repository React Doctor and webpack production build pass.
- Real local dashboard session: tour appears, desktop/mobile content adapts, Skip dismisses, refresh does not reopen it, Settings replay opens it again. No daily ballot stacks over the tour.
- Screenshots in `docs/screenshots/welcome-map-desktop.png` and `welcome-map-mobile.png` show the actual local app, not a design mockup.
- New-account signup and cross-device preference synchronization are not claimed as independently exercised browser flows in this pass.
