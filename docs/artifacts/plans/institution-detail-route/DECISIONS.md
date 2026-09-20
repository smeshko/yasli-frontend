# Decisions — institution-detail-route

Only the choices where two or more real options were weighed. Smaller calls
are listed in `PLAN.md` § Decisions.

---

# Gate implementation on backend phase 1.3 instead of hand-writing the contract

Date: 2026-09-15

## Options Considered

1. Plan now, implement after backend 1.3 — author every task against the
   field list in backend epic 01 §1.3; the first backend-dependent task is a
   gate that regenerates `src/lib/api/types.ts` and diffs it against that
   list. No hand-written API types.
2. Build now on an interim hand-written type — declare the expected profile
   type in `client.ts`, build against the fixture server, reconcile when 1.3
   lands.
3. Re-scope to today's API — ship identity, catchment, freshness, source link,
   "Детайли" link, manifest and search context via `/api/institutions/{id}`;
   move contacts, address, branches and the nursery district to a new phase.

## Dependencies

- `GET /api/institutions/by-source/{kind}/{external_id}` and every enriched
  field do not exist on any backend branch. Backend 1.3 is `planned` with no
  plan file; 1.2 is unmerged.
- `types.ts` is a committed generated artifact; CI never regenerates it.
- The epic's phase 1.1 acceptance criteria name contacts, four branch
  addresses and the nursery district explicitly.

## Selected Option

Option 1.

## Rationale

The plan stays honest about what exists: nothing in the repo pretends to a
contract the backend has not pinned down. Tasks 1–3 need only today's API and
can land immediately, so the wait costs nothing on the frontend side. When 1.3
merges, the gate either confirms the contract or forces a deliberate plan
amendment — drift is caught at one known point rather than discovered in a
component.

## Rejected Options

- Option 2 — a hand-written type would be the only non-generated API type in
  the codebase, would drift from the real schema, and the deployed page would
  render the error state for every institution until the backend shipped.
- Option 3 — it satisfies neither the epic's acceptance criteria nor the
  parent's job ("tell me more about this kindergarten" without contacts or the
  real address is not an answer), and it would require re-phasing the epic.

---

# Read the existing stored search state for the "serves your address" context

Date: 2026-09-15

## Options Considered

1. Read `sessionStorage["yasli:search-state:v2"]` on the detail page and show
   the context when this institution appears in the stored results.
2. Write a one-shot marker (`{slug, addressLabel, matchBasis}`) on "Детайли"
   click; the page shows it once and clears it.
3. Carry `?from=<address_id>&basis=…` in the link URL.

## Dependencies

- The stored `matchState` already holds `selectedAddress.label` and, per
  result, `institution_kind`, `external_id` and `match_basis`.
- The epic asks to reuse "the existing sessionStorage restore mechanism in
  `SearchExperience.tsx`".
- The page must look correct on a direct visit with no stored state.

## Selected Option

Option 1.

## Rationale

Zero new writes, one definition of the storage shape shared by both islands,
and the context survives reload and back/forward exactly like the search
results do. The known side effect — a direct visit in a tab whose last search
included this institution also shows the context — is true information, not a
bug: the institution does serve that address.

Re-challenged in validation (round-2 #2, a click-time provenance marker was
proposed) and kept on 2026-09-16: `PLAN.md`'s acceptance criterion and
TASK-009 now state the same-tab case explicitly and screenshot it, so the
behaviour is validated rather than hidden behind a fresh-session check.

## Rejected Options

- Option 2 — a second storage write duplicating data that is already stored,
  lost on reload, and a new contract for `BaseLayout`'s pre-paint script to
  stay in step with.
- Option 3 — the page would need the reference data (two large fetches) to
  turn an id back into a label, and the shareable URL would carry another
  parent's address.

---

# Static header from the manifest plus an island for API-backed content

Date: 2026-09-15

## Options Considered

1. Prerender the whole page at build time from the API.
2. Render everything, header included, inside the React island.
3. Prerender the header (kind label, number badge, `<h1>` name, back link)
   from the committed manifest; render every API-backed section in an island
   that fetches `by-source` on mount.

## Dependencies

- CI has no backend access; `npm run build` must succeed with the backend
  stopped (epic acceptance criterion).
- The page is meant to be shared; the name should be in the HTML.
- Tests are SSR-markup tests; the island's server-rendered state is what gets
  asserted.

## Selected Option

Option 3.

## Rationale

The manifest is the only data the build can rely on, and it is enough for a
meaningful `<title>`, `<h1>` and eyebrow. Everything that can go stale or
fail lives behind explicit loading / error / not-found states inside the
island, where the existing search screen already handles the same cases.

## Rejected Options

- Option 1 — contradicts the no-backend-at-build constraint outright.
- Option 2 — an empty `<h1>` in the static HTML and a name that appears only
  after a fetch, for no gain over the manifest the page already has.

---

# Guard result-card links by manifest membership

Date: 2026-09-16 (added in validation — round-1 #4)

## Options Considered

1. Render "Детайли" only when the result's `(institution_kind, external_id)`
   slug is in the committed manifest; `SearchExperience.tsx` builds the slug
   set once from the JSON and passes it to `SearchResults` as a prop.
2. Accept the gap as a known limitation: an institution added to the backend
   after the last manifest run links to the site 404 page (which has a way
   back) until the manifest is regenerated and the site redeployed.
3. Defer to a follow-up plan.

## Dependencies

- Search results are live API data; detail pages exist only for manifest
  rows, and the manifest is regenerated by hand, never in CI.
- The manifest is 77 rows of `kind`/`external_id`/`name` — a few KB gzipped
  if it joins the search island bundle.
- `SearchResults` is tested by SSR markup per props; a prop keeps the guard
  testable without the real data file.

## Selected Option

Option 1.

## Rationale

A link that is known at render time to lead nowhere should not be rendered.
The cost is one small JSON import in the search island and one prop; the
check is a `Set.has` per card. The existing drift mitigations (not-found
state, re-sync command, TASK-009 count check) still cover renames and
removals.

## Rejected Options

- Option 2 — ships a link the frontend can already tell is broken; a 404
  page with a back link is a designed dead end, not a feature.
- Option 3 — the guard is a handful of lines in the task that adds the link;
  splitting it out would ship the broken-link window on purpose.
