# Frontend architecture

## Role in the yasli system

```
┌─────────────────────┐
│   yasli-frontend    │   static site (Astro, build-time only)
│ (Cloudflare Pages)  │
└──────────┬──────────┘
           │ fetch JSON (PUBLIC_YASLI_API_BASE_URL)
           ▼
┌──────────────────────┐
│    yasli-backend     │   FastAPI on Railway
│  /api/* endpoints    │
└──────────────────────┘
```

The frontend is the only browser-facing surface of yasli. It has no server runtime — the build emits static HTML/CSS/JS to `dist/`, and Cloudflare Pages serves it. Every dynamic interaction is a `fetch` from the browser straight to the backend, gated by CORS.

## Stack

- **Astro 6** in `output: "static"` mode.
- **React 19** inside Astro for the single interactive component (`SearchExperience`).
- **TypeScript 5** with strict mode, path alias `@/*` → `./src/*`.
- **Vitest 4** for unit tests (node env).
- **No CSS framework** — scoped CSS in Astro pages + global styles in `BaseLayout.astro`.

## Source layout

```
src/
├── components/         React: SearchExperience, StatusBadge
├── layouts/            BaseLayout.astro (shell, global CSS, nav)
├── pages/              Astro routes: /, /about, 404
└── lib/
    ├── api/            client.ts (fetch wrappers), config.ts (base URL resolver), types.ts (generated)
    ├── domain/         kinds.ts (ReceptionKind enum), freshness.ts (14-day staleness)
    └── search/         addressSuggestions.ts, referenceData.ts, results.ts
```

## API client

`src/lib/api/client.ts` exposes typed wrappers over the backend. All return an `ApiResult<T>` discriminated union (`ok: true | false`) so callers handle errors explicitly:

| Function | Backend endpoint |
| --- | --- |
| `listStreets()` | `GET /api/streets` |
| `listAddresses()` | `GET /api/addresses` |
| `listInstitutions()` | `GET /api/institutions` |
| `matchAddress(addressId)` | `GET /api/match/v2?address_id={id}` |

Error codes: `network_error`, `http_error`, `invalid_json`, `address_not_found`. Messages are Bulgarian — they're rendered directly in the UI.

## Search flow

`SearchExperience.tsx` orchestrates the only user flow:

1. **On mount** — `referenceData.ts` fetches `/api/streets` and `/api/addresses` once, caches the Promise.
2. **Build suggestions** — `addressSuggestions.buildExactAddressSuggestions()` transliterates Latin → Cyrillic, expands abbreviated person-name streets, and indexes every `(street, number)` row.
3. **As the user types** — `searchExactAddressSuggestions()` filters by substring + word-prefix scoring.
4. **On suggestion select** — call `matchAddress(addressId)`, which requests the structured `{ address, results }` response from `/api/match/v2` without a `kind` filter.
5. **Group results** — `results.groupMatchResults()` buckets structured rows by `institution_kind` (`nursery`, `kindergarten`, `preschool`) and synthesises nursery entries from kindergartens that have `has_infant_group` set.
6. **Render** — grouped cards with filter tabs (`all` / per-kind). Missing-district and district-fallback notices are derived from `address.district_code` and `match_basis === "district"`, not legacy response envelopes. Freshness banner if `last_seen_at` is >14 days old (`freshness.shouldShowStaleBanner`).

Free-text submission without selecting a suggestion is intentionally **not** supported — the search is exact-address only.

## OpenAPI type generation

`scripts/generate-api-types.mjs` calls the `openapi-typescript` CLI:

- Reads `YASLI_OPENAPI_URL` (defaults to `http://localhost:8000/openapi.json`).
- Writes `src/lib/api/types.ts` (committed to the repo).

The build does **not** call this script. Workflow: backend changes its OpenAPI → run `npm run api:types` locally → commit the regenerated `types.ts`.

## Build output

`output: "static"` produces `dist/` with prerendered HTML for every route plus React islands for `SearchExperience`. The `PUBLIC_YASLI_API_BASE_URL` value is **baked in at build time** — changing it requires a redeploy, not just a restart.

## Deployment

Cloudflare Pages, Git-connected to the repo's `main` branch. See README for build config.

## Cross-repo contracts

- **Backend**: types are generated from `/openapi.json`. A breaking schema change requires regenerating + committing `types.ts` here, and a coordinated deploy.
- **CORS**: backend must list the Pages origin in `CORS_ALLOWED_ORIGINS`.
- **Mixed content**: `PUBLIC_YASLI_API_BASE_URL` must be `https://` in production (the deployed site is served over HTTPS).
