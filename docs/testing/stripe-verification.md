# Stripe verification evidence

## Executed against real Stripe sandbox

Before the Unlimited pricing change, a browser completed hosted Stripe Checkout using Stripe's synthetic `4242` card. Stripe CLI forwarded actual signed events to an isolated HTTP receiver, which called the same `reconcileBilling` function used by the application webhook route. That function wrote to PGlite running the production platform migration. Payment changed capacity from one free team to three teams, and activation of both additional teams succeeded.

The repeatable lifecycle run additionally exercised:

- Invalid signature rejection.
- Free second-team rejection; paid team activation.
- Duplicate events and old-event replay after cancellation.
- Successful monthly renewal using Stripe Test Clocks.
- Quantity downgrade and excess-team archival without deleting connections.
- Scheduled cancellation retaining access to period end.
- Failed renewal removing paid access.
- Cancellation preserving one free slot and all saved connections.
- Resubscription restoring capacity, then explicit cancellation revoking it.
- Expired Checkout sessions never granting capacity.

See `stripe-test-results.json`. The recorded signature failure is the deliberate negative test. No live payments were made. Fixture subscriptions/customers were cleaned with their test clocks; fixture products and prices were archived. Existing product prices and production settings were not changed.

## User-interface regression tests

`tests/billing-ui.test.mjs` renders the actual React components in JSDOM with isolated account/network fixtures. It verifies:

- Pending confirmation does not display an unlock.
- Check again transitions to the verified team count and Open dashboard action.
- Incomplete checkout offers Resume secure checkout.
- Expired checkout gives recovery feedback without a resume URL.
- Signed-out returns ask for sign-in instead of spinning indefinitely.
- Activate disables while the request is pending and reveals the workspace only after server activation.
- Full-slot activation keeps the workspace locked and exposes Manage team slots.

`tests/checkout-status.test.mjs` verifies account/customer ownership, mismatched or unpersisted checkout state, canceled/past-due/expired entitlement, and the confirmed capacity result.

## What this does not prove yet

This is **not** a production or fully authenticated staging UI→Next route→Supabase→Stripe acceptance test. The migration was applied to the correct production Supabase project on 2026-10-25, with live table/RLS/RPC grant verification; authenticated application acceptance is still pending. The isolated receiver verifies signatures and exercises production reconciliation/database logic but does not run the Next middleware or Supabase transport. JSDOM requests are controlled test fixtures. Persistent deployment webhook registration, actual account login/checkout/return navigation and production feature gates still require staging verification. Keep the PR draft until those boundaries are tested.

## Re-run

From `firstballot`, with a test key in the local environment:

```sh
node --env-file=.env.local --import tsx --import ./tests/helpers/register.mjs scripts/testing/stripe-lifecycle.mjs
```

The script refuses non-test keys, starts a Stripe CLI listener on localhost:3107, and writes the hosted Checkout URL to `/tmp/firstballot-stripe-checkout.json`. Complete that sandbox checkout in a browser to continue. `STRIPE_TEST_API_ONLY=true` creates the initial subscription via the Stripe test API instead, for automated renewal/cancellation regression checks. Neither mode uses the production database.

## Unlimited pricing and retention verification

After pricing changed to $12/month or $70/year for unlimited teams:

- Actual hosted Stripe test portal: chose “too expensive”, saw an explicit $5.99/month offer and return to $12, accepted it, and observed the success page.
- Stripe Test Clocks: the next four invoice totals were **599, 599, 599, 1200 cents**. The discount expires automatically.
- Actual hosted portal: canceled afterward, confirmed period-end access, retrieved `cancellation_details.feedback = too_expensive` from Stripe.
- Disposable customer/subscription/test clock cleaned. Dedicated test-plan configuration remains for staging setup. No live payments or production configuration changes.
- Postgres regression activates eight teams under Unlimited (beyond the discarded five-team bundle), then cancellation archives excess teams without deleting them. Unlimited checkout confirmation shows the entitlement rather than “null slots”.
- Reconciliation tests cover the single-unit Unlimited entitlement, private feedback writes before event acknowledgement, retry on feedback-storage failure, and retention eligibility exclusions.

See `stripe-retention-results.json` and the membership, offer and churn-survey screenshots in this PR. Hosted portal tests used API-created disposable fixtures; the authenticated app → Supabase → portal handoff still requires migrated staging.

Reproduce from `firstballot` after test configuration:

```sh
node --env-file=.env.local --env-file=.env.billing-test.local scripts/testing/stripe-retention.mjs setup
# Open URL in /tmp/firstballot-retention-test.json and accept the sandbox retention offer.
node --env-file=.env.local --env-file=.env.billing-test.local scripts/testing/stripe-retention.mjs verify-renewals
# Open the updated fixture URL and cancel, choosing "too expensive".
node --env-file=.env.local --env-file=.env.billing-test.local scripts/testing/stripe-retention.mjs verify-cancel
```

The last command saves the report and deletes the disposable test clock/customer. Do not publish fixture session URLs.

Build note: Vercel also reproduced the Next 16 Turbopack Google-font internal-module resolution failure. `pnpm run build` now explicitly uses the verified webpack production builder.
