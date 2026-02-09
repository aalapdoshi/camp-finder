# Homepage Improvement Plan

**Overall Progress:** `0%`

## TLDR
Improve the homepage by replacing the AI search box with browse page search, adding after care checkbox, calculating accurate stats, removing Featured Camps and How It Works sections, ensuring category counts are accurate, and moving the Browse All Camps button.

## Critical Decisions
- **Search Box**: Replace entire AI search box with browse page search box - redirects to browse.html with search query
- **After Care Checkbox**: Replace "Popular searches" section with after care checkbox - redirects to browse.html with filter applied, works in combination with search
- **Stats Calculation**: Calculate dynamically from camp data on page load
  - Total Camps: Count all camps from `fetchCamps()`
  - Age Range: Min of all `Age Min`, Max of all `Age Max`
  - Price Range: Min/Max of `Cost Per Week`, exclude null/0 values
- **Category Counts**: Trust Airtable `Camp Count` field, but update Google Sheets sync script to maintain accurate counts
- **Sections to Remove**: Featured Camps section, How It Works section
- **Button Placement**: Move "Browse All Camps" button below Browse by Interest section

## Tasks:

- [ ] 🟥 **Step 1: Replace Homepage Search Box**
  - [ ] 🟥 Remove AI search box HTML (lines 34-45 in `campfinder_index.html`)
  - [ ] 🟥 Remove "Ask AI ✨" button
  - [ ] 🟥 Add browse page search box HTML structure
    - Use same structure as `browse.html` (lines 36-44)
    - Label: "Search camps"
    - Placeholder: "Search by name, interests, description..."
    - ID: `homepage-search` (to distinguish from browse page)
    - Class: `search-input` (for styling)
  - [ ] 🟥 Add JavaScript event handler for search input
    - On Enter key or input (debounced like browse page)
    - Store search query in localStorage
    - Redirect to `browse.html`
  - [ ] 🟥 Style search box to match hero section (white text on gradient background)
    - May need to adjust CSS for hero section search input
    - Ensure placeholder text is visible on gradient background

- [ ] 🟥 **Step 2: Replace Popular Searches with After Care Checkbox**
  - [ ] 🟥 Remove "Popular searches" section HTML (lines 46-52 in `campfinder_index.html`)
  - [ ] 🟥 Remove `quickSearch()` function calls
  - [ ] 🟥 Add after care checkbox HTML structure
    - Use same structure as `browse.html` (lines 84-89)
    - Label: "With after care"
    - ID: `homepage-aftercare` (to distinguish from browse page)
    - Place in same location as Popular searches (below search box)
  - [ ] 🟥 Add JavaScript event handler for checkbox
    - On change, store `afterCare: true` in localStorage
    - If search box has value, preserve it
    - Redirect to `browse.html`
  - [ ] 🟥 Style checkbox to match hero section
    - White text on gradient background
    - Ensure checkbox is visible
    - Match styling from browse page but adapt for hero section

- [ ] 🟥 **Step 3: Calculate and Display Accurate Stats**
  - [ ] 🟥 Create `updateHomepageStats()` function in `js/main.js` or new `js/homepage.js`
  - [ ] 🟥 Fetch camps data using `fetchCamps()`
  - [ ] 🟥 Calculate Total Camps:
    - Count: `camps.length`
    - Update `#total-camps` element
  - [ ] 🟥 Calculate Age Range:
    - Find min of all `Age Min` values (filter out null/undefined)
    - Find max of all `Age Max` values (filter out null/undefined)
    - Format as "X-Y" (e.g., "5-15")
    - Update age range stat element
  - [ ] 🟥 Calculate Price Range:
    - Filter out null, undefined, and 0 values from `Cost Per Week`
    - Find min and max values
    - Format as "$X-$Y" (e.g., "$0-$600")
    - Handle edge cases (all null, all 0, single value)
    - Update price range stat element
  - [ ] 🟥 Call `updateHomepageStats()` on page load (in DOMContentLoaded event)
  - [ ] 🟥 Handle loading state (show "Loading..." or keep default values until calculated)

- [ ] 🟥 **Step 4: Remove Featured Camps Section**
  - [ ] 🟥 Remove Featured Camps section HTML (lines 72-89 in `campfinder_index.html`)
  - [ ] 🟥 Remove `loadFeaturedCamps()` call from page load script (line 186)
  - [ ] 🟥 Keep `loadFeaturedCamps()` function in `js/airtable.js` (may be used elsewhere)
  - [ ] 🟥 Adjust spacing if needed (section padding may need adjustment)

- [ ] 🟥 **Step 5: Ensure Category Counts Are Accurate**
  - [ ] 🟥 Verify `loadCategories()` function uses Airtable `Camp Count` field (already does - line 250-252 in `js/airtable.js`)
  - [ ] 🟥 Add `updateCategoryCounts()` function to `google-apps-script-sync.gs`
    - Function should run after camps sync completes
    - Fetch all camps from Airtable
    - Group camps by `Primary Category`
    - Count camps per category
    - Fetch all categories from Airtable Categories table
    - Update each category's `Camp Count` field
    - Create categories that don't exist if needed
  - [ ] 🟥 Call `updateCategoryCounts()` at end of `syncCampsToAirtable()` function
  - [ ] 🟥 Handle edge cases:
    - Categories with 0 camps (set count to 0)
    - Camps with no category (don't count)
    - Categories that don't exist in Categories table (create them with count)

- [ ] 🟥 **Step 6: Remove How It Works Section**
  - [ ] 🟥 Remove How It Works section HTML (lines 105-131 in `campfinder_index.html`)
  - [ ] 🟥 Adjust spacing if needed

- [ ] 🟥 **Step 7: Move Browse All Camps Button**
  - [ ] 🟥 Remove button from Featured Camps section (already removed in Step 4)
  - [ ] 🟥 Add button below Browse by Interest section
    - After `categories-grid` div (line 101)
    - Before closing `</section>` tag
    - Use same button styling: `btn-primary` class
    - Text: "Browse All Camps →"
    - Link: `href="browse.html"`
  - [ ] 🟥 Add CSS for button placement (centered, margin-top)

- [ ] 🟥 **Step 8: Update CSS for Hero Section Elements**
  - [ ] 🟥 Ensure search input is styled for hero section (white text, visible placeholder)
  - [ ] 🟥 Ensure checkbox is styled for hero section (white text, visible checkbox)
  - [ ] 🟥 May need to add `.hero .search-input` and `.hero .browse-filter-aftercare` styles
  - [ ] 🟥 Ensure proper spacing and alignment

- [ ] 🟥 **Step 9: Clean Up JavaScript**
  - [ ] 🟥 Remove `quickSearch()` function from `campfinder_index.html` (lines 190-193)
  - [ ] 🟥 Remove `handleAISearch()` function if not used elsewhere (lines 195-202)
  - [ ] 🟥 Remove debugger statement (line 185)
  - [ ] 🟥 Ensure all event handlers are properly attached

- [ ] 🟥 **Step 10: Test and Verify**
  - [ ] 🟥 Test search box redirects to browse page with query
  - [ ] 🟥 Test after care checkbox redirects to browse page with filter
  - [ ] 🟥 Test search + checkbox combination works
  - [ ] 🟥 Verify stats are accurate and update on page load
  - [ ] 🟥 Verify category counts display correctly
  - [ ] 🟥 Verify Featured Camps section is removed
  - [ ] 🟥 Verify How It Works section is removed
  - [ ] 🟥 Verify Browse All Camps button appears below categories
  - [ ] 🟥 Test on different screen sizes (responsive)

## Implementation Notes

### Search Box Implementation
- The browse page search uses debounced input (250ms delay)
- Search query is stored in `localStorage` with key `searchQuery`
- On browse page load, it reads from localStorage and applies filter

### After Care Checkbox Implementation
- The browse page checkbox stores filter state in `browseFilters.afterCare`
- We'll store `afterCare: true` in localStorage with key `afterCareFilter`
- On browse page load, check localStorage and apply filter

### Stats Calculation Edge Cases
- **Age Range**: If no camps have age data, show "N/A" or "TBD"
- **Price Range**: If all camps have null/0 cost, show "Varies" or "See details"
- **Total Camps**: Should always show a number (even if 0)

### Category Count Update Function
```javascript
function updateCategoryCounts() {
  // 1. Fetch all camps
  // 2. Group by Primary Category
  // 3. Count per category
  // 4. Fetch all categories from Categories table
  // 5. Update Camp Count for each category
  // 6. Create missing categories if needed
}
```

### localStorage Keys
- `searchQuery`: Search text (existing)
- `afterCareFilter`: Boolean for after care filter (new)

## Files to Modify

1. **campfinder_index.html**
   - Replace search box HTML
   - Replace Popular searches with checkbox
   - Remove Featured Camps section
   - Remove How It Works section
   - Move Browse All Camps button
   - Update inline JavaScript

2. **js/main.js** or **js/homepage.js** (new file)
   - Add `updateHomepageStats()` function
   - Add search box event handler
   - Add checkbox event handler

3. **css/styles.css**
   - Add hero section search input styles
   - Add hero section checkbox styles
   - Add button placement styles

4. **google-apps-script-sync.gs**
   - Add `updateCategoryCounts()` function
   - Call it at end of `syncCampsToAirtable()`

5. **js/airtable.js**
   - No changes needed (already uses Camp Count from Airtable)
