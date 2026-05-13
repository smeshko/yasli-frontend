# yasli frontend

Astro, React, and TypeScript frontend for the Bulgarian-only `yasli` user
interface.

## Status

The app is feature-frozen at the s11 search experience. User-facing routes are
limited to `/` (the address-driven search) and `/about`. The institution
profile and listing routes were intentionally removed in s12; result cards
link out to the official `dg.uslugi.io` source instead.

## Requirements

- Node.js 22 for local development and Cloudflare Pages builds.
- npm, using the committed `package-lock.json`.
- A reachable backend only when regenerating OpenAPI types.

## Local setup

```bash
npm ci
npm run dev
```

The local development server defaults API configuration to
`http://localhost:8000` when `PUBLIC_YASLI_API_BASE_URL` is not set.

## Commands

```bash
npm run dev       # local Astro server
npm run build     # production build
npm run preview   # preview the built output
npm run check     # Astro type check
npm run lint      # ESLint
npm run test      # Vitest unit tests
npm run api:types # regenerate backend OpenAPI TypeScript types
```

`npm run build` consumes the committed `src/lib/api/types.ts` file. It does not
regenerate OpenAPI types and does not require the backend service to be running.

## API configuration

Set `PUBLIC_YASLI_API_BASE_URL` to the browser-visible backend origin in every
deployed environment, for example:

```bash
PUBLIC_YASLI_API_BASE_URL=https://api.example.test npm run build
```

The value must be an absolute `http` or `https` URL. A trailing slash is removed
by the shared API configuration module.

## Search development

The home search flow loads these backend endpoints in the browser:

- `GET /api/streets`
- `GET /api/addresses`
- `GET /api/match?address_id=<id>`
- `GET /api/institutions` for freshness metadata

Run the frontend against a backend that has the s07, s08, and s09 endpoints
available. The search input builds exact-address suggestions from the streets
and addresses payloads, so selecting a suggestion starts the match request
directly. Free-text submission without selecting a suggestion is intentionally
not supported in v1.

## OpenAPI type generation

The generator reads `YASLI_OPENAPI_URL` and defaults to
`http://localhost:8000/openapi.json` when it is absent:

```bash
npm run api:types
YASLI_OPENAPI_URL=https://api.example.test/openapi.json npm run api:types
```

Run this command after backend OpenAPI changes, then commit the updated
`src/lib/api/types.ts`.

For the search UI, refresh generated types after the backend OpenAPI includes
the s09 institution endpoints:

```bash
YASLI_OPENAPI_URL=http://localhost:8000/openapi.json npm run api:types
```

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 22
- Required environment variable: `PUBLIC_YASLI_API_BASE_URL`

Cloudflare Pages should run `npm ci` before the build command.
