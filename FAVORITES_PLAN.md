# Favorites Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR

Add the ability for logged-in users to save camps to a "Favorites" list. Heart icon on camp cards (browse + favorites page), save/remove button on camp detail. Stored in Supabase Postgres. Dedicated Favorites page. Require sign-in to add; show heart when logged out and redirect to login on click.

## Critical Decisions

- **Naming: Favorites** – Renamed from "Saved Camps"
- **Storage: Supabase Postgres** – `favorites` table with RLS; same project as auth
- **Nav: Always show Favorites link** – In nav bar
- **Empty state:** "You haven't saved any camps yet" + link to Browse
- **Camp removed from Airtable:** Show card with "No longer available" message
- **Heart when logged out:** Show heart; on click, redirect to login
- **Heart icon:** Outline = not favorited, filled = favorited
- **createCampCard API:** Add optional second param `createCampCard(camp, { isSaved })`

## Prerequisites (Manual – User)

- [x] 🟩 Create `favorites` table in Supabase (see setup section below)
- [x] 🟩 Add RLS policies for `favorites` table

## Tasks

### Step 1: Supabase favorites table and RLS

- [x] 🟩 **1.1** Create table `favorites` with columns: `id` (uuid, default gen_random_uuid()), `user_id` (uuid, references auth.users), `camp_id` (text, Airtable record ID), `saved_at` (timestamptz, default now())
- [x] 🟩 **1.2** Add unique constraint on `(user_id, camp_id)` to prevent duplicates
- [x] 🟩 **1.3** Enable RLS; policy: users can SELECT/INSERT/DELETE only their own rows (`user_id = auth.uid()`)

### Step 2: Create js/favorites.js

- [x] 🟩 **2.1** `getSavedCampIds()` – fetch from Supabase `favorites` where `user_id = session.user.id`, return array of `camp_id`
- [x] 🟩 **2.2** `addFavorite(campId)` – insert row; handle duplicate (ignore or show "already saved")
- [x] 🟩 **2.3** `removeFavorite(campId)` – delete row
- [x] 🟩 **2.4** `isFavorite(campId)` – check if camp is in saved set (or derive from getSavedCampIds)
- [x] 🟩 **2.5** All functions require valid session; return empty/no-op if not logged in

### Step 3: Modify createCampCard for heart icon

- [x] 🟩 **3.1** Update signature: `createCampCard(camp, options = {})` where `options.isSaved` is boolean
- [x] 🟩 **3.2** Add heart icon (outline when !isSaved, filled when isSaved) – use CSS class e.g. `.heart-outline`, `.heart-filled`
- [x] 🟩 **3.3** Heart click handler: if not logged in → redirect to `login.html?redirectTo=currentPage`; if logged in → toggle (add/remove favorite), update UI
- [x] 🟩 **3.4** Prevent heart click from navigating to camp detail (stop propagation on the heart)

### Step 4: Modify browse.js to use favorites

- [x] 🟩 **4.1** On init, if user logged in, call `getSavedCampIds()` and store in variable
- [x] 🟩 **4.2** In `applyBrowseFiltersAndRender()`, pass `{ isSaved: savedIds.includes(camp.id) }` to `createCampCard(camp, { isSaved })`
- [x] 🟩 **4.3** After add/remove favorite, refresh `savedIds` and re-render (or update just the affected card)

### Step 5: Modify camp-detail.js for save/remove button

- [x] 🟩 **5.1** In `renderCampDetail(camp)`, add "Add to Favorites" or "Remove from Favorites" button (check session + isFavorite)
- [x] 🟩 **5.2** If not logged in, button says "Log in to save favorites" and links to login with redirectTo
- [x] 🟩 **5.3** Wire button to `addFavorite` / `removeFavorite`; update button text and state on success

### Step 6: Create favorites.html and favorites-page.js

- [x] 🟩 **6.1** Create `favorites.html` – same layout as browse (nav, footer, feedback); main content area for favorites grid
- [x] 🟩 **6.2** If not logged in, show "Log in to view your favorites" + link to login
- [x] 🟩 **6.3** If logged in and no favorites, show "You haven't saved any camps yet" + link to Browse
- [x] 🟩 **6.4** If logged in with favorites, fetch saved camp IDs, fetch camps via `fetchCamps()` and filter by IDs, render with `createCampCard(camp, { isSaved: true })`
- [x] 🟩 **6.5** For camps no longer in Airtable (getCampById returns null), show card with "No longer available" and option to remove from favorites

### Step 7: Add Favorites to nav

- [x] 🟩 **7.1** Add "Favorites" link to nav in `index.html`, `browse.html`, `camp-detail.html`, `about.html`, `favorites.html`
- [x] 🟩 **7.2** Add "Favorites" to footer Quick Links in all pages

### Step 8: CSS for heart icon and favorites

- [x] 🟩 **8.1** Add `.heart-icon`, `.heart-outline`, `.heart-filled` styles
- [x] 🟩 **8.2** Add styles for "No longer available" card state
- [x] 🟩 **8.3** Add styles for favorites page empty state

## Supabase Setup (Manual)

```sql
-- Create favorites table
create table public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  camp_id text not null,
  saved_at timestamptz default now(),
  unique(user_id, camp_id)
);

-- Enable RLS
alter table public.favorites enable row level security;

-- Policy: users can only access their own rows
create policy "Users can manage own favorites"
  on public.favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## File Summary

| File | Action |
|------|--------|
| `js/favorites.js` | Create – add/remove/get favorites via Supabase |
| `js/airtable.js` | Modify – `createCampCard(camp, { isSaved })` + heart |
| `js/browse.js` | Modify – fetch saved IDs, pass to createCampCard |
| `js/camp-detail.js` | Modify – add save/remove button |
| `favorites.html` | Create – Favorites page |
| `js/favorites-page.js` | Create – load and render favorites |
| `index.html`, `browse.html`, `camp-detail.html`, `about.html` | Modify – add Favorites nav + footer link |
| `css/styles.css` | Modify – heart icon, empty state, unavailable card |
