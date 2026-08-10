# Summer Plan Multi-Year (2026 / 2027) – Implementation Plan

**Overall Progress:** `100%`

## TLDR

Add **2026 and 2027** support on the Summer Plan page. **2027 is the default** year. Users switch years via a control on the **sidebar brand** (near “Summer 20XX”). List, calendar, child filters, and cost totals all scope to the selected year. No schema change — year is derived from `start_date`.

## Critical Decisions

- **Years shown:** Only **2026** and **2027** for now (hardcoded allowlist).
- **Default year:** **2027** on first visit; thereafter restore from `sessionStorage` (same pattern as child filter).
- **Year UI:** Option B — control on/near the sidebar brand title (`Summer 2026` / `Summer 2027`); child nav chips stay below, unchanged in role.
- **No DB migration:** Filter by calendar year of `start_date`; no `year` column.
- **Empty state (selected year has no entries):** Soft copy — e.g. “No camps for 2027” + hint to add a camp or switch years (not the global first-time empty state unless the user has **zero** plan rows at all).
- **Add to Plan dates:** Default start/end into **summer of the active year** (Jun–Aug context); user can still change to any date.
- **Cross-year edit:** If inline edit moves an entry out of the selected year, **stay on current year**; entry disappears from the filtered views (still in DB).
- **Child filters:** Built from names present in the **selected year only**.
- **Deferred (do not build now):** Copy plan from another year.

## Tasks

- [x] 🟩 **Step 1: Year helpers in `js/summer-plan.js`**
  - [x] 🟩 Replace `getSummerWeeks2026()` with `getSummerWeeks(year)` (Jun 1 – Aug 31 of that year)
  - [x] 🟩 Add constants: allowed years `[2026, 2027]`, `DEFAULT_PLAN_YEAR = 2027`
  - [x] 🟩 Add helpers: `yearFromDate(isoDate)`, `filterEntriesByYear(entries, year)`, `defaultSummerStartDate(year)` (e.g. June 1)

- [x] 🟩 **Step 2: Year state on Summer Plan page (`js/summer-plan-page.js`)**
  - [x] 🟩 Persist selected year in `sessionStorage` (validate against allowlist; fall back to 2027)
  - [x] 🟩 Compose filters: year → then child; refresh list, calendar, cost total
  - [x] 🟩 Build child filter options from **year-filtered** entries only
  - [x] 🟩 Call `getSummerWeeks(activeYear)` in calendar render
  - [x] 🟩 Soft empty UI when user has entries overall but none in `activeYear` (hint: add camp or switch year)
  - [x] 🟩 On inline date save: if entry’s new `start_date` year ≠ `activeYear`, refresh views without changing `activeYear`

- [x] 🟩 **Step 3: Sidebar year control (`summer-plan.html` + CSS)**
  - [x] 🟩 Replace static “Summer 2026” with year switcher on brand (dropdown or 2026/2027 toggle — keep compact)
  - [x] 🟩 Update brand title / meta description to reflect selected year where static copy still says 2026
  - [x] 🟩 Mobile: year control remains usable in stacked sidebar

- [x] 🟩 **Step 4: Add to Plan modal defaults (`js/summer-plan.js`)**
  - [x] 🟩 When opening modal from Summer Plan page, default dates to summer of **active year**
  - [x] 🟩 When opening from browse / detail / favorites (no plan year context), default to **2027** summer
  - [x] 🟩 Do not hard-block other years in the date inputs

- [x] 🟩 **Step 5: Docs**
  - [x] 🟩 Note deferred “copy plan from another year” in this plan / exploration index only (no UI)
  - [x] 🟩 Update `CHANGELOG.md` under Unreleased when implemented

## Out of scope

- Copy / duplicate plan across years
- Years beyond 2026–2027
- Schema `year` column
- Airtable / catalog season rollover
- Auto-switching the active year when an entry’s dates change
