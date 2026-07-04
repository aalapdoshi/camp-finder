# Summer Plan Feature – Exploration

**Status:** Exploration (core feature implemented; see [SUMMER_PLAN_PLAN.md](./SUMMER_PLAN_PLAN.md))  
**Goal:** Add camps to a summer plan with user-specified dates; show list + calendar views. Future: print calendar, calendar invites.

**Deferred explorations:** See [.cursor/rules/summer-plan-exploration.mdc](./.cursor/rules/summer-plan-exploration.mdc) and §8 below.

---

## 1. Feature Summary (from your description)

- **Add camp to summer plan:** User adds a camp; we prompt for dates (booked or want to book).
- **Summer plan page:** List view + simple calendar view of the summer with camps.
- **Future (not implemented):** Print calendar; calendar invites — see [SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md](./SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md) (Track A: Booked pickup/dropoff; Track B: Want to book registration reminder).

---

## 2. Codebase Integration Points

### 2.1 Data

| Item | Current State | Integration |
|------|--------------|-------------|
| **Camp** | Airtable record (`camp.id`, `camp.fields`) | Reference via `camp_id` (Airtable record ID). |
| **Favorites** | Supabase `favorites` table: `user_id`, `camp_id`, `saved_at` | Separate from summer plan; a camp can be favorited and in plan. |
| **Auth** | Supabase Auth, `getSession()`, `session.user.id` | Same auth; require login for summer plan. |
| **Camp schedule fields** | `Session Dates`, `Dates`, `Weeks Offered` (free text) | Display only; user-entered dates are separate. |

### 2.2 Storage

- **New Supabase table** (e.g. `summer_plan` or `plan_entries`):
  - `user_id` (uuid, FK auth.users)
  - `camp_id` (text, Airtable record ID)
  - `start_date` (date)
  - `end_date` (date) — or single date if one-day
  - `notes` (optional)
  - `created_at` (timestamptz)
  - Unique on `(user_id, camp_id)` or allow same camp multiple times with different date ranges?

### 2.3 UI Entry Points

- **Add to plan:** From camp detail page and/or camp cards (e.g. "Add to plan" button).
- **Summer plan page:** New page (e.g. `summer-plan.html`) with list + calendar views.
- **Nav:** Add "Summer Plan" link (like Favorites).

### 2.4 Dependencies

- `auth.js`, `favorites.js` pattern for Supabase CRUD
- `airtable.js`: `getCampById()`, `fetchCamps()`, `createCampCard()`
- `camp-detail.js`: `renderCampDetail()` — add "Add to plan" button
- Existing CSS patterns (modals, buttons, cards)

---

## 3. Edge Cases & Constraints

### 3.1 Date Handling

- **Date format:** ISO `YYYY-MM-DD` for storage; display as "Jun 15–21, 2026".
- **Summer range:** Define "summer" (e.g. June–August) for calendar view.
- **Overlapping dates:** Same camp, different weeks — allow multiple entries or single entry with multiple ranges?
- **Past dates:** Allow or block; how to treat in calendar/list.

### 3.2 Camp Lifecycle

- **Camp removed from Airtable:** Same pattern as Favorites — show "No longer available" with option to remove from plan.
- **Camp already in plan:** Allow re-add with different dates (update or new row)?

### 3.3 Auth

- **Logged out:** Show "Summer Plan" link; on click, redirect to login with `redirectTo=summer-plan.html`.
- **Logged in:** Full access to add/edit/remove.

### 3.4 Calendar View

- **Scope:** "Simple calendar view of the summer" — likely month/week grid.
- **Libraries:** No calendar lib yet; could use vanilla JS or a lightweight lib.
- **Mobile:** Responsive layout for list and calendar.

---

## 4. User Decisions (Answered)

| # | Question | Answer |
|---|----------|--------|
| 1 | Single date vs range | Both supported; range is most common |
| 2 | Booked vs want to book | Status toggle; color-coded to differentiate |
| 3 | Same camp, multiple entries | Yes — same camp can appear multiple times (e.g. Week 1 and Week 3) |
| 4 | Add-from | All three: camp detail, browse cards, favorites |
| 5 | Summer range | June through end of August; support multiple years |
| 6 | Default view | Simple list: dates, weeks, camp name |

---

## 5. Refined Design

### 5.1 Data Model

**Table: `summer_plan`** (or `plan_entries`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK auth.users |
| `camp_id` | text | Airtable record ID |
| `start_date` | date | Required |
| `end_date` | date | Nullable for single-day; if null, treat as single day |
| `status` | text | `'booked'` or `'want_to_book'` |
| `notes` | text | Optional |
| `created_at` | timestamptz | Default now() |

- **No unique constraint** on `(user_id, camp_id)` — same camp can appear multiple times with different date ranges.
- **RLS:** `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE.

### 5.2 Status & Color Coding

- **Booked:** e.g. solid green or filled style (confirmed).
- **Want to book:** e.g. outline/striped or lighter color (tentative).
- Toggle could live on each list item and/or in the add/edit form.

### 5.3 Add Flow (All Three Entry Points)

- **Camp detail:** "Add to Summer Plan" button → date modal/form.
- **Browse cards:** "Add to plan" action (e.g. icon or button) → date modal.
- **Favorites:** Same "Add to plan" on each card.
- **Date form:** Start date (required), end date (optional — if blank, single day). Status: Booked / Want to book.

### 5.4 List View (Default)

- Columns: **Camp name** | **Dates** (e.g. Jun 15–21) | **Weeks** (e.g. Week 2) | **Status** (badge/color) | **Actions** (edit, remove).
- Sort: by start date (default) or camp name.
- Year filter: e.g. 2026, 2027 (for multi-year support).

### 5.5 Calendar View

- Secondary view (tab or toggle).
- June–August grid; each plan entry shown on its date range.
- Color by status (booked vs want to book).

### 5.6 Summer Definition

- **Range:** June 1 – August 31 (configurable later if needed).
- **Year:** User-selectable (e.g. 2026, 2027) for list and calendar.

### 5.7 Open Questions

1. **Week display:** "Week 2" — is that calendar week number, or "Week of Jun 15" style?
2. **Edit flow:** Inline edit vs modal when changing dates/status?
3. **Year selector:** Top of page, or part of a filter bar?
4. **Empty state:** "Add camps from Browse or Favorites" + link?

---

## 6. Proposed Structure

```
summer_plan table:
  id, user_id, camp_id, start_date, end_date, status, notes?, created_at
  RLS: user_id = auth.uid()

Pages:
  summer-plan.html — list (default) + calendar tabs/sections

JS:
  js/summer-plan.js — CRUD, list render, calendar render
  js/summer-plan-api.js — Supabase helpers (or extend a shared module)

Entry points:
  camp-detail.html — "Add to Summer Plan" button
  browse cards — "Add to plan" action
  favorites page — "Add to plan" action
```

---

## 7. Next Steps

1. Resolve open questions in §5.7.
2. Finalize plan and implementation order.
3. Implement.

---

## 8. Related explorations (future / deferred)

| Feature | Document | Status |
|---------|----------|--------|
| Calendar invites — Booked pickup/dropoff (±30 min) | [SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md](./SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md) §Track A | **Exploration only** |
| Calendar invites — Want to book registration (30 min before opens) | [SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md](./SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md) §Track B | **Exploration only** |
| Agent index | [.cursor/rules/summer-plan-exploration.mdc](./.cursor/rules/summer-plan-exploration.mdc) | Cursor rule |
