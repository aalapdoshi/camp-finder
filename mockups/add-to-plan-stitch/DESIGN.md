---
name: Summer Adventure System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#784b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  container-max: 1200px
  gutter: 1.5rem
  margin-mobile: 1rem
  stack-sm: 0.5rem
  stack-md: 1.5rem
  stack-lg: 3rem
---

## Brand & Style

The design system is built for families and organizers, emphasizing clarity, accessibility, and optimism. It adopts a **Corporate Modern** style with a friendly, lifestyle-oriented edge. The aesthetic is defined by a clean light theme, ample whitespace, and high legibility to reduce the cognitive load of planning complex schedules.

The visual narrative focuses on "organized joy"—utilizing soft, rounded elements to appear approachable while maintaining a structured grid to convey reliability. It avoids unnecessary ornamentation, allowing functional color coding and clear typography to guide the user experience.

## Colors

The palette is anchored by a vibrant **Primary Blue** (#2563EB) used for primary actions and navigational highlights. A **Teal Green** (#0D9488) serves as a secondary brand color, often associated with specific categories or "assigned" states, evoking the outdoors. 

For status indicators, we use a warm **Amber** (#F59E0B) for pending actions or "Want to Book" states. The neutral scale is cool-toned, with background surfaces utilizing off-whites and very light grays to define sections without heavy borders. Background fills for cards use a 5-10% opacity of the category color (blue or green) to provide soft, contextual tinting.

## Typography

The design system utilizes **Plus Jakarta Sans** across all levels. This typeface offers a modern, geometric structure with soft terminals that align with the "friendly professional" brand voice. 

- **Headlines:** Use Bold weights with slight negative letter-spacing for a compact, authoritative look.
- **Body:** Uses a Regular weight with generous line height to ensure readability in data-dense lists.
- **Labels:** Small caps or semi-bold weights are used for badges and category markers to provide distinct visual hierarchy at small scales.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for desktop (centered 1200px container) to maintain focus, transitioning to a fluid layout on mobile devices. 

- **Rhythm:** A 4px/8px incremental system governs all spacing. 
- **Verticality:** Sections (e.g., "Weeks") are separated by large 48px gaps (stack-lg) to allow the eye to rest. 
- **Grids:** On desktop, cards typically span the full width of the content area to emphasize the chronological "timeline" flow, while filter controls use a flexible flexbox arrangement.
- **Mobile:** Margins reduce to 16px, and multi-column filters collapse into a horizontal scroll or a full-screen drawer.

## Elevation & Depth

This design system avoids heavy shadows, favoring **Tonal Layers** and **Low-contrast outlines** to create depth. 

- **Level 0 (Base):** Solid white or #F9FAFB background.
- **Level 1 (Cards):** Defined by a 1px solid border (#E2E8F0) and a very soft, high-diffusion shadow (0px 2px 4px rgba(0,0,0,0.02)) to lift the card slightly from the page.
- **Active States:** Elements being interacted with may use a subtle backdrop blur or a more pronounced primary-colored border.
- **Separators:** Horizontal rules are kept at 1px thickness with high transparency to maintain the "clean" aesthetic without fragmenting the layout.

## Shapes

The design system employs a **Pill-shaped (3)** roundedness strategy to maximize the "friendly" feel. 

- **Primary Buttons & Chips:** Use fully rounded (pill) corners to signify interactivity.
- **Cards & Input Fields:** Use `rounded-xl` (1.5rem / 24px) to soften the large surface areas.
- **Selection Indicators:** Small indicators (like the color dots next to names) are perfect circles to provide a clear, organic focal point.

## Components

### Buttons & Chips
- **Action Buttons:** High-contrast pill shapes with white text on primary blue.
- **Filter Chips:** Use a "Ghost" style (light gray background) when inactive, and solid primary color when active.
- **Status Badges:** Small, rounded-sm containers with low-saturation background tints (e.g., light yellow for "Want to Book") and high-saturation text for readability.

### Cards & Timeline Items
- **Schedule Cards:** Large radius containers with a 4px left-accent bar in the category color (blue or green). This allows for color-coding without overwhelming the card with saturated backgrounds.
- **Hover States:** Cards should subtly scale (1.01x) or deepen their shadow to provide tactile feedback.

### Input Fields
- **Search & Text Inputs:** Large, pill-shaped fields with light gray borders. Focus states should use a 2px primary blue ring with an offset to ensure accessibility.

### Navigation
- **Top Bar:** Simple, text-based navigation with high contrast. The active page is indicated by a slightly bolder weight or a subtle primary-colored underline.