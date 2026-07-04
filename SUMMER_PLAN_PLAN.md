# Summer Plan Feature Implementation Plan

**Overall Progress:** `95%` (Step 1 manual – user creates Supabase table)

## TLDR

Logged-in users can add camps to a summer plan with dates and a booked/want-to-book status. Summer plan page has list view (default) and simple calendar view. Add-from: camp detail, browse cards, favorites. Stored in Supabase. This iteration: current year (2026) only, no year selector.

## Critical Decisions

- **Storage: Supabase Postgres** – `summer_plan` table with RLS; same project as auth
- **Week display:** "Week of June 15" style (start date of week), not calendar week number
- **Calendar view:** Simple — weeks only; camps shown in weeks they span; empty weeks stay empty
- **Edit flow:** Inline (no modal)
- **Year:** Current year (2026) only this release; no year selector
- **Empty state:** "Select a camp and add it to the summer to get started." + link to Browse
- **Add-from:** Camp detail, browse cards, favorites (all three)
- **Status:** `booked` (confirmed) vs `want_to_book` (tentative); color-coded
- **Same camp, multiple entries:** Allowed (e.g. Week 1 and Week 3)
- **Summer range:** June 1 – August 31

## Prerequisites (Manual – User)

- [ ] 🟥 Create `summer_plan` table in Supabase (see setup section below)
- [ ] 🟥 Add RLS policies for `summer_plan` table

## Tasks

### Step 1: Supabase summer_plan table and RLS

- [ ] 🟥 **1.1** Create table `summer_plan` with columns: `id` (uuid, default gen_random_uuid()), `user_id` (uuid, references auth.users), `camp_id` (text, Airtable record ID), `start_date` (date), `end_date` (date, nullable for single-day), `status` (text: `'booked'` or `'want_to_book'`), `notes` (text, optional), `created_at` (timestamptz, default now())
- [ ] 🟥 **1.2** No unique constraint on (user_id, camp_id) — allow same camp multiple times
- [ ] 🟥 **1.3** Enable RLS; policy: users can SELECT/INSERT/UPDATE/DELETE only their own rows (`user_id = auth.uid()`)

### Step 2: Create js/summer-plan.js (Supabase CRUD)

- [x] 🟩 **2.1** `getPlanEntries()` – fetch from Supabase where `user_id = session.user.id`, return array of entries
- [x] 🟩 **2.2** `addPlanEntry(campId, startDate, endDate, status)` – insert row
- [x] 🟩 **2.3** `updatePlanEntry(id, startDate, endDate, status)` – update row
- [x] 🟩 **2.4** `removePlanEntry(id)` – delete row
- [x] 🟩 **2.5** All functions require valid session; return empty/no-op if not logged in

### Step 3: Add "Add to Summer Plan" flow (date modal)

- [x] 🟩 **3.1** Create shared add-to-plan modal: start date (required), end date (optional), status (Booked / Want to book)
- [x] 🟩 **3.2** Modal shown from camp detail, browse cards, favorites; on submit call `addPlanEntry` and close
- [x] 🟩 **3.3** If not logged in, redirect to login with `redirectTo=currentPage`
- [x] 🟩 **3.4** Wire modal to `createCampCard` (Add to plan button/icon) and `renderCampDetail` (Add to Summer Plan button)

### Step 4: Modify camp-detail.js for Add to Summer Plan

- [x] 🟩 **4.1** Add "Add to Summer Plan" button in `renderCampDetail` (alongside favorite button)
- [x] 🟩 **4.2** If not logged in, button links to login with redirectTo
- [x] 🟩 **4.3** On click, open add-to-plan modal with camp ID pre-filled

### Step 5: Modify createCampCard for Add to plan action

- [x] 🟩 **5.1** Add "Add to plan" button/icon to camp cards (browse and favorites)
- [x] 🟩 **5.2** On click, stop propagation; if not logged in redirect to login; else open add-to-plan modal
- [x] 🟩 **5.3** Ensure modal is shared and reusable from all entry points

### Step 6: Create summer-plan.html and js/summer-plan-page.js

- [x] 🟩 **6.1** Create `summer-plan.html` – nav, footer, feedback; main content for list + calendar views
- [x] 🟩 **6.2** If not logged in, show "Log in to view your summer plan" + link to login
- [x] 🟩 **6.3** If logged in and no entries, show empty state: "Select a camp and add it to the summer to get started." + link to Browse
- [x] 🟩 **6.4** If logged in with entries, show list view (default) + calendar view (tab or toggle)
- [x] 🟩 **6.5** For camps no longer in Airtable, show "No longer available" with option to remove from plan

### Step 7: List view implementation

- [x] 🟩 **7.1** Columns: Camp name | Dates (e.g. Jun 15–21) | Week (e.g. "Week of Jun 15") | Status (inline select) | Actions (inline edit, remove)
- [x] 🟩 **7.2** Sort by start date (default)
- [x] 🟩 **7.3** Inline edit: allow editing dates and status without modal; update on change
- [x] 🟩 **7.4** Remove: call `removePlanEntry`, remove row from DOM

### Step 8: Calendar view implementation

- [x] 🟩 **8.1** Simple week-based layout: June 1 – Aug 31, 2026; one row per week
- [x] 🟩 **8.2** Each week shows "Week of [date]" and any plan entries that overlap that week
- [x] 🟩 **8.3** Empty weeks show empty (no placeholder content)
- [x] 🟩 **8.4** Camp entries display camp name; color by status (booked vs want to book)

### Step 9: Add Summer Plan to nav and footer

- [x] 🟩 **9.1** Add "Summer Plan" link to nav in `index.html`, `browse.html`, `camp-detail.html`, `about.html`, `favorites.html`, `summer-plan.html`
- [x] 🟩 **9.2** Add "Summer Plan" to footer Quick Links in all pages

### Step 10: CSS and polish

- [x] 🟩 **10.1** Add-to-plan modal styles
- [x] 🟩 **10.2** List view: status select styling (booked = green, want_to_book = amber)
- [x] 🟩 **10.3** Calendar view: week rows, entry pills/blocks
- [x] 🟩 **10.4** Empty state styling

## Supabase Setup (Manual)

```sql
-- Create summer_plan table
create table public.summer_plan (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  camp_id text not null,
  start_date date not null,
  end_date date,
  status text not null check (status in ('booked', 'want_to_book')),
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.summer_plan enable row level security;

-- Policy: users can only access their own rows
create policy "Users can manage own summer plan"
  on public.summer_plan
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Multi-child labels (Option A)

```sql
alter table public.summer_plan
  add column if not exists child_name text;
```

See `supabase/migrations/20260529120000_add_child_name.sql` and `MULTI_KID_SUMMER_PLAN_PLAN.md`.

### Estimated cost per entry (`estimated_cost`)

**Semantics:** One user-entered **total dollar amount** for that plan row (the whole camp stint). It is **not** per day, per week, or prorated by how many weeks the camp spans on the calendar. List view, calendar cards, and the sidebar total all read **only** the saved `estimated_cost` — never camp catalog **Cost Per Week** / **Cost Display**.

- Modal label: **Total Estimated Cost ($)**; field starts empty (blank saves as `0`).
- List: **Total cost** column — inline edit saves back to `estimated_cost`.
- Calendar: shows the same saved total on the camp’s **first** week only (one card per entry).
- Sidebar total: sum of `estimated_cost` for entries matching the active child filter (each entry counted once).

Run after deploying code that writes `estimated_cost` (Add to Plan modal). In Supabase **SQL Editor**:

```sql
alter table public.summer_plan
  add column if not exists estimated_cost numeric not null default 0;

update public.summer_plan
  set estimated_cost = 0
  where estimated_cost is null;
```

Or apply `supabase/migrations/20260703190000_add_estimated_cost.sql`. Blank cost in the UI saves as `0` (not null) so future totals can use `SUM(estimated_cost)`.

### Notes per entry (`notes`)

Optional free-text note per plan row (max 500 characters in UI; blank saves as `null`). Set in Add to Plan modal or edited later from Summer Plan list/calendar.

Run before testing notes in production. In Supabase **SQL Editor**:

```sql
alter table public.summer_plan
  add column if not exists notes text;
```

Or apply `supabase/migrations/20260703220000_add_notes.sql`.

**If `summer_plan` does not exist yet**, run the full table setup in the **Supabase Setup (Manual)** section above first (create table, RLS, policies), then run the `child_name`, `estimated_cost`, and `notes` migrations in order.

## File Summary

| File | Action |
|------|--------|
| `js/summer-plan.js` | Create – Supabase CRUD for plan entries |
| `js/summer-plan-page.js` | Create – summer plan page logic, list + calendar render |
| `summer-plan.html` | Create – Summer Plan page |
| `js/airtable.js` | Modify – `createCampCard` add "Add to plan" action |
| `js/browse.js` | Modify – include summer-plan.js, wire add-to-plan |
| `js/camp-detail.js` | Modify – add "Add to Summer Plan" button |
| `js/favorites-page.js` | Modify – add "Add to plan" to cards |
| `index.html`, `browse.html`, `camp-detail.html`, `about.html`, `favorites.html` | Modify – add Summer Plan nav + footer link |
| `css/styles.css` | Modify – modal, status badges, calendar, empty state |
| Shared add-to-plan modal | Create – likely in `summer-plan.js` or `main.js` as reusable component |
