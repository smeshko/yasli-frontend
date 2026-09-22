# TASK-006: Mount the map on the profile and document the route

Depends on: TASK-001, TASK-005
Suggested commit: `feat(institution): show the map on the detail page`

## Goal

The map appears on the detail page between the address and the contacts, fed
by the manifest's coordinate and the profile's branches, and the architecture
docs describe what the route now loads.

## Files

- `src/pages/institution/[slug].astro` — pass the manifest `location` into
  `<InstitutionProfile>`.
- `src/components/InstitutionProfile.tsx` — accept `location`, render
  `<InstitutionMap>` between `AddressSection` and `ContactsSection`.
- `src/components/InstitutionProfile.test.tsx` — cover the new prop.
- `docs/ARCHITECTURE.md` — the map island, its lazy import, and
  `tiles.openfreemap.org` as the page's one third-party origin.

## Acceptance

- [ ] `InstitutionProfileView` takes `location` and renders the map only in
      the `success` state — never under loading, error or not-found, where
      there are no branches to draw and nothing else on the page yet.
- [ ] The main pin uses the manifest `location`, so it matches the link-outs
      above it by construction; branch pins come from `profile.branches`.
- [ ] With `location: null` the profile renders exactly as it does today —
      the existing tests for that shape pass unchanged.
- [ ] The map sits between the address and contacts in both DOM and reading
      order.
- [ ] Existing `InstitutionProfile` tests keep passing; the only changed
      assertions are the ones the new prop requires, named in the commit.
- [ ] `docs/ARCHITECTURE.md` states that the detail route loads MapLibre
      lazily and that no other route can reach it.
- [ ] `npm run build` succeeds with no backend running; `npm run lint`,
      `npm run check` and `npm run test` pass.

Evidence: `npm run test` output for the `InstitutionProfile` suite; the
rendered page against the fixture server at `kindergarten-46` (3 pins) and
`kindergarten-34` (no map), screenshotted.

## Steps

### RED
- [ ] Add `InstitutionProfile.test.tsx` cases: the success state with a
      location renders the map region; the success state without one does not;
      loading/error/not-found never do.

### GREEN
- [ ] Thread the prop through `[slug].astro` → `InstitutionProfile` →
      `InstitutionProfileView` → `InstitutionMap`.

### REFACTOR
- [ ] Update `docs/ARCHITECTURE.md` in the same commit.

## Notes

Threading `location` as a prop rather than reading the manifest inside the
island keeps the island's inputs explicit and keeps the manifest import in the
one file that already owns it.

The map is deliberately not rendered in the loading state. A container that
appears, draws a single pin, then re-fits when branches arrive is two layout
shifts for no information; the address and link-outs above it already answer
"where is this" during that window.
