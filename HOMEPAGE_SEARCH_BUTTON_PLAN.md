# Homepage Search Button Plan

**Overall Progress:** `0%`

## TLDR
Update the homepage search box to only trigger search when a search button is pressed, removing the debounced input behavior. Add a search button next to the input field.

## Critical Decisions
- **Search Trigger**: Only on button click (remove debounced input behavior)
- **Enter Key**: Keep Enter key functionality for better UX (users expect Enter to work)
- **Button Placement**: Add search button next to the input field (similar to original AI search box layout)
- **Button Styling**: Style button to match hero section (white/light background, visible on gradient)
- **Button Text**: Use "Search" or search icon (🔍) - need to decide

## Tasks:

- [ ] 🟥 **Step 1: Update HTML Structure**
  - [ ] 🟥 Modify search box container in `campfinder_index.html`
  - [ ] 🟥 Wrap input and button in a container (similar to original `.search-box` structure)
  - [ ] 🟥 Add search button element with appropriate ID (`homepage-search-btn`)
  - [ ] 🟥 Decide on button text: "Search" or icon (🔍) or both
  - [ ] 🟥 Ensure proper HTML structure for styling

- [ ] 🟥 **Step 2: Update JavaScript**
  - [ ] 🟥 Remove debounced input event listener from `js/homepage.js`
  - [ ] 🟥 Remove `homepageSearchTimeout` variable (no longer needed)
  - [ ] 🟥 Add click event listener for search button
  - [ ] 🟥 Keep Enter key handler (for better UX)
  - [ ] 🟥 Create `handleHomepageSearch()` function that:
    - Gets search query from input
    - Checks after care checkbox state
    - Calls `redirectToBrowseWithSearch()` if query exists
    - Optionally: Show validation message if search is empty

- [ ] 🟥 **Step 3: Update CSS Styling**
  - [ ] 🟥 Add styles for search button container (flex layout)
  - [ ] 🟥 Style search button for hero section:
    - Visible on gradient background
    - Proper padding and sizing
    - Hover states
    - Active states
  - [ ] 🟥 Ensure input and button are properly aligned
  - [ ] 🟥 Make button responsive (mobile-friendly)
  - [ ] 🟥 Match styling with original search box button if possible

- [ ] 🟥 **Step 4: Test Functionality**
  - [ ] 🟥 Test search button click triggers search
  - [ ] 🟥 Test Enter key still works
  - [ ] 🟥 Test empty search handling (should it redirect or show message?)
  - [ ] 🟥 Test after care checkbox still works with search
  - [ ] 🟥 Test on mobile devices
  - [ ] 🟥 Verify redirect to browse page with correct filters

## Implementation Notes

### HTML Structure Options

**Option A: Similar to original search-box**
```html
<div class="hero-search-box">
    <input type="text" id="homepage-search" class="search-input" ...>
    <button id="homepage-search-btn" class="search-btn">Search</button>
</div>
```

**Option B: Keep current structure, add button**
```html
<div class="browse-filter-group browse-filter-search">
    <label>Search camps</label>
    <div class="search-input-wrapper">
        <input type="text" id="homepage-search" class="search-input" ...>
        <button id="homepage-search-btn" class="search-btn">Search</button>
    </div>
</div>
```

### JavaScript Changes

**Remove:**
```javascript
searchInput.addEventListener('input', () => {
    // debounced search logic
});
```

**Add:**
```javascript
const searchButton = document.getElementById('homepage-search-btn');
if (searchButton) {
    searchButton.addEventListener('click', handleHomepageSearch);
}

function handleHomepageSearch() {
    const query = searchInput.value.trim();
    if (query) {
        redirectToBrowseWithSearch(query);
    } else {
        // Optional: show message or focus input
        searchInput.focus();
    }
}
```

### CSS Considerations

- Button should be visible on gradient background
- Use white or light background for button
- Ensure proper contrast
- Match button height with input height
- Add hover/active states
- Consider icon vs text (or both)

### Edge Cases

1. **Empty Search**: Should button do nothing, show message, or focus input?
2. **Button Disabled State**: Should button be disabled when input is empty?
3. **Loading State**: Should button show loading state during redirect?
4. **Accessibility**: Ensure button has proper ARIA labels and keyboard navigation

## Files to Modify

1. **campfinder_index.html**
   - Update search box HTML structure
   - Add search button element

2. **js/homepage.js**
   - Remove debounced input listener
   - Add button click handler
   - Keep Enter key handler

3. **css/styles.css**
   - Add search button container styles
   - Style search button for hero section
   - Ensure proper layout and alignment

## Questions to Resolve

1. **Button Text**: "Search", icon (🔍), or both?
2. **Empty Search Behavior**: What should happen if user clicks search with empty input?
3. **Button Disabled State**: Should button be disabled when input is empty?
4. **Layout**: Should button be inline with input or below it on mobile?
