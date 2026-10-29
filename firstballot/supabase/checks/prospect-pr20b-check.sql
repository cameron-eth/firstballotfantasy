-- PR-20b checks: run after the migration (and inside the dry run, before rollback).
select
  (select count(*) from public.dynasty_prospects_pr20b_backup) as backed_up,          -- 37
  (select count(*) from public.dynasty_prospects where id in (1005, 1000, 998, 923, 929, 917, 926, 908, 930)) as stale_left,  -- 0
  (select count(*) from (
     select lower(regexp_replace(name, '[^A-Za-z]', '', 'g')), position
     from public.dynasty_prospects group by 1, 2 having count(*) > 1) d) as duplicate_names,  -- 0
  (select count(*) from (
     select espn_id from public.dynasty_prospects where espn_id is not null
     group by espn_id having count(*) > 1) d) as shared_espn_ids,                     -- 0
  (select count(*) from public.dynasty_prospects where espn_id is null) as missing_espn;  -- 10 (8 review, 2 none)
