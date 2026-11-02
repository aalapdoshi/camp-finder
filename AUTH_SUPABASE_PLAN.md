# Supabase Authentication Implementation Plan

**Overall Progress:** `86%`

## TLDR

Add user authentication to A2CampFinder using Supabase Auth with Google sign-in. Separate login and signup pages, auth links in header and footer. Default Supabase URLs (no custom domain). Saved camps feature deferred to a later phase.

## Critical Decisions

- **Auth provider: Supabase Auth** – Single provider for auth (and future saved camps DB), generous free tier, Netlify integration
- **Social provider: Google only** – Facebook login removed; email/password can be added later
- **Separate login and signup pages** – `login.html` and `signup.html`, with links between them
- **Default Supabase URLs** – No custom auth domain for now
- **Auth links in nav + footer** – Login/Sign up when logged out; user email + Log out when logged in
- **Scope: Auth only** – No saved camps in this phase

## Prerequisites (Manual – User)

- [ ] 🟥 Create Supabase project at [supabase.com](https://supabase.com)
- [ ] 🟥 Install Netlify Supabase integration (Extensions → Supabase → Install → Connect to site)
- [ ] 🟥 Enable Google provider in Supabase: Authentication → Providers → Google (add Client ID + Secret from Google Cloud Console)
- [x] ⬛ Facebook provider: **not used** — leave off in Supabase (login/signup are Google only)
- [ ] 🟥 Add redirect URLs in Supabase: Authentication → URL Configuration → Redirect URLs: `https://a2campfinder.com/**`, `https://a2campfinder.com`, `http://localhost:8888/**`, `http://localhost:8888`

## Tasks

### Step 1: Add Supabase client and auth config

- [x] 🟩 **1.1** Create `js/auth-config.js` with `SUPABASE_URL` and `SUPABASE_ANON_KEY` (user adds values from Supabase dashboard; anon key is safe to expose client-side)
- [x] 🟩 **1.2** Load Supabase via CDN on auth pages and all main pages
- [x] 🟩 **1.3** Create `js/auth.js` with: `initSupabase()`, `signInWithGoogle()`, `signOut()`, `getSession()`, `onAuthStateChange()`, `initAuth()`

### Step 2: Create login and signup pages

- [x] 🟩 **2.1** Create `login.html` with: heading "Log in", Google button, link to signup ("Don't have an account? Sign up")
- [x] 🟩 **2.2** Create `signup.html` with: heading "Sign up", Google button, link to login ("Already have an account? Log in")
- [x] 🟩 **2.3** Style both pages to match existing site (reuse `styles.css`, `.auth-page`, `.auth-card`, `.btn-auth`)
- [x] 🟩 **2.4** Wire the Google button to `signInWithGoogle()`; redirect to `index.html` after successful auth (with `redirectTo` param support)

### Step 3: Handle OAuth redirect callback

- [x] 🟩 **3.1** `handleOAuthCallback()` in auth.js checks URL hash, exchanges session, redirects to `index.html` or `redirectTo` param
- [x] 🟩 **3.2** OAuth redirect lands on `index.html`; `initAuth()` runs `handleOAuthCallback()` on load

### Step 4: Add auth links to nav and footer

- [x] 🟩 **4.1** Updated nav in `index.html`, `browse.html`, `camp-detail.html`, `about.html`: `#nav-auth` shows Log in/Sign up when logged out, email + Log out when logged in
- [x] 🟩 **4.2** Updated footer Quick Links in all 4 pages: `#footer-auth` with same logic
- [x] 🟩 **4.3** `onAuthStateChange()` updates nav/footer; `initAuth()` runs on page load

### Step 5: Protected Netlify function (for future saved camps)

- [x] 🟩 **5.1** Created `netlify/functions/auth-verify.js` – verifies Supabase JWT via JWKS, returns 401 if invalid
- [x] 🟩 **5.2** CORS includes `Authorization` in `Access-Control-Allow-Headers`
- [x] 🟩 **5.3** Documented in `AUTH_SUPABASE_SETUP.md`

### Step 6: Environment and deployment

- [x] 🟩 **6.1** Created `AUTH_SUPABASE_SETUP.md` with env var instructions
- [x] 🟩 **6.2** `auth-config.js` holds URL + anon key (user fills in)
- [x] 🟩 **6.3** Added `package.json` with `jose` for auth-verify; user runs `npm install`

### Step 7: Testing and verification

- [ ] 🟥 **7.1** Test Google sign-in flow locally and on production
- [x] ⬛ **7.2** Facebook sign-in: **removed** — do not test; provider stays off
- [ ] 🟥 **7.3** Test sign-out and session persistence across page navigations
- [ ] 🟥 **7.4** Verify nav/footer correctly show logged-in vs logged-out state

## File Summary

| File | Action |
|------|--------|
| `js/auth-config.js` | Create – Supabase URL + anon key |
| `js/auth.js` | Create – auth helpers, OAuth, session |
| `login.html` | Create – login page |
| `signup.html` | Create – signup page |
| `index.html`, `browse.html`, `camp-detail.html`, `about.html` | Modify – nav + footer auth links |
| `netlify/functions/auth-verify.js` | Create – JWT verification |
| `css/styles.css` | Modify – optional auth page styles |

## Notes

- Supabase anon key is designed to be public; it restricts access via RLS. For auth-only, we use it client-side.
- OAuth redirect: Supabase redirects to your Site URL with hash. Ensure `login.html` and `signup.html` (or a shared callback) can parse it.
- If using `netlify dev`, Supabase integration injects env vars; for pure static, you may need to expose anon key in config (acceptable for anon key).
