# Google Sheets → Airtable Sync Setup Guide

## Quick Start

1. **Open your Google Sheet**: https://docs.google.com/spreadsheets/d/1FfiziYg5Ow-BlHqFRSWl2d3I-Uh7iy8W53lmpLSVfEU/edit

2. **Open Apps Script Editor**:
   - Click `Extensions` → `Apps Script`
   - A new tab will open with the script editor

3. **Copy the Script**:
   - Open `google-apps-script-sync.gs` from this project
   - Copy the entire contents
   - Paste into the Apps Script editor (replace any default code)

4. **Save the Script**:
   - Click the floppy disk icon or press `Ctrl+S` / `Cmd+S`
   - Name it "CampFinder Sync" (optional)

5. **Test the Script**:
   - Click the function dropdown (top center) → select `syncCampsToAirtable`
   - Click the play button (▶️) or press `Ctrl+R` / `Cmd+R`
   - **First time**: You'll need to authorize the script
     - Click "Review Permissions"
     - Choose your Google account
     - Click "Advanced" → "Go to CampFinder Sync (unsafe)" (this is safe, it's your own script)
     - Click "Allow"
   - Check the execution log (View → Logs) for results
   - Check your email (aalap1.doshi@gmail.com) for the summary

6. **Set Up Daily Trigger**:
   - In the function dropdown, select `setupDailyTrigger`
   - Click the play button (▶️)
   - This creates a daily trigger at 2:30 AM
   - You can verify it worked by going to: Triggers (clock icon on left sidebar)

## What the Script Does

- **Reads** all camp data from your Google Sheet (starting from row 4)
- **Matches** camps by `Camp Name` (exact match)
- **Updates** existing Airtable records with sheet data
- **Creates** new Airtable records for camps not yet in Airtable
- **Deletes** Airtable records that no longer exist in the sheet
- **Preserves** fields not in the sheet (`Primary Category`, `Activities`)
- **Sends** an email summary after each sync

## Data Transformations

### Age Parsing
- `"5-13"` → Age Min: 5, Age Max: 13
- `"8+"` → Age Min: 8, Age Max: null
- Non-numeric formats → skipped (warning logged)

### Cost Parsing
- `"$600/week"` → Cost Per Week: 600, Cost Display: "$600/week"
- `"$199"` → Cost Per Week: 199, Cost Display: "$199"
- `"Varies - see website"` → Cost Per Week: null, Cost Display: "Varies - see website"

### City Extraction
- Extracts city names from addresses (Ann Arbor, Saline, Ypsilanti, etc.)
- If no city found, leaves empty

### URL Extraction
- Extracts URLs from hyperlinked Camp Name cells
- If URL contains "registration" → `Registration URL`
- Otherwise → `Website`

### After Care
- Empty, "N/A", or "No" → `Has After Care`: false
- Any other text → `Has After Care`: true

### Description
- Combines: Registration Details + Days/Times + Before/After Care info
- Formatted with line breaks

## Troubleshooting

### Script Won't Run
- **Error: "Authorization required"**: Click "Review Permissions" and authorize
- **Error: "Cannot find function"**: Make sure you selected `syncCampsToAirtable` from the function dropdown

### Sync Errors
- Check the email summary for specific errors
- Common issues:
  - **Invalid age format**: Check the Ages column for non-numeric values
  - **Invalid cost format**: Check the Cost column
  - **Missing Camp Name**: Ensure all rows have a camp name

### Trigger Not Running
- Go to Triggers (clock icon) → check if trigger exists
- Verify it's set to "Daily" at 2:30 AM
- Check execution history for errors

### Rate Limiting
- Airtable API allows 5 requests/second
- Script includes 200ms delays between requests
- If you have 100+ camps, sync may take 2-5 minutes

## Manual Testing

To test without waiting for the trigger:

1. Open Apps Script editor
2. Select `syncCampsToAirtable` from function dropdown
3. Click play button (▶️)
4. Check execution log and email summary

## Modifying the Schedule

To change the sync time:

1. In Apps Script editor, go to Triggers (clock icon)
2. Delete existing trigger
3. Modify `setupDailyTrigger()` function:
   - Change `.atHour(2)` to desired hour (0-23)
   - Change `.nearMinute(30)` to desired minute (0-59)
4. Run `setupDailyTrigger()` again

## Monitoring

- **Execution Logs**: View → Logs (in Apps Script editor)
- **Trigger History**: Triggers → click trigger → View execution history
- **Email Summaries**: Check aalap1.doshi@gmail.com after each sync

## Security Notes

- The script contains your Airtable API key
- Only share the script with trusted people
- The API key has read/write access to your Airtable base
- Consider rotating the API key periodically
