# Craft Master Labs — Brand Kit

_Last updated: 2026-02_

## Product Name
- **Full**: Craft Master Labs
- **Short (PWA / TWA)**: Craft Master
- **Tagline**: AI · Marketplace
- **Voice**: sharp, expert, opinionated, artisan-meets-lab.

## Logo System
- **Component**: `frontend/src/components/Logo.jsx`
  - `<LogoMark />` — 32×32 default glyph
  - `<LogoWordmark />` — mark + wordmark inline
  - `<LogoLockup />` — mark + wordmark + tagline (navbar)
- **Vector source**: `frontend/public/favicon.svg`
- **Concept**: chisel (artisan) merging into a circuit trace (AI). Lime nodes read as active lab signals.
- **Minimum size**: 20 px. Below that, drop to mark only.
- **Clear space**: half the mark height on all sides.
- **Do not**: rotate, recolor the chisel, or place the circuit trace under other marks.

## Color Tokens
Available as Tailwind `craft-*` utilities via `tailwind.config.js`.

| Token | Hex | Use |
| --- | --- | --- |
| `craft-graphite` | `#0B0F14` | Primary background surface |
| `craft-slate` | `#141B24` | Elevated surfaces, cards |
| `craft-fog` | `#94A3B8` | Muted text, subtle borders |
| `craft-ink` | `#E5E7EB` | Primary foreground on graphite |
| `craft-amber` | `#F59E0B` | Primary heat — CTAs, hover peaks |
| `craft-ember` | `#B45309` | Pressed / low-emphasis heat |
| `craft-lime` | `#B7FF3A` | Lab-lime — scan lines, active AI |
| `craft-cyan` | `#22D3EE` | Secondary scanline / diagnostic tags |

**Rule of thumb**: amber is the action, lime is the signal, cyan is the label.

## Typography
- **Headings** (`font-heading`): system-provided display face, weight 700, tracking `-0.02em`.
- **Body**: default `system-ui`, weight 400–500.
- **Mono** (`font-mono`): meta labels, timestamps, code — usage `text-[10px] uppercase tracking-widest`.

### Scale
| Role | Size |
| --- | --- |
| H1 hero | `text-4xl sm:text-5xl lg:text-6xl` |
| H2 section | `text-2xl md:text-3xl` |
| H3 card | `text-lg md:text-xl` |
| Body | `text-base` (mobile: `text-sm`) |
| Meta / eyebrow | `text-xs` mono uppercase, `tracking-widest` |

## Motion
Predefined Tailwind animations (see `tailwind.config.js`):
- `animate-scanline` — vertical scan sweep (used in hero AR overlay)
- `animate-grid-pulse` — subtle grid opacity breath
- `animate-label-in` — diagnostic label pop-in
- `animate-wire-draw` — SVG wireframe stroke reveal

Timing: 200–400 ms for micro-interactions, 1.8–3.2 s for ambient loops.

## Iconography
- Library: `lucide-react` (already installed).
- Weight: 1.5 px stroke.
- Prefer icons paired with mono labels for meta rows.

## Assets
- Favicon: `frontend/public/favicon.svg`
- PWA icons: `frontend/public/icon-192.png`, `icon-512.png` (regenerated from the mark)
- Play Store hero copy: `PLAY_STORE_LISTING.md`

## Internal Preview
Visit `/brand` while signed in to inspect every logo variant, palette swatch, and type sample rendered live from these tokens.
