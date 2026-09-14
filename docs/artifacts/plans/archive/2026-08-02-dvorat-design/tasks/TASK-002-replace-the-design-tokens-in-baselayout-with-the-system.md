# TASK-002: Replace the design tokens in BaseLayout with the Дворът system

Depends on: TASK-001
Suggested commit: `Replace design tokens with the Дворът system`

## Goal

Swap the blue/Inter token set for the Дворът palette, type scale, shadows and
radii, and drop the dark-mode block.

## Files

- `src/layouts/BaseLayout.astro` — the `<style is:global>` token block

## Acceptance

- [ ] Every token is function-named (`--color-section-nursery`, not
      `--tomato`) and carries a one-line rationale comment
- [ ] These exact values are present and used:
      `--color-bg-page: #f4ecdf`, `--color-bg-surface: #fbf6ee`,
      `--color-ink: #201c17`, `--color-ink-muted: #5d554a`,
      `--color-section-nursery: #c7361f`,
      `--color-section-kindergarten: #2b52c9`,
      `--color-section-preschool: #4a7550`
- [ ] `@media (prefers-color-scheme: dark)` block is gone and
      `color-scheme: light` is set
- [ ] No `#2563eb`, `#1d4ed8`, `#3b82f6`, `#60a5fa` anywhere under `src/`
- [ ] `--shadow-panel: 0 22px 44px …` replaced by the hard offset shadow scale
- [ ] Grain overlay renders as a fixed, `pointer-events: none` pseudo-element
- [ ] The three background circles use the three section hues
- [ ] `npm run check` and `npm run build` pass

Evidence: screenshot of the home page showing cream ground, grain and the three
tinted circles; `grep -rn "2563eb\|1d4ed8\|3b82f6\|prefers-color-scheme: dark" src/`
returning nothing.

## Steps

### RED
- [ ] `grep -rn "#2563eb\|#1d4ed8\|#3b82f6\|#60a5fa" src/` — record the hit
      list; this is the set that must reach zero

### GREEN
- [ ] Replace the `:root` block with the Дворът tokens, each commented
- [ ] Delete the dark-mode override block; pin `color-scheme: light`
- [ ] Add the grain overlay and the three circles to the page shell
- [ ] Repoint existing consumers (`.button`, `.status-badge`, `nav`, `main`)
      at the new token names

### REFACTOR
- [ ] Remove tokens no longer referenced anywhere
- [ ] Confirm the ratios in RESEARCH.md §2 still hold against the shipped hexes

## Notes

Keep `body { overflow: hidden }` + `main { overflow-y: auto }`. The hero
collapse on `[data-has-results]` is tuned against that scroll container; moving
the scroll to the document reintroduces a layout jump on first result.

Resolve `color-mix()` note tints to static hex at author time.
