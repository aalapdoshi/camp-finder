# Summer Plan — Calendar Invites Exploration

**Status:** Exploration only — **not implementing now** (May 2026)  
**Parent doc:** [SUMMER_PLAN_EXPLORATION.md](./SUMMER_PLAN_EXPLORATION.md)  
**Agent index:** [.cursor/rules/summer-plan-exploration.mdc](./.cursor/rules/summer-plan-exploration.mdc)  
**Related implemented docs:** [SUMMER_PLAN_PLAN.md](./SUMMER_PLAN_PLAN.md), [ADD_TO_PLAN_MODAL_PLAN.md](./ADD_TO_PLAN_MODAL_PLAN.md)

Two related features share email/calendar infrastructure but differ by **plan status** and **time source**.

| Track | Plan status | Trigger time | Time source |
|-------|-------------|--------------|-------------|
| **A — Pickup / dropoff** | `booked` | 30 min **before** pickup; 30 min **after** dropoff | User entry and/or camp schedule (TBD) |
| **B — Registration reminder** | `want_to_book` | 30 min **before** registration opens | Camp catalog: `Registration Opens Date` + `Registration Opens Time` |

---

## Track A — Pickup / dropoff invites (Booked)

### Feature summary

For **Booked** summer-plan entries, send **calendar invites** to **user-provided email addresses**, timed to:

- **30 minutes before pickup time**
- **30 minutes after dropoff time**

Only `status === 'booked'`. **Want to book** entries use Track B instead.

### Track A — codebase gaps

| Area | State | Gap |
|------|--------|-----|
| **`summer_plan`** | dates, status, child, cost | No pickup/dropoff times; no recipient emails |
| **Camp catalog** | Free-text `Schedule Notes` / `Days/Times` | Not structured for reliable pickup/dropoff |
| **Email / calendar** | No outbound email or `.ics` today | Provider + scheduling needed |

### Track A — edge cases

- Multi-day entries: invites per day vs whole stint?
- Missing pickup/dropoff times — block, defaults, or user input?
- Status `booked` → `want_to_book`: cancel pickup invites; consider registration invite?
- Extended care changes dropoff time?
- Camp removed from Airtable but plan row remains?

### Track A — open questions

See §Shared open questions plus:

- Pickup/dropoff source: user per entry, parsed from camp schedule, account defaults, or mix?
- Two events per camp day (pre-pickup + post-dropoff) vs one?
- Event titles and whether ±30 min is event start vs reminder alert?

---

## Track B — Registration invites (Want to Book)

### Feature summary

For **Want to book** summer-plan entries on the **Summer Plan page**, send **calendar invites** to **user-provided email addresses** timed to:

- **30 minutes before** the camp’s **registration opens** date and time

Only `status === 'want_to_book'`. When user marks a camp **Booked**, registration invites should be cancelled/superseded by Track A (pickup/dropoff) if enabled.

**User wording (May 2026):** “30 minutes to registration dates and times” — interpreted as **30 minutes before** registration opens (reminder to register), analogous to Track A’s “30 minutes before pickup.”

### Track B — codebase (registration data today)

Registration data lives on **camp catalog** (Airtable), not on `summer_plan` rows. Summer Plan page already loads camps via `fetchCamps()` → `cachedCampById` for list/calendar display.

| Field | Source | Format | Used today |
|-------|--------|--------|------------|
| `Registration Opens Date` | Airtable (parsed from sheet `Registration Details`) | `YYYY-MM-DD` | `computeRegistrationStatus()`, `formatRegistrationDate()` in `js/airtable.js` |
| `Registration Opens Time` | Same | Free text, e.g. `7am`, `10:00A`, `noon`, `12 pm` | Appended in display only — **not parsed to datetime** |
| `Registration Status` | Airtable / sheet `Registration Status` | `Open Now`, `Coming Soon`, `Not Updated` | Badge on browse/detail cards |
| `Registration Notes` | Sheet `Registration Details` (full text) | Free text | Camp detail |

**Key functions:** `computeRegistrationStatus()`, `formatRegistrationDate()` — `js/airtable.js`  
**Summer plan:** `js/summer-plan-page.js` filters/renders by `entry.status`; does **not** surface registration date/time on plan list/calendar yet.

### Track B — integration on Summer Plan page

1. For each `want_to_book` entry, resolve `camp_id` → camp fields from `cachedCampById`.
2. Build datetime: `Registration Opens Date` + parsed `Registration Opens Time` (new parser needed).
3. Invite event time = that datetime **minus 30 minutes**.
4. Skip or warn when date/time missing (`Not Updated`, no parsed date).
5. UI: opt-in emails, “Add registration reminder” — placement TBD (§Shared).

**Sync pipeline:** Dates/times updated nightly via `google-apps-script-sync.gs` (`parseRegistrationOpensDate`, `parseRegistrationOpensTime`). Invite scheduling must **refresh** when catalog data changes (re-sync after sheet update).

### Track B — edge cases

- **No registration date/time:** Many camps are `Not Updated` or date-only without time → default to midnight? skip invite? prompt user?
- **Date in the past:** `computeRegistrationStatus()` may show `Open Now`; registration reminder is moot — skip or offer “registration may already be open”?
- **Date-only (no time):** e.g. `2026-03-11` with empty time — remind at 12:01 AM local? 8:00 AM default? user setting?
- **Ambiguous time strings:** `10:00A`, `7am`, `noon`, `12 pm` — need robust parser (reuse/extend Apps Script patterns in `google-apps-script-sync.gs`).
- **Registration already open** when user adds camp as Want to book — no future invite?
- **Status flip:** `want_to_book` → `booked` — cancel registration invite; optionally create pickup/dropoff invites (Track A).
- **Same camp, multiple plan entries** — one invite per entry or dedupe by `camp_id` + registration datetime?
- **Timezone:** `America/Detroit` for Ann Arbor camps?
- **Sheet/Airtable lag:** User relies on stale registration date — wrong reminder time.

### Track B — open questions

- Confirm: invite fires **30 minutes before** registration opens (not at registration time, not 30 min after)?
- If registration is **today** but time is in 20 minutes — send immediately or skip?
- Show registration date/time on Summer Plan list/calendar for `want_to_book` rows before user enables invites?
- Auto-create invite when user adds camp as Want to book, or explicit opt-in per entry / account?
- One invite per entry vs per camp registration window across duplicates?
- Include registration **URL** (`Website` / `Registration URL`) in calendar event description?
- Handle `Coming Soon` with no parsed date — block invites with message?

---

## Shared infrastructure (both tracks)

Both tracks likely need:

1. **Recipient emails** — user-provided (auth email + optional list); storage TBD.
2. **Calendar payload** — `.ics` and/or add-to-calendar links in email.
3. **Delivery** — email API (Resend, SendGrid, etc.) via Netlify function.
4. **Scheduling** — cron (Netlify scheduled function, Supabase Edge, etc.) unless invites are created once with future-dated events only.
5. **Per-entry or account settings** — `invites_enabled`, invite type, recipients.

### Shared open questions

**Delivery mechanism**

- (A) Email with `.ics` attachment?
- (B) Email with add-to-calendar links only?
- (C) Google Calendar API (OAuth)?
- (D) In-app download only?

**When to send / create**

- (A) Immediately on opt-in — calendar events dated in the future?
- (B) Scheduled email at computed reminder time?
- (C) Manual “Send invites” on Summer Plan page?

**Recipients**

- (A) Auth email only?
- (B) User-provided list — per entry, per child, or account-wide?
- (C) Both?

**Infrastructure**

- Email provider preference?
- Netlify scheduled functions OK?

**UI placement (Summer Plan page)**

- Per-row actions on list view?
- Calendar card actions?
- Account settings for default emails?
- Add-to-plan modal when status = Want to book / Booked?

**Status transitions**

- Matrix for cancel/reschedule when status or camp catalog data changes?

| From → To | Track A (pickup/dropoff) | Track B (registration) |
|-----------|--------------------------|---------------------------|
| want_to_book → booked | Create A; cancel B | Cancel B |
| booked → want_to_book | Cancel A | Create B (if data exists) |
| Remove plan entry | Cancel all | Cancel all |
| Registration date updated in Airtable | — | Reschedule B |

---

## Suggested schema additions (draft — not migrated)

```text
-- Per entry (optional)
invite_recipients   text[]
invites_reg_enabled boolean   -- Track B
invites_camp_enabled boolean  -- Track A (pickup/dropoff)
pickup_time         time      -- Track A override
dropoff_time        time      -- Track A override

-- Or account-level user_plan_settings
default_recipients  text[]
timezone            text      -- default America/Detroit
default_reg_reminder_minutes int  -- default 30
```

Scheduled jobs table (optional): `plan_calendar_invites` with `entry_id`, `invite_type` (`registration` | `pickup` | `dropoff`), `send_at`, `status`, `external_id`.

---

## Key files (reference)

| File | Relevance |
|------|-----------|
| `js/summer-plan-page.js` | List/calendar; `want_to_book` / `booked` filter; `cachedCampById` |
| `js/summer-plan.js` | CRUD, modal status segment |
| `js/airtable.js` | `computeRegistrationStatus`, `formatRegistrationDate` |
| `js/camp-detail.js` | Registration display in Quick Details |
| `google-apps-script-sync.gs` | Registration date/time parsing from sheet |
| `REGISTRATION_EXTRACTION_PLAN.md` | Field semantics |
| `netlify/functions/` | Future email/invite endpoints |

---

## Next steps (when prioritized)

1. Answer Track A and Track B open questions (§above).
2. Confirm shared email/calendar infrastructure once for both tracks.
3. Run `create-plan.mdc` → implementation plan(s) — may be one plan with two phases or two PRs.
4. **Do not implement** until explicitly requested.
