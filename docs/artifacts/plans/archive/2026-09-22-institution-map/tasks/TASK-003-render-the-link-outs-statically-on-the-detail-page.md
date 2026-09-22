# TASK-003: Render the link-outs statically on the detail page

Depends on: TASK-001, TASK-002
Suggested commit: `feat(institution): render the map link-outs without JavaScript`

## Goal

The four link-outs are part of the prerendered HTML, so a parent can get
directions even with JavaScript disabled, the API down, or the map unable to
load.

## Files

- `src/pages/institution/[slug].astro` — read `location` from the manifest
  props in the frontmatter, call `buildMapLinks`, render the block as plain
  HTML; add its styles to the page's existing `profile-` scoped block.

## Acceptance

- [ ] `/institution/kindergarten-46/` in `dist/` contains all four anchors in
      its HTML, with no hydration directive and no JavaScript required to
      reach them.
- [ ] A manifest row with `location: null` renders no block and no heading —
      not an empty container, not a "no location" message.
- [ ] Every anchor carries `target="_blank" rel="noreferrer"` and the `↗`
      marker, matching the outbound-link treatment 1.1 established for the
      website and source links.
- [ ] "Как да стигна" is visually the primary action; the other three are
      secondary.
- [ ] The block uses tokens only, inherits the page's kind hue from
      `data-kind`, and is legible in both themes.
- [ ] Every anchor has a visible `:focus-visible` indicator and is reachable
      in keyboard order between the address and the contacts.
- [ ] Targets are at least 44×44px at 390px width (the accessibility audit's
      M5 sizing note).
- [ ] `npm run build` succeeds with no backend running; `npm run lint`,
      `npm run check` and `npm run test` pass.

Evidence: `grep` of the four hrefs out of
`dist/institution/kindergarten-46/index.html`; the same page opened with
JavaScript disabled, screenshotted at 390px in both themes; a `dist/` grep
showing no anchor block in `dist/institution/nursery-47/index.html`.

## Steps

### RED
- [ ] No unit test applies — Astro pages are not covered by the node test
      environment. The gate is the `dist/` grep in Acceptance, run before and
      after.

### GREEN
- [ ] Add the frontmatter call and the markup.
- [ ] Add the styles to the page's existing `<style is:global>` block under
      the `profile-` prefix.

### REFACTOR
- [ ] Check the block reads sensibly in the page's heading outline: it belongs
      under the address, not as a sibling `<h2>` competing with "Контакти".

## Notes

This block must not move into `InstitutionProfile.tsx` later "for
consistency" — living outside the island is the entire point
(`DECISIONS.md` 1). If a future change makes the island render link-outs too,
the static block has to be deleted in the same change, not duplicated.

`nursery-47` is a real manifest slug with no coordinate (research fact 5) and
is the natural fixture for the null case — it needs no fixture server at all.
