## Unreleased

### Added
- Added `camp-detail.html` camp details page (supports `?id=<airtable_record_id>`).
- Added `js/camp-detail.js` to fetch and render parent-friendly camp details (age, cost, location, description, activities, after care, website).
- Added `browse.html` browse page with filters for search, age, max price, city, category, and after care.
- Added `js/browse.js` to wire Airtable data and client-side filtering into the browse page.
- Added `google-apps-script-sync.gs` Google Apps Script for automated daily sync from Google Sheets to Airtable.
- Added `GOOGLE_SHEETS_SYNC_PLAN.md` and `GOOGLE_SHEETS_SYNC_SETUP.md` documentation for sync feature.
- Added AI-powered camp enrichment using OpenAI API:
  - `enrichCampsWithAI()` function for manual enrichment of all eligible camps
  - `enrichNewCampsFromSync()` function for automatic enrichment of new camps during sync
  - Website content scraping and description extraction
  - Category matching with fuzzy matching and synonym support
  - Email summaries with unmatched category suggestions
- Added `AI_ENRICHMENT_PLAN.md` and `AI_ENRICHMENT_SETUP.md` documentation for AI enrichment feature.

### Changed
- Updated `css/styles.css` with styles for the new camp detail page layout and browse page filters/results.
- Updated `js/camp-detail.js` to display Notes section with Address, Schedule Notes, Registration Notes, and Extended Care Notes.
- Updated `js/airtable.js` and `js/camp-detail.js` to handle missing age/cost data gracefully (hide fields instead of showing "undefined").
- Updated `google-apps-script-sync.gs` to:
  - Copy full Address field from Google Sheet
  - Map Registration Details → Registration Notes, Days/Times → Schedule Notes, Before/After Care → Extended Care Notes
  - Integrate AI enrichment for newly created camps

### Fixed
- Fixed `campfinder_index.html` home link to point at `campfinder_index.html` (not `index.html`).
- Fixed Airtable base ID usage in `js/config.js` (use base id only for Airtable API URL construction).

### Security
- `js/config.js` contains an Airtable personal access token; do not deploy this client-side in production.

