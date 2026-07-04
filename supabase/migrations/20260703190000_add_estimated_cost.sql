-- User-entered total for this plan entry (whole camp stint). Not per day/week; never derived from dates or catalog.
alter table public.summer_plan
  add column if not exists estimated_cost numeric not null default 0;

update public.summer_plan
  set estimated_cost = 0
  where estimated_cost is null;
