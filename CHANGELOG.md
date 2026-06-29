## Unreleased

### Added
- Multi-child summer plan (Option A): optional `child_name` on plan entries; filter chips on Summer Plan page; child picker in add-to-plan modal; color-coded calendar labels. Migration: `supabase/migrations/20260529120000_add_child_name.sql`.
- Added `DESIGN_SYSTEM.md` — design tokens and UI patterns extracted from Stitch “Summer Camp Weekly Planner Dashboard” screens.
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
- Homepage hero: summer-camp illustration background (below navbar), left-aligned copy, pill search, after-care checkbox (below search, above CTAs), **Start Planning** / **Browse Camps** buttons; existing search JS unchanged.
- Browse page: two-column layout — filters in `app-sidebar` left column; title, results count toolbar, and camp grid in main column (mirrors Summer Plan shell).
- Camp detail page (Phase A): text-only hero with badges, action bar (Visit Website, favorites, Add to Summer Plan), two-column layout with card sections and Quick Details sidebar; Plus Jakarta Sans and `#f8f9ff` canvas aligned with Browse/Summer Plan.
- Unified page canvas (`#f8f9ff`), reusable sidebar tokens (`--sidebar-bg`, `--card-border`, `.app-sidebar`), and aligned week/camp card borders.
- Browse and Favorites pages: Stitch-style rich camp cards — icon rows for ages/cost/location, pill badges, circular heart button, **Add to Plan** + **Details** footer actions (no image).
- Nav auth: signed-in users see a **My Account** pill dropdown (avatar initial, email, Log out); footer auth simplified to Log in or Log out only.
- Summer Plan page: two-column shell — full-height blue left nav column; title and content in main column; Calendar toggle first (default), List second.
- Summer Plan page: Stitch Phase 1 Evolution styling — Plus Jakarta Sans, left child sidebar with icons, pill List/Calendar toggle, week cards with accent bar (no Add Child control).
- Browse page: **Search and Filter** section title; subtle blue-tinted panel, primary border, shadow, and white inputs on the filter block.
- Stitch design system Phase 1: `:root` tokens in `css/styles.css` (canvas `#f6f8f6`, `background-dark` / on-primary text, app primary `#2563eb`); homepage hero restyled to dark band (removed purple gradient).
- Replaced remaining **CampFinder** product naming with **A2CampFinder** in About copy, `js/main.js` log, and setup/feature docs (`SETUP.md`, enrichment/sync/feedback plans).
- About page (`about.html`): added full **From Komal and Aalap** section after Crystal’s sign-off and removed the short bridge paragraph before **Why this exists**, matching `ABOUT_HOMEPAGE_CONTENT_PLAN.md`.
- Rewrote `about.html` with Crystal Hoppe’s narrative interleaved with the site story, parallel short bios (Crystal, Komal, Aalap), and the same feedback invitation; homepage hero and trust copy in `index.html` now echo that story and link to About.
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

