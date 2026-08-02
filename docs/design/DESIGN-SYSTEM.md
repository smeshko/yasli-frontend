# Дворът — the shipped design system

Status: **implemented**. Every value below is live in
`src/layouts/BaseLayout.astro`; the reference rendering is
`dvorat-reference.html` in this directory.

The product is a Bulgarian-language static site that tells a parent in Varna
which **ясла**, **детска градина** and **подготвителна група** serve their home
address, with the honest match basis (по адрес / по район) and a link to the
official portal.

The design register is a **risograph neighbourhood guide printed on cream
stock** — warm, physical, and legible before it is clever. It is not a SaaS
landing page and not a municipal form.

## Typography

| Role | Face | Why |
|---|---|---|
| UI, body, card names | **Sofia Sans** | Bulgarian Cyrillic is its *default* glyph set, so `<html lang="bg">` finally has visible effect with no `font-feature-settings` hack. Sofia's civic typeface, which suits a public-service tool. |
| Display — h1, group headings | **Cormorant Garamond** | Verified to ship Bulgarian letterforms. Carries the editorial voice the search hero needs. |

Both are self-hosted from `public/fonts/` as `latin` + `cyrillic` subsets. Six
variable woff2 files, ~185KB total. `font-synthesis: none` is set, so the
Cormorant **italic is a separate file** — a roman-only subset would silently
render the italic headline word upright.

Smoke-test any future face with `вгдж икпт цщ ю`: `т` must look like `m`, `п`
like `n`, `и` like `u`, and `г` must be short.

## Colour

### Ground and ink

| Token | Value | Note |
|---|---|---|
| `--color-bg-page` | `#f4ecdf` | Cream stock. Everything is measured against this. |
| `--color-bg-surface` | `#fbf6ee` | Cards and panels — paper laid on paper. |
| `--color-ink` | `#201c17` | Warm near-black. 14.45:1 on the ground. |
| `--color-ink-muted` | `#5d554a` | Secondary copy. 6.82:1 on the card surface. |

### Section hues

One value per reception kind, used for **both graphics and text**. The three
background tint circles carry these same hues, so the decoration reads as a key
to the result grouping rather than as ornament.

| Token | Value | On cream | On surface | White on it |
|---|---|---|---|---|
| `--color-section-nursery` | `#c7361f` | 4.50:1 | 4.91:1 | 5.28:1 |
| `--color-section-kindergarten` | `#2b52c9` | 5.68:1 | 6.19:1 | 6.66:1 |
| `--color-section-preschool` | `#4a7550` | 4.53:1 | 4.94:1 | 5.31:1 |

The nursery hue doubles as the primary action colour — it is the first group a
parent looks for.

Tint-circle alpha is capped at ~0.22 so that even muted body copy laid over a
circle clears 4.5:1. The header and footer are opaque for the same reason: a
circle bleeding under the nav put muted link text at 3.27:1.

## The riso devices

- **Hard offset shadow** (`--shadow-hard: 5px 5px 0`) — an un-blurred ink
  offset, a print misregistration device. Interactive surfaces shift *into*
  their own shadow on hover or focus rather than lifting away from the page.
- **2px ink outline** on cards, the address field and the suggestion panel. The
  structure comes from the line, not from elevation.
- **Grain** — one inline SVG turbulence, fixed and `pointer-events: none`, at
  0.5 opacity in multiply.
- **Outline numeral** bedded into each result card, behind the content.

## Radii

Two values, assigned by role: `--radius-control: 999px` for the address field
and filter pills, `--radius-surface: 16px` for cards and panels.

## Light only

There is no dark mode. `color-scheme` is pinned to `light`. The design is
committed to paper, ink and grain; inverting it would produce a different
design, not a translation of this one. The previous
`@media (prefers-color-scheme: dark)` block was removed rather than ported.

## Rules that remain binding

Carried over from the research in the parent directory and still enforced:

- **Civic contrast floor.** Every text/background pair meets WCAG AA — 4.5:1
  for body, 3:1 for large text, UI and borders. Non-negotiable. This is why the
  originally-approved tomato `#e0503a` (3.33:1) and moss `#4f7d55` (4.07:1)
  were darkened before shipping.
- **Bulgarian `locl` correctness.** The face must ship Bulgarian letterforms.
- **Function-named tokens only** — `--color-section-nursery`, never `--tomato`.
- **No unmotivated blue/indigo/violet.** `#2563eb`, `#1d4ed8`, `#3b82f6` and
  `#60a5fa` are banned and absent from `src/` and `public/`.
- **No Inter.**
- **`prefers-reduced-motion` honoured** everywhere, including the nav.
- **Content-first on mobile** — the address field stays reachable; the hero
  left-aligns below 620px rather than centring under a tall gradient heading.

## Rules deliberately superseded

Two rules from the parent's `anti-slop-rules.md` are knowingly not followed.
Both were written against the old visual system and would remove the character
this direction was chosen for.

1. **"No floating-card shadows" / "restrained elevation."** Дворът uses a hard
   `5px 5px 0` offset on cards, the address field and buttons. This is a
   *printing* device, not a depth cue — it never blurs, never scales with
   hierarchy, and the element moves into it on interaction. The rule's real
   target was the soft `0 22px 44px` drop shadow, which is gone.
2. **"Body weight is not 700."** Card institution names are Sofia Sans 700 at
   ~1.06rem. In a result list the institution name *is* the content, and it
   carries the hierarchy the group heading no longer needs to. Body copy,
   inputs and notes sit at 400–500 — the previous UI's use of 700 for input
   text and body was the actual defect, and that is fixed.
