# Stripe verification evidence

## Executed against real Stripe sandbox

A browser completed hosted Stripe Checkout using Stripe's synthetic `4242` card. Stripe CLI forwarded actual signed events to an isolated HTTP receiver, which called the same `reconcileBilling` function used by the application webhook route. That function wrote to PGlite running the production platform migration. Payment changed capacity from one free team to three teams, and activation of both additional teams succeeded.

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

This is **not** a production or fully authenticated staging UI→Next route→Supabase→Stripe acceptance test. Correct-project Supabase migration access is still missing. The isolated receiver verifies signatures and exercises production reconciliation/database logic but does not run the Next middleware or Supabase transport. JSDOM requests are controlled test fixtures. Hosted Billing Portal UI, persistent deployment webhook registration, actual account login/checkout/return navigation and production feature gates still require staging verification. Keep the PR draft until those boundaries are tested.

## Re-run

From `firstballot`, with a test key in the local environment:

```sh
node --env-file=.env.local --import tsx --import ./tests/helpers/register.mjs scripts/testing/stripe-lifecycle.mjs
```

The script refuses non-test keys, starts a Stripe CLI listener on localhost:3107, and writes the hosted Checkout URL to `/tmp/firstballot-stripe-checkout.json`. Complete that sandbox checkout in a browser to continue. `STRIPE_TEST_API_ONLY=true` creates the initial subscription via the Stripe test API instead, for automated renewal/cancellation regression checks. Neither mode uses the production database.
