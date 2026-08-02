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
- [ ] These named scenarios exist and are addressable by typing a fixed prefix:
      | Scenario | Address | Proves |
      |---|---|---|
      | S1 full | `ул. Преслав 12` | all three groups populated |
      | S2 no preschool | `бул. Сливница 84` | preschool empty state |
      | S3 no nursery | `ул. Дрин 5` | nursery empty state + district fallback |
      | S4 no kindergarten | `ул. Македония 118` | kindergarten empty state |
      | S5 no district | `ж.к. Чайка бл. 12` | missing-district notice |
      | S6 stale | any, with `last_seen_at` 30 days old | stale banner |
      | S7 error | `/api/match` returns 500 | error + retry state |
      | S8 address gone | `/api/match` returns `address_not_found` | stale-address state |
- [ ] Scenarios are selected deterministically — a flag or env var, not by
      editing the file between runs
- [ ] `SCENARIOS.md` maps each scenario to the PLAN acceptance criteria it
      provides evidence for
- [ ] The harness is dev-only: not imported by `src/`, not in the build output.
      `npm run build` output is byte-identical with and without it present

Evidence: `npm run fixtures` running, and one screenshot per scenario S1–S8
taken against it.

## Steps

### RED
- [ ] Start `npm run dev` with no backend and capture the failure state — this
      is what makes the current acceptance criteria unverifiable

### GREEN
- [ ] Read `src/lib/api/client.ts` and `src/lib/api/types.ts` and enumerate the
      exact endpoints, query shapes and response types used
- [ ] Write the fixture dataset covering S1–S8
- [ ] Write the server; support scenario selection by env var
- [ ] Confirm each scenario renders its intended state in the browser

### REFACTOR
- [ ] Note in `README.md` that the fixture server exists and how to run it

## Notes

This is test infrastructure, not product code. It exists because "demonstrated
at runtime" is in the plan's acceptance criteria and cannot otherwise be met
from a clean checkout.

Do not weaken it into a mocked `fetch` inside the app — that would change the
code under test. It has to sit behind the real network boundary.
