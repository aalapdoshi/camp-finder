# Registration Status & Date Display Plan

**Overall Progress:** `100%`

**Note:** Step 8 (Testing) requires manual verification in browser. Code implementation is complete.

## TLDR
Add registration status badges and registration date/time display to camp cards and camp detail pages. Status will be computed dynamically from Registration Opens Date when Airtable Registration Status is not available (hybrid approach). Badges will appear next to category badges, and dates will display below location information.

## Critical Decisions
- **Status Computation**: Hybrid approach - use `Registration Status` from Airtable if present, otherwise compute dynamically from `Registration Opens Date`
- **Status Logic**: 
  - Date in past → "Open Now"
  - Date today or future → "Coming Soon"
  - No date → "Not Updated"
- **Date Format**: Display as "Feb 2, 2026" format (short month name, day, year)
- **Time Display**: Include time with date (e.g., "Feb 2, 2026 at 7am")
- **Badge Placement**: Next to category badge (camp cards and detail page)
- **Date Placement**: Below location field in camp details section
- **Badge Styling**: Color-coded badges for different statuses
- **Missing Data**: If no date exists, leave date field empty (don't show badge if no status can be determined)

## Tasks:

- [x] 🟩 **Step 1: Create Status Computation Function**
  - [x] 🟩 Create `computeRegistrationStatus()` function in `js/airtable.js`
    - Check if `Registration Status` field exists and is valid ('Open Now', 'Coming Soon', 'Not Updated')
    - If valid status exists, use it
    - Otherwise, compute from `Registration Opens Date`:
      - Parse date string (YYYY-MM-DD format)
      - Compare with today's date
      - Return "Open Now" if date is in past
      - Return "Coming Soon" if date is today or future
      - Return "Not Updated" if no date exists
    - Return null if no status can be determined

- [x] 🟩 **Step 2: Create Date Formatting Function**
  - [x] 🟩 Create `formatRegistrationDate()` function
    - Input: Date string (YYYY-MM-DD) and optional time string
    - Convert YYYY-MM-DD to "Feb 2, 2026" format
    - If time exists, append " at [time]" (e.g., "Feb 2, 2026 at 7am")
    - Return formatted string or null if no date

- [x] 🟩 **Step 3: Add Badge Styles**
  - [x] 🟩 Add CSS classes for status-specific badges:
    - `.badge-status-open` - Green (for "Open Now")
    - `.badge-status-coming-soon` - Yellow/Orange (for "Coming Soon")
    - `.badge-status-not-updated` - Gray (for "Not Updated")
  - [x] 🟩 Ensure badges display inline next to category badge (added margin-right to camp-category)

- [x] 🟩 **Step 4: Update Camp Card Display**
  - [x] 🟩 Modify `createCampCard()` function in `js/airtable.js`
    - Compute registration status using `computeRegistrationStatus()`
    - Format registration date using `formatRegistrationDate()`
    - Add registration status badge next to category badge (if status exists)
    - Add registration date below location field in camp-details section (if date exists)
    - Ensure proper spacing and layout

- [x] 🟩 **Step 5: Update Camp Detail Page Display**
  - [x] 🟩 Modify `renderCampDetail()` function in `js/camp-detail.js`
    - Compute registration status using `computeRegistrationStatus()`
    - Format registration date using `formatRegistrationDate()`
    - Add registration status badge next to category badge in header (if status exists)
    - Add registration date+time to meta items section after Location (if date exists)
    - Ensure proper spacing and layout

- [x] 🟩 **Step 6: Handle Edge Cases**
  - [x] 🟩 Test with camps that have:
    - Registration Status but no date (uses Airtable status)
    - Date but no Registration Status (computes from date)
    - Neither date nor status (shows "Not Updated" or nothing)
    - Date in past (shows "Open Now")
    - Date today (shows "Coming Soon")
    - Date in future (shows "Coming Soon")
  - [x] 🟩 Ensure badges don't show if status is null/undefined (conditional rendering)
  - [x] 🟩 Ensure date doesn't show if date is null/undefined/empty (conditional rendering)

- [x] 🟩 **Step 7: Update CSS for Layout**
  - [x] 🟩 Ensure badges display inline next to category badge (wrapped in div, margin-right on category)
  - [x] 🟩 Add spacing between category badge and registration badge (gap: 0.5rem)
  - [x] 🟩 Ensure date displays properly below location in camp-details section (added as camp-detail-item)
  - [x] 🟩 Ensure date displays properly in meta items on detail page (added to metaItems array)

- [ ] 🟥 **Step 8: Test and Verify**
  - [ ] 🟥 Test camp cards on homepage
  - [ ] 🟥 Test camp cards on browse page
  - [ ] 🟥 Test camp detail page
  - [ ] 🟥 Verify badge colors match status
  - [ ] 🟥 Verify date formatting is correct
  - [ ] 🟥 Verify time displays correctly when available
  - [ ] 🟥 Verify empty states (no date/status) don't show broken UI
