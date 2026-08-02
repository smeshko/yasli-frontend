# Design documentation

This directory describes the design that **actually ships** from this
repository.

| File | What it is |
|---|---|
| `DESIGN-SYSTEM.md` | The Дворът system as implemented: tokens, type, colour, the riso devices, and the measured contrast ratios |
| `dvorat-reference.html` | The approved design reference. Open it directly in a browser — it is self-contained and its search works against demo data |

## Relationship to the research in the parent directory

The `yasli/docs/design/` directory **one level up** holds the earlier
typography and accessibility research: `01-typography-bulgarian-cyrillic.md`,
`02-mobile-readability.md`, `03-wcag-2.2-essentials.md`,
`04-localization-ux-pitfalls.md`, `anti-slop-rules.md`, `DESIGN-SYSTEM.md` and
`05-token-and-implementation-plan.md`.

Two things to know about it:

1. **It is outside version control.** The parent `yasli/` directory is not a
   git repository, so nothing there ships with this codebase or survives a
   clean checkout. That is why this directory exists.
2. **Its research is still sound; its direction is superseded.** Documents
   01–04 and `anti-slop-rules.md` were written against the old blue/Inter UI
   but their findings hold and several are still binding — see
   `DESIGN-SYSTEM.md` § "Rules that remain binding". The parent's
   `DESIGN-SYSTEM.md` and `05-token-and-implementation-plan.md` describe a
   direction that was **not** the one chosen; treat this directory as
   authoritative for anything describing the live design.

The research directly changed what shipped. `01-typography-bulgarian-cyrillic.md`
is the reason the UI face is Sofia Sans: the originally-approved mock used
Golos Text, which renders Russian letterforms identical to Inter's.
