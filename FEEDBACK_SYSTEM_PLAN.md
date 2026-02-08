# Feedback System Plan

**Overall Progress:** `0%`

## TLDR
Add a subtle floating feedback button that opens a modal form with two questions: "How helpful was CampFinder?" (rating) and "Any suggestions?" (text). Submit feedback to Airtable "Feedback" table via Netlify Function to keep API keys secure.

## Critical Decisions
- **UI Element**: Floating button (bottom-right corner, subtle, not intrusive)
- **Questions**: 
  1. "How helpful was CampFinder?" - Rating (1-5 stars or 1-5 scale)
  2. "Any suggestions?" - Optional text input
- **Data Storage**: Airtable "Feedback" table
- **API Integration**: Netlify Function to proxy Airtable API calls (keeps API keys secure)
- **UX**: Subtle, non-intrusive, doesn't block user from finding camps
- **Placement**: Floating button on all pages (campfinder_index.html, browse.html, camp-detail.html)

## Airtable Table Structure

**Table Name:** `Feedback`

**Fields:**
- `Rating` (Number) - 1-5 rating
- `Suggestions` (Long text) - Optional text feedback
- `Submitted At` (Date) - Auto-populated timestamp
- `Page` (Single line text) - Page where feedback was submitted (optional, for analytics)

## Tasks:

- [ ] 🟥 **Step 1: Create Airtable Feedback Table**
  - [ ] 🟥 Create new table "Feedback" in Airtable base
  - [ ] 🟥 Add field: `Rating` (Number, 1-5)
  - [ ] 🟥 Add field: `Suggestions` (Long text, optional)
  - [ ] 🟥 Add field: `Submitted At` (Date with time, auto-populated)
  - [ ] 🟥 Add field: `Page` (Single line text, optional)
  - [ ] 🟥 Verify table structure matches plan

- [ ] 🟥 **Step 2: Create Netlify Function for Feedback Submission**
  - [ ] 🟥 Create `netlify/functions/feedback.js`
  - [ ] 🟥 Function should:
    - Accept POST requests only
    - Validate input (rating 1-5, suggestions optional)
    - Use AIRTABLE_API_KEY and AIRTABLE_BASE_ID from environment variables
    - Create record in Airtable "Feedback" table
    - Return success/error response
    - Include CORS headers
  - [ ] 🟥 Handle errors gracefully
  - [ ] 🟥 Add "Feedback" to allowed tables check (security)

- [ ] 🟥 **Step 3: Create Feedback Modal HTML Structure**
  - [ ] 🟥 Create modal overlay (backdrop)
  - [ ] 🟥 Create modal content container
  - [ ] 🟥 Add form with:
    - Title: "Share Your Feedback"
    - Rating question: "How helpful was CampFinder?"
    - Rating input: Star rating or 1-5 buttons
    - Suggestions question: "Any suggestions?" (optional)
    - Textarea for suggestions
    - Submit button
    - Close button (X)
  - [ ] 🟥 Add to all HTML pages (campfinder_index.html, browse.html, camp-detail.html)
  - [ ] 🟥 Initially hidden (display: none)

- [ ] 🟥 **Step 4: Create Floating Feedback Button**
  - [ ] 🟥 Create floating button element
  - [ ] 🟥 Position: Fixed, bottom-right corner
  - [ ] 🟥 Styling: Subtle, small, rounded
  - [ ] 🟥 Icon/Text: "Feedback" or 💬 icon
  - [ ] 🟥 Add to all HTML pages
  - [ ] 🟥 Click handler: Opens modal

- [ ] 🟥 **Step 5: Create JavaScript for Feedback Functionality**
  - [ ] 🟥 Create `js/feedback.js` file
  - [ ] 🟥 Functions needed:
    - `initFeedback()` - Initialize feedback button and modal
    - `openFeedbackModal()` - Show modal, add event listeners
    - `closeFeedbackModal()` - Hide modal, reset form
    - `handleRatingClick(rating)` - Handle rating selection
    - `submitFeedback()` - Validate and submit to Netlify Function
    - `showSuccessMessage()` - Show thank you message
    - `showErrorMessage()` - Show error message
  - [ ] 🟥 Rating selection: Allow clicking stars/numbers (1-5)
  - [ ] 🟥 Form validation: Rating required, suggestions optional
  - [ ] 🟥 Track current page for analytics

- [ ] 🟥 **Step 6: Style Feedback Components**
  - [ ] 🟥 Floating button styles:
    - Fixed position, bottom-right
    - Small size, rounded corners
    - Subtle colors (not too bright)
    - Hover effect
    - z-index high enough to be above content
  - [ ] 🟥 Modal styles:
    - Centered overlay
    - Backdrop (semi-transparent, dark)
    - Modal container (white background, rounded corners, shadow)
    - Responsive (mobile-friendly)
    - Smooth animations (fade in/out)
  - [ ] 🟥 Form styles:
    - Rating buttons/stars (visual feedback on hover/click)
    - Textarea styling
    - Submit button (primary color)
    - Close button (X, top-right)
  - [ ] 🟥 Success/error message styles

- [ ] 🟥 **Step 7: Add Script Tags to HTML Pages**
  - [ ] 🟥 Add `<script src="js/feedback.js"></script>` to:
    - campfinder_index.html
    - browse.html
    - camp-detail.html
  - [ ] 🟥 Initialize feedback on page load

- [ ] 🟥 **Step 8: Update Netlify Configuration**
  - [ ] 🟥 Verify `netlify.toml` redirects `/api/*` to `/.netlify/functions/:splat`
  - [ ] 🟥 Ensure environment variables are set in Netlify dashboard:
    - AIRTABLE_API_KEY
    - AIRTABLE_BASE_ID
  - [ ] 🟥 Test function locally (if using Netlify CLI)

- [ ] 🟥 **Step 9: Test and Verify**
  - [ ] 🟥 Test floating button appears on all pages
  - [ ] 🟥 Test modal opens when button clicked
  - [ ] 🟥 Test rating selection works
  - [ ] 🟥 Test form submission (with and without suggestions)
  - [ ] 🟥 Test error handling (network errors, validation)
  - [ ] 🟥 Verify data appears in Airtable Feedback table
  - [ ] 🟥 Test on mobile devices
  - [ ] 🟥 Test modal closes on backdrop click
  - [ ] 🟥 Test modal closes on X button
  - [ ] 🟥 Verify UX is subtle and non-intrusive

## Implementation Details

### Netlify Function Structure

```javascript
// netlify/functions/feedback.js
exports.handler = async (event, context) => {
  // CORS headers
  // Handle OPTIONS preflight
  // Validate POST method
  // Parse request body
  // Validate rating (1-5)
  // Create Airtable record
  // Return success/error response
};
```

### Airtable Record Structure

```javascript
{
  fields: {
    'Rating': 4,
    'Suggestions': 'Could use more filters',
    'Submitted At': '2026-01-26T10:30:00.000Z',
    'Page': 'browse.html'
  }
}
```

### Rating Input Options

**Option A: Star Rating (Visual)**
- 5 clickable stars
- Fill stars up to selected rating
- More visual, user-friendly

**Option B: Number Buttons (Simple)**
- 5 buttons labeled 1, 2, 3, 4, 5
- Simpler implementation
- Clear numeric value

**Recommendation:** Start with Option B (number buttons) for simplicity, can upgrade to stars later.

### Modal UX Flow

1. User clicks floating button
2. Modal fades in with backdrop
3. User selects rating (required)
4. User optionally types suggestions
5. User clicks "Submit Feedback"
6. Form validates
7. Shows loading state
8. Submits to Netlify Function
9. Shows success message ("Thank you for your feedback!")
10. Modal closes after 2 seconds OR user clicks close
11. Form resets for next use

### Error Handling

- **Network Error**: Show error message, allow retry
- **Validation Error**: Highlight required fields
- **Server Error**: Show generic error message
- **Rate Limiting**: Handle gracefully (if needed)

### Accessibility

- Floating button: ARIA label "Provide feedback"
- Modal: ARIA role "dialog", aria-labelledby
- Close button: Keyboard accessible (Escape key)
- Focus management: Trap focus in modal
- Screen reader friendly

## Files to Create/Modify

1. **New Files:**
   - `netlify/functions/feedback.js` - Netlify Function for submitting feedback
   - `js/feedback.js` - Client-side feedback functionality

2. **Modified Files:**
   - `campfinder_index.html` - Add modal HTML, floating button, script tag
   - `browse.html` - Add modal HTML, floating button, script tag
   - `camp-detail.html` - Add modal HTML, floating button, script tag
   - `css/styles.css` - Add feedback button and modal styles
   - `netlify.toml` - Verify redirects are correct (should already be set)

## Questions to Resolve

1. **Rating Input Type**: Star rating (visual) or number buttons (1-5)?
   - **Recommendation**: Start with number buttons for simplicity

2. **Success Message**: Show in modal or separate toast notification?
   - **Recommendation**: Show in modal, then auto-close

3. **Modal Close Behavior**: Close on backdrop click?
   - **Recommendation**: Yes, for better UX

4. **Page Tracking**: Include page URL in feedback?
   - **Recommendation**: Yes, useful for analytics

5. **Required Fields**: Should suggestions be optional?
   - **Answer**: Yes, suggestions are optional (only rating required)

## Security Considerations

- API keys stored in Netlify environment variables (never exposed to client)
- Netlify Function validates input before sending to Airtable
- CORS headers properly configured
- Rate limiting: Consider adding if needed (Netlify Functions have limits)
- Input sanitization: Sanitize text input before storing

## Future Enhancements (Not in Scope)

- Email notifications when feedback is submitted
- Feedback analytics dashboard
- Ability to respond to feedback
- Star rating visual upgrade
- Feedback history for users (if logged in)
