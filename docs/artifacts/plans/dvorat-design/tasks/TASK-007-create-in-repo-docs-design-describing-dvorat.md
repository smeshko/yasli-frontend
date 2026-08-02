# TASK-007: Create in-repo docs/design describing Дворът

Depends on: TASK-005, TASK-006
Suggested commit: `Document Дворът as the shipped design direction`

## Goal

Give this repository its own design documentation describing what actually
ships, so the design system travels with the code instead of living in an
unversioned parent directory.

## Files

All paths are **new**, inside this repo:

- `docs/design/README.md` — new: what this directory is, and where the prior
  research lives
- `docs/design/DESIGN-SYSTEM.md` — new: the shipped Дворът system
- `docs/design/dvorat-reference.html` — new: the approved concept, extracted
  from `../design-concepts/index.html` (parent directory, concept `#opt-b`)

## Acceptance

- [ ] `docs/design/DESIGN-SYSTEM.md` describes the shipped system: cream/ink
      ground, the three section hues with their measured contrast ratios, the
      two typefaces, the riso devices, and the token names actually in
      `BaseLayout.astro`
- [ ] It records the two deliberately superseded rules from the parent's
      `anti-slop-rules.md` — the hard offset shadow as a print device rather
      than elevation, and 700 on card names — each with its rationale
- [ ] It restates the rules that remain binding: contrast floor, Bulgarian
      `locl`, function-named tokens, `prefers-reduced-motion`, no Inter, no
      unmotivated blue
- [ ] `README.md` states plainly that `yasli/docs/design/` in the parent is
      historical research, is outside version control, and is superseded by
      this directory for anything describing the live design
- [ ] `dvorat-reference.html` opens standalone from the repo, shows the Дворът
      design with its results state, and has the concept switcher and the other
      two concepts stripped out
- [ ] No doc in `docs/` tells a reader to use Inter or `#2563eb`
- [ ] Every token value quoted in the docs matches `BaseLayout.astro` exactly

Evidence: the new files rendered, and `dvorat-reference.html` opened from the
repo showing the approved design.

## Steps

- [ ] Create `docs/design/` and write `README.md` explaining the split
- [ ] Write `DESIGN-SYSTEM.md` from the tokens as shipped — read them out of
      `BaseLayout.astro` rather than from the plan, so the doc cannot drift
- [ ] Extract concept `#opt-b` from `../design-concepts/index.html` into
      `dvorat-reference.html`: drop the `.chrome` switcher, the `#opt-s` and
      `#opt-k` sections and their CSS, and the view-toggle script
- [ ] Verify the extracted file still renders and its search still works

## Notes

Checklist task — documentation only, no source changes and no tests.

The parent `yasli/docs/design/` is **not** edited by this task: it is outside
this git repo, so any change there would not ship on this branch. Its research
documents (01–04) remain accurate and are cited, not replaced.
