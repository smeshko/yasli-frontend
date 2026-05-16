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
```

`npm run build` consumes the committed `src/lib/api/types.ts`; it does **not** regenerate types and does **not** require the backend.

## Environment variables

| Variable | When | Purpose |
| --- | --- | --- |
| `PUBLIC_YASLI_API_BASE_URL` | build-time | Absolute URL of the backend (e.g. `https://yasli-backend-production.up.railway.app`). Required in every non-dev environment. |
| `YASLI_OPENAPI_URL` | `api:types` only | OpenAPI source URL (defaults to `http://localhost:8000/openapi.json`). |

## Deployment

Deployed on Cloudflare Pages (Git-connected, auto-deploys on push to `main`).

- Framework preset: **Astro**
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `PUBLIC_YASLI_API_BASE_URL`, `NODE_VERSION=22`

`PUBLIC_YASLI_API_BASE_URL` is baked in at build time — changing it requires a redeploy.
