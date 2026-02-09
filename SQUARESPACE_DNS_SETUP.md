# Squarespace DNS Setup for Netlify

## Overview
This guide explains how to configure your Squarespace domain (A2CampFinder.com) to point to your Netlify site.

## Prerequisites
- You have DNS settings from Netlify (usually includes A records, CNAME records, or both)
- You have access to your Squarespace account
- Your domain is registered/managed through Squarespace

## Step-by-Step Instructions

### Step 1: Access DNS Settings in Squarespace

1. **Log in to Squarespace**
   - Go to https://www.squarespace.com
   - Sign in to your account

2. **Navigate to Domains**
   - Click on **Settings** (gear icon) in the left sidebar
   - Click on **Domains**
   - Find and click on **A2CampFinder.com** (or your domain)

3. **Access DNS Settings**
   - Click on **DNS Settings** tab
   - You should see a list of current DNS records

### Step 2: Understand Netlify DNS Requirements

Netlify typically provides one of these configurations:

**Option A: A Records (IPv4)**
- Type: A
- Host: @ (or blank/root domain)
- Points to: IP addresses (usually 2-4 addresses like `75.2.60.5`)

**Option B: CNAME Record**
- Type: CNAME
- Host: @ (or www)
- Points to: Your Netlify site URL (e.g., `camp-finder.netlify.app`)

**Option C: Both A Records and CNAME**
- A record for root domain (@)
- CNAME for www subdomain

### Step 3: Update DNS Records

#### If Netlify Provided A Records:

1. **Remove existing A records** (if any) for the root domain (@)
   - Find any existing A records pointing to Squarespace IPs
   - Click the trash/delete icon next to each

2. **Add Netlify A Records**
   - Click **Add Record**
   - Select **A** as the record type
   - For **Host**: Enter `@` (or leave blank if Squarespace uses @ for root)
   - For **Points to**: Enter the first IP address from Netlify
   - Click **Save**
   - Repeat for each IP address provided by Netlify (usually 2-4 addresses)

#### If Netlify Provided CNAME Record:

1. **Remove existing CNAME records** (if any)
   - Find any existing CNAME records
   - Delete them

2. **Add Netlify CNAME Record**
   - Click **Add Record**
   - Select **CNAME** as the record type
   - For **Host**: Enter `@` (for root domain) or `www` (for www subdomain)
   - For **Points to**: Enter your Netlify site URL (e.g., `camp-finder.netlify.app`)
   - **Important**: Do NOT include `http://` or `https://` - just the domain
   - Click **Save**

#### If Netlify Provided Both:

1. **Add A Records** (for root domain @)
   - Add all A record IPs as described above

2. **Add CNAME Record** (for www subdomain)
   - Add CNAME record with Host: `www`
   - Points to: Your Netlify site URL

### Step 4: Configure Domain in Netlify

1. **Go to Netlify Dashboard**
   - Navigate to your site
   - Go to **Site Settings** → **Domain Management**

2. **Add Custom Domain**
   - Click **Add custom domain**
   - Enter `A2CampFinder.com`
   - Click **Verify**

3. **Follow Netlify's Instructions**
   - Netlify will show you the exact DNS records needed
   - Use these exact values in Squarespace

### Step 5: Wait for DNS Propagation

- DNS changes can take **24-48 hours** to fully propagate
- Usually works within **1-2 hours**, but can take longer
- You can check propagation status at: https://www.whatsmydns.net

### Step 6: Verify SSL Certificate

- Netlify will automatically provision an SSL certificate once DNS is configured
- This usually happens automatically within a few minutes to hours
- Check in Netlify Dashboard → Site Settings → Domain Management
- Look for "SSL certificate" status

## Common Issues & Solutions

### Issue: "Domain not verified" in Netlify
**Solution**: 
- Double-check DNS records match exactly what Netlify shows
- Ensure you're using the correct record types (A vs CNAME)
- Wait a bit longer for DNS propagation

### Issue: Site shows Squarespace default page
**Solution**:
- Make sure you've removed Squarespace's default A/CNAME records
- Verify Netlify DNS records are correct
- Clear browser cache and try again

### Issue: www subdomain not working
**Solution**:
- Add a CNAME record for `www` pointing to your Netlify site
- Or configure redirect in Netlify (Site Settings → Domain Management → Add domain alias)

### Issue: SSL certificate not provisioning
**Solution**:
- Wait longer (can take up to 24 hours)
- Ensure DNS records are correct
- Check Netlify logs for any errors

## Important Notes

1. **Don't delete all DNS records at once** - Add Netlify records first, then remove old ones
2. **Keep other DNS records** - Don't delete MX records (email), TXT records (verification), etc.
3. **Squarespace email** - If you use Squarespace email, keep those MX records
4. **Subdomains** - If you need subdomains, add CNAME records for each (e.g., `www`, `api`, etc.)

## Example DNS Configuration

Here's what your Squarespace DNS might look like after setup:

```
Type    Host    Points to
----    ----    ---------
A       @       75.2.60.5
A       @       99.83.190.102
CNAME   www     camp-finder.netlify.app
MX      @       (keep existing email records)
TXT     @       (keep existing verification records)
```

## Verification Steps

1. **Check DNS propagation**: https://www.whatsmydns.net
2. **Test domain**: Visit `https://A2CampFinder.com` in browser
3. **Check SSL**: Look for padlock icon in browser
4. **Verify in Netlify**: Check Domain Management shows "SSL certificate active"

## Need Help?

- **Netlify Support**: https://www.netlify.com/support/
- **Squarespace Support**: https://support.squarespace.com/hc/en-us/articles/205812378
- **DNS Check Tool**: https://dnschecker.org/

## After Setup

Once DNS is configured and SSL is active:
- Your site will be accessible at `https://A2CampFinder.com`
- Netlify will automatically handle HTTPS
- You can set up redirects in Netlify if needed (e.g., www → root domain)
