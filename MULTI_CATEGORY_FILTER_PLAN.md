# Multi-Category Browse Filter — Implementation Plan

**Overall Progress:** `100%`

## TLDR

Let parents pick **more than one category** on Browse, using the **same dropdown + checkbox panel as City**. A camp matches if its `Primary Category` is in the selected set (OR). None checked = all categories.

## Critical Decisions

- **Where:** Browse sidebar Category control only. Match City’s UI, a11y, OR logic, empty default, clear-all, and ellipsis label.
- **UI (locked):** Closed button looks like today’s Category `<select>`. Open it to check several categories; it stays open until the user is done. Closed label: `All categories` when none selected, otherwise the selected names (e.g. `Sports, STEM`), truncated with an ellipsis so the sidebar does not grow. Hover `title` shows the full list.
- **Match:** OR. Selected `{Sports, STEM}` shows camps whose `Primary Category` is either.
- **Empty selection:** No boxes checked means all categories (current default).
- **Clear filters:** Uncheck every category, close the panel, button reads `All categories`.
- **Homepage cards:** Unchanged. A category card still writes one name to `localStorage.categoryFilter`. Browse seeds that as a **single checked category** (same as today’s one-value select), then removes the key.
- **Two dropdowns:** Opening Category closes City, and vice versa, so the panels do not stack.
- **CSS:** Reuse City dropdown styles (shared class on both controls). Do not copy a second stylesheet block.
- **Data:** Unchanged. Each camp still has one `Primary Category`. `getCategories()` stays a sorted unique list for the checkboxes.
- **Out of scope:** Homepage category grid redesign, catalog/schema, `mockups/browse-filters-proposed.html`, sharing JS into a generic widget unless the City copy is a straight rename.

### Accessibility (same as City)

- Trigger is a `<button>` (`aria-expanded`, `aria-controls`). Not a clickable `<div>`.
- Panel holds native `<input type="checkbox">` + `<label>` for each category.
- Keyboard: Enter/Space opens; Tab moves through options; Space toggles; Escape closes and returns focus to the button. Click outside also closes.
- Panel **stays open** while checking more than one category.
- Closed panel is not in the tab order (`hidden`).
- Checkbox state is the selected indicator; color is not the only cue.

## Tasks

- [x] 🟩 **Step 1: Filter logic (`js/airtable.js`)**
  - [x] 🟩 Change `filterCamps` category check from `filters.category` string (`'all'` or one name) to `filters.categories` array
  - [x] 🟩 If `categories` is missing or empty, do not filter by category
  - [x] 🟩 If `categories` has names, keep the camp when `fields['Primary Category']` is in that list
  - [x] 🟩 Keep `getCategories()` as-is (checkbox source)

- [x] 🟩 **Step 2: Browse state (`js/browse.js`)**
  - [x] 🟩 Store `browseFilters.categories` as `[]` instead of `category: 'all'`
  - [x] 🟩 Render category checkboxes from `getCategories()` into the dropdown panel (same pattern as City)
  - [x] 🟩 On checkbox change: set `categories`; update button label + `title`; re-render results; **do not close** the panel
  - [x] 🟩 Open/close: `aria-expanded`, click-outside, Escape (focus back to button); opening Category closes City and vice versa
  - [x] 🟩 Homepage seed: if `localStorage.categoryFilter` is set, check that one box and set `categories` to `[name]`
  - [x] 🟩 Clear-all resets `categories` to `[]`, unchecks every box, sets button to `All categories`

- [x] 🟩 **Step 3: Browse markup + CSS (`browse.html`, `css/styles.css`)**
  - [x] 🟩 Replace `#browse-category` `<select>` with a Category group: button trigger + hidden checkbox panel (mirror City markup)
  - [x] 🟩 Shared dropdown classes with City so both stay 18rem with ellipsis
  - [x] 🟩 Panel can scroll if the category list is long

- [x] 🟩 **Step 4: Docs**
  - [x] 🟩 `CHANGELOG.md` Unreleased: Browse Category filter allows multiple categories (dropdown + checkboxes, OR)
  - [x] 🟩 Mark this plan done when the above ships
