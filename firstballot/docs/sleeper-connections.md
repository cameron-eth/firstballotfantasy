# Saved Sleeper connections

The actions route requires an authenticated First Ballot account and verifies its JWT on every request. A new token is checked against Sleeper and league roster ownership before saving. Restores and actions repeat those checks. The API never returns the credential.

Tokens are AES-256-GCM encrypted with a random 96-bit nonce and the account UUID as authenticated additional data. Ciphertext lives at `<account UUID>/token.json` in the private Supabase Storage bucket `sleeper-connections`. Only the server service-role client reads/writes it; do not create browser storage policies for this bucket. Disconnect deletes the object. It does not revoke the credential in Sleeper. Expired Sleeper credentials require reconnecting.

Required server-only configuration:

- `SLEEPER_TOKEN_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hex characters; persist the same value across deployments that share this storage. Never use a `NEXT_PUBLIC_` variable.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key for the configured Supabase project.
- Private bucket `sleeper-connections`, JSON content, 32 KiB file limit.

Changing the encryption key without migrating existing ciphertext makes saved connections unreadable. Users can reconnect to replace their record. Tokens never go into localStorage, sessionStorage, cookies, analytics or logs.

# Market history and Heat

`import-ktc-history.py` validates and compacts all SDK snapshots. `sync-ktc-values.mjs` idempotently upserts them by `(ktc_player_id, scraped_date)` without deleting existing data. The daily workflow reuses the SDK scraper and its 100-player minimum, imports the full archive, persists it to Supabase, and proposes a PR updating the fallback archive. Repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required. Scheduled jobs start once this workflow reaches the default branch.

The KTC API paginates history to avoid Supabase's default row cap, matches name suffixes only when unambiguous, and uses the bundled archive when the database is unavailable. `source` and `latestDate` identify coverage.

Heat is a momentum index, not trade demand: 50 neutral, with equal contributions from seven-day KTC SF percentage change and the last two played games' PPR FPPG versus prior played games in six completed weeks. Contributions saturate at 10% and 50%, respectively. The FPPG denominator has a five-point floor. Both inputs, four played games and fresh KTC data are required. Requests remains a separate private-history count. Weekly scoring history is cached server-side for one hour.
