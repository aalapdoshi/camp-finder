# CampPlanner — design system (from Stitch)

**Implementation status (Phase 0–1):** Live app tokens in `css/styles.css` `:root` and homepage hero restyle. **App primary:** `#2563eb` (blue); Stitch reference screens use `#5cee2b` (green). Scope so far: **tokens + hero only** — typography, component reskin, and dark mode are deferred. See `STITCH_DESIGN_PHASE01_PLAN.md`.

Extracted from Stitch project **Summer Camp Weekly Planner Dashboard** (`projects/2433476040581509770`) by reading generated HTML (Tailwind + inline patterns). All listed screens use the same theme tokens.

**Source of truth in code:** `<script id="tailwind-config">` in each screen’s HTML.

---

## Brand colors

| Token | Hex | Usage |
|--------|-----|--------|
| **Primary** | `#5cee2b` | CTAs, active states, focus rings, accents, progress fill |
| **Background light** | `#f6f8f6` | Page canvas (light) |
| **Background dark** | `#152210` | Page canvas (dark); text on primary buttons |
| **Primary on UI** | `primary/5`–`primary/20` | Subtle fills, borders, rings (`border-primary/10`, `ring-primary`, `bg-primary/10`) |

**Neutrals (Tailwind slate):** `slate-50` … `slate-900` for surfaces, borders, and text hierarchy. Common pairs: `text-slate-900` / `dark:text-slate-100` for body; `text-slate-500` / `dark:text-slate-400` for secondary; `text-slate-400` for labels.

**Semantic accents (usage in UI):**

- **Success / booked:** `green-500`, `green-100` / `green-700` badges  
- **Pending / considered:** `purple-500`, `purple-100` / `purple-700`  
- **Info / calendar:** `blue-100`, `blue-600`  
- **Destructive hover:** `hover:text-red-500` (icon buttons)

---

## Typography

| Item | Value |
|------|--------|
| **Font** | [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) — `font-display` / `font-family: 'Plus Jakarta Sans', sans-serif` |
| **Weights** | `400`–`800` (normal → `font-black`) |
| **Page title** | `text-3xl font-black tracking-tight` |
| **Section title** | `text-xl font-bold` |
| **Card title** | `text-sm font-bold` / `text-lg font-black` |
| **Nav / buttons** | `text-sm font-semibold` / `font-bold` |
| **Overlines** | `text-xs font-bold uppercase tracking-wider text-slate-400` |
| **Micro labels** | `text-[10px] font-bold uppercase tracking-wider` / `tracking-widest` |
| **Letter-spacing tweak** | `tracking-[-0.015em]` on logo wordmark |

---

## Icons

- **Set:** [Material Symbols Outlined](https://fonts.google.com/icons) (`material-symbols-outlined`)
- **CSS:** `font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`
- **Sizes:** often `text-xl` / `text-lg` in header; `text-sm` / `text-xs` in dense UI

---

## Radius & elevation

| Token | Value |
|--------|--------|
| **Default** | `0.25rem` (4px) |
| **lg** | `0.5rem` (8px) |
| **xl** | `0.75rem` (12px) |
| **full** | `9999px` (avatars, pills) |

**Patterns in UI:** `rounded-lg` (inputs, small buttons), `rounded-xl` (cards, panels), `rounded-2xl` (large feature cards), `rounded-full` (avatars).

**Shadows:** `shadow-sm` (buttons, small cards), `shadow-md` (emphasis buttons), `shadow-xl` (hero/detail panel), `hover:shadow-md` on stat cards.

---

## Layout

- **Shell:** `min-h-screen` column; optional `lg:flex-row` for sidebar + main  
- **Homepage hero:** Illustration `images/hero-summer-camp.png` on `.hero` with left-to-right scrim gradient; left-aligned `.hero-content` with generous left inset; pill search (`.hero-search-pill`); after-care checkbox below search, above `.hero-cta-row`; primary + ghost CTAs; full-width `.hero-stats-bar` (three columns) at bottom of hero. Navbar stays separate above hero.
- **Header:** `border-b border-primary/10`, `bg-white` / `dark:bg-background-dark`, `px-6 py-3` → `lg:px-10`  
- **Sidebar:** `lg:w-72`, `border-r` using `--sidebar-border`, `background: --sidebar-bg`, vertical `gap-8`  
- **Sidebar / card borders (`:root`):** `--sidebar-bg` `rgb(239, 244, 255)`, `--card-border` `rgb(210, 214, 228)` (sidebar divider + camp/week cards), `--sidebar-item-hover` `#dce9ff`, page canvas `--bg-light` `#f8f9ff`
- **Main:** `flex-1`, `p-6 lg:p-10`, `max-w-6xl mx-auto`, vertical `gap-8`  
- **Grids:** week cards `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; stats `md:grid-cols-3`

---

## Components

**Primary button:** `rounded-lg h-10 px-4 bg-primary text-background-dark text-sm font-bold shadow-sm hover:opacity-90`

**Secondary / ghost:** `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold shadow-sm`

**Search field:** `rounded-lg`, prefix icon in `bg-slate-100 dark:bg-slate-800`, input `border-none focus:ring-0`

**Nav links:** active `text-sm font-semibold`; inactive `text-slate-500` + `hover:text-primary`

**Week / calendar cards:** `rounded-xl border`, active `ring-2 ring-primary border-primary`; dashed empty state `border-dashed`; hover `translateY(-2px)` on `.calendar-week-card`

**Status chips:** `text-[10px] px-1.5 py-0.5 rounded font-bold uppercase` + semantic bg/text colors

**Progress:** track `bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full`; fill `bg-primary`

**Checklist panel:** `bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border`

---

## Dark mode

- **Strategy:** `class` (`darkMode: "class"` in Tailwind)  
- **Body:** `dark:bg-background-dark` + `dark:text-slate-100`  
- **Cards:** `dark:bg-slate-800` / `dark:bg-slate-900` with matching borders

---

## Tailwind snippet (reuse)

```js
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#5cee2b",
        "background-light": "#f6f8f6",
        "background-dark": "#152210",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
};
```

**Dependencies:** `tailwindcss` (+ `forms`, `container-queries` plugins if matching Stitch), Plus Jakarta Sans, Material Symbols Outlined.

---

## Notes

- Stitch project metadata also lists theme `#5bee2b` — generated HTML uses **`#5cee2b`**; treat as the implemented primary unless you standardize on one hex.
- Extraction is from **one screen’s HTML**; other frames may add one-off classes—re-scan HTML if you change layouts in Stitch.
