# TASK-005: Build the lazily loaded InstitutionMap island

Depends on: TASK-004
Suggested commit: `feat(institution): add the lazily loaded map component`

## Goal

A React component that draws the institution and its branch buildings on an
OpenFreeMap base map, loading MapLibre only when it scrolls into view and
disappearing entirely when it cannot draw.

## Files

- `package.json` / `package-lock.json` — add `maplibre-gl@^6`.
- `src/components/InstitutionMap.tsx` — new.
- `src/lib/map/pins.ts` — new. Pure: `toPins(location, branches)` and
  `fitBoundsFor(pins)`.
- `src/lib/map/pins.test.ts` — new.
- `src/lib/map/theme.ts` — new. `currentMapTheme()` and
  `observeMapTheme(cb)`, the single place that knows how `ThemeToggle.astro`
  stores the choice.
- `src/components/InstitutionMap.test.tsx` — new. SSR-markup only.

## Acceptance

- [ ] `toPins` returns the main pin first, then one pin per branch that has a
      coordinate; branches with `location: null` produce no pin. Unit-tested
      against the ДГ№13 shape (main + 4 branches) and the no-branch shape.
- [ ] `fitBoundsFor` returns bounds covering every pin for two or more pins,
      and signals "use a fixed zoom" for exactly one — fitting a single point
      has no meaning.
- [ ] `InstitutionMap` renders nothing at all when `location` is null; its SSR
      markup is asserted empty.
- [ ] With a location, the server-rendered markup is a labelled region
      containing an empty container and no map code — the component never
      touches `window`, `document` or `maplibre-gl` during render, so SSR and
      the first client render agree (the rule 1.1 set for this page).
- [ ] `maplibre-gl` is reached only through a dynamic `import()` fired from an
      `IntersectionObserver` callback, so it is absent from the initial
      detail-route payload and from every other route's.
- [ ] A failure to import, a missing `IntersectionObserver`, a MapLibre
      constructor throw (no WebGL) or a style load error removes the
      container. No error text, no retry, no console noise — the address and
      the link-outs above it are the fallback.
- [ ] Pins are DOM markers coloured from the page's kind hue via the existing
      CSS tokens: main larger and filled, branches smaller and outlined. They
      are `aria-hidden`, carry no `tabindex`, and have no click handler.
- [ ] The map follows the theme: `styleUrlForTheme(currentMapTheme())` on
      load, and `observeMapTheme` re-sets the style on a `data-theme` change
      or a `prefers-color-scheme` change while no explicit theme is set.
- [ ] Bulgarian labels and every pin are re-applied after a style swap — both
      run from one function bound to load and to `styledata`, because setting
      a style resets the map's sources and markers.
- [ ] Default attribution stays enabled and visible (not collapsed behind an
      "i").
- [ ] `prefers-reduced-motion: reduce` disables animated camera movement.
- [ ] The container has no focusable children and does not trap focus.
- [ ] The observer, the theme subscription and the map instance are all torn
      down on unmount.
- [ ] `npm run lint`, `npm run check` and `npm run test` pass.

Evidence: `npm run test` output for the `pins` and `InstitutionMap` suites;
`ls -la dist/_astro/*.js` showing the MapLibre chunk separate from
`SearchExperience.*.js`; a browser network capture showing the chunk requested
only after the container scrolls into view.

## Steps

### RED
- [ ] Test `toPins` and `fitBoundsFor` first, including the single-pin and
      no-branch-coordinate cases.
- [ ] Test the component's SSR markup for both the null-location and
      with-location cases.

### GREEN
- [ ] Add the dependency, then build the component: container ref →
      `IntersectionObserver` → dynamic import → construct → patch style → add
      markers → fit bounds.
- [ ] Wire `src/lib/map/theme.ts` and the `styledata` re-apply.

### REFACTOR
- [ ] Keep every branch of the "cannot draw" logic in one place, so the
      no-coordinate, no-WebGL and failed-import cases visibly share an
      outcome rather than each unmounting in their own way.
- [ ] Comment `theme.ts` with a pointer to `ThemeToggle.astro`, the way
      `storedSearch.ts` points at `BaseLayout.astro`'s inline script.

## Notes

No DOM, no canvas and no WebGL exist in the node test environment, and effects
never run under `renderToStaticMarkup`. Everything worth asserting therefore
has to live in `pins.ts` / `style.ts` / `theme.ts`; the component itself stays
a thin shell. Do not add a DOM test environment for this — it would change the
whole suite's contract to cover one component.

Pins are DOM markers rather than a GeoJSON symbol layer so they can read the
page's CSS tokens directly and stay correct in both themes without a second
palette. It also keeps them out of the style, which a theme swap resets.

MapLibre v6 is ESM-only; the dynamic import is also what keeps it from landing
in the Astro build's shared chunk.
