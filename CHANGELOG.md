## Unreleased

### Added
- Added `camp-detail.html` camp details page (supports `?id=<airtable_record_id>`).
- Added `js/camp-detail.js` to fetch and render parent-friendly camp details (age, cost, location, description, activities, after care, website).
- Added `browse.html` browse page with filters for search, age, max price, city, category, and after care.
- Added `js/browse.js` to wire Airtable data and client-side filtering into the browse page.

### Changed
- Updated `css/styles.css` with styles for the new camp detail page layout and browse page filters/results.

### Fixed
- Fixed `campfinder_index.html` home link to point at `campfinder_index.html` (not `index.html`).
- Fixed Airtable base ID usage in `js/config.js` (use base id only for Airtable API URL construction).

### Security
- `js/config.js` contains an Airtable personal access token; do not deploy this client-side in production.

