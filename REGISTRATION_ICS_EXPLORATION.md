# Registration calendar (.ics) — Exploration (resolved + email option)

**Status:** Implemented (Aug 2026) — see [REGISTRATION_ICS_PLAN.md](./REGISTRATION_ICS_PLAN.md)  
**Plan:** [REGISTRATION_ICS_PLAN.md](./REGISTRATION_ICS_PLAN.md)  
**Parent:** [SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md](./SUMMER_PLAN_CALENDAR_INVITES_EXPLORATION.md) §Track B  
**Agent index:** [.cursor/rules/summer-plan-exploration.mdc](./.cursor/rules/summer-plan-exploration.mdc)

---

## Feature summary

**“Add registration to calendar”** on Summer Plan (**`want_to_book` only**, list + calendar):

1. Modal with registration **date/time** prefilled from camp catalog when available (editable)
2. **Download `.ics`** or **email `.ics`** to logged-in user’s auth email
3. Event: **30 min before → 30 min after** registration datetime (`America/Detroit`)

---

## Resolved decisions (Aug 2026)

| # | Question | Answer |
|---|----------|--------|
| 1 | Button placement | Summer Plan **list + calendar** only |
| 2 | Status filter | **`want_to_book`** entries only |
| 3 | Missing catalog date | Open modal for **manual entry** |
| 4 | Date-only prefill | Leave time **empty**; time **required** (user fills in) |
| 5 | Past registration | **Allow** download/email with **warning** |
| 6 | Event title | Include **child**: `Register {Child}: {Camp}` |
| 7 | Description | **Yes** — registration URL + camp detail link |
| 8 | Event window | **reg − 30m → reg + 30m** (confirmed) |

---

## Delivery options (both in plan)

### Option A — Download `.ics` (client-only)

- Build ICS in browser via `js/registration-ics-core.js`
- `Blob` + download link
- **Pros:** No backend, works offline after camps loaded, Google Calendar user can import manually
- **Cons:** Extra steps on mobile; no inbox reminder

### Option B — Email `.ics` (recommended for Google Calendar users)

- Modal **“Email to me”** → Netlify function → **Resend** with `.ics` attachment
- Recipient: **auth email only** (from verified Supabase JWT — never client-supplied address)
- Same event payload as download; ICS built server-side from shared core module
- **Pros:** One tap to inbox; Gmail/Google Calendar often surfaces “Add to calendar” from attachment
- **Cons:** Requires Resend account, verified domain, env vars, deploy

**UI:** Both actions in modal footer — user chooses download or email per attempt. No cron; immediate send only.

---

## Email option — integration notes

### Why Resend

- Simple REST API for attachments (`text/calendar`)
- Fits existing Netlify Functions pattern (`feedback.js`)
- No OAuth; unlike Google Calendar API

### Auth & abuse prevention

- Client sends `Authorization: Bearer <supabase_access_token>`
- Function verifies JWT via JWKS (`jose` — same as `auth-verify.js`)
- Send **only** to `email` claim in token
- Rate limit (optional later): cap sends per user/day in function

### Env vars (Netlify)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key |
| `REGISTRATION_CALENDAR_FROM_EMAIL` | Verified sender (e.g. `calendar@a2campfinder.com`) |
| `SUPABASE_URL` | JWT verification |

### Request shape (POST)

```json
{
  "campName": "Ann Arbor Art Center",
  "childName": "Emma",
  "registrationAt": "2026-01-23T07:00:00",
  "campDetailUrl": "https://…/camp-detail.html?id=rec…",
  "registrationUrl": "https://…",
  "entryId": "uuid",
  "campId": "rec…"
}
```

`registrationAt` = user-confirmed local datetime (ISO); server applies ±30m in `America/Detroit`.

### Email content (proposed)

- **Subject:** `Registration reminder: Emma — Ann Arbor Art Center`
- **Body (plain text):** Short line + links; attachment is the calendar invite
- **Attachment:** `registration-emma-ann-arbor-art-center.ics`

### Local dev

- **Download:** works without backend
- **Email:** requires `netlify dev` + Resend key; otherwise show “Email unavailable — use download”

### Not in email MVP

- CC other addresses
- Scheduled “send day before”
- Calendar invite as `METHOD:REQUEST` with RSVP — use simple `VEVENT` attachment (import-style)

---

## Codebase gaps (unchanged)

| Gap | Resolution in plan |
|-----|-------------------|
| No time parser in browser JS | `registration-ics-core.js` |
| No `.ics` generation | Shared core module |
| No email infra | Resend + Netlify function |
| Registration not on plan UI | Button on list/calendar only |

---

## Edge cases (with resolved handling)

| Case | Handling |
|------|----------|
| No catalog date | Modal open; user enters date + time |
| Unparseable time | Time empty; required before submit |
| Past registration | Warning banner; allow download/email |
| Camp removed from catalog | Manual entry; header “No longer available” |
| Email fails (Resend down) | Error message; suggest download |
| iOS Safari download | QA; email path may be easier on mobile |

---

## Delivery menu UX (exploration — Aug 2026)

**User proposal:** Replace a flat “download / email” footer with a **primary “Add to Calendar” control** that opens a **dropdown** of three destinations:

```
[ 📅 Add to Calendar ▼ ]

  Google Calendar (direct link)
  Apple / Outlook (.ics file)
  Email me this invite
```

**Status:** Exploration only — revises modal footer in [REGISTRATION_ICS_PLAN.md](./REGISTRATION_ICS_PLAN.md) when approved. **Do not implement yet.**

### What each option takes technically

| Menu item | Mechanism | Backend? | Notes |
|-----------|-----------|----------|--------|
| **Google Calendar** | `window.open()` to Google template URL | **No** | Pre-filled create-event page; user saves in their Google account |
| **Apple / Outlook (.ics)** | Client `.ics` `Blob` download | **No** | Same ICS builder as current plan; works for Apple Calendar, Outlook desktop, many others |
| **Email me this invite** | Netlify function + Resend + `.ics` attach | **Yes** | Same as current plan; auth email only |

All three reuse the **same event payload** after the user confirms date/time:

- Title: `Register {Child}: {Camp}`
- Window: registration ± 30 min (`America/Detroit`)
- Description: registration URL + camp detail link

**New code (vs current plan):** `buildGoogleCalendarUrl(...)` in `registration-ics-core.js` — ~20 lines, alongside existing ICS builder.

**Google URL shape:**

```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text={encoded title}
  &dates={startLocal}/{endLocal}     // YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS
  &ctz=America/Detroit
  &details={encoded description}
  &location={optional registration URL}
```

Use **local** `dates` + `ctz=America/Detroit` (not UTC `Z`) so Google shows correct Ann Arbor time.

### UX flow options (must pick one)

**A — Dropdown on Summer Plan row/card → then modal (recommended)**

1. User opens **Add to Calendar ▼** on list/calendar row.
2. Picks **Google**, **.ics**, or **Email**.
3. **Modal opens** with date/time prefill (same as plan); footer primary action reflects choice (“Open in Google Calendar” / “Download .ics” / “Send email”).
4. User edits date/time if needed → confirms → selected delivery runs.

*Pros:* User chooses destination upfront; one modal; matches mockup on the plan page.  
*Cons:* Two steps before calendar action.

**B — Modal first → delivery menu in footer**

1. Single **Add to Calendar** button opens modal (date/time).
2. Modal footer **is** the three-item menu (or split button dropdown).

*Pros:* One entry point; all editing before delivery choice.  
*Cons:* Mockup shows menu on the row, not inside modal.

**C — Dropdown sets method silently; modal footer is generic “Add to calendar”**

Same as A but footer label is neutral; chosen menu item runs on submit.

### UI / frontend work

| Area | Effort |
|------|--------|
| **Dropdown component** | Small — mirror `.nav-account-menu` / `.nav-account-trigger` (existing in `css/styles.css`); `aria-expanded`, click-outside, Escape |
| **List + calendar placement** | Same as plan — `want_to_book` only; replace simple link with split button + menu |
| **`registration-ics-core.js`** | Add `buildGoogleCalendarUrl`; shared `getEventWindow(registrationAt)` for ICS + Google |
| **Modal** | Accept `deliveryMethod: 'google' \| 'ics' \| 'email'`; dynamic primary CTA + handler |
| **Email path** | Unchanged from plan (Resend + JWT) |
| **CSS** | Menu panel + optional calendar icon on trigger |

**No new Supabase tables.** Email still needs Resend env vars.

### Platform behavior

| Platform | Google link | .ics download | Email |
|----------|-------------|---------------|-------|
| Desktop Chrome | Opens Google; one click save | Downloads file; double-click import | Inbox + attach |
| Android | Opens Google app / browser | Download + open | Gmail often shows add-to-calendar |
| iOS Safari | Opens Google login / app | Share sheet → Calendar | Mail app + attach |
| Logged out of Google | Google prompts login | N/A | N/A |

**Google link limitation:** Does not add the event silently — opens Google’s “Create event” screen with fields filled; user still clicks **Save**. That is expected and fine.

**`.ics` on iOS:** Often smoother than Google link for Apple Calendar users; label **“Apple / Outlook (.ics file)”** is reasonable.

### Compared to current plan

| Current plan | With delivery menu |
|--------------|-------------------|
| Footer: Download \| Email \| Cancel | Row/card: **Add to Calendar ▼** + modal OR modal footer menu |
| 2 delivery paths | **3 paths** (+ Google URL) |
| No Google URL builder | + `buildGoogleCalendarUrl` |

Core ICS module, time parser, Summer Plan wiring, and email function **unchanged in spirit** — mostly **UI restructure** + one URL builder.

### Edge cases (same as before + menu-specific)

- Date/time invalid → block all three until valid.
- Past registration → warning; all three still allowed.
- **Email** without Resend configured → disable menu item or toast “Use download instead”.
- **Google** in embedded WebView / privacy browsers — may block pop-up; use `target=_blank` with fallback copy link.
- Keyboard: menu items focusable; Enter activates.

### Open questions (before updating plan)

1. ~~**Flow A vs B vs C**~~ — **Flow A** (dropdown on row → modal → confirm). See [REGISTRATION_ICS_PLAN.md](./REGISTRATION_ICS_PLAN.md).
2. ~~**Icons**~~ — Yes — Material icons on trigger and menu items.
3. ~~**Email item copy**~~ — Yes — subtitle “Send to {auth email}”.
4. ~~**Google only for want_to_book**~~ — Yes (unchanged scope).
5. ~~**Plan doc**~~ — Revised in `REGISTRATION_ICS_PLAN.md` (Aug 2026).

---

## Next step

Execute [REGISTRATION_ICS_PLAN.md](./REGISTRATION_ICS_PLAN.md) when user requests (`execute.mdc`).
