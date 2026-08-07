# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
For **`booked`** Summer Plan entries (list + calendar only), add **Add pickup/dropoff to calendar ▾** with the same delivery UX as registration: **Google Calendar**, **Apple/Outlook (.ics)**, **Email me this invite**. User picks destination → modal shows **Schedule Notes** (read-only) plus **dropoff time** and **pickup time** inputs (no prefill) → confirm generates **two separate invite types** (dropoff + pickup) for **each weekday** in the plan date range. Event window: **±30 min** around each time (`America/Detroit`). Titles: **`Drop off {Child}: {Camp}`** and **`Pick up {Child}: {Camp}`**. Either time required. Ephemeral — no Supabase storage.

**Parent:** [SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md](./SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md) §Track A  
**Pattern:** [REGISTRATION_ICS_PLAN.md](./REGISTRATION_ICS_PLAN.md)

## Critical Decisions
- **Scope:** Summer Plan list Actions + calendar cards; **`booked` only** (registration stays `want_to_book`).
- **UX flow:** Same as registration — dropdown first → modal → confirm runs chosen delivery.
- **Modal inputs:** Dropoff time + pickup time only; dates come from plan `start_date` / `end_date`. **Schedule Notes** shown as read-only reference text — **no time prefill**.
- **Validation:** **Either** dropoff **or** pickup time required (both optional individually; at least one must be set).
- **Weekdays:** For each **Monday–Friday** date in `[start_date, end_date]` inclusive, create events for each provided time type (1 or 2 events per day).
- **Event window:** Same as registration — `DTSTART = time − 30m`, `DTEND = time + 30m` for both dropoff and pickup events.
- **Event titles:** `Drop off {Child}: {Camp}` and `Pick up {Child}: {Camp}`.
- **Two invite types:** Separate calendar events for dropoff vs pickup (not one combined event).
- **Google path:** Open **two tabs** when both times are set — one URL per invite type using the **first weekday** in range; modal hint that **.ics / email** include **all weekdays**.
- **.ics path:** Single download with **all** generated `VEVENT`s (every weekday × each provided type).
- **Email path:** One Resend message, one `.ics` attachment with all events; reuse `RESEND_API_KEY`, `REGISTRATION_CALENDAR_FROM_EMAIL`, `SUPABASE_URL`.
- **Persistence:** Ephemeral — times not saved to `summer_plan`.
- **Shared core:** Extend `js/registration-ics-core.js` (timezone, wall-clock, ±30m, ICS escaping) — no DOM.
- **Past times:** Non-blocking warning (mirror registration); all delivery paths still allowed.

## UX flow

```
Summer Plan row/card (booked)
  [ Add pickup/dropoff to calendar ▾ ]
    ├─ Google Calendar          — Opens Google Calendar in a new tab
    ├─ Apple / Outlook (.ics)   — Download .ics file
    └─ Email me this invite       — Send to you@example.com

        ↓ (any menu item)

  Modal: "Add pickup/dropoff to calendar"
    header — camp name, child · plan dates
    body — Schedule Notes (read-only, if present)
           dropoff time (optional), pickup time (optional)
           ±30m hint, past-time warning, validation error
    footer — [Open in Google Calendar | Download .ics | Send email] + Cancel
```

## Tasks:

- [x] 🟩 **Step 1: Core helpers (`js/registration-ics-core.js`)**
  - [x] 🟩 `enumerateWeekdaysInRange(startDate, endDate)` — Mon–Fri dates in range (`YYYY-MM-DD[]`)
  - [x] 🟩 `getCampDayEventWindowMs(dateStr, timeStr24)` — reuse ±30m logic (alias/wrapper of existing window helper)
  - [x] 🟩 `buildDropoffEventTitle(campName, childName)` / `buildPickupEventTitle(...)`
  - [x] 🟩 `buildPickupDropoffEventDescription(...)` — camp, child, plan dates, camp detail URL, schedule notes snippet
  - [x] 🟩 `buildPickupDropoffEvents(params)` — array of `{ type, date, time, startMs, endMs, title, description }`
  - [x] 🟩 `buildPickupDropoffIcs(events[])` — multi-`VEVENT` calendar file
  - [x] 🟩 `buildGoogleCalendarUrlForEvent(event)` — single-event URL (reuse existing URL builder pattern)
  - [x] 🟩 `getPickupDropoffIcsFilename(campName, childName)`
  - [x] 🟩 Export new symbols for Netlify `require()`

- [x] 🟩 **Step 2: Dropdown + modal (`js/pickup-dropoff-calendar.js`)**
  - [x] 🟩 `createPickupDropoffCalendarDropdown` — mirror `createRegCalendarDropdown` (reuse `reg-calendar-*` CSS classes)
  - [x] 🟩 Trigger label: **Add pickup/dropoff to calendar ▾**; full phrase in `aria-label` / `title`
  - [x] 🟩 Menu → `openPickupDropoffCalendarModal({ deliveryMethod, entry, campFields, campName, authEmail })`
  - [x] 🟩 Modal: read-only **Schedule Notes** block; dropoff + pickup `<input type="time">` (empty defaults)
  - [x] 🟩 Validate: at least one time; build event list via core helpers
  - [x] 🟩 **Google:** 1 tab if one time set; **2 tabs** if both (first weekday per type); show hint about full-week .ics/email
  - [x] 🟩 **.ics:** download multi-event file
  - [x] 🟩 **Email:** POST to Netlify function
  - [x] 🟩 Past-time warning on first weekday (non-blocking)

- [x] 🟩 **Step 3: Summer Plan wiring (`js/summer-plan-page.js`, `summer-plan.html`)**
  - [x] 🟩 List Actions: mount for `booked` entries (`data-pickup-dropoff-calendar-mount`)
  - [x] 🟩 Calendar cards: same mount in note/actions area for `booked`
  - [x] 🟩 `wirePickupDropoffCalendarDropdowns()` in `refreshViews()` (alongside registration wiring)
  - [x] 🟩 Script tag for `pickup-dropoff-calendar.js` after core + registration scripts

- [x] 🟩 **Step 4: Email — Netlify function**
  - [x] 🟩 `netlify/functions/send-pickup-dropoff-calendar.js` — JWT verify + Resend + multi-event `.ics` attach
  - [x] 🟩 Request body: camp/child/plan dates, dropoffTime?, pickupTime?, startDate, endDate, campDetailUrl, entryId, campId
  - [x] 🟩 Reuse `REGISTRATION_CALENDAR_FROM_EMAIL` and existing env vars (no new secrets)

- [x] 🟩 **Step 5: CSS (`css/styles.css`)**
  - [x] 🟩 Reuse `.reg-calendar-*` dropdown/modal styles
  - [x] 🟩 `.reg-calendar-schedule-notes` — read-only schedule reference block in modal

- [x] 🟩 **Step 6: Docs**
  - [x] 🟩 `CHANGELOG.md` — feature summary
  - [x] 🟩 `SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md` — Track A resolved decisions + link to this plan
  - [x] 🟩 `.cursor/rules/summer-plan-exploration.mdc` — index row for this plan

## Supabase / schema

**No migration required** (ephemeral times).

## Event generation rules

| Input | Events per weekday (Mon–Fri in range) |
|-------|----------------------------------------|
| Dropoff only | 1 × dropoff |
| Pickup only | 1 × pickup |
| Both | 1 × dropoff + 1 × pickup |

Example: plan Jun 16–20 (Mon–Fri), both times set → **10** `VEVENT`s in `.ics` / email.

## Google Calendar limitation

Google `action=TEMPLATE` supports **one event per URL**. When both times are provided, open **two tabs** (dropoff + pickup) using the **first weekday** in the plan range. Show modal hint: *“Google opens the first camp day only. Download or email for all weekdays.”*

## File summary

| File | Action |
|------|--------|
| `js/registration-ics-core.js` | Extended |
| `js/pickup-dropoff-calendar.js` | Created |
| `js/summer-plan-page.js` | Modified |
| `summer-plan.html` | Modified |
| `netlify/functions/send-pickup-dropoff-calendar.js` | Created |
| `css/styles.css` | Minor (schedule notes block if needed) |
| `CHANGELOG.md`, exploration index | Updated |

## Test plan

- [ ] `booked` row/card shows pickup/dropoff dropdown; `want_to_book` shows registration only (not both)
- [ ] Modal shows Schedule Notes when camp has `Schedule Notes`; times start empty
- [ ] Confirm blocked when both time inputs empty; works with dropoff-only or pickup-only
- [ ] **.ics:** correct count of events for multi-day Mon–Fri range; valid import
- [ ] **Email:** one message, one attachment, all weekdays × provided types
- [ ] **Google:** 1 tab (one time) or 2 tabs (both times); first weekday dates only
- [ ] Event titles: `Drop off {Child}: {Camp}` / `Pick up {Child}: {Camp}`
- [ ] ±30 min window; `America/Detroit`
- [ ] Past-time warning; delivery still succeeds
