# TASK-005: Add the by-source client wrapper and not-found error code

Depends on: TASK-004
Suggested commit: `feat(api): add getInstitutionBySource with a not-found error code`

## Goal

`client.ts` exposes a typed `getInstitutionBySource(kind, externalId)` whose
404 is distinguishable from other HTTP failures, using the generated types
from TASK-004.

## Files

- `src/lib/api/client.ts` — export
  `type InstitutionProfile = components["schemas"]["<name recorded in RESEARCH.md>"]`;
  `buildInstitutionBySourcePath(kind, externalId)` →
  `/api/institutions/by-source/<kind>/<encodeURIComponent(externalId)>`;
  `getInstitutionBySource(kind, externalId): Promise<ApiResult<InstitutionProfile>>`;
  add `"institution_not_found"` to `ApiErrorCode`; generalise
  `isAddressNotFoundResponse` into `readNotFoundCode(response)` that returns
  `address_not_found` or `institution_not_found` when a 404 body is exactly
  `{"error": <that code>}`, else `null`. The `address_not_found` path keeps
  its message and behaviour byte-identical.
- `src/lib/api/client.test.ts` — new cases, using the file's existing
  pattern: `vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(…)))`
  per case.
- `docs/ARCHITECTURE.md` — add the row to the API client table and the new
  error code to the list.

## Acceptance

- [ ] `buildInstitutionBySourcePath("kindergarten", "46")` →
      `/api/institutions/by-source/kindergarten/46`; an `external_id` with a
      reserved character is percent-encoded
- [ ] 200 → `{ ok: true, data }`; 404 with `{"error":"institution_not_found"}`
      → `{ ok: false, error: { code: "institution_not_found", status: 404 } }`
      with a Bulgarian message; 404 with any other body → `http_error`;
      500 → `http_error`; thrown `fetch` → `network_error`; unparsable 200 →
      `invalid_json`
- [ ] Every existing `client.test.ts` case passes unchanged, including the
      byte-exact `address_not_found` mapping
- [ ] `npm run check` passes with `InstitutionProfile` resolving to the
      generated schema (no local interface)

Evidence: `npm run test` output for `client.test.ts` listing the new cases.

## Steps

### RED
- [ ] Add the path-builder and the five response-mapping cases

### GREEN
- [ ] Implement the wrapper and the generalised 404 reader

### REFACTOR
- [ ] Update `docs/ARCHITECTURE.md`

## Notes

The match route's 404 is `{"error":"address_not_found"}` and the institution
routes' is `{"error":"institution_not_found"}` (backend
`routes/institutions.py:176`); both are byte-exact matches, which is why the
reader takes a closed list rather than trusting any `error` string.
