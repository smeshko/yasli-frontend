# TASK-007: Update docs/design to describe Дворът and record the superseded rules

Depends on: TASK-005, TASK-006
Suggested commit: `Document Дворът as the shipped design direction`

## Goal

Make the repo's design documentation describe what is actually live, and record
which advisory rules were deliberately superseded and why.

## Files

- `docs/design/DESIGN-SYSTEM.md` — direction section rewritten for Дворът
- `docs/design/05-token-and-implementation-plan.md` — token table refreshed to
  the shipped values
- `docs/design/anti-slop-rules.md` — exceptions appendix
- `docs/design/dvorat-reference.html` — new: the approved concept, committed

## Acceptance

- [ ] `DESIGN-SYSTEM.md` describes the cream/ink/three-hue system, the two
      typefaces and the riso devices, with the measured contrast ratios
- [ ] Status line no longer claims the doc is advisory-and-unapplied
- [ ] The token table lists the shipped token names and values
- [ ] An exceptions section records the two superseded rules — hard offset
      shadow as a print device rather than elevation, and 700 on card names —
      each with its rationale
- [ ] The rules that remain binding are restated as still binding
- [ ] `dvorat-reference.html` opens standalone and shows the approved design
- [ ] No doc still tells a reader to use Inter or `#2563eb`

Evidence: the rendered diff of the three docs, and the reference file opened
from the repo.

## Steps

- [ ] Rewrite the `DESIGN-SYSTEM.md` direction section
- [ ] Refresh the token table in `05-token-and-implementation-plan.md`
- [ ] Append the exceptions section to `anti-slop-rules.md`
- [ ] Copy the Дворът concept out of the parent `design-concepts/index.html`
      into `docs/design/dvorat-reference.html`, stripping the concept switcher
- [ ] Re-read `01-typography-bulgarian-cyrillic.md`; its Sofia Sans
      recommendation is now implemented, so mark it as such

## Notes

Checklist task — documentation only, no source changes and no tests.

Keep the research documents (01–04) as they are. They are still accurate; only
the direction and token documents describe a system that no longer ships.
