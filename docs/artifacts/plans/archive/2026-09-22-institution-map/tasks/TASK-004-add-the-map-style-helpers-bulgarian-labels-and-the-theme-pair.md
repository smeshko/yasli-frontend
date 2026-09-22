# TASK-004: Add the map style helpers: Bulgarian labels and the theme pair

Depends on: None
Suggested commit: `feat(map): patch base-map labels to Bulgarian`

## Goal

Two pure functions the map island can lean on: one that rewrites an
OpenFreeMap style's label expressions to prefer `name:bg`, and one that picks
the style URL for a theme.

## Files

- `src/lib/map/style.ts` — new. `bulgarianLabelStyle(style)` and
  `styleUrlForTheme(theme)`.
- `src/lib/map/style.test.ts` — new.

## Acceptance

- [ ] `bulgarianLabelStyle` rewrites `layout.text-field` to
      `["coalesce", ["get","name:bg"], ["get","name"]]` **only** on layers
      whose existing expression mentions `name:latin`, and returns a new style
      object rather than mutating its argument.
- [ ] A layer whose `text-field` is `["to-string", ["get","ref"]]`
      (`highway_name_motorway`) is left byte-identical — patching it would
      blank the motorway shields.
- [ ] A layer with no `layout`, or a `layout` with no `text-field`, is left
      untouched and does not throw.
- [ ] The function reports how many layers it rewrote, so a style-schema
      change that silently matches nothing is detectable rather than invisible.
- [ ] `styleUrlForTheme("light")` →
      `https://tiles.openfreemap.org/styles/positron`;
      `styleUrlForTheme("dark")` → `.../styles/dark`. Both are pinned as
      literals in a test, so changing the cartography is a deliberate edit.
- [ ] `npm run lint`, `npm run check` and `npm run test` pass.

Evidence: `npm run test` output for the `style` suite, showing the
rewrite-count assertion and the untouched-`ref` case.

## Steps

### RED
- [ ] Write the test against a small hand-built style object with four layers:
      a `case`/`concat` `name:latin` + `name:nonlatin` label, a
      `coalesce(name_en, name)` label that also mentions `name:latin`, a
      `["to-string", ["get","ref"]]` shield, and a layer with no `layout`.
- [ ] Assert the rewritten count, the two rewritten expressions, the untouched
      shield, and that the input object is unchanged.

### GREEN
- [ ] Implement both functions. Detect `name:latin` by walking the expression
      tree for the string, not by matching a specific expression shape — the
      three shapes measured today are not a contract.

### REFACTOR
- [ ] Type the style parameter against MapLibre's `StyleSpecification` if it
      is exported cleanly; otherwise keep a minimal local shape and say why in
      a comment. Do not import anything from `maplibre-gl` at module scope —
      this file must stay loadable in the node test environment without
      dragging in the map bundle.

## Notes

Fixtures are hand-built on purpose. Committing a 25 KB copy of the real style
would make the test a snapshot of OpenFreeMap's cartography rather than a test
of our rewrite rule, and it would go stale silently.

The three expression shapes to cover were measured 2026-09-21 and are recorded
in RESEARCH.md fact 9.
