## Design Context

### Users

Print shop **staff and managers** doing production work in a busy shop environment — updating job stages, managing orders, uploading files, tracking quotes. They are coming from paper ledgers and manual systems; this is their first purpose-built digital tool. Speed and clarity are critical. The **owner** oversees but is not the primary daily user. Desktop-first; mobile only for owner status checks.

### Brand Personality

**Direct, tactile, purposeful.** Not startup-chic. Not generic admin gray. The interface should feel like it was made specifically for this trade — like a Pantone guide or a well-designed production sheet: precise, dense with meaning, zero wasted space.

- **Direct**: Every element has a job. No decorative filler. Staff need to scan a job queue fast.
- **Tactile**: Nods to the physical nature of print work — paper, ink, substrate — through warm neutrals and purposeful color.
- **Purposeful**: Clear hierarchy, clear status, clear next action. No cognitive overhead.

### Aesthetic Direction

**Light mode is the default.** Print shops are well-lit, daytime work environments. Staff use this at a front desk or production computer during a busy shift.

**Color palette:**
- Background: warm off-white with a barely-perceptible warm tint (`oklch(0.98 0.008 75)`) — feels like paper, not a cold screen
- Foreground: near-black with a warm undertone (`oklch(0.14 0.012 75)`)
- Accent: deep teal — a restrained nod to CMYK cyan, industry-specific without being garish (`oklch(0.44 0.10 202)`)
- Neutrals tinted warm throughout. No pure grays.

**Typography:**
- Display/headings/labels: **Bricolage Grotesque** — variable font with optical sizes, feels crafted and purposeful without being decorative. Distinct from any template.
- Body/UI text: **Hind** — warm, highly legible at small sizes, uncommon enough to feel intentional
- Fixed `rem` scale for UI (no fluid type in dashboards). Strong hierarchy — at minimum 1.3× ratio between steps.

**Layout:**
- Information-dense layouts — tables and lists over card grids. Staff need to scan a queue, not browse a portfolio.
- Left-aligned. Asymmetric when possible.
- Strong typographic hierarchy carries the visual weight, not icons.
- No card-in-card nesting. Not everything needs a container.

**Anti-references:**
- Not: generic SaaS blue with rounded icons above every heading
- Not: glassmorphism or glow effects
- Not: shadcn default neutral gray (the stock out-of-box look)
- Not: any gradient text

### Design Principles

1. **Scan-first density** — staff need to find a job status or customer name in 2 seconds. Dense, well-spaced tables beat card grids.
2. **Warm precision** — not cold tech, not consumer-warm. The aesthetic sits between a tool catalog and a well-designed invoice template.
3. **Trade-specific, not generic** — typography, color, and layout should communicate "built for print shops" without resorting to clichés (no ink splatter, no press imagery).
4. **Hierarchy over decoration** — status badges, action buttons, and data labels should carry their weight through position and contrast, not embellishment.
5. **Light and legible** — WCAG AA minimum. Warm off-white backgrounds, high-contrast foreground text, teal accent used sparingly as the 10%.
