-- Membership and billing fields are managed by billing, never by the user (PR-22, audit P1-9).
--
-- Legacy policies let a signed-in user update their own user_profiles row with no column
-- limits (so membership_status / feature_access / stripe_id), insert and update their own
-- subscriptions rows, and call check_membership_status(email) for any email. No app code
-- trusts these fields today (entitlements come from account_billing), but they become a
-- privilege escalation the moment something does.
--
-- Profile edits keep working: the app's own insert sends membership_status = false and
-- feature_access = false (app/api/user-profile/route.ts), which the guard allows, and its
-- update only touches sleeper_username / updated_at. Service-role writers are unaffected.
--
-- Rollback:
--   drop trigger if exists guard_profile_entitlements on public.user_profiles;
--   drop function if exists public.guard_profile_entitlements();
--   create policy "Users can update own membership status" on public.user_profiles
--     for update using (auth_id = auth.uid());
--   create policy "Users can insert own subscriptions" on public.subscriptions
--     for insert with check (auth_id = auth.uid());
--   create policy "Users can update own subscriptions" on public.subscriptions
--     for update using (auth_id = auth.uid());
--   grant insert, update, delete on public.subscriptions to anon, authenticated;
--   grant execute on function public.check_membership_status(text) to public, anon, authenticated;

create or replace function public.guard_profile_entitlements()
returns trigger
language plpgsql
as $$
begin
  -- PostgREST runs client requests as anon/authenticated; billing runs as service_role.
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if coalesce(new.membership_status, false)
        or coalesce(new.feature_access, false)
        or new.stripe_id is not null then
        raise exception 'membership fields are managed by billing' using errcode = '42501';
      end if;
    elsif new.membership_status is distinct from old.membership_status
      or new.feature_access is distinct from old.feature_access
      or new.stripe_id is distinct from old.stripe_id then
      raise exception 'membership fields are managed by billing' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_entitlements on public.user_profiles;
create trigger guard_profile_entitlements
  before insert or update on public.user_profiles
  for each row execute function public.guard_profile_entitlements();

drop policy if exists "Users can update own membership status" on public.user_profiles;
drop policy if exists "Users can insert own subscriptions" on public.subscriptions;
drop policy if exists "Users can update own subscriptions" on public.subscriptions;
revoke insert, update, delete, truncate, references, trigger
  on public.subscriptions from anon, authenticated;

revoke execute on function public.check_membership_status(text) from public, anon, authenticated;
