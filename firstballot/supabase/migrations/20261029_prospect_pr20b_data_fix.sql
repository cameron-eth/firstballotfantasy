-- PR-20 (= prospect plan P1), part b: prospect data fixes (audit R4-2).
--
-- 1. Remove 9 stale 2026-class duplicates. Each player stayed in school and has a current,
--    graded 2027 row; the April 2026 row (grade about 45) is the stale copy. No user grade or
--    note references them (checked 2026-10-29), and both referencing tables cascade.
-- 2. Backfill 28 ESPN ids confirmed by scripts/prospects/lookup-espn-ids.mjs: one ESPN player
--    whose position, college and draft year all match (docs/data-architecture/PR20B_ESPN_LOOKUP.md).
--    Rows still marked review or none are left for the owner.
--
-- Every touched row is copied to public.dynasty_prospects_pr20b_backup first.
--
-- Rollback (restores both changes exactly):
--   insert into public.dynasty_prospects
--     select * from public.dynasty_prospects_pr20b_backup b
--     where not exists (select 1 from public.dynasty_prospects p where p.id = b.id);
--   update public.dynasty_prospects p set espn_id = b.espn_id, updated_at = b.updated_at
--     from public.dynasty_prospects_pr20b_backup b where p.id = b.id;
--   drop table public.dynasty_prospects_pr20b_backup;

create table if not exists public.dynasty_prospects_pr20b_backup
  (like public.dynasty_prospects including defaults);
alter table public.dynasty_prospects_pr20b_backup enable row level security;
revoke all on public.dynasty_prospects_pr20b_backup from anon, authenticated;

create temporary table pr20b_stale (id integer primary key) on commit drop;
insert into pr20b_stale (id) values (1005), (1000), (998), (923), (929), (917), (926), (908), (930);

create temporary table pr20b_espn (id integer primary key, espn_id bigint not null) on commit drop;
insert into pr20b_espn (id, espn_id) values
  (731, 3115394), -- 2018 DJ Chark → DJ Chark
  (160, 4034952), -- 2020 LaMical Perine → LaMical Perine
  (222, 4242433), -- 2021 Josh Palmer → Joshua Palmer
  (343, 4259305), -- 2022 Bo Melton → Bo Melton
  (348, 4361529), -- 2022 Isaih Pacheco → Isiah Pacheco
  (283, 4567048), -- 2022 Ken Walker III → Kenneth Walker III
  (380, 4429160), -- 2023 Devon Achane → DeVon Achane
  (373, 4366031), -- 2023 Nathaniel Dell → Tank Dell
  (927, 4870799), -- 2026 Nico Iamaleava → Nico Iamaleava
  (39, 4870795), -- 2026 Makai Lemon → Makai Lemon
  (957, 4686658), -- 2026 Mike Washington Jr. → Mike Washington Jr.
  (11, 4594749), -- 2026 Michael Trigg → Michael Trigg
  (28, 4870612), -- 2026 Zachariah Branch → Zachariah Branch
  (14, 4682648), -- 2026 Malachi Fields → Malachi Fields
  (35, 4685246), -- 2026 Kaytron Allen → Kaytron Allen
  (27, 4698597), -- 2026 Barion Brown → Barion Brown
  (943, 4685553), -- 2026 Brenen Thompson → Brenen Thompson
  (24, 4567747), -- 2026 Garrett Nussmeier → Garrett Nussmeier
  (40, 4832800), -- 2026 Denzel Boston → Denzel Boston
  (6, 4832846), -- 2026 Demond Claiborne → Demond Claiborne
  (3, 4832955), -- 2026 Emmett Johnson → Emmett Johnson
  (7, 4869961), -- 2026 Chris Bell → Chris Bell
  (31, 4430841), -- 2026 Carson Beck → Carson Beck
  (9, 4685512), -- 2026 Jadarian Price → Jadarian Price
  (946, 4885466), -- 2026 Jeff Caldwell → Jeff Caldwell
  (953, 5081338), -- 2026 Kaden Wetjen → Kaden Wetjen
  (944, 4869748), -- 2026 Zavion Thomas → Zavion Thomas
  (952, 4685441); -- 2026 Kendrick Law → Kendrick Law

insert into public.dynasty_prospects_pr20b_backup
  select p.* from public.dynasty_prospects p
  where p.id in (select id from pr20b_stale) or p.id in (select id from pr20b_espn);

-- Only a 2026 row whose player has a 2027 row of the same name and position is removed.
delete from public.dynasty_prospects p
using pr20b_stale s
where p.id = s.id
  and p.draft_year = 2026
  and exists (
    select 1 from public.dynasty_prospects c
    where c.draft_year = 2027 and c.name = p.name and c.position = p.position and c.id <> p.id
  );

-- Only rows that still have no ESPN id are filled.
update public.dynasty_prospects p
set espn_id = e.espn_id, updated_at = now()
from pr20b_espn e
where p.id = e.id and p.espn_id is null;
