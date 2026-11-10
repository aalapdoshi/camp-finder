-- One-off Summer Plan rows that are not catalog camps: custom, vacation, no_camp.
-- camp_id stays required for catalog rows and is null for the other three.
-- Run in the Supabase SQL editor before using Add a camp / Vacation / No Camp.

alter table public.summer_plan
  add column if not exists entry_type text not null default 'catalog';

alter table public.summer_plan
  add column if not exists custom_name text;

alter table public.summer_plan
  add column if not exists custom_location text;

alter table public.summer_plan
  alter column camp_id drop not null;

alter table public.summer_plan
  drop constraint if exists summer_plan_entry_type_check;

alter table public.summer_plan
  add constraint summer_plan_entry_type_check
  check (entry_type in ('catalog', 'custom', 'vacation', 'no_camp'));

alter table public.summer_plan
  drop constraint if exists summer_plan_entry_shape_check;

alter table public.summer_plan
  add constraint summer_plan_entry_shape_check
  check (
    (
      entry_type = 'catalog'
      and camp_id is not null
    )
    or (
      entry_type = 'custom'
      and camp_id is null
      and custom_name is not null
      and length(btrim(custom_name)) > 0
    )
    or (
      entry_type in ('vacation', 'no_camp')
      and camp_id is null
      and child_name is null
    )
  );
