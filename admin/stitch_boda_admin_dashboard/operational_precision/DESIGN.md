---
name: Operational Precision
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b22'
  on-surface-variant: '#424656'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#a33200'
  on-tertiary: '#ffffff'
  tertiary-container: '#cc4204'
  on-tertiary-container: '#fff6f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832600'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1ec'
typography:
  display:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-xs:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  mono:
    fontFamily: jetbrainsMono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  container-margin: 20px
  gutter: 12px
---

## Brand & Style

The brand personality is rooted in logic, speed, and operational reliability. As an admin dashboard for a logistics hub, the UI acts as a high-performance tool rather than a marketing surface. The target audience consists of dispatchers and fleet managers who require immediate access to real-time data.

The design style is **Minimalist / Corporate Modern**, heavily influenced by the "Linear" and "Vercel" aesthetic. It prioritizes information density over white space, using a structured hierarchy to guide the eye through complex datasets. The emotional response should be one of control, clarity, and technical efficiency. Every element is intentional, reducing cognitive load by stripping away decorative flourishes in favor of utility.

## Colors

The palette is anchored in professional neutrals to ensure longevity and minimize eye strain during long shifts. 

- **Primary:** A vibrant "Hyper Blue" used sparingly for primary actions, active states, and critical paths.
- **Neutrals:** A scale of Zinc and Slate. Backgrounds utilize a slightly off-white (#FAFAFA) to reduce glare while maintaining a clean, "paper" feel.
- **Success/Warning/Error:** Standardized semantic colors (Green, Amber, Red) are used only for status indicators in the fleet and delivery tracking modules.
- **Borders:** A consistent light gray (#E4E4E7) is used for all structural divisions, providing definition without adding visual weight.

## Typography

This design system utilizes **Geist** for its exceptional legibility at small sizes and its technical, neutral character. The type scale is intentionally compact to facilitate high data density.

- **Headlines:** Reserved for page titles and major section headers, kept at a modest maximum of 24px.
- **Body:** The primary interface size is 13px, providing a balance between readability and space efficiency.
- **Labels:** Used for table headers and metadata, often utilizing Medium (500) or SemiBold (600) weights to differentiate from body text.
- **Monospace:** **JetBrains Mono** is employed for tracking IDs, coordinates, and currency values to ensure character alignment in dense lists.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a strictly enforced 4px baseline rhythm. This ensures that even in data-heavy views, the vertical rhythm remains predictable.

- **Grid:** A 12-column system is used for desktop views. Gutters are kept tight at 12px to maximize the horizontal area for data tables and maps.
- **Padding:** Component internal padding is minimized. Standard button and input padding is 6px (vertical) by 10px (horizontal).
- **Density:** We utilize "Compact" spacing as the default. Larger margins (24px+) are only used to separate unrelated functional blocks.
- **Mobile:** On smaller screens, the layout collapses to a single column with 16px side margins, maintaining the same 4px spacing increments for consistency.

## Elevation & Depth

This design system avoids heavy shadows and physical metaphors. Depth is primarily conveyed through **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface 1 (Base):** #FAFAFA. The main background.
- **Surface 2 (Containers):** #FFFFFF. Used for cards and table rows to pop slightly against the base.
- **Borders:** 1px solid #E4E4E7 is the primary method of separation. 
- **Shadows:** Only used for "floating" elements like dropdown menus, tooltips, or modals. These shadows are "Ambient": highly diffused, low opacity (e.g., `0px 4px 12px rgba(0,0,0,0.05)`), and never used on flat page elements.

## Shapes

The shape language is **Soft (0.25rem / 4px)**. This subtle rounding provides a professional, modern feel without sacrificing the "grid-like" precision of the layout. 

- **Components:** Buttons, input fields, and small cards use a 4px radius.
- **Large Containers:** Modals or main content areas may scale up to a 6px or 8px radius to signify their hierarchy, but never beyond that.
- **Iconography:** Use 1.5px stroke widths with slightly rounded caps to match the component radius.

## Components

### Buttons
- **Primary:** Solid #0066FF with white text. 28px height for compact, 32px for standard.
- **Secondary:** White background with 1px Zinc-200 border.
- **Ghost:** No background/border, becomes Zinc-100 on hover. Used for secondary actions in tables.

### Tables
- **Header:** Zinc-50 background, 11px uppercase labels, 1px bottom border.
- **Rows:** 32px minimum height. Hover state uses Zinc-50. 
- **Cells:** Vertical dividers are omitted; horizontal lines only.

### Input Fields
- **Default:** 1px Zinc-200 border, white background. Font size 13px. 
- **Focus:** 1px Primary Blue border with a 2px soft blue outer glow (halo).

### Chips & Badges
- **Status Badges:** Small (11px text), semi-transparent background with high-contrast text (e.g., Light Green bg with Dark Green text). 2px radius.

### Stat Grids
- Used for high-level metrics. Simple 1px borders, no background color, large bold values (18px) with small descriptive labels (11px) above or below.

### Map Elements
- Custom map styling with desaturated colors (Silver/Light Gray) to allow the colorful "Boda" (ride) pins to stand out as the primary focus.