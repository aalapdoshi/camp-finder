# Supabase Authentication Setup

## 1. Add Supabase credentials to `js/auth-config.js`

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → select your project
2. Go to **Project Settings** → **API**
3. Copy **Project URL** and **anon public** key
4. Edit `js/auth-config.js` and replace the placeholders:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

The anon key is safe to expose client-side; it is intended for public use.

## 2. Netlify environment variables

Add these in **Site Settings** → **Environment variables**:

| Variable        | Description                          |
|-----------------|--------------------------------------|
| `SUPABASE_URL`  | Your Supabase project URL            |

Required for the `auth-verify` Netlify function (used when you add saved camps).

## 3. Supabase redirect URLs

In Supabase: **Authentication** → **URL Configuration** → **Redirect URLs**, add:

- `https://a2campfinder.com/**`
- `https://a2campfinder.com`
- `http://localhost:8888/**`
- `http://localhost:8888`

## 3b. Facebook login — full walkthrough

`provider is not enabled` means Facebook is **off** in this Supabase project. Google can work while Facebook is still disabled. The site already calls `signInWithFacebook()` — no code change.

Budget about **30–45 minutes**. You need: the Facebook account that will own the app, access to the A2CampFinder Supabase project, and the live privacy page (`https://a2campfinder.com/privacy.html`).

Official reference: [Supabase — Sign in with Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

### Step A — Copy the Supabase callback URL

Do this first. You will paste this into Facebook.

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and select the A2CampFinder project.
2. Left sidebar: **Authentication** (the padlock).
3. **Sign In / Providers** (sometimes labeled **Providers** under Configuration).
4. Click **Facebook** to expand it. Leave it **off** for now.
5. Copy **Callback URL**. It looks like:

   `https://xxxxxxxx.supabase.co/auth/v1/callback`

   That is **not** `https://a2campfinder.com`. Facebook must send the user back to Supabase; Supabase then sends them to the site.

### Step B — Create (or open) a Facebook app

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in.
2. Top right: **My Apps** → **Create App**.
3. If Facebook asks for a use case, pick **Authenticate and request data from users with Facebook Login** (or **Consumer** if you only see app types).
4. App name: `A2CampFinder` (or similar). Contact email: `a2summercamp@umich.edu`.
5. Create the app. If you already started one, open it from **My Apps**.

### Step C — Add Facebook Login and the callback URL

1. In the app dashboard, add the product **Facebook Login** if it is not already there (**Add product** / **Use cases**).
2. Skip the platform Quickstart (iOS/Android/Web walkthroughs). You only need the redirect URI.
3. Left sidebar: **Facebook Login** → **Settings** (not Quickstart).
4. Find **Valid OAuth Redirect URIs**.
5. Paste the Supabase callback from Step A. One URI, no trailing slash, exact match.
6. **Save changes**.

Wrong (will fail): `https://a2campfinder.com`, `https://a2campfinder.com/login.html`, `http://localhost:8888`.

### Step D — Turn on email + profile permissions

Without **email**, Supabase often cannot finish the account.

1. Left sidebar: **Use Cases** (under Build your app).
2. Find **Authentication and account creation** → **Edit**.
3. Confirm **public_profile** and **email** are listed and **Ready for testing**.
4. If **email** is missing, click **Add** next to it.

### Step E — Fill Basic settings and copy the keys

1. Left sidebar: **App settings** → **Basic** (sometimes **Settings** → **Basic**).
2. Copy **App ID**.
3. Next to **App Secret**, click **Show**, copy the secret. Treat it like a password; only paste it into Supabase.
4. Fill the required fields on this page (Facebook will not go Live without them):

   | Field | Value |
   |---|---|
   | App domains | `a2campfinder.com` |
   | Privacy Policy URL | `https://a2campfinder.com/privacy.html` |
   | User data deletion | `https://a2campfinder.com/privacy.html` (or the “email us to delete” wording on that page) |
   | Category | Lifestyle or Education |

5. If there is an **Add Platform** / **Website** option, add Website and set Site URL to `https://a2campfinder.com`.
6. **Save changes**.

### Step F — Turn Facebook on in Supabase

1. Back in Supabase: **Authentication** → **Sign In / Providers** → **Facebook**.
2. Toggle **Facebook Enabled** **ON**.
3. **Client ID** (or Facebook Client ID) = App ID from Step E.
4. **Client Secret** = App Secret from Step E.
5. **Save**.

The `provider is not enabled` error should stop as soon as this save succeeds.

### Step G — Test while the Facebook app is in Development

Development mode is fine for you. Only **roles** on the app can sign in: you (admin), plus anyone you add as **Tester**.

1. On Facebook: **App roles** → **Roles**. You are already an admin.
2. To test a second Facebook account: **Add testers** → they must accept the invite at [developers.facebook.com/requests](https://developers.facebook.com/requests).
3. On [a2campfinder.com/login.html](https://a2campfinder.com/login.html), click **Continue with Facebook**.
4. Log in with a Facebook account that is an admin or tester.
5. Allow the app. You should land back on A2CampFinder signed in (nav shows your account).

A normal parent account that is **not** a tester will fail until you go Live. That is expected.

### Step H — Go Live (needed before Nov 1)

1. Facebook app dashboard: look for **App Mode** (top bar) **Development** → **Live**.
2. Facebook will block Live if Privacy Policy URL / required Basic fields are empty (Step E).
3. `public_profile` and `email` are standard permissions. You usually do **not** need a full App Review for those two.
4. After Live: try **Continue with Facebook** in a private window, with a Facebook account that is **not** a tester.

### If something fails

| What you see | Likely cause |
|---|---|
| `Unsupported provider: provider is not enabled` | Facebook still **off** in Supabase, or Save did not stick. Repeat Step F. |
| Redirect URI mismatch / can't load Facebook login | Callback in Facebook ≠ Supabase callback. Repeat Steps A and C. |
| Works for you, fails for a friend | App still in **Development**. Repeat Step H, or add them as Tester. |
| Signed in but no email / odd account | **email** permission missing. Repeat Step D. |
| Google works, Facebook does not | Normal until F is done. The site buttons are already wired. |

Do **not** put the App Secret in the website, Netlify env, or git. Only Supabase’s Facebook provider fields.

## 4. Install dependencies (for auth-verify)

```bash
npm install
```

This installs `jose` for JWT verification in the auth-verify function.

## 5. Test locally

```bash
npm install
netlify dev
```

Or open the site with a static server. Ensure `auth-config.js` has your Supabase URL and anon key.

## 6. Verify auth flow

1. Visit `login.html` or `signup.html`
2. Click "Continue with Google" or "Continue with Facebook"
3. Complete the OAuth flow
4. You should be redirected back and see your email in the nav
5. Click "Log out" to sign out
