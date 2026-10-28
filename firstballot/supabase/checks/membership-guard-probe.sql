-- Read-only probe for PR-22 (run inside begin; ... rollback;): acts as a signed-in user and
-- reports whether membership self-grants, subscription writes and check_membership_status are
-- blocked while ordinary profile edits still work.
--   { echo begin; cat supabase/checks/membership-guard-probe.sql; echo rollback; } | supabase db query --linked -f /dev/stdin

create temp table t_results(test text, outcome text);
grant insert, select on t_results to authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select auth_id from public.user_profiles where not membership_status and auth_id is not null limit 1), 'role','authenticated')::text, true);
set local role authenticated;
do $$ begin
  begin
    update public.user_profiles set membership_status = true where auth_id = auth.uid();
    insert into t_results values ('1 self-grant membership', 'ALLOWED (' || (select count(*) from public.user_profiles where auth_id = auth.uid() and membership_status) || ' row now member)');
  exception when insufficient_privilege then insert into t_results values ('1 self-grant membership', 'blocked: ' || sqlerrm); end;
  begin
    update public.user_profiles set sleeper_username = coalesce(sleeper_username, 'probe') where auth_id = auth.uid();
    insert into t_results values ('2 edit own sleeper_username', 'allowed');
  exception when others then insert into t_results values ('2 edit own sleeper_username', 'ERROR ' || sqlstate || ' ' || sqlerrm); end;
  -- As a brand-new user (no profile yet), the way ensureUserProfile inserts.
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  begin
    insert into public.user_profiles(auth_id, email, username, membership_status, feature_access) values (auth.uid(), 'probe@example.invalid', 'probe', false, false);
    insert into t_results values ('3 new profile, membership false', 'allowed');
  exception when others then insert into t_results values ('3 new profile, membership false', case when sqlstate = '42501' then 'BLOCKED ' else 'passed guard, then ' end || sqlstate || ' ' || left(sqlerrm, 50)); end;
  begin
    insert into public.user_profiles(auth_id, email, username, membership_status, feature_access) values (auth.uid(), 'probe2@example.invalid', 'probe2', true, false);
    insert into t_results values ('3b new profile, membership TRUE', 'ALLOWED');
  exception when others then insert into t_results values ('3b new profile, membership TRUE', case when sqlstate = '42501' then 'blocked ' else 'passed guard, then ' end || sqlstate || ' ' || left(sqlerrm, 50)); end;
  begin
    insert into public.subscriptions(auth_id, status) values (auth.uid(), 'active');
    insert into t_results values ('4 self-insert subscription', 'ALLOWED');
  exception when others then insert into t_results values ('4 self-insert subscription', 'blocked: ' || sqlstate); end;
  begin
    perform public.check_membership_status('someone@example.invalid');
    insert into t_results values ('5 call check_membership_status', 'ALLOWED');
  exception when others then insert into t_results values ('5 call check_membership_status', 'blocked: ' || sqlstate); end;
end $$;
reset role;
select test, outcome from t_results order by test;
