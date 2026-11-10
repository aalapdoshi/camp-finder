# Feature Implementation Plan

**Overall Progress:** `96%`

## TLDR

On the Summer Plan page, let a signed-in user fill an empty week (or an empty plan) with a one-off **custom camp**, **Vacation**, or **No Camp**. Custom camps stay on that user’s plan. A custom camp can be emailed to the site as a catalog suggestion. Catalog camps are unchanged.

## Critical Decisions

- **Where it starts:** Summer Plan page only. Each empty calendar week, the first-plan empty screen, and the “no camps for this year” screen offer **Search camp** (Browse), **Add a Custom Camp**, **Vacation**, and **No Camp**. The week control hides once that week shows a camp. List view shows the rows and is not an add entry point. Browse, favorites, and camp detail stay catalog-only.
- **Which weeks count as empty:** The same weeks that currently say “No camps planned this week,” after the active child filter. A week that only has another child’s camp still shows the control when that child is filtered out.
- **Date defaults:** From a week, start is that week’s Monday and end is that week’s Sunday (`getSummerWeeks` bounds). The user can change both. From an empty screen, use the first summer week of the active plan year (stored year, otherwise 2027).
- **Three row kinds, no camp library:** Each submit inserts one `summer_plan` row. There is no saved list of custom camps to pick again. The user can still add Vacation in one week and a different custom camp in another week. Custom camp name is fixed after save.
- **`entry_type`:** `catalog` (existing rows), `custom`, `vacation`, `no_camp`. `camp_id` stays required for `catalog` and is null for the other three. No new table. Existing RLS stays.
- **Custom camp fields:** Name (required), dates, location (optional), total cost (optional; blank saves as `0`), child (required, same rules as Add to Plan), status (`want_to_book` or `booked`).
- **Vacation and No Camp:** Names are the presets **Vacation** and **No Camp**. The form is start and end date only. No name, location, cost, child, or status picker. Persist `status = booked`, `child_name = null`, `custom_location = null`, and `estimated_cost = 0`. They show under every child filter and under All. Legacy catalog rows with a null child stay on the existing Unassigned path.
- **Display:** Plain text name, location under the name, on list and calendar. No camp-detail link, no “No longer available,” no favorites, no registration-opens invite.
- **Edit later:** List inline edit for dates, cost, and location. Custom rows keep the existing child and status edits. Vacation and No Camp show “All children” and do not edit child or status.
- **Actions:** Custom + Booked gets the existing pickup/dropoff action (name from the row, no catalog fields, no detail URL). Custom rows also get **Suggest adding this camp to the catalog**. Vacation and No Camp get Remove plus the inline edits only.
- **Suggestion email:** Confirm, then a Netlify function sends one plain email to **a2summercamp@umich.edu** using the existing Resend from-address. Body: camp name, dates, location, cost, and the user’s account email. Nothing is written to the catalog. Vacation and No Camp do not get this link.
- **Notes:** The custom form has no note field. Note actions stay hidden on these three row kinds. Catalog notes stay as they are.
- **Cost total:** These rows use `estimated_cost` and count in the existing total. A blank cost is `0`.

## Tasks

- [ ] 🟨 **Step 1: Schema**
  - [x] 🟩 Migration: `entry_type text not null default 'catalog'` check (`catalog`, `custom`, `vacation`, `no_camp`); `custom_name text`; `custom_location text`; `camp_id` nullable
  - [x] 🟩 Check: `catalog` requires `camp_id`; `custom` requires `custom_name` and null `camp_id`; `vacation` and `no_camp` require null `camp_id` and null `child_name`
  - [x] 🟩 Note the SQL in `SUMMER_PLAN_PLAN.md`
  - [ ] 🟥 Run the migration on Supabase (manual — operator)

- [x] 🟩 **Step 2: CRUD (`js/summer-plan.js`)**
  - [x] 🟩 Select `entry_type`, `custom_name`, `custom_location` in `getPlanEntries()`
  - [x] 🟩 Insert helper for `custom`, `vacation`, and `no_camp` (child + status rules above; blank cost → `0`)
  - [x] 🟩 Allow `updatePlanEntry()` to save `custom_location`
  - [x] 🟩 Leave catalog `addPlanEntry()` unchanged

- [x] 🟩 **Step 3: Add form (Summer Plan page only)**
  - [x] 🟩 One modal, three modes: custom camp, Vacation, No Camp
  - [x] 🟩 Custom mode: name, dates, location, cost, child picker, Want to book / Booked
  - [x] 🟩 Vacation and No Camp: preset title and dates only
  - [x] 🟩 Prefill dates from the week that opened the form

- [x] 🟩 **Step 4: Entry points**
  - [x] 🟩 On each empty calendar week: Search camp, Add a Custom Camp, Vacation, No Camp. Hide that week’s control when the week has a card
  - [x] 🟩 Same three actions on `#summer-plan-empty-state` and `#summer-plan-year-empty`
  - [x] 🟩 After the first row is saved from the full empty screen, show the plan

- [x] 🟩 **Step 5: List and calendar**
  - [x] 🟩 Resolve the label from `entry_type` (typed name, Vacation, or No Camp)
  - [x] 🟩 Show location under the name. Plain text, no detail link
  - [x] 🟩 Include `vacation` and `no_camp` in every child filter
  - [x] 🟩 Custom + Booked: pickup/dropoff. No registration invite on these rows
  - [x] 🟩 Hide note actions on these rows

- [x] 🟩 **Step 6: Edit location**
  - [x] 🟩 List input for location on these rows, saved through `updatePlanEntry()`

- [x] 🟩 **Step 7: Suggest adding this camp to the catalog**
  - [x] 🟩 Link on custom rows only, in list actions and on the calendar card
  - [x] 🟩 Confirm, then POST to a new Netlify function
  - [x] 🟩 Function: Supabase JWT check (same pattern as the calendar functions); plain Resend email to `a2summercamp@umich.edu`; reuse `getResendConfig()`; no calendar attachment
  - [x] 🟩 Show success or error on the page

- [x] 🟩 **Step 8: Docs**
  - [x] 🟩 `CHANGELOG.md` under Unreleased
  - [x] 🟩 Mark this plan’s steps as done after they ship
