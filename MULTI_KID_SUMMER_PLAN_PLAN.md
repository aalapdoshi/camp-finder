# Multi-Child Summer Plan – Implementation Plan (Option A)

**Overall Progress:** `100%`

## TLDR

Extend the shipped summer plan with an optional **`child_name`** on each plan entry. Families keep **one shared calendar and list**; they label entries by child, **filter** the plan by child name, and see **color-coded** calendar pills. No `children` table, no per-child profile CRUD. Favorites stay household-level.

**Source:** `MULTI_KID_SUMMER_PLAN_EXPLORATION.md` — Option A (smallest change).

---

## Critical Decisions

- **Option A** — shared family view + child labels; filtering is the main per-child UX (not separate calendars).
- **Schema** — `summer_plan.child_name text` only (nullable); no new tables, no RLS beyond existing `summer_plan` policies.
- **Child names** — free-text labels on entries; dropdown in add-to-plan modal populated from **distinct names already used** on the user’s plan, plus “type a new name” (combobox / select + custom input).
- **Favorites** — household-level (unchanged).
- **Existing rows** — `child_name` null → show as **Unassigned**; optional inline assign from list/calendar.
- **Same camp, two kids** — two plan rows with different `child_name` (same as today’s multi-entry model).
- **Colors** — deterministic palette by hashing `child_name` (no stored color column).
- **Max names** — soft cap of **6** distinct child names per account (validate on add; show friendly error).
- **Year** — still 2026 only (no year selector in this iteration).

---

## Tasks

- [x] 🟩 **Step 1: Supabase schema**
  - [x] 🟩 Add migration: `alter table public.summer_plan add column child_name text;`
  - [x] 🟩 Document SQL in `supabase/migrations/` and `SUMMER_PLAN_PLAN.md` setup section
  - [ ] 🟥 Run migration on Supabase project (manual — operator)
  - [x] 🟩 Remove Option B migration file (`children` table / `child_id`) if present and not deployed

- [x] 🟩 **Step 2: Revert Option B code (if present)**
  - [x] 🟩 Delete `js/children.js` and script tags (if added)
  - [x] 🟩 Remove `child_id` / `getChildren` / profile flows from `js/summer-plan.js`
  - [x] 🟩 Ensure `addPlanEntry` / `updatePlanEntry` / `getPlanEntries` use `child_name` only

- [x] 🟩 **Step 3: `js/summer-plan.js` — CRUD + modal**
  - [x] 🟩 `getPlanEntries({ childName?: string })` — filter by name; `'all'` / omitted = all; `'unassigned'` = null names
  - [x] 🟩 `addPlanEntry(..., childName)` and `updatePlanEntry` accept `child_name`
  - [x] 🟩 `getDistinctChildNames()` — query distinct non-null `child_name` for current user (for dropdown)
  - [x] 🟩 Add-to-plan modal: child field (select existing + optional new name input); enforce max 6 distinct names on submit
  - [x] 🟩 Helper: `getChildColor(childName)` — map name → palette hex for UI

- [x] 🟩 **Step 4: Summer Plan page — filter + display**
  - [x] 🟩 `summer-plan.html` — filter control (All / per-name chips or select + Unassigned if any)
  - [x] 🟩 `js/summer-plan-page.js` — apply filter to list + calendar; persist active filter in `sessionStorage`
  - [x] 🟩 List table: **Child** column (show name badge; inline edit: select existing or text input)
  - [x] 🟩 Calendar entries: prefix or badge with child name; left border / background tint using `getChildColor`
  - [x] 🟩 Empty / edge cases: no entries unchanged; entries with null name show “Unassigned”

- [x] 🟩 **Step 5: Styles**
  - [x] 🟩 `css/styles.css` — filter chips/toggle, child badges, calendar entry colors (reuse status badge patterns)

- [x] 🟩 **Step 6: Entry points (minimal)**
  - [x] 🟩 Pass last-used child name into modal via `sessionStorage` (`summerPlanLastChildName`)
  - [x] 🟩 No changes to favorites scope

- [x] 🟩 **Step 7: Docs**
  - [x] 🟩 `CHANGELOG.md` — multi-child (Option A) shipped note
  - [x] 🟩 Update `MULTI_KID_SUMMER_PLAN_EXPLORATION.md` status → Option A implemented
  - [x] 🟩 Mark steps in this file

---

## Supabase migration (Option A)

Run in Supabase SQL Editor:

```sql
alter table public.summer_plan
  add column if not exists child_name text;
```

File: `supabase/migrations/20260529120000_add_child_name.sql`

---

## Test plan

1. Run migration; confirm existing plan rows load with Unassigned where `child_name` is null.
2. Add camp with new child name “Emma” → appears on list and calendar with color.
3. Add second entry for “Noah” → filter to Noah shows only his entries; **All** shows both.
4. Add camp with same name as existing from dropdown → no duplicate-name issues.
5. Try 7th distinct name → blocked with clear message.
6. Inline edit child on list row → calendar updates.
7. Add-to-plan from browse remembers last child name in modal.
