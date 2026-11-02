# Multi-City Browse Filter — Implementation Plan

**Overall Progress:** `100%`

## TLDR

Let parents pick **more than one city** on Browse (e.g. Saline + Ann Arbor + Dexter). Replace the City `<select>` with a **dropdown button that opens a panel of native checkboxes**. A camp matches if its one `City` value is in the selected set (OR). None checked = all cities, same as today’s “All cities.”

## Critical Decisions

- **Where:** Browse sidebar only. That is the only city control. Homepage search has no city picker — do not add one. Text search already matches city names in the query string.
- **UI (locked):** Closed control looks like today’s City dropdown. Open it to check several cities; it stays open until the user is done. Closed label: `All cities` when none selected, otherwise the selected names (e.g. `Ann Arbor, Saline`), truncated with an ellipsis so the sidebar does not grow. Hover `title` shows the full list.
- **Not using:** Always-visible checkbox list, pill chips, native `<select multiple>`, typeahead + chips, filter-bar redesign.
- **Match:** OR. Selected `{Saline, Ann Arbor, Dexter}` shows camps in any of those cities.
- **Empty selection:** No boxes checked means all cities (current default).
- **Clear filters:** Uncheck every city, close the panel, button reads `All cities`.
- **Data:** Unchanged. Each camp still has one `City`. Sheet sync still keeps the first city if an address lists several. A camp matches at most one selected city.
- **Out of scope:** Category multi-select, homepage city UI, catalog/schema changes, `mockups/browse-filters-proposed.html`.

### Accessibility (locked with the UI)

- Trigger is a `<button>` (`aria-expanded`, `aria-controls` pointing at the panel). Not a clickable `<div>`.
- Panel holds native `<input type="checkbox">` + `<label>` for each city.
- Keyboard: Enter/Space opens; Tab moves through cities; Space toggles; Escape closes and returns focus to the button. Click outside also closes.
- Panel **stays open** while checking more than one city (must not close on first check).
- Closed panel is not in the tab order (`hidden` or removed).
- Checkbox state is the selected indicator; color is not the only cue.

## Tasks

- [x] 🟩 **Step 1: Filter logic (`js/airtable.js`)**
  - [x] 🟩 Change `filterCamps` location check from `filters.city` string (`'all'` or one name) to `filters.cities` array
  - [x] 🟩 If `cities` is missing or empty, do not filter by city
  - [x] 🟩 If `cities` has names, keep the camp when `fields['City']` is in that list
  - [x] 🟩 Keep `getCities()` as a sorted unique list (used to fill the checkbox panel)

- [x] 🟩 **Step 2: Browse state (`js/browse.js`)**
  - [x] 🟩 Store `browseFilters.cities` as `[]` instead of `city: 'all'`
  - [x] 🟩 Render city checkboxes from `getCities()` into the dropdown panel
  - [x] 🟩 On checkbox change: set `cities` to the checked values; update the button label; re-render results; **do not close** the panel
  - [x] 🟩 Open/close: toggle `aria-expanded`, click-outside, Escape (focus back to button)
  - [x] 🟩 Clear-all resets `cities` to `[]`, unchecks every box, sets button to `All cities`

- [x] 🟩 **Step 3: Browse markup + CSS (`browse.html`, `css/styles.css`)**
  - [x] 🟩 Replace `#browse-city` `<select>` with a City group: button trigger + hidden checkbox panel
  - [x] 🟩 Closed button matches existing filter control width/height; open panel is a simple list of labeled checkboxes (after-care spacing)
  - [x] 🟩 Panel can scroll if the city list is long; no extra drawer

- [x] 🟩 **Step 4: Docs**
  - [x] 🟩 `CHANGELOG.md` Unreleased: Browse City filter allows multiple cities (dropdown + checkboxes, OR)
  - [x] 🟩 Mark this plan done when the above ships
