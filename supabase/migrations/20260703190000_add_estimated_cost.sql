-- Estimated cost per plan entry (dollars). Blank UI input saves as 0 for future totals.
alter table public.summer_plan
  add column if not exists estimated_cost numeric not null default 0;

update public.summer_plan
  set estimated_cost = 0
  where estimated_cost is null;
