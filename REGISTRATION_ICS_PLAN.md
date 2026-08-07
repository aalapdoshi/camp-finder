# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
For **`want_to_book`** Summer Plan entries (list + calendar only), add an **Add to Calendar ▼** dropdown with three destinations: **Google Calendar** (direct link), **Apple / Outlook (.ics)**, and **Email me this invite** (Resend). User picks a destination → modal opens with registration **date/time** prefilled from catalog (editable; time **required**) → confirms → delivery runs. Event window: **registration time − 30 min → + 30 min** (`America/Detroit`). Title: **`Register {Child}: {Camp}`**. Description includes registration URL + camp detail link. Past registration: allow with warning. No Supabase schema changes.

## Critical Decisions
- **Scope:** Summer Plan list + calendar; **`want_to_book` only**. Not Browse or Camp detail.
- **UX flow (Flow A):** **Dropdown on row/card first** → user picks Google / .ics / Email → **modal** for date/time → confirm runs chosen delivery. Matches mockup; delivery intent is clear upfront.
- **Missing catalog data:** Always show button + modal; empty date/time fields for manual entry.
- **Date-only catalog:** Prefill date; leave time **empty** (no default); time input **required** before confirm.
- **Past registration:** Non-blocking warning in modal; all three deliveries still allowed.
- **Event window:** `DTSTART = registrationAt − 30m`, `DTEND = registrationAt + 30m` (1-hour block).
- **Timezone:** Fixed `America/Detroit`; `VTIMEZONE` in `.ics`.
- **Event title:** `Register {childName}: {campName}` (child from plan entry).
- **Event description:** Camp name, child, plan dates, registration URL (`Website` / `Registration URL`), link to `camp-detail.html?id=…`.
- **Shared core:** `js/registration-ics-core.js` (no DOM) — used by client modal and Netlify email function.
- **Google path:** Client-only — `window.open(buildGoogleCalendarUrl(...))`.
- **.ics path:** Client `Blob` download.
- **Email path:** Netlify `send-registration-calendar.js` + Resend; JWT → auth email only.
- **Dropdown UI:** Material icons + subtitles on menu rows; email subtitle shows auth email.
- **Modal footer:** Single primary confirm matching chosen method + **Cancel**.

## UX flow

```
Summer Plan row/card (want_to_book)
  [ 📅 Add to Calendar ▼ ]
    ├─ Google Calendar          — Opens Google Calendar in a new tab
    ├─ Apple / Outlook (.ics)   — Download .ics file
    └─ Email me this invite       — Send to you@example.com

        ↓ (any menu item)

  Modal: "Add registration to calendar"
    header — camp name, child · plan dates
    body — date (required), time (required), ±30m hint, warnings
    footer — [Open in Google Calendar | Download .ics | Send email] + Cancel
```

## Tasks:

- [x] 🟩 **Step 1: Core module (`js/registration-ics-core.js`)**
  - [x] 🟩 `parseRegistrationOpensTime(timeStr)` — catalog free-text → `{ hours, minutes }` or null
  - [x] 🟩 `buildRegistrationDateTime` / wall-clock + `getRegistrationEventWindowMs` ±30m
  - [x] 🟩 `isRegistrationInPast`
  - [x] 🟩 `buildRegistrationEventDescription`
  - [x] 🟩 `buildRegistrationIcs(...)` — RFC 5545 + `TZID=America/Detroit`
  - [x] 🟩 `buildGoogleCalendarUrl(...)` — `action=TEMPLATE`, local `dates` + `ctz`
  - [x] 🟩 `getIcsFilename(campName, childName)`

- [x] 🟩 **Step 2: Dropdown + modal (`js/registration-calendar.js`)**
  - [x] 🟩 `createRegCalendarDropdown` — menu + a11y (Escape, click-outside)
  - [x] 🟩 Menu item → `openRegistrationCalendarModal({ deliveryMethod, ... })`
  - [x] 🟩 Prefill, validate, warnings
  - [x] 🟩 Google / .ics / email confirm handlers
  - [x] 🟩 Dynamic primary button label

- [x] 🟩 **Step 3: Summer Plan wiring (`js/summer-plan-page.js`, `summer-plan.html`)**
  - [x] 🟩 Dropdown on list rows + calendar cards (`want_to_book` only)
  - [x] 🟩 `wireRegCalendarDropdowns()` in `refreshViews()`
  - [x] 🟩 Script tags for core + calendar JS

- [x] 🟩 **Step 4: Email — Netlify function**
  - [x] 🟩 `netlify/functions/send-registration-calendar.js` — JWT + Resend + `.ics` attach

- [x] 🟩 **Step 5: CSS (`css/styles.css`)**
  - [x] 🟩 Dropdown, modal, warnings, list/calendar placement

- [x] 🟩 **Step 6: Docs & operator setup**
  - [x] 🟩 `NETLIFY_SETUP.md` — Resend env vars
  - [x] 🟩 `CHANGELOG.md`
  - [x] 🟩 `REGISTRATION_ICS_EXPLORATION.md` — delivery menu resolved

## Supabase / schema

**No migration required.**

## Resend setup (operator)

See §Resend setup in this doc (unchanged) and [NETLIFY_SETUP.md](./NETLIFY_SETUP.md). **Note:** Email delivery requires verified domain in Resend; until DNS propagates, Google and `.ics` paths still work.

## File summary

| File | Action |
|------|--------|
| `js/registration-ics-core.js` | Created |
| `js/registration-calendar.js` | Created |
| `js/summer-plan-page.js` | Modified |
| `summer-plan.html` | Modified |
| `netlify/functions/send-registration-calendar.js` | Created |
| `css/styles.css` | Modified |
| `NETLIFY_SETUP.md`, `CHANGELOG.md` | Updated |

## Test plan

- [ ] `want_to_book` row/card shows dropdown; `booked` does not
- [ ] Menu shows icons + subtitles; email subtitle uses logged-in email
- [ ] Each menu item opens modal with correct primary button label
- [ ] Date/time validation blocks confirm until both set
- [ ] **Google:** new tab, pre-filled event, ±30m window
- [ ] **.ics:** valid file import
- [ ] **Email:** arrives after Resend domain verified + redeploy
- [ ] Past registration warning; all paths still work

---

## Resend setup (operator — configure before testing email)

### 1. Create Resend account and API key

1. Go to [https://resend.com](https://resend.com) and sign up.
2. **API Keys** → **Create API Key** → name e.g. `campfinder-production`.
3. Copy the key (starts with `re_`) — shown once.

### 2. Verify a sending domain

1. Resend dashboard → **Domains** → **Add Domain**.
2. Enter your domain (e.g. `a2campfinder.com` or the domain Netlify assigns if using custom domain).
3. Add the **DNS records** Resend shows (SPF, DKIM — typically 2–3 records at your DNS host).
4. Wait until domain status is **Verified** (can take minutes to 48h).

### 3. Choose the From address

Use an address on the verified domain, e.g.:

- `calendar@yourdomain.com`
- `noreply@yourdomain.com`

This becomes `REGISTRATION_CALENDAR_FROM_EMAIL`.

### 4. Add Netlify environment variables

Netlify → your site → **Site configuration** → **Environment variables** → **Add a variable** (or **Import**):

| Variable | Value | Scopes |
|----------|--------|--------|
| `RESEND_API_KEY` | `re_…` | Production (and Deploy previews if testing PRs) |
| `REGISTRATION_CALENDAR_FROM_EMAIL` | `calendar@yourdomain.com` | Production |
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` | Production — required for JWT verify |

`SUPABASE_URL` may already exist if `auth-verify` is deployed; confirm it matches your Supabase project URL (Project Settings → API).

### 5. Local testing (optional)

```bash
# In project root — create .env with the same vars (do not commit)
RESEND_API_KEY=re_...
REGISTRATION_CALENDAR_FROM_EMAIL=calendar@yourdomain.com
SUPABASE_URL=https://YOUR_PROJECT.supabase.co

netlify dev
```

Open Summer Plan via `http://localhost:8888/summer-plan.html`, log in, test **Email me this invite**.

### 6. Redeploy

After saving env vars, trigger a **new deploy** (Deploys → Trigger deploy) so functions pick up secrets.

### 7. Smoke test email

1. Log in on production.
2. Summer Plan → **want_to_book** camp → **Add to Calendar ▼** → **Email me this invite**.
3. Set date/time → **Send email**.
4. Check inbox (and spam); open `.ics` attachment or add from Gmail.

### Troubleshooting

| Symptom | Check |
|---------|--------|
| 500 from function | Netlify function logs; `RESEND_API_KEY` / `SUPABASE_URL` set |
| 401 on email | Session expired; re-login |
| Resend 403 / validation | From email must be on **verified** domain |
| Email not received | Resend dashboard → **Emails** for delivery status |
