# TASK-009: Add a deterministic API fixture harness for runtime verification

Depends on: TASK-002
Suggested commit: `Add a fixture API server for runtime verification`

## Goal

Make every result state reproducible without a database, so the visual
acceptance criteria can be demonstrated from a fixed dataset instead of
whatever a local Postgres happens to hold.

## Files

- `scripts/fixture-server.mjs` — new: a dependency-free Node HTTP server that
  answers the endpoints `src/lib/api/client.ts` calls, on `:8000`
- `scripts/fixtures/*.json` — new: the fixture dataset
- `docs/artifacts/plans/dvorat-design/SCENARIOS.md` — new: the scenario table
  that TASK-008 verifies against
- `package.json` — new script: `"fixtures": "node scripts/fixture-server.mjs"`

## Acceptance

- [ ] `npm run fixtures` serves the API contract on `:8000` with no deps
      beyond Node's stdlib, and `npm run dev` against it produces results
- [ ] Responses are shaped by the committed types in `src/lib/api/types.ts` —
      the harness must not invent a contract the real backend does not have
- [ ] Every response carries CORS headers. The dev server is on `:4321` and the
      fixture server on `:8000`; without `Access-Control-Allow-Origin: *` every
      call fails as `network_error` and no scenario is reachable
- [ ] The scenarios below exist, each selected by `FIXTURE_SCENARIO=<id>` at
      launch. Addresses are real rows in the fixture `/api/addresses` payload so
      they are reachable by typing the prefix shown.

      | id | Launch | Address (prefix to type) | Endpoint behaviour | Proves |
      |---|---|---|---|---|
      | S1 | `FIXTURE_SCENARIO=S1` | `ул. Преслав 12` (`прес`) | all endpoints 200 | all three groups populated |
      | S2 | `FIXTURE_SCENARIO=S1` | `бул. Сливница 84` (`слив`) | all 200 | preschool empty state |
      | S3 | `FIXTURE_SCENARIO=S1` | `ул. Дрин 5` (`дрин`) | all 200; every result `match_basis: "district"` | nursery empty state **and** district-fallback note |
      | S4 | `FIXTURE_SCENARIO=S1` | `ул. Македония 118` (`макед`) | all 200 | kindergarten empty state |
      | S5 | `FIXTURE_SCENARIO=S1` | `ж.к. Чайка бл. 12` (`чайка`) | all 200; match context `district_code: null` | missing-district notice |
      | S6 | `FIXTURE_SCENARIO=S6` | any | `/api/institutions` items carry `last_seen_at` 30 days old | stale banner (threshold is 14 days) |
      | S7 | `FIXTURE_SCENARIO=S7` | any | `/api/match` returns HTTP 500 | match **error message only** — this state has no retry control |
      | S8 | `FIXTURE_SCENARIO=S8` | any | `/api/match` returns HTTP 404, body exactly `{"error":"address_not_found"}` | stale-address state **with** the `Презареди адресите` button |
      | S9 | `FIXTURE_SCENARIO=S9` | n/a | `/api/streets` returns HTTP 500 | reference-data error panel with the `Опитайте пак` retry |

- [ ] S8's body is byte-exact. `client.ts:113-126` only maps to
      `address_not_found` when the status is 404 **and** the parsed body is
      `{"error":"address_not_found"}`; anything else degrades to `http_error`
      and the wrong state renders
- [ ] S6 drives staleness from `/api/institutions` `last_seen_at` — the match
      response has no bearing on the banner (`newestFreshnessDate`)
- [ ] S9 fails `/api/streets`, not `/api/match` — the `Опитайте пак` retry
      belongs to the reference-data panel in `SearchExperience`, and no retry
      control exists on the match-error state
- [ ] Scenarios are selected deterministically by `FIXTURE_SCENARIO`, read at
      startup. Switching scenario means restarting the server, and
      `SCENARIOS.md` states that explicitly with the exact command per scenario
- [ ] `SCENARIOS.md` maps each scenario to the PLAN acceptance criteria it
      provides evidence for
- [ ] The harness is dev-only: not imported by `src/`, not in the build output.
      `npm run build` output is byte-identical with and without it present

Evidence: `npm run fixtures` running, and one screenshot per scenario S1–S9
taken against it.

## Steps

### RED
- [ ] Start `npm run dev` with no backend and capture the failure state — this
      is what makes the current acceptance criteria unverifiable

### GREEN
- [ ] Read `src/lib/api/client.ts` and `src/lib/api/types.ts` and enumerate the
      exact endpoints, query shapes and response types used:
      `/api/streets`, `/api/addresses`, `/api/institutions`, and
      `/api/match?address_id=<n>`
- [ ] Write the fixture dataset covering S1–S9
- [ ] Write the server: CORS headers on every response, scenario selection by
      `FIXTURE_SCENARIO`, and the exact status/body shapes above
- [ ] Confirm each scenario renders its intended state in the browser

### REFACTOR
- [ ] Note in `README.md` that the fixture server exists and how to run it

## Notes

This is test infrastructure, not product code. It exists because "demonstrated
at runtime" is in the plan's acceptance criteria and cannot otherwise be met
from a clean checkout.

Do not weaken it into a mocked `fetch` inside the app — that would change the
code under test. It has to sit behind the real network boundary.
