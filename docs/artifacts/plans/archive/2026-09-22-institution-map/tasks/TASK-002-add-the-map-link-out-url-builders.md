# TASK-002: Add the map link-out URL builders

Depends on: None
Suggested commit: `feat(institution): add the map link-out URL builders`

## Goal

A pure, tested module that turns a coordinate and a name into the four
outbound map URLs from research §5.2, with their Bulgarian labels.

## Files

- `src/lib/domain/mapLinks.ts` — new. `buildMapLinks(location, name)` returns
  an ordered array of `{ id, label, href }`, directions first.
- `src/lib/domain/mapLinks.test.ts` — new.

## Acceptance

- [ ] The four URLs match research §5.2 exactly:
      `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lon>`,
      `https://www.google.com/maps/search/?api=1&query=<lat>,<lon>`,
      `https://maps.apple.com/?ll=<lat>,<lon>&q=<name>`,
      `https://www.openstreetmap.org/?mlat=<lat>&mlon=<lon>#map=18/<lat>/<lon>`.
- [ ] Directions is first in the returned order; it is the primary affordance.
- [ ] The institution's name is percent-encoded in the Apple Maps `q`
      parameter — real names carry quotes, `№` and Cyrillic (`ДГ№13 "Мир"`),
      and an unencoded `"` or `#` would break the URL.
- [ ] Coordinates are formatted from the numbers as given, with no rounding,
      reordering or locale-dependent separator — a test pins a
      six-decimal-place pair against its exact expected string.
- [ ] The OSM URL's hash is built after the query string and keeps the `18/`
      zoom prefix.
- [ ] Labels are Bulgarian; "Как да стигна" is the directions label.
- [ ] `npm run lint`, `npm run check` and `npm run test` pass.

Evidence: `npm run test` output showing the `mapLinks` suite, including the
encoding case with a real institution name.

## Steps

### RED
- [ ] Write the test first, with one case per URL using
      `ДГ№13 "Мир"` at `43.209589, 27.926883` — the real ДГ№13 coordinate —
      and assert the four full strings.
- [ ] Add a case asserting the order, and one asserting that a name containing
      `"` and `№` survives encoding.

### GREEN
- [ ] Implement `buildMapLinks`.

### REFACTOR
- [ ] Keep the label strings in a `COPY` const in the same shape
      `InstitutionProfile.tsx` uses, so the page's Bulgarian copy stays
      greppable in one idiom.

## Notes

Takes the `InstitutionLocation` type from `@/lib/api/client`, not a local
redeclaration — the shape is contractual with the backend.

This module knows nothing about MapLibre and must stay that way: TASK-003
renders its output from Astro frontmatter, where no map code may be imported.
