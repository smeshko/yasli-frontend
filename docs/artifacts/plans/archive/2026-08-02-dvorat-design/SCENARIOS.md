# Fixture scenarios

Deterministic states served by `scripts/fixture-server.mjs` for runtime
verification. The frontend talks to a separate backend, so without this every
result-state screenshot would depend on whatever a local database happened to
hold.

Scenario selection is read **at startup**, so S6–S9 each need their own restart:

```bash
FIXTURE_SCENARIO=S1 npm run fixtures   # S1–S5 all live here
FIXTURE_SCENARIO=S6 npm run fixtures
FIXTURE_SCENARIO=S7 npm run fixtures
FIXTURE_SCENARIO=S8 npm run fixtures
FIXTURE_SCENARIO=S9 npm run fixtures
```

Run `npm run dev` alongside it. The dev server is on `:4321`, the fixture
server on `:8000`; every response carries `Access-Control-Allow-Origin: *`
because they are different origins.

## Scenarios

| id | Launch | Address to type | Endpoint behaviour | Proves |
|---|---|---|---|---|
| S1 | `S1` | `прес` → ул. Преслав 012 | all 200 | all three groups populated, infant-group suffix |
| S2 | `S1` | `слив` → бул. Сливница 084 | all 200 | preschool empty state |
| S3 | `S1` | `дрин` → ул. Дрин 005 | all 200, every result `match_basis: district` | nursery empty state **and** district-fallback note |
| S4 | `S1` | `макед` → ул. Македония 118 | all 200 | kindergarten empty state |
| S5 | `S1` | `чайка` → ж.к. Чайка 012 вх.А | `district_code: null` | missing-district notice |
| S6 | `S6` | any | `/api/institutions` `last_seen_at` = now − 30d | stale banner (threshold 14d) |
| S7 | `S7` | any | `/api/match` → 500 | match error message, **no retry control** |
| S8 | `S8` | any | `/api/match` → 404 `{"error":"address_not_found"}` | stale-address state **with** `Презареди адресите` |
| S9 | `S9` | `прес` | `/api/streets` → 500 once, then 200 | reference-data error panel with `Опитайте пак`, recoverable |

## Criterion coverage

| PLAN acceptance criterion | Scenarios |
|---|---|
| Search + autocomplete behave as before | S1 |
| Filters switch groups | S1 |
| All three empty states | S2, S3, S4 |
| District-fallback notice | S3 |
| Missing-district notice | S5 |
| Stale banner | S6 |
| Error states | S7, S8, S9 |
| Freshness line | S1 (fresh), S6 (stale) |
| sessionStorage persistence | S1 + reload |

## Notes that cost us a round of review

- **`last_seen_at` is computed at server startup**, never hardcoded.
  `shouldShowStaleBanner` compares against `new Date()` with a 14-day
  threshold (`src/lib/search/results.ts:75`), so frozen timestamps would drift
  past it and every baseline scenario would eventually render S6's banner.
- **S8's body is byte-exact.** `requestJson` only maps to `address_not_found`
  when the status is 404 *and* the parsed body is
  `{"error":"address_not_found"}` (`src/lib/api/client.ts:113-126`). Anything
  else degrades to `http_error` and a different state renders.
- **The retry control is not on the match-error path.** `status === "error"`
  renders message text only. `Презареди адресите` belongs to the stale-address
  state (S8) and `Опитайте пак` to the reference-data panel (S9).
