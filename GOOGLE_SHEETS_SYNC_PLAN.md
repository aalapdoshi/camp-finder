# Google Sheets → Airtable Sync Plan

## Goal

Create an automated daily sync that updates Airtable `Camps` table from a Google Sheet, matching records by `Camp Name`, with Google Sheet data always taking precedence.

---

## 1. Requirements Summary

- **Sync Direction**: One-way (Google Sheets → Airtable)
- **Match Key**: `Camp Name` (exact match, case-sensitive)
- **Frequency**: Daily (overnight, ~2-3 AM)
- **Conflict Resolution**: Google Sheet always wins (overwrite Airtable)
- **Error Handling**: Skip bad rows, log errors, continue syncing, email summary
- **Email Summary**: Send to your email address after each sync

---

## 2. Column Mapping & Data Transformation

### Google Sheet → Airtable Field Mapping

| Google Sheet Column | Airtable Field | Transformation Logic |
|---------------------|----------------|---------------------|
| `Camp Name` | `Camp Name` | Direct copy (used as match key) |
| `Camp Name` | `Website` / `Registration URL` | Extract URLs from Camp Name cell (if contains hyperlink) |
| `Ages` | `Age Min`, `Age Max` | Parse numeric ranges (e.g., "5-13" → Min: 5, Max: 13) |
| `Address` | `City` | Extract city name from address string |
| `Address` | `Location Name` | Use full address string |
| `Cost` | `Cost Per Week` | Extract numeric value (e.g., "$600/week" → 600) |
| `Cost` | `Cost Display` | Use full cost string as-is |
| `Registration Details (2026)` + `Days/Times` + `Before / After Care?` | `Description` | Combine with line breaks |
| `Before / After Care?` | `Has After Care` | Parse to boolean (non-empty, not "N/A", not "No" → true) |
| N/A | `Primary Category` | Leave empty for new camps, preserve for existing |
| N/A | `Activities` | Preserve existing values, leave empty for new |
| N/A | `Featured` | Ignore (removing from app) |

---

## 3. Data Parsing Logic

### Age Parsing (`Ages` → `Age Min`, `Age Max`)

**Patterns to handle:**
- `"5-13"` → Age Min: 5, Age Max: 13
- `"11-17"` → Age Min: 11, Age Max: 17
- `"Ages 6-18"` → Age Min: 6, Age Max: 18
- `"Y5-5th Grade"` → Skip (non-numeric, leave empty)
- `"entering K-9th grade"` → Skip (non-numeric, leave empty)
- `"8+"` → Age Min: 8, Age Max: null (or set to 18 as max)

**Algorithm:**
1. Extract first number → `Age Min`
2. Extract second number (if exists) → `Age Max`
3. If only one number with "+", set `Age Max` to null or 18
4. If no numbers found, leave both empty

### City Extraction (`Address` → `City`)

**Cities to detect:**
- Ann Arbor
- Saline
- Ypsilanti
- Dexter
- Chelsea
- Plymouth
- Canton
- Pinckney
- Howell
- Livonia
- Novi
- Northville
- Other (if not found, leave empty)

**Algorithm:**
1. Check if address string contains any city name (case-insensitive)
2. Extract first matching city
3. If multiple cities mentioned, use first one
4. If no city found, leave empty

### Cost Parsing (`Cost` → `Cost Per Week`, `Cost Display`)

**Patterns to handle:**
- `"$600/week"` → Cost Per Week: 600, Cost Display: "$600/week"
- `"$199"` → Cost Per Week: 199, Cost Display: "$199"
- `"$300 per week for full days"` → Cost Per Week: 300, Cost Display: "$300 per week for full days"
- `"Varies - see website"` → Cost Per Week: null, Cost Display: "Varies - see website"
- `"$59/day or $275/week"` → Extract weekly value: Cost Per Week: 275, Cost Display: "$59/day or $275/week"

**Algorithm:**
1. Look for pattern: `$[number]/week` or `$[number] per week` → extract number
2. If not found, look for standalone `$[number]` → extract number
3. If multiple prices, prefer weekly rate
4. Store full string in `Cost Display`
5. Store numeric value in `Cost Per Week` (or null if not parseable)

### URL Extraction (`Camp Name` → `Website` / `Registration URL`)

**Algorithm:**
1. Check if Camp Name cell contains hyperlink (Google Sheets API provides this)
2. Extract URL from hyperlink
3. If URL contains "registration" or "register" → `Registration URL`
4. Otherwise → `Website`
5. If no hyperlink found, preserve existing Airtable value (if updating) or leave empty (if new)

### After Care Boolean (`Before / After Care?` → `Has After Care`)

**Patterns:**
- Empty string → false
- `"N/A"` → false
- `"No"` → false
- `"Yes"` → true
- `"Yes - see website"` → true
- Any other non-empty text → true (assume it describes after care availability)

**Algorithm:**
1. Trim and lowercase the value
2. If empty, "n/a", or "no" → false
3. Otherwise → true

### Description Combination

**Format:**
```
[Registration Details]

Schedule: [Days/Times]

After Care: [Before / After Care?]
```

**Algorithm:**
1. Combine `Registration Details` + `Days/Times` + `Before / After Care?` with line breaks
2. Remove empty sections
3. Add section headers if content exists

---

## 4. Sync Workflow

### Step 1: Fetch Data
1. Read all rows from Google Sheet (skip header row, skip metadata rows 1-2)
2. Fetch all existing records from Airtable `Camps` table

### Step 2: Build Match Map
1. Create map: `Camp Name` → Airtable Record ID
2. Create map: `Camp Name` → Airtable Record (for preserving fields)

### Step 3: Process Each Sheet Row
For each row in Google Sheet:
1. Extract `Camp Name` (match key)
2. Skip if `Camp Name` is empty
3. Parse all fields according to transformation logic
4. Check if record exists in Airtable (by `Camp Name`)
5. If exists:
   - Preserve `Primary Category` (if empty in sheet)
   - Preserve `Activities` (if empty in sheet)
   - Update record with new data
6. If new:
   - Set `Primary Category` to empty
   - Set `Activities` to empty array
   - Create new record

### Step 4: Error Handling
- Wrap each row processing in try-catch
- Log errors with row number and camp name
- Continue processing remaining rows
- Track: successful updates, successful creates, errors, skipped rows

### Step 5: Send Email Summary
After sync completes:
- Total rows processed
- Records updated
- Records created
- Errors (with details)
- Skipped rows (with reasons)

---

## 5. Technical Implementation

### Platform: Google Apps Script

**Why:**
- Free, runs in Google infrastructure
- Native Google Sheets API access
- Can call Airtable API
- Scheduled triggers (daily)
- Email sending capability
- Easy to maintain (all code in one place)

### File Structure

```
sync-script.gs (Google Apps Script file)
├── Configuration (Airtable credentials, email)
├── Main sync function
├── Data fetching functions
├── Data parsing functions (age, cost, city, etc.)
├── Airtable API functions (create, update, list)
├── Error handling & logging
└── Email summary function
```

### Airtable API Usage

**Endpoints:**
- `GET /v0/{baseId}/Camps` - List all camps (for matching)
- `PATCH /v0/{baseId}/Camps/{recordId}` - Update existing camp
- `POST /v0/{baseId}/Camps` - Create new camp

**Rate Limits:**
- 5 requests per second
- Batch operations (up to 10 records per request) for efficiency

### Google Sheets API Usage

**Methods:**
- `SpreadsheetApp.getActiveSpreadsheet()` - Get current sheet
- `getDataRange().getValues()` - Get all data
- `getRange().getRichTextValue()` - Get cell with hyperlinks
- `getUrl()` - Get sheet URL for reference

---

## 6. Setup Steps

### Step 1: Create Google Apps Script
1. Open Google Sheet
2. Extensions → Apps Script
3. Create new script file

### Step 2: Configure Credentials
- Add Airtable API key (from `config.js`)
- Add Airtable Base ID
- Add your email address for summaries

### Step 3: Implement Sync Script
- Write all parsing functions
- Write Airtable API wrapper functions
- Write main sync function
- Write email summary function

### Step 4: Test Manually
- Run sync function manually
- Verify data in Airtable
- Check email summary
- Fix any parsing issues

### Step 5: Set Up Daily Trigger
- Create time-based trigger (daily at 2-3 AM)
- Test trigger execution
- Monitor for a few days

---

## 7. Edge Cases & Considerations

### Edge Cases
1. **Duplicate Camp Names**: If sheet has duplicates, use first occurrence, log warning
2. **Missing Required Fields**: `Camp Name` is required, skip row if missing
3. **Very Long Text**: Airtable has field length limits, truncate if needed
4. **Special Characters**: Handle quotes, commas, line breaks in CSV properly
5. **URL Format**: Validate URLs before storing
6. **Date Formats**: If `Days/Times` contains dates, preserve as text

### Data Quality
- Log warnings for unparseable ages
- Log warnings for unparseable costs
- Log warnings for missing cities
- Include warnings in email summary

### Performance
- Batch Airtable API calls (10 records per batch)
- Process rows sequentially to avoid rate limits
- Estimated time: ~2-5 minutes for 100+ camps

---

## 8. Success Criteria

Sync is successful when:
1. ✅ All valid sheet rows are synced to Airtable
2. ✅ Existing records are updated correctly
3. ✅ New records are created correctly
4. ✅ Fields not in sheet are preserved (Primary Category, Activities)
5. ✅ Errors are logged and don't stop sync
6. ✅ Email summary is sent after each sync
7. ✅ Daily trigger runs automatically
8. ✅ Data transformations work correctly (age, cost, city parsing)

---

## 9. Next Steps

1. **Get your email address** (for summary emails)
2. **Confirm Google Sheet access** (can you share the sheet ID or confirm it's accessible?)
3. **Review parsing logic** (especially age/cost patterns - are there edge cases I missed?)
4. **Implement Google Apps Script** (once plan is approved)
5. **Test with sample data** (before full sync)
6. **Set up daily trigger** (after testing)

---

## 10. Questions / Ambiguities

1. **Email Address**: What email should receive the sync summary? (You said "My address" - please provide)
2. **Google Sheet Access**: Is the sheet already a Google Sheet, or is it currently CSV-only? (Need to confirm we can access it via Apps Script)
3. **Camp Name Links**: When you said "Extract from Camp name, which has links" - are these hyperlinks in the Google Sheet cell, or URLs embedded in the text?
4. **New vs Existing**: For new camps, should we set any default values, or leave everything empty except what's in the sheet?
5. **Deletions**: If a camp exists in Airtable but not in the Google Sheet, should we delete it from Airtable, or leave it untouched?
