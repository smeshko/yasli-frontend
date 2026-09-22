# Research: Map with pins and link-outs

Curated findings only — no raw conversation transcripts. Everything below was
measured on 2026-09-21 against the live OpenFreeMap endpoints, the deployed
backend and this repo, not estimated.

## Key Files & Directories

- `src/pages/institution/[slug].astro` — the detail route phase 1.1 shipped.
  `getStaticPaths()` reads the committed manifest and passes
  `{kind, external_id, name}` as props; the frontmatter renders the header
  (kind label, `№N`, `<h1>`) as plain HTML and mounts
  `<InstitutionProfile client:load>` below it. This is the only part of the
  page that renders **without** JavaScript, so it is where the link-outs go.
- `src/components/InstitutionProfile.tsx` — the React island. Fetches
  `by-source` in an effect, holds `profile.branches` (each with its own
  `location`), and renders the address, contacts, coverage, branch list,
  freshness line and source link. Every state is decided in an effect so SSR
  markup and hydration agree; the map has to keep that property.
- `src/lib/institutions/manifest.ts` — `ManifestEntry`, `buildInstitutionSlug`,
  `institutionPath`, `manifestToStaticPaths`, `buildSlugSet`. Adding a field to
  the manifest means adding it here and in the generator.
- `scripts/generate-institutions-manifest.mjs` — validates every row field by
  field and exits non-zero on anything unexpected. A new field needs its own
  validation in the same style, not a silent pass-through.
- `src/components/ThemeToggle.astro` — writes
  `document.documentElement.dataset.theme` and **emits no event**. "system" is
  the absence of a stored value. A map that follows the theme must observe the
  attribute, not listen for a signal.
- `src/layouts/BaseLayout.astro` — every colour token is `light-dark(...)` on
  `:root`; `--color-section-{nursery,kindergarten,preschool}` are the kind hues
  the pins reuse.
- `scripts/fixture-server.mjs` — already serves `location` on profiles and on
  branches (added by 1.1 so the payload matched the real schema field for
  field). No fixture change is needed for this phase.
- `src/lib/search/referenceData.ts` — the repo's one precedent for a memoized
  module-level promise plus an explicit cache-clear for retry. Considered and
  rejected for the map (see `DECISIONS.md`).

## Architecture Facts

1. **The coordinate is already in the committed API types.**
   `components["schemas"]["Location"]` is `{lat: number, lon: number,
   precision: "building" | "approximate"}`. It hangs off `InstitutionDetail`,
   `InstitutionListItem` **and** `Branch`. Nothing needs regenerating.

2. **`InstitutionListItem` carries `location`, so the manifest generator needs
   no extra request.** One `GET /api/institutions` call already returns the
   field for every row — the same call the generator makes today.

3. **The deployed backend does not yet serve it.** Measured against
   `https://yasli-backend-production.up.railway.app/api/institutions`
   (2026-09-21): 95 rows, keys `{id, external_id, name, kind, source_url,
   last_seen_at}` — **no `location` at all**, and `by-source` answers 404.
   Backend phases 1.2 and 1.3 are merged on the backend's `staging`, not on
   `main`, and Railway deploys `main`. So the manifest must be regenerated
   against a locally seeded backend, exactly as 1.1's real-data check was.

4. **All 77 institution buildings are pinned at building precision.**
   `backend/data/institution_locations.csv` (95 lines): 77 `main` rows, all
   `precision=building`, none blank; 17 `branch` rows, 16 with a coordinate
   and 1 (`precision=none`) without.

5. **18 of the 95 manifest rows can never have a coordinate.** The manifest's
   kinds are kindergarten 53, nursery 30, preschool 12 — but the CSV's `main`
   rows are kindergarten 53, nursery 12, preschool 12. The extra 18 nursery
   rows are infant-group kindergartens listed a second time under
   `nursery/<kindergarten external_id>` (`nursery/47` = `ДГ№14 "Дружба"/ с
   яслена група/`). `institution_locations` keys that building only under
   `kindergarten/47`, so the join returns `location: null`. Nothing in search
   links to those URLs — `SearchResults.tsx` builds hrefs from
   `institution_kind`, so an infant-group card points at the kindergarten's
   page — but the pages exist and are directly reachable.

6. **ДГ№13 „Мир“ really is 5 buildings.** `kindergarten/46` has one `main` row
   plus four `branch` rows, all four with `precision=building` coordinates
   (бул. Княз Борис I 109, ул. Н. Михайловски 1А, ул. Тодор Икономов 36, ул.
   Тодор Икономов 26). The epic's 5-pin criterion is reachable from real data.

7. **The fixture's ДГ№13 is deliberately a 3-pin case.** `kindergarten/46` in
   `scripts/fixture-server.mjs` has a `location` plus four branches of which
   only two carry one — the other two cover "addressed but unpinned" and
   "label only". `kindergarten/34` (ДГ№1 „Светулка“) has `location: null`, so
   the no-coordinate path already has a fixture. Fixtures prove the states;
   only the 5-pin count needs real data.

8. **OpenFreeMap serves several styles, not one.** Fetched 2026-09-21:

   | style | bytes | layers | text-field layers |
   |---|---|---|---|
   | `liberty` | 43 079 | 111 | 23 |
   | `bright` | 48 713 | — | — |
   | `positron` | 25 153 | 55 | 19 |
   | `dark` | 20 959 | 47 | 13 |

   All of them share `glyphs`, `sprite` and both sources (`ne2_shaded` raster
   + `openmaptiles` vector), all on `tiles.openfreemap.org`. There is no
   `liberty`-dark; `positron`/`dark` are the only matched pair.

9. **The `text-field` patch must be selective.** The epic's
   `["coalesce", ["get","name:bg"], ["get","name"]]` is right for the label
   layers, but not every `text-field` is a name. Measured shapes in the
   styles:

   - `['case', ['has','name:nonlatin'], ['concat', ['get','name:latin'], ' ',
     ['get','name:nonlatin']], ['coalesce', ['get','name_en'], ['get','name']]]`
     — the Latin-transliteration trap the epic names. Replace these.
   - `['to-string', ['get','ref']]` (`highway_name_motorway`) — a road shield
     number. Replacing it would blank the motorway shields.

   So the rule is "replace a `text-field` whose expression mentions
   `name:latin`", not "replace every `text-field`".

10. **`name:bg` exists in every label layer of the tiles.** The planet
    TileJSON (`https://tiles.openfreemap.org/planet`, v3.16.0, tiles dated
    `20260913_164504_pt`) lists `name:bg` alongside `name` on
    `aerodrome_label`, `boundary`, `mountain_peak`, `park`, `place`, `poi`,
    `transportation_name`, `water_name` and `waterway`. The coalesce will find
    a value, not fall through to `name` everywhere.

11. **Attribution comes with the TileJSON.** It carries
    `OpenFreeMap © OpenMapTiles Data from OpenStreetMap` as an `attribution`
    string, which MapLibre's default `AttributionControl` renders on its own.
    The criterion is met by not disabling it, plus a visible-not-collapsed
    check.

12. **`maxzoom` is 14.** Building precision comes from overzooming vector
    tiles, which MapLibre does natively. Nothing to configure; worth knowing
    when the map opens at z17.

13. **Astro already emits one chunk per island.** Current `dist/_astro/`:
    `client.DTojXMD-.js` 185 936 B (React runtime, shared),
    `SearchExperience.n9japh6P.js` 23 014 B,
    `InstitutionProfile.6MYS0zJg.js` 7 200 B,
    `storedSearch.BjG_lZBO.js` 4 397 B, `index.CO9X3OiW.js` 7 614 B. A
    dynamic `import("maplibre-gl")` inside the profile island becomes its own
    chunk, referenced from `InstitutionProfile.*.js` and from nothing the
    search screen loads. `maplibre-gl@6.10.0` unpacks to ~20 MB on disk but
    ships ~200 KB gzipped to the browser.

14. **Tests are SSR-markup tests.** `vitest.config.ts` pins
    `environment: "node"`; component tests use `renderToStaticMarkup`. No DOM,
    no canvas, no WebGL, no `fetch`, and effects never run. Everything about
    the map that can be tested must therefore live in pure functions — style
    patching, bounds, link URLs — with the component test asserting only the
    server-rendered container, or its absence.

15. **CI runs `lint`, `check`, `test`, `build`** and never the generator
    scripts. The build needs `PUBLIC_YASLI_API_BASE_URL` and no backend.

## Constraints

- No API key, no registration, no runtime quota — the site is a static
  Cloudflare Pages build, and `PUBLIC_YASLI_API_BASE_URL` is the only
  build-time variable it has.
- Bulgarian-only UI. Latin transliteration on the base map is a defect.
- Light **and** dark, driven by `data-theme` on `<html>` plus the system
  preference when that attribute is absent.
- The accessibility posture treats focus traps and live-region defects as
  blocking. The map must be skippable and must not steal focus.
- `output: "static"`. Nothing may require a server runtime.
- The map must not land in the search screen's payload.

## Useful Commands

```bash
# The OpenFreeMap styles, with layer and text-field counts
for s in liberty positron dark; do
  curl -s https://tiles.openfreemap.org/styles/$s | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(len(d['layers']), sum('text-field' in (l.get('layout') or {}) for l in d['layers']))"
done

# Which tile fields carry a Bulgarian name
curl -s https://tiles.openfreemap.org/planet | python3 -c "
import json,sys
for l in json.load(sys.stdin)['vector_layers']:
    print(l['id'], [f for f in l.get('fields',{}) if f.startswith('name:bg')])"

# What the deployed backend actually serves (expect: no location, 404)
curl -s https://yasli-backend-production.up.railway.app/api/institutions | head -c 400
curl -s -o /dev/null -w '%{http_code}\n' \
  https://yasli-backend-production.up.railway.app/api/institutions/by-source/kindergarten/46

# Manifest rows with no main row in the backend's location CSV
python3 - <<'PY'
import csv, json
mains = {(r['kind'], r['external_id'])
         for r in csv.DictReader(open('../backend/data/institution_locations.csv'))
         if r['role'] == 'main'}
rows = json.load(open('src/data/institutions-manifest.json'))
print([(r['kind'], r['external_id']) for r in rows if (r['kind'], r['external_id']) not in mains])
PY

# Per-chunk JS weight, before and after
ls -la dist/_astro/*.js
```

## Uncertainty

- **Does `client:visible` survive?** No. Branch coordinates arrive only with
  the client-fetched `by-source` payload, which a manifest-fed island cannot
  see. Resolved by mounting the map inside the existing `client:load` island
  and lazy-loading MapLibre with a dynamic import behind an
  `IntersectionObserver` — same deferral, one fetch. See `DECISIONS.md`.
- **Does the no-JS criterion survive?** Partly. Phase 1.1 put the address
  inside the island, so with JS off the page renders only its header. The
  link-outs can move into the Astro frontmatter and do work with JS off; the
  address cannot, without duplicating a live field into the manifest.
  Resolved by narrowing the criterion to the link-outs and recording why.
- **Does the base map read Bulgarian?** The tiles carry `name:bg` (fact 10),
  so the expression will resolve. That the rendered glyphs are Cyrillic at
  Varna's zoom levels is a runtime claim, demonstrated in TASK-007 rather than
  assumed here.
- **Does WebGL exist everywhere?** No, and MapLibre throws when it does not.
  Treated as a designed state — the container is never rendered — rather than
  an error, the same shape as the missing-coordinate case.

## References

- [`openspec/docs/INSTITUTION_DETAIL_MAP_RESEARCH.md`](../../../../../openspec/docs/INSTITUTION_DETAIL_MAP_RESEARCH.md)
  — §5.2 the four link-out URL templates, §6 the provider comparison and the
  `name:bg` trap, §5.1 why the parent's own address is never pinned.
- [Epic 01, phase 1.2](../../epics/01-institution-detail-page.md) — the goal,
  the build list and the acceptance criteria this plan implements.
- [Phase 1.1's plan](../archive/2026-09-20-institution-detail-route/PLAN.md)
  and its [`SCENARIOS.md`](../archive/2026-09-20-institution-detail-route/SCENARIOS.md)
  — the page this phase extends, and the fixture slugs it reuses.
- [`backend/data/institution_locations.csv`](../../../../../backend/data/institution_locations.csv)
  — the coordinate table, 77 mains + 17 branches.
- [`docs/design/DESIGN-SYSTEM.md`](../../../design/DESIGN-SYSTEM.md) — the
  tokens and the light/dark contract the map lives inside.
