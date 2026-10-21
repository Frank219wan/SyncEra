---
name: FutureProof AI
description: A calm botanical workspace for career discovery and observable learning progress.
colors:
  sage: "#e8efe5"
  ivory: "#f7f5ee"
  forest: "#243d30"
  body: "#415547"
  action: "#365b43"
  line: "#cdd8c9"
  muted: "#5e6f60"
  soft: "#e1e9dd"
  danger: "#9c4037"
  warning: "#705727"
  workspace: "#eef2eb"
typography:
  display:
    fontFamily: "Noto Serif, Noto Serif SC, serif"
    fontSize: "64px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Noto Serif, Noto Serif SC, serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Noto Serif, Noto Serif SC, serif"
    fontSize: "23px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Noto Sans, Noto Sans SC, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Noto Sans, Noto Sans SC, sans-serif"
    fontSize: "13px"
    fontWeight: 500
rounded:
  chip: "5px"
  control: "8px"
  choice: "12px"
  surface: "14px"
  panel: "16px"
spacing:
  compact: "8px"
  control: "12px"
  field: "20px"
  panel: "24px"
  section: "30px"
  roomy: "36px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.control}"
    padding: "12px 19px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.action}"
    rounded: "{rounded.control}"
    padding: "12px 19px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.action}"
    padding: "4px 0"
  surface:
    backgroundColor: "{colors.ivory}"
    rounded: "{rounded.surface}"
  input:
    backgroundColor: "#fdfdf8"
    textColor: "{colors.forest}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  skill-chip:
    backgroundColor: "#e8ede1"
    textColor: "#4a6244"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  navigation:
    textColor: "#50654f"
    rounded: "{rounded.control}"
    padding: "12px"
  entry-card:
    backgroundColor: "{colors.ivory}"
    padding: "28px 24px"
    width: "248px"
    height: "248px"
---

# Design System: FutureProof AI

## Overview

**Creative North Star: "Connected growth"**

A calm botanical workspace connects career discovery to observable learning progress. Sage scenery, opaque ivory surfaces and deep green text preserve the approved natural, warm, quiet character. Photographic leaves frame the entry experience; bamboo and restrained botanical drawings connect learning progress to growth inside the workspace.

This record extracts the shipped implementation from `src/styles.css` and `src/components.tsx`. The locked choices in `docs/implementation-brief.md` supersede historical unresolved choices in the parent PRODUCT.md. The palette and serif/sans pairing are inherited decisions, not a new identity proposal.

**Key Characteristics:**
- Warm opaque surfaces on pale sage surroundings.
- Serif headings with practical multilingual sans-serif controls.
- Softly irregular entrance cards and regular workspace geometry.
- Subtle breathing motion, visible focus, and reduced-motion support.

## Colors

### Primary

Forest anchors headings and identity; action green marks primary controls and selected progress states. Sage establishes the botanical canvas.

### Neutral

Ivory is the principal surface. Workspace green sits behind operational pages; body and muted greens separate reading and supporting information. Line green defines boundaries without heavy contrast. Soft green supports quiet tonal groupings.

Danger red and warning ochre are semantic exception colors, not additional brand accents.

**The Opaque Surface Rule.** Reading and control surfaces remain opaque; the photographic atmosphere belongs behind them.

## Typography

Noto Serif with Noto Serif SC and serif fallbacks supplies display, page headings and section titles. Noto Sans with Noto Sans SC and sans-serif fallbacks supplies body, navigation and form controls.

The frontmatter records the default desktop scale. The entry subtitle is 20px with 1.5 line height; entry titles are 28px with 1.2 line height. Tertiary headings use 16px, weight 600. Body paragraphs are capped at 75ch. Compact metadata is present at 10–12px, but is not the recommended size for primary reading or new controls.

**The Two Voices Rule.** Use serif for orientation and growth storytelling; use sans-serif for data entry, actions and evidence.

## Layout

The entry uses a centered 1200px desktop composition: a 520px text column, 80px gap and 600px entrance region. Its two 248px cards have a 32px horizontal gap and 96px vertical stagger. Short viewports retain document flow rather than clipping content.

The workspace has a 232px sidebar, 78px top bar and a content region capped at 1550px. Default page padding is 36px 42px 30px. Forms, paired analysis panels and tables use explicit grids; large data views retain horizontal overflow where needed.

Shipped adaptations exist at 1600, 1330, 1170, 960 and 680px. At narrower widths the sidebar contracts, paired grids stack and the entrance cards eventually form a vertical pair. These describe defensive implementation behavior; the approved project scope remains desktop, not a newly approved mobile design.

## Elevation & Depth

Most workspace surfaces rely on tonal layering and thin green borders. Entrance cards use the ambient shadow (0 8px 24px rgba(36,61,48,.08)); hover raises them 8px and uses a broader shadow (0 16px 34px rgba(36,61,48,.13)). Do not generalize entrance-card lift to every workspace panel.

The photograph breathes over 22 seconds and the entry copy drifts vertically by 4px over seven seconds. Control transitions use 180ms; entrance lift uses 350ms with cubic-bezier(.16,1,.3,1). Reduced-motion preference disables animations and transitions.

## Shapes

Regular controls use gently rounded corners; chips are tighter and larger panels softer. Most surfaces have a thin border. Entrance cards alone use asymmetric percentage radii, retaining a near-square silhouette rather than becoming circles. Circular step markers, status dots and radar bubbles encode their own roles.

## Components

### Buttons

Primary actions use action green and ivory text, a minimum 44px height and medium weight. Hover darkens to #294934; active darkens to #203e2b. Secondary actions are transparent with a #96a78d outline and pale green hover. Text actions underline on hover. Disabled buttons retain their shape and reduce opacity to .5.

### Inputs / Fields

Fields use a warm near-white fill, a #8c9c87 border and a minimum 43px height. Labels precede controls with an 8px gap. Hints follow in muted text; errors use danger red. Global keyboard focus uses a 3px #6b854f outline with a 4px offset; fields reduce the offset to 2px.

### Navigation

A vertical icon-and-label list uses muted green text, pale green hover and a stronger green selected surface with weight 600. Current-page state is conveyed by the router's active link, not color alone. Language selection remains a native select.

### Chips

Skill chips wrap within available width and use compact green tonal fills. Strength chips use a slightly stronger green treatment. Editable chips include a separate removal button.

### Cards / Containers

The reusable surface supplies ivory, a green border and the standard surface radius; padding belongs to the consuming panel. Form panels use 28px, while the main intake surface uses 35px. Avoid claiming one universal card padding.

### Entrance cards

The whole card is a link. Text sits above a quiet botanical layer, with no added arrow. Hover and keyboard focus both lift the card. Preserve the two distinct asymmetric contours, spacing and stagger.

### Growth and evidence

Bamboo expresses earned milestones with accessible descriptive text. Evidence panels separate profile, market and scenario context. Synthetic-data disclosure stays visibly available and expands to explain limitations.

## Do's and Don'ts

### Do:
- **Do** preserve the approved sage, ivory and forest roles.
- **Do** pair serif orientation with sans-serif actions and evidence.
- **Do** retain keyboard focus and reduced-motion behavior.
- **Do** keep data and synthetic-demo disclosures readable.

### Don't:
- **Don't** replace opaque reading surfaces with translucent glass.
- **Don't** turn every workspace panel into an irregular entrance card.
- **Don't** use tiny metadata typography for primary reading.
- **Don't** translate user-entered content as part of language switching.
