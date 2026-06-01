# A2CampFinder Setup Guide

## Initial Setup

### 1. Configure API Keys

**For Local Development (js/config.js):**
1. Copy `js/config.example.js` to `js/config.js`
2. Add your Airtable API key and Base ID
3. Add your OpenAI API key (if using AI features)

**For Netlify Deployment:**
- See `NETLIFY_SETUP.md` for detailed instructions
- API keys are stored as environment variables in Netlify dashboard
- No need to configure `config.js` for production

**For Google Apps Script (google-apps-script-sync.gs):**
1. Open your Google Sheet
2. Go to Extensions → Apps Script
3. Copy the contents of `google-apps-script-sync.gs` (from your local machine, not from git)
4. Paste into Apps Script editor
5. Add your API keys in the configuration section

**Note:** The actual `config.js` and `google-apps-script-sync.gs` files with API keys are **not** in git for security. Only example/template files are committed.

### 2. Get Your API Keys

**Airtable:**
- Go to https://airtable.com/create/tokens
- Create a Personal Access Token with read/write access to your base
- Copy the Base ID from your Airtable base URL

**OpenAI (optional, for AI enrichment):**
- Go to https://platform.openai.com/api-keys
- Create a new API key
- Add payment method to your OpenAI account (required even for free tier)

---

## File Structure

- `js/config.js` - **Local only** (not in git) - Contains your actual API keys
- `js/config.example.js` - Template file (in git) - Copy this to create config.js
- `google-apps-script-sync.gs` - **Local only** (not in git) - Contains your actual API keys
- `google-apps-script-sync.example.gs` - Template file (in git) - Reference for setup

---

## Security Notes

- **Never commit** `js/config.js` or `google-apps-script-sync.gs` to git
- These files are in `.gitignore` to prevent accidental commits
- If you accidentally commit secrets, rotate your API keys immediately

---

## Troubleshooting

### "Secrets detected" error when pushing
- Make sure `.gitignore` includes `js/config.js` and `google-apps-script-sync.gs`
- If files were already committed, they've been removed from git tracking
- Your local files are safe - they just won't be in the repository

### Missing config.js
- Copy `js/config.example.js` to `js/config.js`
- Add your actual API keys

### Deploying to Netlify
- See `NETLIFY_SETUP.md` for complete deployment guide
- API keys are configured as environment variables in Netlify dashboard
- The site automatically uses Netlify Functions proxy when deployed

### Local dev: camps not loading / Airtable error

**Use `netlify dev` (recommended):**
1. Create `.env` in the project root with `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID`
2. Run `netlify dev` and open **http://localhost:8888** (port 8888 enables the `/api/airtable` proxy)

**Plain static server** (`python -m http.server`, `npx serve`, etc.): `js/config.js` calls Airtable directly — replace `YOUR_AIRTABLE_API_KEY_HERE` with your real token, or camps will fail with 401.

**HTTP 429 / billing limit:** Airtable returns `PUBLIC_API_BILLING_LIMIT_EXCEEDED` when the workspace hits its monthly API quota. This affects localhost and production until usage resets or you upgrade at [airtable.com/pricing](https://airtable.com/pricing). Check usage in Airtable workspace settings. Longer term, see `AIRTABLE_TO_SUPABASE_PLAN.md` for migrating camp reads off Airtable.
