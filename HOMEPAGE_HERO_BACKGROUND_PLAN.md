# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
Redesign the homepage hero with the provided summer-camp illustration as a full-bleed background (below the existing navbar), left-aligned copy, a pill-shaped search bar, and two CTAs. Reuse existing search/after-care wiring in `js/homepage.js` via the same element IDs. Navbar stays as-is—no transparent or merged nav.

## Critical Decisions
- **Scope**: Hero section only on `index.html`—illustration background, left-aligned layout, pill search, dual CTAs. No registration badge, social-proof avatars, or nav redesign in this pass.
- **Nav boundary**: White navbar unchanged above `.hero`; illustration starts at the hero, not behind the nav.
- **Background**: CSS layered background on `.hero`—dark scrim gradient + `url('../images/hero-summer-camp.png')`, `background-size: cover`, tuned `background-position`.
- **Layout**: Replace centered `text-align: center` with a left-aligned content column (`max-width` ~640–720px) inside existing `.container` or a new `.hero-inner` wrapper.
- **Search**: Restyle to pill form (icon + input + embedded Search button); **keep IDs** `homepage-search`, `homepage-search-btn`, and `homepage-aftercare` so `js/homepage.js` needs no logic changes.
- **CTAs**:
  - **Start Planning** → `summer-plan.html` (primary button)
  - **Browse Camps** → `browse.html` (ghost/outline button on scrim)
  - Plain `<a>` links—no new JS handlers.
- **Copy**: Retain existing headline and subtitle/story link; optional accent styling on one headline word (e.g. “Camp”)—cosmetic only.
- **After care**: Keep checkbox **below search, above CTAs**. Visually de-emphasized, left-aligned with content column.
- **Stats row**: Keep dynamic stats (`#total-camps`, `#age-range`, `#price-range`); restyle left-aligned under hero actions—no JS changes to `updateHomepageStats()`.
- **Typography**: Add Plus Jakarta Sans + Material Symbols to `index.html` head (match Browse/Summer Plan) for search icon consistency.
- **Asset location**: `images/hero-summer-camp.png` (212 KB). Source: Cursor assets illustration.
- **Performance**: PNG with `<link rel="preload">` in `index.html` head for LCP.

## Suggested DOM (hero only)

```
<section class="hero">
  <div class="container hero-inner">
    <div class="hero-content">
      <h1 class="hero-title">…</h1>
      <p class="hero-subtitle">… <a href="about.html">Read our story →</a></p>

      <div class="hero-search-pill">
        <span class="material-symbols-outlined hero-search-icon">search</span>
        <input id="homepage-search" …>
        <button id="homepage-search-btn" type="button">Search</button>
      </div>

      <div class="hero-checkbox">… id="homepage-aftercare" …</div>

      <div class="hero-cta-row">
        <a href="summer-plan.html" class="hero-cta-primary">Start Planning</a>
        <a href="browse.html" class="hero-cta-ghost">Browse Camps</a>
      </div>

      <div class="hero-stats">… existing stat IDs …</div>
    </div>
  </div>
</section>
```

## Tasks:

- [x] 🟩 **Step 1: Add hero illustration assets**
  - [x] 🟩 Copy source PNG into `images/hero-summer-camp.png`
  - [x] 🟩 Use optimized PNG for production (WebP tooling unavailable in env)
  - [x] 🟩 User-provided generated asset for site use

- [x] 🟩 **Step 2: Update `index.html` hero markup**
  - [x] 🟩 Add Plus Jakarta Sans + Material Symbols font links in `<head>`
  - [x] 🟩 Wrap hero content in `.hero-inner` / `.hero-content` for left-aligned column
  - [x] 🟩 Replace rectangular search box with `.hero-search-pill` markup; preserve `homepage-search`, `homepage-search-btn` IDs
  - [x] 🟩 Add `.hero-cta-row` with **Start Planning** and **Browse Camps**
  - [x] 🟩 After-care checkbox below search, above CTAs; `homepage-aftercare` ID preserved
  - [x] 🟩 Keep stats block with existing stat element IDs
  - [x] 🟩 Add `<link rel="preload" as="image" href="images/hero-summer-camp.png">`

- [x] 🟩 **Step 3: Hero CSS in `css/styles.css`**
  - [x] 🟩 Illustration background + scrim on `.hero`
  - [x] 🟩 `min-height` immersive hero below nav
  - [x] 🟩 Left-align `.hero-content`
  - [x] 🟩 Style `.hero-search-pill` (pill, icon, embedded button)
  - [x] 🟩 Style `.hero-cta-primary` and `.hero-cta-ghost`
  - [x] 🟩 Restyle subtitle link, checkbox, and stats
  - [x] 🟩 Responsive `background-position` and mobile CTA stacking

- [x] 🟩 **Step 4: Verify JS unchanged**
  - [x] 🟩 `handleHomepageSearch()` binds to `#homepage-search` and `#homepage-search-btn`
  - [x] 🟩 After-care checkbox uses existing change handler
  - [x] 🟩 `updateHomepageStats()` stat element IDs unchanged
  - [x] 🟩 No changes to `js/homepage.js`

- [x] 🟩 **Step 5: Responsive QA & performance**
  - [x] 🟩 Mobile rules for pill search, CTAs, stats
  - [x] 🟩 Left-to-right scrim for text legibility on bright areas
  - [x] 🟩 Preload hero image; PNG ~212 KB

- [x] 🟩 **Step 6: Documentation**
  - [x] 🟩 `CHANGELOG.md`
  - [x] 🟩 `DESIGN_SYSTEM.md` hero pattern note

## Out of scope (future passes)
- Transparent or illustration-backed navbar
- Registration status badge (“Registration Open”)
- Social-proof avatars / “Trusted by X families”
- Dynamic registration aggregate badge
- Applying hero treatment to other pages
- Auth-aware CTA (e.g. login redirect for Start Planning)

## Files touched
| File | Change |
|------|--------|
| `images/hero-summer-camp.png` | New asset |
| `index.html` | Hero markup, fonts, preload |
| `css/styles.css` | Hero background, layout, pill search, CTAs, responsive rules |
| `js/homepage.js` | No changes |
| `CHANGELOG.md` | Brief note |
| `DESIGN_SYSTEM.md` | Hero pattern note |

## Verification
- Navbar unchanged; illustration visible only in `.hero` below it
- Copy, search, CTAs, and stats are left-aligned
- Order: search → after care → CTAs → stats
- Pill search + Enter/button → Browse with query/after-care via existing `localStorage` flow
- **Start Planning** → `summer-plan.html`; **Browse Camps** → `browse.html`
- Stats populate after camp data loads
