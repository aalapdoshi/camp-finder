-- Option A: child label on summer plan entries (no children table)
alter table public.summer_plan
  add column if not exists child_name text;
