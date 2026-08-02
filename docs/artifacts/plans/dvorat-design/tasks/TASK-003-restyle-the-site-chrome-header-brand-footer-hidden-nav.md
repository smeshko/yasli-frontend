# TASK-003: Restyle the site chrome: header, brand, footer, hidden nav

Depends on: TASK-002
Suggested commit: `Restyle header, brand and footer for Дворът`

## Goal

Bring the persistent chrome onto the new system: the riso brand dot, the cream
header, and the footer that now renders at every width.

## Files

- `src/layouts/BaseLayout.astro` — header, brand, nav styles
- `src/components/SiteFooter.astro` — footer styles

## Acceptance

- [ ] Brand is the tomato dot with a hard ink offset shadow plus the wordmark,
      matching the reference
- [ ] Header sits on the cream ground with an ink hairline, not a white bar
- [ ] Footer uses the UI face (not the old monospace stack) and its link takes
      the nursery hue
- [ ] `showNav` is still `false`; nav and `.nav-toggle` markup and JS unchanged
- [ ] Nav styles are updated in place so they are correct whenever the flag is
      flipped back on
- [ ] Focus rings are visible on the brand and footer link against cream
- [ ] `npm run check`, `npm run lint`, `npm run build` pass

Evidence: desktop and 390px screenshots of the header and footer; a screenshot
with `showNav` temporarily flipped true locally (reverted before commit) proving
the nav renders correctly on the new system.

## Steps

### RED
- [ ] Screenshot the current header/footer as the before-state

### GREEN
- [ ] Restyle `.site-header`, `.brand`, `nav`, `.nav-toggle`
- [ ] Restyle `.site-footer` and its link
- [ ] Verify the footer still renders once at every width (the `--desktop`
      class is only applied when `showNav` is true — see commit 00394e2)

### REFACTOR
- [ ] Drop any header/footer rule the new design no longer uses

## Notes

Do not touch `showNav` or the nav script. TASK scope is presentation only.
