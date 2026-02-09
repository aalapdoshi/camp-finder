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
- Date strings (e.g., "Wed Nov 17 2021...") → skipped (no warning)
- Grade-based formats (e.g., "K-6th grade", "Y5-5th Grade") → skipped (no warning)
- Uses `getDisplayValue()` to handle Google Sheets date/number formatting

### Cost Parsing
- `"$600/week"` → Cost Per Week: 600, Cost Display: "$600/week"
- `"$199"` → Cost Per Week: 199, Cost Display: "$199"
- `"199"` (plain number) → Cost Per Week: 199, Cost Display: "$199"
- `"Varies - see website"` → Cost Per Week: null, Cost Display: "Varies - see website"
- Uses `getDisplayValue()` to handle Google Sheets number formatting

### City Extraction
- Extracts city names from addresses (Ann Arbor, Saline, Ypsilanti, etc.)
- If no city found, leaves empty

### Address Mapping
- Full address string → `Address` field (direct copy)
- City extracted separately → `City` field

### URL Extraction
- Extracts URLs from hyperlinked Camp Name cells
- All URLs stored in `Website` field (Airtable doesn't have separate `Registration URL` field)

### After Care
- Empty, "N/A", or "No" → `Has After Care`: false
- Any other text → `Has After Care`: true
- Full text also copied to `Extended Care Notes` field

### Field Mapping (Separate Fields)
- `Registration Status` → `Registration Status` (parsed: 'Open Now', 'Coming Soon', 'Not Updated', or blank if no match)
- `Registration Details` → `Registration Opens Date` (parsed date in YYYY-MM-DD format, if found)
- `Registration Details` → `Registration Opens Time` (parsed time string, if found)
- `Registration Details` → `Registration Notes` (direct copy - original text preserved)
- `Days/Times` → `Schedule Notes` (direct copy)
- `Before / After Care?` → `Extended Care Notes` (direct copy)
- No longer combines into single `Description` field

### Registration Data Parsing

The script now extracts structured registration data from the Registration Details field:

**Registration Status:**
- "OPEN for 2026" → "Open Now"
- "Coming Soon for 2026..." → "Coming Soon"
- "Not yet updated for 2026" → "Not Updated"
- Empty or no match → Field left blank (warning logged if original value exists)

**Registration Opens Date:**
- Extracts dates in formats like:
  - "Jan 23, 2026" → "2026-01-23" (explicit year)
  - "January 20th, 2026" → "2026-01-20" (explicit year)
  - "Feb 1st, 2026" → "2026-02-01" (explicit year)
  - "2026 Summer Camps enrollment begins February 2nd" → "2026-02-02" (year from context)
  - "February 24th" → uses current year or context year (doesn't assume next year)
  - "March 11" → uses current year or context year (doesn't assume next year)
- Year extraction priority:
  1. Explicit year in date (highest priority)
  2. Year from context ("2026 Summer Camps", "for 2026", "2026 enrollment", "Summer 2026")
  3. Current year (if no context year found)
- If multiple dates found, uses the earliest date
- If no date found, field is left blank (not set to null)

**Registration Opens Time:**
- Extracts times in formats like:
  - "@ 7am" → "7am"
  - "@ 10:00A" → "10:00A"
  - "at 8:00 AM" → "8:00 AM"
  - "at noon" → "noon"
  - "at 12pm" → "12pm"
- If no time found, field is left blank (not set to null)

## Troubleshooting

### Script Won't Run
- **Error: "Authorization required"**: Click "Review Permissions" and authorize
- **Error: "Cannot find function"**: Make sure you selected `syncCampsToAirtable` from the function dropdown

### Sync Errors
- Check the email summary for specific errors
- Common issues:
  - **Invalid age format**: Check the Ages column. Dates and grade-based formats are expected and won't cause errors
  - **Invalid cost format**: Check the Cost column. Plain numbers (e.g., "199") are automatically handled
  - **Missing Camp Name**: Ensure all rows have a camp name
  - **Unknown field errors**: If you see "UNKNOWN_FIELD_NAME" errors, the field doesn't exist in Airtable - contact developer to update script

### Warnings
- Warnings are only shown for truly unexpected formats
- Date strings, grade-based age formats, and expected text values (TBD, FREE, etc.) won't trigger warnings
- If you see warnings, they indicate data that couldn't be parsed but won't stop the sync

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
