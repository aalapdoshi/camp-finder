# Netlify Deployment Setup

## Overview

This site uses **Netlify Functions** to proxy Airtable API calls, keeping API keys secure on the server side. The client-side code never exposes API keys.

---

## Setup Steps

### 1. Deploy to Netlify

1. **Connect Repository**:
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Netlify will auto-detect settings

2. **Build Settings**:
   - **Build command**: (leave empty - static site)
   - **Publish directory**: `.` (root directory)

### 2. Add Environment Variables

Go to **Site Settings** → **Environment Variables** and add:

```
AIRTABLE_API_KEY=YOUR_AIRTABLE_API_KEY_HERE
AIRTABLE_BASE_ID=YOUR_AIRTABLE_BASE_ID_HERE
```

**Optional** (for AI enrichment):
```
OPENAI_API_KEY=sk-your-openai-key-here
```

### 3. Deploy

Netlify will automatically:
- Deploy your static files
- Set up the Netlify Function (`netlify/functions/airtable-proxy.js`)
- Use environment variables in the function

---

## How It Works

### Local Development:
- Uses `js/config.js` with direct API keys
- Makes direct API calls to Airtable

### Netlify Production:
- Client code detects Netlify domain
- Uses `/api/airtable` endpoint (proxied through Netlify Function)
- Netlify Function reads API keys from environment variables
- API keys never exposed to client

### Code Flow:

1. **Client** (`js/airtable.js`):
   - Checks if running on Netlify
   - If Netlify: Calls `/api/airtable?table=Camps`
   - If local: Calls Airtable API directly

2. **Netlify Function** (`netlify/functions/airtable-proxy.js`):
   - Receives request from client
   - Reads `AIRTABLE_API_KEY` from environment variables
   - Makes authenticated request to Airtable
   - Returns data to client

---

## Testing Locally

### Option 1: Test with Netlify Dev

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run locally with Netlify Functions
netlify dev
```

This will:
- Start local server
- Run Netlify Functions locally
- Use environment variables from `.env` file (create one)

### Option 2: Test Direct API (Current Setup)

Just open `campfinder_index.html` in browser - it will use direct API calls from `config.js`.

---

## Environment Variables File (Optional)

Create `.env` file for local Netlify dev (add to `.gitignore`):

```
AIRTABLE_API_KEY=your-key-here
AIRTABLE_BASE_ID=your-base-id-here
OPENAI_API_KEY=your-openai-key-here
```

---

## Security Notes

✅ **API keys are secure**:
- Never committed to git
- Only stored in Netlify environment variables
- Never sent to client browser
- Only used server-side in Netlify Functions

✅ **What's in git**:
- Template files (`config.example.js`)
- Netlify Function code (no keys)
- Static HTML/CSS/JS files

---

## Troubleshooting

### "Failed to fetch" error
- Check Netlify Function logs (Site → Functions → View logs)
- Verify environment variables are set correctly
- Check function name matches route (`airtable-proxy.js` → `/api/airtable`)

### API calls work locally but not on Netlify
- Verify environment variables are set in Netlify dashboard
- Check Netlify Function logs for errors
- Ensure `netlify.toml` redirect is configured correctly

### CORS errors
- Netlify Function includes CORS headers
- If still seeing errors, check browser console for details

---

## File Structure

```
CampFinder_v1/
├── netlify/
│   └── functions/
│       └── airtable-proxy.js    # Server-side proxy (secure)
├── netlify.toml                  # Netlify configuration
├── js/
│   ├── config.js                 # Local dev only (not in git)
│   └── config.example.js         # Template (in git)
└── ... (other files)
```

---

## Next Steps

1. ✅ Push code to git (secrets already removed)
2. ✅ Connect repository to Netlify
3. ✅ Add environment variables in Netlify dashboard
4. ✅ Deploy and test!
