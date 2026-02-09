# Registration Data Extraction Plan

**Overall Progress:** `83%`

**Note:** Steps 4 and 6 require manual testing/deployment. Code implementation is complete.

## TLDR
Extract structured registration data (status, date, time) from the Google Sheet's "Registration Details" field and store them in separate Airtable columns. Currently, Registration Details is copied as-is to Registration Notes. We'll parse it to extract:
- Registration Status (from Registration Status column)
- Registration Opens Date (parsed from Registration Details)
- Registration Opens Time (parsed from Registration Details)

## Critical Decisions
- **Parsing Strategy**: Use regex patterns to extract dates and times from free-form text in Registration Details field
- **Date Format**: Store as Airtable date field (YYYY-MM-DD format)
- **Time Format**: Store as text/time string (e.g., "7am", "10:00A", "noon")
- **Fallback**: If parsing fails, preserve original Registration Details text in Registration Notes
- **Status Values**: Map Registration Status column values to exact Airtable options: 'Open Now', 'Coming Soon', 'Not Updated'
- **Existing Fields**: Registration Status, Registration Opens Date, and Registration Opens Time fields already exist in Airtable - update them instead of creating new ones
- **Default Status**: If no Registration Status is found or doesn't match valid options, leave field blank (omit from update)
- **Empty Values**: If no dates or times are found, leave those fields blank (omit from Airtable update, don't set null)
- **Warnings**: Log warnings when Registration Status doesn't match any valid option

## Tasks:

- [x] 🟩 **Step 1: Verify Existing Airtable Fields**
  - [x] 🟩 Confirm "Registration Status" field exists in Airtable base
  - [x] 🟩 Confirm "Registration Opens Date" field exists (Date field type)
  - [x] 🟩 Confirm "Registration Opens Time" field exists (Text field type)
  - [x] 🟩 Note field names exactly as they appear in Airtable (case-sensitive)

- [x] 🟩 **Step 2: Create Parsing Functions**
  - [x] 🟩 Create `parseRegistrationStatus()` function
    - Map "OPEN for 2026" → "Open Now"
    - Map "Coming Soon for 2026..." → "Coming Soon"
    - Map "Not yet updated for 2026" → "Not Updated"
    - If empty or no match found → null (field omitted from update)
  - [x] 🟩 Create `parseRegistrationDate()` function
    - Extract dates from patterns like:
      - "Jan 23, 2026" (explicit year - highest priority)
      - "January 20th, 2026" (explicit year - highest priority)
      - "Feb 1st, 2026" (explicit year - highest priority)
      - "February 24th" (no year - use context year or current year)
      - "March 11" (no year - use context year or current year)
      - "2026 Summer Camps enrollment begins February 2nd" (extract year from context)
      - "Jan 20th for Members + Jan 22nd, 2026" (extract earliest date)
    - Year extraction priority:
      1. Explicit year in date pattern (highest priority)
      2. Year from context ("2026 Summer Camps", "for 2026", "2026 enrollment", "Summer 2026")
      3. Current year (if no context year found)
    - Convert to YYYY-MM-DD format
    - Return null if no date found (omit field from Airtable update)
  - [x] 🟩 Create `parseRegistrationTime()` function
    - Extract times from patterns like:
      - "@ 7am"
      - "@ 10:00A"
      - "at 8:00 AM"
      - "at noon"
      - "at 12pm"
      - "at 6:00 p.m."
    - Return time string as-is (normalize format if needed)
    - Return null if no time found (omit field from Airtable update)

- [x] 🟩 **Step 3: Update Google Apps Script**
  - [x] 🟩 Add parsing function calls in `extractCampsFromSheet()`
    - Parse Registration Status column (COL_REGISTRATION_STATUS)
    - Parse Registration Details column (COL_REGISTRATION_DETAILS) for date and time
  - [x] 🟩 Update `transformToAirtableFields()` function
    - Map parsed status to "Registration Status" field (only if matches valid options: 'Open Now', 'Coming Soon', 'Not Updated')
    - If parsed status doesn't match valid options, omit field and log warning
    - Map parsed date to "Registration Opens Date" field (only if date found, otherwise omit field)
    - Map parsed time to "Registration Opens Time" field (only if time found, otherwise omit field)
    - Keep original Registration Details in "Registration Notes" field (for reference)
  - [x] 🟩 Add error handling for parsing failures
    - Log warnings if date/time parsing fails
    - Still populate Registration Notes with original text
    - Only include date/time fields in Airtable update if values were successfully parsed

- [ ] 🟨 **Step 4: Test Parsing Logic**
  - [ ] 🟥 Test with sample Registration Details strings:
    - "Registration Opens - Jan 23, 2026 @ 7am"
    - "Registration opens Jan 20th for Members + Jan 22nd, 2026 for non-members"
    - "Registration Opens TUESDAY, FEBRUARY 24th AT 10:00A"
    - "Registration opens February 3rd, 2025"
    - "Registration will open February 1st, 2026."
    - "Member Pre-Sale March 4, 2026 | Public Sale March 11, 2026"
  - [ ] 🟥 Verify date extraction handles various formats
  - [ ] 🟥 Verify time extraction handles various formats
  - [ ] 🟥 Test edge cases:
    - Empty Registration Status → should leave field blank (omit from update)
    - Registration Status that doesn't match valid options → should log warning and leave field blank
    - No date found → should leave Registration Opens Date field blank (omit from update)
    - No time found → should leave Registration Opens Time field blank (omit from update)
    - Multiple dates → extract earliest date
    - Multiple times → extract first time found

- [x] 🟩 **Step 5: Update Documentation**
  - [x] 🟩 Update `GOOGLE_SHEETS_SYNC_SETUP.md` with new field mappings
  - [x] 🟩 Update `GOOGLE_SHEETS_SYNC_PLAN.md` with parsing logic details
  - [x] 🟩 Document date/time parsing patterns and examples

- [ ] 🟥 **Step 6: Deploy and Verify**
  - [ ] 🟥 Run sync script manually to test
  - [ ] 🟥 Verify existing fields populate correctly in Airtable
  - [ ] 🟥 Verify Registration Status field is left blank when empty or doesn't match valid options
  - [ ] 🟥 Verify warnings are logged for unmatched Registration Status values
  - [ ] 🟥 Verify date/time fields remain blank when not found (not set to null)
  - [ ] 🟥 Check email summary for any parsing warnings
  - [ ] 🟥 Verify Registration Notes still contains original text
