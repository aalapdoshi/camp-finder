-- Optional free-text note per summer plan entry
alter table public.summer_plan
  add column if not exists notes text;
