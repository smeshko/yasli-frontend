# TASK-001: Generate and commit the institutions manifest

Depends on: None
Suggested commit: `feat(build): generate and commit the institutions manifest`

## Goal

A committed JSON list of every institution's `(kind, external_id, name)`,
produced by a script that mirrors `scripts/generate-api-types.mjs`, plus the
typed helpers that turn it into slugs, page paths and `getStaticPaths` rows.

## Files

- `scripts/generate-institutions-manifest.mjs` — new. Reads
  `YASLI_INSTITUTIONS_URL` (default `http://localhost:8000/api/institutions`)
  with the global `fetch`, validates the payload, keeps only `kind`,
  `external_id`, `name`, sorts by kind order (`nursery`, `kindergarten`,
  `preschool`) then numeric `external_id` (string compare as a fallback),
  writes 2-space JSON with a trailing newline, prints
  `wrote <N> institutions from <url> to src/data/institutions-manifest.json`
  (the source URL is always in the line — see the fixture-server risk in
  `PLAN.md`), exits 1 on any failure. Plain `.mjs`; must not import from `src/`.
- `package.json` — `"institutions:manifest": "node ./scripts/generate-institutions-manifest.mjs"`.
- `src/data/institutions-manifest.json` — new, committed output of one run
  against the production backend.
- `src/lib/institutions/manifest.ts` — new: `ManifestEntry`
  (`{ kind: ReceptionKind; external_id: string; name: string }`),
  `buildInstitutionSlug(kind, externalId)` → `<kind>-<external_id>`,
  `institutionPath(kind, externalId)` → `/institution/<slug>/`,
  `manifestToStaticPaths(entries)` → `{ params: { slug }, props: entry }[]`,
  `buildSlugSet(entries)` → `ReadonlySet<string>` of every slug (the search
  island's guard for the "Детайли" link — TASK-008).
- `src/lib/institutions/manifest.test.ts` — new.
- `README.md` — add the command and the `YASLI_INSTITUTIONS_URL` row to the
  environment table, with the documented invocation always passing the
  variable explicitly (the localhost default is the fixture server's port
  whenever `npm run fixtures` is up); `docs/ARCHITECTURE.md` — add `lib/institutions/` and
  `data/` to the source layout and a short "Institution manifest" section next
  to "OpenAPI type generation" (same rule: never run in CI).

## Acceptance

- [ ] The script exits non-zero, with a one-line reason, on: non-200 status,
      invalid JSON, a non-array or empty payload, a row missing any of the
      three fields, a `kind` outside the enum, a duplicate `(kind, external_id)`
- [ ] The committed file holds only `kind`, `external_id`, `name` per row,
      sorted as specified, and its row count equals the live API's
- [ ] Running the script a second time against the same backend leaves
      `git diff --quiet -- src/data/institutions-manifest.json` clean
- [ ] `buildInstitutionSlug("kindergarten", "46")` → `kindergarten-46`;
      `institutionPath` → `/institution/kindergarten-46/`;
      `manifestToStaticPaths` returns one row per entry with the slug as the
      only param and the entry as props
- [ ] `buildSlugSet` returns one slug per entry; `has("kindergarten-46")` is
      true for a list containing that entry and false otherwise
- [ ] The summary line names the URL the rows came from
- [ ] `.github/workflows/ci.yml` is untouched
- [ ] The commit message records the URL used and the row count

Evidence: the script's `wrote N institutions …` line from the production run;
`git diff --stat` after the second run showing no change to the manifest;
`npm run test` output for `manifest.test.ts`.

## Steps

### RED
- [ ] Write `manifest.test.ts`: slug, path, `manifestToStaticPaths` shape
      (including that props are passed through untouched) and `buildSlugSet`

### GREEN
- [ ] Implement `src/lib/institutions/manifest.ts`
- [ ] Write the script with validation, sort and the summary line
- [ ] Add the npm script; run it against production
      (`YASLI_INSTITUTIONS_URL=https://<backend>/api/institutions`), commit
      the output

### REFACTOR
- [ ] Run the script again and confirm an empty diff
- [ ] Document the command in `README.md` and `docs/ARCHITECTURE.md`

## Notes

Sort with our own key, not the API's order, so the committed diff stays stable
if the backend's ordering ever changes. `(external_id, kind)` is the unique
key on the backend — `external_id` alone repeats across kinds, which is why the
slug carries the kind. ДГ№13 „Мир“ is `kindergarten/46` (backend epic 1.3
acceptance) — its presence in the file is a quick sanity check.
