begin;

create table public.dynasty_tier_publications (
 id uuid primary key default gen_random_uuid(),
 snapshot_key text not null,
 payload jsonb not null,
 source text not null,
 fetched_at timestamptz not null,
 source_observed_at timestamptz,
 expires_at timestamptz not null,
 content_hash text not null,
 season integer,
 archived_at timestamptz not null default now(),
 unique(snapshot_key, fetched_at)
);
create index dynasty_tier_publications_recent
 on public.dynasty_tier_publications(snapshot_key, fetched_at desc);
alter table public.dynasty_tier_publications enable row level security;
revoke all on public.dynasty_tier_publications from anon, authenticated;
grant all on public.dynasty_tier_publications to service_role;

-- One transaction publishes both formats and its immutable history. The advisory
-- lock serializes workers; older source observations or workers cannot roll back
-- a newer publication even if they complete last.
create function public.publish_dynasty_tiers(
 p_key text, p_payload jsonb, p_content_hash text, p_source text,
 p_generated_at timestamptz, p_source_observed_at timestamptz,
 p_expires_at timestamptz, p_season integer
) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_snapshot public.data_snapshots%rowtype;
begin
 if p_key <> 'dynasty:tiers:v1' or p_payload is null or p_content_hash is null
    or p_source_observed_at is null or p_generated_at is null
    or p_expires_at <= p_generated_at or p_season is null then
  raise exception 'INVALID_TIER_PUBLICATION';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key, 7));
 select * into current_snapshot from public.data_snapshots where key = p_key for update;
 if found and (current_snapshot.source_observed_at > p_source_observed_at
    or (current_snapshot.source_observed_at = p_source_observed_at
        and current_snapshot.fetched_at >= p_generated_at)) then
  return false;
 end if;
 if found then
  insert into public.dynasty_tier_publications
   (snapshot_key,payload,source,fetched_at,source_observed_at,expires_at,content_hash,season)
  values
   (current_snapshot.key,current_snapshot.payload,current_snapshot.source,
    current_snapshot.fetched_at,current_snapshot.source_observed_at,
    current_snapshot.expires_at,current_snapshot.content_hash,current_snapshot.season)
  on conflict (snapshot_key,fetched_at) do nothing;
 end if;
 insert into public.dynasty_tier_publications
  (snapshot_key,payload,source,fetched_at,source_observed_at,expires_at,content_hash,season)
 values (p_key,p_payload,p_source,p_generated_at,p_source_observed_at,p_expires_at,p_content_hash,p_season)
 on conflict (snapshot_key,fetched_at) do nothing;
 insert into public.data_snapshots
  (key,source,payload,fetched_at,source_observed_at,expires_at,quality,content_hash,season)
 values
  (p_key,p_source,p_payload,p_generated_at,p_source_observed_at,p_expires_at,'validated',p_content_hash,p_season)
 on conflict (key) do update set
  source=excluded.source,payload=excluded.payload,fetched_at=excluded.fetched_at,
  source_observed_at=excluded.source_observed_at,expires_at=excluded.expires_at,
  quality=excluded.quality,content_hash=excluded.content_hash,season=excluded.season;
 return true;
end $$;
revoke all on function public.publish_dynasty_tiers(text,jsonb,text,text,timestamptz,timestamptz,timestamptz,integer)
 from public, anon, authenticated;
grant execute on function public.publish_dynasty_tiers(text,jsonb,text,text,timestamptz,timestamptz,timestamptz,integer)
 to service_role;

commit;
