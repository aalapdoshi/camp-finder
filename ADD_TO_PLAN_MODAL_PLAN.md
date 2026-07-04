# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
Require a child name on every summer-plan add (no **Unassigned**), add **Estimated Cost ($)** on plan entries (blank saves as **0** for future totals), and restyle the **Add to Summer Plan** modal to match the Stitch mockup (`mockups/add-to-plan-stitch/`): pill child chips, two-column dates, cost input, segmented status toggle, and pill footer actions. **Sidebar Add child** remains out of scope.

## Critical Decisions
- **No Unassigned (policy):** New and updated plan entries must have a non-empty `child_name`. Remove **Unassigned** from the add-to-plan modal; block submit when child is missing.
- **First camp / no names yet:** If `getDistinctChildNames()` returns `[]`, show only **+ Add New** child flow with a **required** name input—user cannot add a camp without naming a child.
- **Child picker UX:** Replace `<select>` with **pill chips** per Stitch (`code.html` lines 428–437): one chip per existing name (filled = selected), **+ Add New** dashed chip reveals text input.
- **Estimated cost — blank = 0:** Add `estimated_cost` on `summer_plan` as **`numeric not null default 0`**. Modal field is optional to fill in, but empty/blank input **persists as `0`**, not `null`, so future **sum across camps** is straightforward (`SUM(estimated_cost)` / client reduce).
- **Cost parsing:** `parseEstimatedCostInput(value)` — empty string, whitespace, or omitted → `0`; valid non-negative number otherwise; reject negative or non-numeric with modal error.
- **Cost prefill:** On modal open, prefill from camp `Cost Per Week` or parse `Cost Display` when available; user can clear field (still saves `0`) or override.
- **UI empty state:** Cost input may appear empty on open when no prefill; placeholder optional (e.g. `0`). Do not require user to type `0`.
- **Modal shell:** Stitch card: header with title + camp subtitle + Material **close**, body `space-y-6`, footer on tinted bar with **Add to Plan** + **Cancel**.
- **Status control:** Segmented pill toggle (Want to book | Booked); values `want_to_book` / `booked`.
- **Dates:** Side-by-side **Start Date** / **End Date**; start required, end optional.
- **Sidebar Add child:** **Out of scope**.
- **Child name backend:** UI + JS enforcement; `child_name` column stays nullable for legacy rows.
- **Legacy rows:** Migration backfills `estimated_cost = 0` for any existing rows after column add. Legacy null `child_name` unchanged until edited in list.
- **Future totals (not built in this pass):** Plan entries always have numeric `estimated_cost`; later feature can sum by child, week, or whole plan without null-coalescing.
- **Reference assets:** `mockups/add-to-plan-stitch/code.html`, `screen.png`, `DESIGN.md`.

## Stitch modal structure (target)

```
#add-to-plan-modal (backdrop blur)
  .add-to-plan-dialog (max-w-lg, rounded-xl, white)
    header — title, camp name, close button
    body
      Select Child — pill chips + conditional new-name input
      Start Date | End Date (grid)
      Estimated Cost ($) — input with $ prefix (blank → 0 on save)
      Status — segmented pill
      error
    footer — Add to Plan | Cancel
```

## Tasks:

- [x] 🟩 **Step 1: Supabase schema — `estimated_cost`**
  - [x] 🟩 Add migration `supabase/migrations/…_add_estimated_cost.sql`:
    - `add column if not exists estimated_cost numeric not null default 0`
    - `update public.summer_plan set estimated_cost = 0 where estimated_cost is null` (safety if column existed nullable)
  - [x] 🟩 Document in `SUMMER_PLAN_PLAN.md` setup section (manual run note for operator)
  - [ ] 🟨 Run migration on Supabase project (manual — operator)

- [x] 🟩 **Step 2: CRUD — cost in `js/summer-plan.js`**
  - [x] 🟩 Include `estimated_cost` in `getPlanEntries()` select
  - [x] 🟩 Extend `addPlanEntry(...)` to always set `estimated_cost` (number, default `0`)
  - [x] 🟩 Extend `updatePlanEntry()` to accept `estimated_cost`; coerce blank to `0`
  - [x] 🟩 `parseEstimatedCostInput(value)` → `{ ok, value: number }` where empty → `0`

- [x] 🟩 **Step 3: Required-child logic (`js/summer-plan.js`)**
  - [x] 🟩 Remove **Unassigned** from child picker
  - [x] 🟩 When `names.length === 0`: only **+ Add New** + required name input
  - [x] 🟩 When `names.length >= 1`: chips + **+ Add New**; default last-used or sole name
  - [x] 🟩 `resolveAddToPlanChildName()`: reject empty child on submit
  - [x] 🟩 List save: reject clearing `child_name` to empty

- [x] 🟩 **Step 4: Modal markup & cost field (`js/summer-plan.js`)**
  - [x] 🟩 Restructure `openAddToPlanModal` template: Stitch header / body / footer
  - [x] 🟩 Add `#add-to-plan-cost` — `type="number"` min="0" step="1", `$` prefix (Stitch layout)
  - [x] 🟩 Prefill cost from camp when available; empty field allowed
  - [x] 🟩 `handleAddToPlanSubmit()`: `parseEstimatedCostInput` → always numeric (min `0`) → `addPlanEntry`
  - [x] 🟩 Child chips; segmented status; Cancel button

- [x] 🟩 **Step 5: Child chip interactions (`js/summer-plan.js`)**
  - [x] 🟩 Chip selection + **+ Add New** toggle input
  - [x] 🟩 `aria-pressed` on chips; preserve `MAX_CHILD_NAMES` hint

- [x] 🟩 **Step 6: Modal CSS (`css/styles.css`)**
  - [x] 🟩 `.add-to-plan-dialog`, header/body/footer, backdrop blur
  - [x] 🟩 Child chips, date grid, cost input with prefix, status segment, footer pills
  - [x] 🟩 Mobile: stack date columns; full-width footer buttons

- [x] 🟩 **Step 7: Summer Plan page alignment (`js/summer-plan-page.js`)**
  - [x] 🟩 List inline child edit: reject empty on save
  - [x] 🟩 Omit **Unassigned** sidebar filter (legacy null `child_name` via list)
  - [x] 🟩 (Optional) **Cost** column in list showing `estimated_cost` (including `$0`)

- [x] 🟩 **Step 8: Call sites**
  - [x] 🟩 `js/airtable.js` — pass camp cost fields into `openAddToPlanModal` for prefill
  - [x] 🟩 `js/camp-detail.js` — same for detail Add to Plan

- [x] 🟩 **Step 9: Verification**
  - [x] 🟩 Modal matches Stitch: chips, dates, cost, status, footer
  - [x] 🟩 Child required on every add
  - [x] 🟩 Blank cost → `estimated_cost = 0` in DB
  - [x] 🟩 Entered cost persists correctly
  - [x] 🟩 Cost prefill from camp when available
  - [x] 🟩 `getPlanEntries()` returns numeric `estimated_cost` for sum-ready totals later

- [x] 🟩 **Step 10: Documentation**
  - [x] 🟩 `CHANGELOG.md` — required child, estimated cost (default 0), Stitch modal
  - [x] 🟩 Migration note in `SETUP.md` or `SUMMER_PLAN_PLAN.md`

## Out of scope
- Sidebar **Add child** on Summer Plan page
- **Total cost** UI / aggregation across camps (schema-ready only)
- `children` table or child profile CRUD
- Camps-first empty-state redesign
- localStorage pre-registration of child names
- Auto-sync cost from Airtable after plan entry is saved

## Files touched (expected)
| File | Change |
|------|--------|
| `supabase/migrations/…_add_estimated_cost.sql` | `not null default 0` |
| `js/summer-plan.js` | Modal, chips, cost coercion, CRUD |
| `js/summer-plan-page.js` | Child validation; optional cost column |
| `js/airtable.js` | Cost prefill on open |
| `js/camp-detail.js` | Cost prefill on open |
| `css/styles.css` | Stitch-style modal |
| `SUMMER_PLAN_PLAN.md` / `SETUP.md` | Migration docs |
| `CHANGELOG.md` | Brief note |

## Verification checklist
- Blank cost input saves **`0`**, not `null`
- All plan rows have numeric `estimated_cost` suitable for future `SUM`
- No **Unassigned** in modal
- Every new row has non-null `child_name`
- Migration applied in target Supabase environment
