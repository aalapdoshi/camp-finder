# Netlify Troubleshooting Guide

## 404 Error on `/api/airtable`

### Issue
Getting "Failed to load resource: the server responded with a status of 404" when accessing the browse page on Netlify.

### Solutions

#### 1. Verify Function File Name
The function file must be named `airtable.js` (not `airtable-proxy.js`) to match the route `/api/airtable`.

**Check:**
```bash
ls netlify/functions/airtable.js
```

**Fix if needed:**
```bash
mv netlify/functions/airtable-proxy.js netlify/functions/airtable.js
```

#### 2. Verify Environment Variables
Go to Netlify Dashboard → Site Settings → Environment Variables and ensure:
- `AIRTABLE_API_KEY` is set
- `AIRTABLE_BASE_ID` is set

#### 3. Check Function Logs
1. Go to Netlify Dashboard → Functions
2. Click on `airtable` function
3. View logs to see any errors

#### 4. Verify Redirect Configuration
Check `netlify.toml` has:
```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

#### 5. Redeploy
After making changes:
1. Commit and push to git
2. Netlify will auto-deploy
3. Or trigger manual deploy in Netlify dashboard

#### 6. Test Function Directly
Try accessing the function directly:
```
https://your-site.netlify.app/.netlify/functions/airtable?table=Camps
```

If this works but `/api/airtable` doesn't, the redirect isn't working.

#### 7. Check Browser Console
Open browser DevTools → Console and look for:
- Exact error message
- Network tab → check the failed request URL
- Response status code

### Common Issues

**Function not found:**
- Function file must be in `netlify/functions/` directory
- Function file name must match the route (without `.js`)

**Environment variables not set:**
- Check Netlify dashboard → Environment Variables
- Variables are case-sensitive
- Redeploy after adding variables

**CORS errors:**
- Function already includes CORS headers
- Check browser console for specific CORS error

**500 errors:**
- Check function logs in Netlify dashboard
- Usually means environment variables are missing or API call failed
