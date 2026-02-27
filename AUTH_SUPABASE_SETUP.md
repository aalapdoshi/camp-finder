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
