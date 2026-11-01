# yasli-frontend

The static Astro 6 + React 19 site parents use to find their nursery or kindergarten. `docs/ARCHITECTURE.md` has the
layout. All copy is Bulgarian; `docs/design/` holds the design rules. The backend and scraper are separate repositories.

## Commands

- Lint: `npm run lint`. Types: `npm run check`. One test file: `npx vitest run <file>`.
- `npm` is the package manager; a new dependency is `npm install --save-exact <package>`.

## Tests

Vitest in the node environment, beside the code as `src/**/*.test.ts(x)`. Test the logic in `src/lib/`; a component's
behaviour that only a browser shows is demonstrated, not unit-tested.

## Generated files

`src/lib/api/types.ts` and the institutions manifest are committed and generated from a live backend (`npm run api:types`,
`npm run institutions:manifest`). Never regenerate or hand-edit them in a run: a change that needs a new backend field
waits for that backend change to deploy. End the step **blocked**, saying so.

## Demonstration

The one surface is `web`: the site in headless Chrome, against the deterministic fixture backend.

`.sail/lib/demo.sh <scenario> <command> [args…]` starts `scripts/fixture-server.mjs` on that scenario and the dev server,
runs the command with `$APP_URL` and `$API_URL` set, then stops both. The scenarios (S1–S9 for search, D1–D3 for
institution pages) are listed at the top of `scripts/fixture-server.mjs`. Single-quote the command, so `$APP_URL` expands
inside it:

```
.sail/lib/demo.sh S1 bash -c 'bun .sail/lib/browse.mjs "$STAGE_OUT/demo" search-escape "$APP_URL/" steps=$STAGE_OUT/steps.json size=390x844'
```

`.sail/lib/browse.mjs`'s header lists its steps: click, type, press a key, scroll, wait, shot. `steps=` is a JSON list you
write with your file tools. It appends each step and each console warning or error to `transcript.txt`, and writes each
shot's PNG and DOM. Read the PNG to see what a person sees, and `grep` the DOM for the text the scenario names. The site
is mobile-first: use `size=390x844` unless the criterion is about the desktop layout.

`scripts/generate-*` and any URL outside `$APP_URL` and `$API_URL` are off limits: never touch the deployed backend.
