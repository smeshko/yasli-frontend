# yasli-frontend

Bulgarian-language Astro + React UI for finding nurseries, kindergartens, and preschools by address in Varna. Static site that talks to [`yasli-backend`](https://github.com/smeshko/yasli-backend) over JSON.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the pieces fit together.

## Quickstart

Requires Node 22.

```bash
npm ci
npm run dev   # http://localhost:4321
```

Defaults `PUBLIC_YASLI_API_BASE_URL` to `http://localhost:8000` in dev.

## Commands

```bash
npm run dev        # Astro dev server
npm run build      # static build → dist/
npm run preview    # serve the built output
npm run check      # Astro type check
npm run lint       # ESLint
npm run test       # Vitest
npm run api:types  # regenerate src/lib/api/types.ts from backend OpenAPI
npm run institutions:manifest  # regenerate src/data/institutions-manifest.json from a live backend
```

`npm run build` consumes the committed `src/lib/api/types.ts` and `src/data/institutions-manifest.json`; it does **not** regenerate either and does **not** require the backend.

Regenerate the manifest against the deployed backend, never bare while `npm run fixtures` is up (the default URL is the fixture server's port, and it answers `/api/institutions` with a handful of synthetic rows):

```bash
YASLI_INSTITUTIONS_URL=https://yasli-backend-production.up.railway.app/api/institutions npm run institutions:manifest
```

An institution added to the backend after the last run has no page until the manifest is regenerated and the site redeployed.

## Environment variables

| Variable | When | Purpose |
| --- | --- | --- |
| `PUBLIC_YASLI_API_BASE_URL` | build-time | Absolute URL of the backend (e.g. `https://yasli-backend-production.up.railway.app`). Required in every non-dev environment. |
| `YASLI_OPENAPI_URL` | `api:types` only | OpenAPI source URL (defaults to `http://localhost:8000/openapi.json`). |
| `YASLI_INSTITUTIONS_URL` | `institutions:manifest` only | Institution list URL (defaults to `http://localhost:8000/api/institutions`, which is also the fixture server's port — always pass it explicitly). |

## Deployment

Deployed on Cloudflare Pages (Git-connected, auto-deploys on push to `main`).

- Framework preset: **Astro**
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `PUBLIC_YASLI_API_BASE_URL`, `NODE_VERSION=22`

`PUBLIC_YASLI_API_BASE_URL` is baked in at build time — changing it requires a redeploy.
