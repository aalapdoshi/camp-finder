# Saved Camps Feature – Exploration Summary

**Status:** Saved for later implementation  
**Date:** January 2026

## Overview

Allow users to save camps they like to a list ("Saved camps").

---

## User Decisions

| Question | Decision |
|----------|----------|
| Storage | **Hybrid** – localStorage now, backend + user accounts later |
| Where to save | **Both** – browse page (camp cards) and camp detail page |
| Where to view | **Dedicated page** – "Saved Camps" |
| UI | **Both** – heart icon on cards + save/remove button on detail page |
| List model | **Single list** |
| Persistence | **localStorage** – session persistence; backend persistence when accounts exist |
| Naming | **Saved camps** |

---

## Open Questions (to resolve before implementation)

1. **Nav link**: Always show "Saved Camps" in nav, or only when there are saved camps? Show count badge?
2. **Empty state**: On Saved Camps page with no saved camps – show "You haven't saved any camps yet" + link to Browse?
3. **Camp removed from Airtable**: Hide it, show "no longer available", or other?
4. **Backend migration**: When user accounts ship – migrate localStorage on sign-up, or start fresh?
5. **Saved Camps page layout**: Same as browse (grid of camp cards)? Same card design with hearts?
6. **Heart icon**: Outline = not saved, filled = saved?

---

## Technical Notes

### Data model

- Store camp IDs in `localStorage` as array: `["recXXX123", "recYYY456"]`
- Backend-ready: same structure can be sent to API when user accounts exist

### Files to modify

- `js/airtable.js` – `createCampCard()` to add heart icon
- `js/camp-detail.js` – `renderCampDetail()` to add save button
- New: `saved-camps.html` – dedicated page
- New: `js/saved-camps.js` – load and render saved camps
- New: `js/favorites.js` – add/remove saved camps, sync with localStorage
- Nav: `browse.html`, `camp-detail.html`, `campfinder_index.html`, `about.html`

---

## Dependencies

- Existing: `fetchCamps()`, `getCampById()`, `createCampCard()` in `airtable.js`
- Existing: `localStorage` usage for `searchQuery`, `categoryFilter`, `afterCareFilter` in `browse.js` and `homepage.js`
