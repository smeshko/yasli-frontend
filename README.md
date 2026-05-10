# yasli frontend

Astro, React, and TypeScript frontend for the Bulgarian-only `yasli` user
interface.

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

## OpenAPI type generation

The generator reads `YASLI_OPENAPI_URL` and defaults to
`http://localhost:8000/openapi.json` when it is absent:

```bash
npm run api:types
YASLI_OPENAPI_URL=https://api.example.test/openapi.json npm run api:types
```

Run this command after backend OpenAPI changes, then commit the updated
`src/lib/api/types.ts`.

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 22
- Required environment variable: `PUBLIC_YASLI_API_BASE_URL`

Cloudflare Pages should run `npm ci` before the build command.
