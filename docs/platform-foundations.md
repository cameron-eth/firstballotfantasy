# Platform foundation and launch runbook

Status: implementation in review; **not a production launch**. The production Supabase project is `aanoqbjauukcczrlnxka`. Do not apply this migration to a different project just because it is accessible in the dashboard.

## Membership and user flow

- Browsing, scouting and community ranking remain free. An account can activate one team free, without a card or Sleeper authorization token.
- Discovering leagues is free and never starts a purchase. A connected team is a roster in a league lineage, so annual league renewal does not consume another slot.
- Unlimited membership costs $12/month or $70/year (USD), with one Stripe subscription unit per account. It includes unlimited active teams; free membership retains one. Users explicitly review Stripe Checkout before paying.
- Archiving frees a slot without deleting plans. A downgrade retains the oldest active teams up to capacity; users can archive unwanted teams first. Expired and past-due entitlement grants only the free slot.
- One unresolved checkout attempt is stored per account. Retries reuse it. Changing billing interval expires the previous open checkout before a replacement is created; a completed checkout is never replaced. Users can change billing interval in the portal, not subscription quantity. An expired checkout can be retried. Unresolved attempts older than 23 hours require reconciliation to avoid a second charge after Stripe's idempotency window.
- Never grant access from a checkout success URL. Signed webhooks update entitlements transactionally; retries deduplicate by event ID.

Annual pricing saves $74 versus twelve monthly payments. Eligible monthly members may accept a one-time retention offer of $5.99/month for three months, then $12/month. Annual, delinquent, already-discounted and previously retained accounts do not receive it. Cancellation remains available without accepting the offer and collects a reason plus optional feedback in Stripe. Signed webhooks persist feedback and retention redemption in service-only `billing_feedback` before acknowledging the billing event. Group by subscription/account when reporting churn; multiple subscription events can reference the same feedback.

`paid_slots = -1` denotes unlimited; JSON `capacity: null` is the explicit unlimited representation. SQL activation and access checks honor it without an artificial team ceiling. Free and expired accounts retain one active team. Legacy finite-slot fixtures remain supported for regression testing. API limits remain 100 requests/day free and 1,000 paid, shared with MCP; unlimited teams does not mean unlimited requests. Do not sell a freshness guarantee before all-source monitoring is ready.

## Data boundary

| Dataset | Persistence | Refresh budget | Limitations |
| --- | --- | --- | --- |
| ESPN current-season PPR actuals and positional ranks | Postgres `data_snapshots`, fetched server-side | 15 minutes | ESPN does not supply an independently verified source update timestamp. Quality is `unverified`; a recent fetch is not proof of recent publication. |
| Sleeper projections | Shared Postgres snapshots; scoring server-side | Weekly: 15 minutes; season: 6 hours | Source publication timestamp unknown. No stale fallback on source failure. |
| Sleeper roster for API/MCP | Shared Postgres snapshots | 2 minutes | Snapshot represents the roster returned at fetch time. |
| KTC current values | Existing server-side history table | Reject current values older than 48 hours | History remains historical; a successful fetch does not reset source age. |
| College prospects | Existing Supabase prospect records | Not yet guaranteed | Row edit time is not source verification. College provenance/backfill and scheduled ingestion remain launch work. |
| Identity crosswalk | Versioned JSON, server-side | Import-time validation | Invalid ESPN IDs and ambiguous aliases are excluded and quarantined rather than guessed. |

`data_snapshots` contains fetch time, source time when known, expiration, season/week, quality, and content hash. Expired snapshots return unavailable on failed refresh. Missing stats stay null, not zero. The health endpoint currently covers ESPN snapshots only; it is not a comprehensive service SLA. Do not advertise an all-source freshness guarantee yet.

Browser state still includes presentation, selected league, local caches and optimistic editing. Private plans/notes and stored Sleeper credentials retain their existing server persistence. New billing, team activation, API grants, metering, audit and ingestion state live in Postgres. No credentials are returned through API/MCP.

## Security and API

- Browser operations verify the Supabase session. Public API routes use exact paths, avoiding prefix-based exposure of private sibling routes.
- Personal API tokens are random 256-bit secrets, returned once, stored as SHA-256 hashes, expire after 30 days, and can be revoked immediately. They grant read-only scopes and explicitly selected teams.
- Versioned endpoints: `GET /api/v1/teams`, `GET /api/v1/teams?team=<connection UUID>`, `GET /api/v1/players?ids=<Sleeper IDs>` (up to 100).
- `POST /api/mcp` uses the official MCP SDK with stateless Streamable HTTP. Tools: `list_teams`, `get_roster`, `get_player_stats`. Bearer personal tokens work without OAuth configuration.
- OAuth is disabled by default. When enabled, tokens must have asymmetric signatures, the correct issuer, expiration, client ID, and exact resource audience `<BASE_URL>/api/mcp`. Ordinary browser JWTs are not accepted as MCP tokens. Persisted team grants are checked on every call.
- Sleeper credentials need reversible encryption to perform authorized actions; hashing cannot replace their existing encrypted storage. MCP cannot send trades or change lineups. Website actions continue to require independently verified Sleeper ownership and an active team.
- All new tables have RLS and service-role-only writes. Only own billing/connected-team rows have authenticated SELECT policies. RPC functions are service-role-only.
- Durable metering uses account locks, idempotent request IDs and a 300/minute ceiling; API and MCP additionally share a daily UTC allowance. These are request counts, not counts of individual player rows or tool invocations.
- Logs include request ID, operation, channel, duration and outcome. They omit tokens and request payloads. Operational records currently need an explicit retention job before launch; billing-event deduplication must not be pruned casually.

## Deployment order and required evidence

1. **Applied 2026-10-25:** `firstballot/supabase/migrations/20261026_platform_foundations.sql` was executed transactionally through the SQL Editor on production project `aanoqbjauukcczrlnxka`. Preflight found none of the 11 target tables. Live catalog verification confirmed 11 tables with RLS, zero anonymous table access, zero authenticated writes, two own-account read policies, and three service-only RPCs. SHA-256: `1415b5b011c55950cd4ae9fe7213824f1bd1ece139af6f28c1e79a0d6052018e`. This was a manual SQL Editor execution, not a CLI migration-history entry. Two-account application acceptance remains required.
2. Deploy a preview against a staging database containing the migration. Verify free activation, full-slot rejection, archival, rollover lineage, saved plans, and recovery from database/source outages. The new dashboard gate depends on these tables; do not deploy first.
3. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_TEAM_MONTHLY_PRICE_ID`, `STRIPE_TEAM_YEARLY_PRICE_ID`, `STRIPE_PORTAL_CONFIGURATION_ID`, `STRIPE_RETENTION_COUPON_ID`, and `NEXT_PUBLIC_BASE_URL`. Create USD licensed prices at 1200 cents monthly and 7000 cents annually with price metadata `plan=unlimited`. No client-provided price/customer IDs are trusted.
4. Register `/api/webhooks/stripe` for subscription created/updated/deleted, checkout completed, invoice paid/payment failed. Configure the customer portal to permit monthly/annual price changes and period-end cancellation only for the Unlimited product; keep quantity changes disabled and enable cancellation reasons. Test checkout, duplicate tabs, failed payments, renewal, cancellation, out-of-order/replayed webhooks, expired checkout and downgrade in Stripe test mode before live prices.
5. Set `DATA_REFRESH_SECRET` in Vercel and GitHub Actions, then enable repository variable `PLATFORM_MONITOR_ENABLED=true`. Hourly refresh/health checks are opt-in until the migration and credentials are ready. Set failure notifications. Add all-source monitors, college provenance and retention before promising freshness.
6. For OAuth MCP, enable Supabase OAuth 2.1 server, set authorization path `/oauth/consent`, register redirect URIs, require PKCE, use asymmetric signing keys, and configure a Custom Access Token Hook to issue the exact MCP audience for approved clients. Keep `MCP_OAUTH_ENABLED` unset until issued tokens actually satisfy validation. Set `MCP_ALLOWED_ORIGINS` explicitly for browser clients. Verify consent, expired tokens, wrong audience, revoked grants and cross-account access with a real client.
7. Perform backup/restore verification and observe load, database growth, source latency and upstream rate limits. Add distributed refresh coalescing before high-traffic launch; current snapshots can have simultaneous refreshes after expiry.

## Verification performed locally

`pnpm run ci` performs strict TypeScript checks, the repository React Doctor check and regression tests. Platform tests execute the actual migration in PGlite/Postgres, covering RLS isolation, service-only mutations, free/paid capacity, archive preservation, webhook idempotency and quota enforcement. These tests do not substitute for live Stripe, Supabase OAuth or production API verification.

Read-only audit: 1,002 prospect rows, no duplicate name/class/school groups, 66 missing ESPN IDs, 21 ungraded. The identity crosswalk had invalid placeholder IDs and three ambiguous ESPN mappings; quarantine records explain exclusions. No production records were deleted.

References: [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions), [Supabase OAuth setup](https://supabase.com/docs/guides/auth/oauth-server/getting-started).

## Stripe follow-up verification

Real sandbox Checkout, signed CLI webhook delivery, renewal, failed payment, downgrade, cancellation and resubscription have now been exercised against an isolated database using production reconciliation logic. The post-checkout page verifies session ownership, waits for persisted entitlements and refreshes team/API allowance caches after activation. See [test evidence and remaining staging boundaries](testing/stripe-verification.md). This does not remove the production migration/configuration launch gates above.

## Test billing configuration

`node --env-file=.env.local scripts/billing/configure-test.mjs` provisions/reuses only test-mode Unlimited prices, a product-scoped $6.01 repeating discount for three months, and a dedicated portal configuration. It writes non-secret configuration IDs to ignored `.env.billing-test.local`; load that file explicitly for test scripts. Never deploy test configuration as live billing. Production needs equivalent live objects and a live webhook signing secret, after migration and staging acceptance.
