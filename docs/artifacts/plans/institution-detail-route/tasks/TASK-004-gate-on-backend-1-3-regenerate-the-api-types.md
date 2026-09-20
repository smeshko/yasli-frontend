# TASK-004: Gate on backend 1.3: regenerate the API types

Depends on: None
Suggested commit: `chore(api): regenerate types for the institution profile contract`

## Goal

`src/lib/api/types.ts` describes the `by-source` route and the enriched
detail response as the backend actually serves them, and the plan's assumed
contract is either confirmed or deliberately amended.

## Files

- `src/lib/api/types.ts` — regenerated with `npm run api:types` against a
  backend that has phase 1.3 merged and deployed. Never hand-edited.
- `docs/artifacts/plans/institution-detail-route/RESEARCH.md` — § Uncertainty:
  record the exact operation id (`operations["…by_source…"]`) and the schema
  name carrying the new fields.
- Only if the contract differs from `RESEARCH.md` § Architecture Facts:
  `RESEARCH.md` (contract list), `scripts/fixture-server.mjs` (`PROFILES`),
  `SCENARIOS.md`, and the text of TASK-005 / TASK-006 — amended in this same
  commit, and called out in the commit body.

## Acceptance

- [ ] Backend phase 1.3 is merged: its phase block in
      `../backend/docs/artifacts/epics/01-institution-data-foundation.md`
      reads `status: done` (or YAS-8 is Done), and
      `curl https://<backend>/api/institutions/by-source/kindergarten/46`
      returns 200 with `branches` of length 4 and non-null `phone`, `email`
      and `director` (the production snapshot carries them for every
      institution — scraper epic 01 is done; a null here means the data path
      is broken, not that the field is optional)
- [ ] `types.ts` declares the path
      `/api/institutions/by-source/{kind}/{external_id}` and its response
      schema carries `address`, `phone`, `email`, `director`, `website`,
      `district_code`, `location`, `branches` with the nullability listed in
      `RESEARCH.md`; `branches[]` items carry `label`, `address`, `location`
- [ ] The diff is additive only: the six pre-existing paths are still
      declared, no pre-existing field is removed or retyped, and the only
      changes are the new `by-source` path, the new fields on the detail
      schema (which `GET /api/institutions/{institution_id}` shares, so that
      schema *does* change) and any new schemas those fields reference
- [ ] `npm run check` and `npm run test` pass on the regenerated file
- [ ] On any mismatch with the assumed contract: work stops here, the
      amendment is made and described, and only then does the task complete.
      Silent adaptation in later tasks is not allowed

Evidence: the `curl` output (status line +
`jq '{phone, email, director, branches: (.branches | length)}'`); `git diff --stat
src/lib/api/types.ts`; `grep -n "by-source" src/lib/api/types.ts`; the
`npm run check` and `npm run test` tails.

## Steps

- [ ] Confirm 1.3 is merged and deployed to the backend
      `YASLI_OPENAPI_URL` will point at
- [ ] `YASLI_OPENAPI_URL=https://<backend>/openapi.json npm run api:types`
- [ ] Diff the new schema against `RESEARCH.md`'s field list, field by field
- [ ] Record the operation id and schema name in `RESEARCH.md`
- [ ] Run `npm run check` and `npm run test`
- [ ] Commit `types.ts` (and, if needed, the amended plan files) — nothing else

## Notes

Regenerate against the **deployed** backend, not a local checkout, so the
committed types match what production serves. If the only backend with 1.3 is
local, say so in the commit body and re-run this task once it deploys.

Tasks 1–3 do not depend on this gate; tasks 5–9 do.
