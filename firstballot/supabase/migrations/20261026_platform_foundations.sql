begin;
create table public.account_billing (
 account_id uuid primary key references auth.users(id) on delete cascade,
 stripe_customer_id text unique, stripe_subscription_id text unique,
 status text not null default 'free', paid_slots integer not null default 0 check(paid_slots between -1 and 100),
 period_end timestamptz, cancel_at_period_end boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.connected_teams (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references auth.users(id) on delete cascade,
 lineage_id text not null, league_id text not null, roster_id integer not null check(roster_id > 0),
 sleeper_user_id text not null, name text not null, season integer not null,
 active boolean not null default false, activated_at timestamptz, created_at timestamptz not null default now(),
 unique(account_id,lineage_id,roster_id)
);
create index connected_teams_account_active on public.connected_teams(account_id,active);
create table public.data_snapshots (
 key text primary key, source text not null, payload jsonb not null,
 fetched_at timestamptz not null, source_observed_at timestamptz,
 expires_at timestamptz not null, quality text not null check(quality in ('validated','unverified')),
 content_hash text not null, season integer, week integer,
 check(expires_at > fetched_at)
);
create table public.ingestion_runs (
 id uuid primary key default gen_random_uuid(), dataset text not null,
 started_at timestamptz not null default now(), completed_at timestamptz,
 status text not null check(status in ('success','failed')), error_code text, row_count integer
);
create index ingestion_runs_dataset_time on public.ingestion_runs(dataset,started_at desc);
create table public.api_access_tokens (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references auth.users(id) on delete cascade,
 name text not null, token_hash text not null unique, prefix text not null,
 scopes text[] not null default array['teams:read','players:read'], team_ids uuid[] not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 revoked_at timestamptz, last_used_at timestamptz
);
create table public.usage_events (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, operation text not null, channel text not null check(channel in ('web','api','mcp')),
 occurred_at timestamptz not null default now(), unique(account_id,request_id,operation)
);
create index usage_events_quota on public.usage_events(account_id,occurred_at);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), account_id uuid references auth.users(id) on delete set null,
 request_id uuid not null, operation text not null, outcome text not null,
 created_at timestamptz not null default now()
);
create table public.billing_events (
 event_id text primary key, processed_at timestamptz not null default now()
);
-- Browsers can read only their own account records. All writes run through checked server operations.
do $$ declare t text; begin
 foreach t in array array['account_billing','connected_teams','api_access_tokens','usage_events','audit_events','data_snapshots','ingestion_runs','billing_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.account_billing, public.connected_teams to authenticated;
create policy own_billing on public.account_billing for select to authenticated using(account_id = auth.uid());
create policy own_teams on public.connected_teams for select to authenticated using(account_id = auth.uid());
-- Transactional account locks prevent concurrent activation from exceeding paid capacity.
create function public.activate_connected_team(p_account uuid,p_team uuid,p_active boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare capacity integer; used integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_account::text,0));
 if not exists(select 1 from connected_teams where id=p_team and account_id=p_account) then raise exception 'TEAM_NOT_FOUND'; end if;
 select case when exists(select 1 from account_billing where account_id=p_account and status in ('active','trialing') and period_end>now() and paid_slots=-1) then null else 1 + coalesce((select case when status in ('active','trialing') and period_end>now() then paid_slots else 0 end from account_billing where account_id=p_account),0) end into capacity;
 select count(*) into used from connected_teams where account_id=p_account and active and id<>p_team;
 if p_active and used>=capacity then raise exception 'TEAM_LIMIT'; end if;
 update connected_teams set active=p_active,activated_at=case when p_active then coalesce(activated_at,now()) else activated_at end where id=p_team;
end $$;
-- Server-selected request IDs; each API/MCP request consumes one unit, including tool errors.
create function public.consume_platform_usage(p_account uuid,p_request uuid,p_operation text,p_channel text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare daily_limit integer; used integer; burst integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_account::text,1));
 if exists(select 1 from usage_events where account_id=p_account and request_id=p_request and operation=p_operation) then return true; end if;
 select count(*) into burst from usage_events where account_id=p_account and occurred_at>now()-interval '1 minute';
 if burst >= 300 then return false; end if;
 select case when exists(select 1 from account_billing where account_id=p_account and status in ('active','trialing') and period_end>now()) then 1000 else 100 end into daily_limit;
 select count(*) into used from usage_events where account_id=p_account and occurred_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC' and channel in ('api','mcp');
 if p_channel<>'web' and used>=daily_limit then return false; end if;
 insert into usage_events(account_id,request_id,operation,channel) values(p_account,p_request,left(p_operation,80),p_channel);
 return true;
end $$;
-- Apply current Stripe state and mark the event in one transaction. Order is serialized per account.
create function public.apply_platform_billing(p_event text,p_account uuid,p_customer text,p_subscription text,p_status text,p_slots integer,p_end timestamptz,p_cancel boolean,p_observed timestamptz default now()) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_account::text,0));
 if exists(select 1 from billing_events where event_id=p_event) then return; end if;
 if exists(select 1 from account_billing where account_id=p_account and updated_at>p_observed) then
  insert into billing_events(event_id) values(p_event); return;
 end if;
 insert into account_billing(account_id,stripe_customer_id,stripe_subscription_id,status,paid_slots,period_end,cancel_at_period_end,updated_at)
 values(p_account,p_customer,p_subscription,p_status,p_slots,p_end,p_cancel,p_observed)
 on conflict(account_id) do update set stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,status=excluded.status,paid_slots=excluded.paid_slots,period_end=excluded.period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=p_observed;
 -- Preserve plans and archived connections on downgrade. Oldest active teams keep available slots.
 if not (p_status in ('active','trialing') and p_end>now() and p_slots=-1) then
 update connected_teams set active=false where id in (
  select id from connected_teams where account_id=p_account and active order by activated_at,id
  offset (case when p_status in ('active','trialing') and p_end>now() then 1+p_slots else 1 end)
 );
 end if;
 insert into billing_events(event_id) values(p_event);
end $$;
revoke all on function public.activate_connected_team(uuid,uuid,boolean),public.consume_platform_usage(uuid,uuid,text,text),public.apply_platform_billing(text,uuid,text,text,text,integer,timestamptz,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.activate_connected_team(uuid,uuid,boolean),public.consume_platform_usage(uuid,uuid,text,text),public.apply_platform_billing(text,uuid,text,text,text,integer,timestamptz,boolean,timestamptz) to service_role;
create table public.oauth_team_grants (
 account_id uuid not null references auth.users(id) on delete cascade, client_id text not null,
 team_ids uuid[] not null, scopes text[] not null default array['teams:read','players:read'],
 revoked_at timestamptz, created_at timestamptz not null default now(), primary key(account_id,client_id)
);
alter table public.oauth_team_grants enable row level security;
revoke all on public.oauth_team_grants from anon, authenticated;
grant all on public.oauth_team_grants to service_role;

-- A single immutable checkout attempt per account prevents double subscriptions
-- across tabs, quantity changes, retries and function restarts.
create table if not exists public.billing_checkout_attempts (
 account_id uuid primary key references auth.users(id) on delete cascade,
 id uuid not null default gen_random_uuid(),
 price_id text not null,
 quantity integer not null check(quantity between 1 and 100),
 session_id text,
 created_at timestamptz not null default now()
);
alter table public.billing_checkout_attempts enable row level security;
revoke all on public.billing_checkout_attempts from anon, authenticated;
grant all on public.billing_checkout_attempts to service_role;

-- Private cancellation feedback and retention history; written before billing event acknowledgement.
create table public.billing_feedback (
 event_id text primary key, account_id uuid not null references auth.users(id) on delete cascade,
 subscription_id text not null, feedback text, comment text, reason text,
 retention_redeemed boolean not null default false, created_at timestamptz not null default now()
);
alter table public.billing_feedback enable row level security;
revoke all on public.billing_feedback from anon, authenticated;
grant all on public.billing_feedback to service_role;
commit;
