# Review Summary — institution-detail-route

**Rounds:** 3
**Fix commits:** `633f59a`..`928b146` (11 commits)
**Reviewer:** subagent (`general-purpose`, adversarial framing) in all three rounds. Codex was usage-limited for the whole session (`You've hit your usage limit … try again at 12:04 PM`), so the shared protocol's Codex-unavailable fallback applied throughout.

## ⚠ Blocking: do not merge before the backend deploys

`GET /api/institutions/by-source/{kind}/{external_id}` **does not exist on production**. Backend phase 1.3 is merged on the backend repo's `staging`, but Railway's `backend-api` service deploys from `main`, which does not yet carry it. Probed twice during this review — the route returns `404 {"detail":"Not Found"}`.

Round-1 #1 hardened the failure mode (a page now shows the designed not-found state with a link back, rather than an error state whose retry can never succeed), but the page still cannot show real data until the backend ships. Merging the frontend first makes all 95 institution pages assert "Институцията вече не е в източника" — a confidently false claim — and the result cards that link to them lose their source link.

**Merge order: backend `staging` → `main` first, then this PR.** Afterwards, re-run TASK-004's check and the ДГ№13 row from `VALIDATION.md` § "Not demonstrated".

## Rounds

| Round | Findings | Fixed | Deferred | Rejected |
|-------|----------|-------|----------|----------|
| 1     | 10       | 8     | 1        | 1        |
| 2     | 5        | 4     | 0        | 1        |
| 3     | 2        | 2     | 0        | 0        |

Round 1's #7 was triaged `defer` and **reclassified `fix`** after round 2 overturned its premise; the table above counts it as fixed. Round 3's verdict was *approve-with-comments* — it found no new bugs, one stale doc line and one undemonstrable parser edge, both fixed at the plan author's direction.

## Fixes

### Round 1
- `633f59a` — any 404 on `by-source` maps to the designed not-found state; a backend without the route no longer produces an unretryable error page (round-1 #1)
- `35385ef` — the page context prefers the address basis: a kindergarten with an infant group appears in two groups, and the nursery row's "district" was beating the kindergarten's "address", contradicting the search screen (round-1 #2)
- `fae2124` — an unparsable `last_seen_at` no longer throws out of the render path and tears the island down, leaving a header with nothing under it (round-1 #3)
- `735fbe7` — `source_url` goes behind the same http(s) href guard as `website`, on both the profile page and the result card (round-1 #5)
- `07bb19d` — an unknown `district_code` no longer renders "Яслата обслужва район undefined." (round-1 #6)
- `8770682` — the card focus ring reads the group's own hue instead of hardcoding nursery (round-1 #9)
- `7ac1c3a` — a test whose name asserted the opposite of its assertion (round-1 #10)

### Round 2
- `701c674` — **round-1 #7, reclassified.** ДЯ № 4's live `TEL` is `"052 820758 0885665404"`; the page shipped `tel:0528207580885665404` while the text read as two correct numbers. `splitPhone`/`splitEmail` link the first whole number and always show the full published value (round-2 #1)
- `92382dd` — a non-manifest card whose `source_url` fails normalization names its source as text instead of losing the row, restoring PLAN.md's "no card is a dead end" invariant that `735fbe7` had dropped (round-2 #4)
- `3aeb868` — corrected the `client.ts` and `fixture-server.mjs` comments that `633f59a` made false (round-2 #3)

### Round 3
- `11c0157` — `splitPhone` no longer absorbs a `(0)` trunk prefix or a lone trailing extension digit: `"052 613039 вътр. 1"` dialled `0526130391`, a different subscriber (round-3 #2)
- `928b146` — the same false byte-exact-404 rule, still stated in `ARCHITECTURE.md` (round-3 #1)

## Deferred

- (round-1 #8) **Result card text is unselectable under the stretched card link** — an inherent cost of the whole-card-navigation pattern `VALIDATION.md` deliberately chose; the mitigation (cancelling navigation when a selection exists) is new interaction behaviour with its own edge cases, not a bug fix. Filed as **YAS-23**.

Round 1 also deferred #7 (multi-value phone) as **YAS-22**; round 2 proved the premise wrong and it was fixed in this branch, so YAS-22 is closed as done-here.

## Rejected

- (round-1 #4) **`<h1>`/`<title>` keep the manifest name after the island loads the live one** — `PLAN.md` § Risks accepts "an institution renamed or removed from the source after the manifest was generated shows a stale name" outright, with `npm run institutions:manifest` plus a redeploy as the documented re-sync. Author-confirmed. Round 2 pushed back that the original rationale also cited the "Static header from the manifest plus an island" Decision, which is silent on reconciling the heading post-load; the rationale in `round-1.md` was restated to rest on the accepted Risk alone. Round 2 added that the stale name is visible across two screens (the card shows the live name, the page the manifest name) — recorded, not acted on. Round 3 noted the manifest is currently byte-identical to production on all 95 rows, so the accepted drift is at zero today.
- (round-2 #5) **Narrowing `isSnapshotStale` to accept only `Date`** — the reviewer marked the round-1 #3 fix sufficient and this type-level hardening with no reachable runtime path: every caller now passes a `Date` or is already NaN-guarded. Would edit `results.ts` and three test call sites for no behaviour change.

## Gates

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm run check` | 0 errors, 0 warnings, 0 hints |
| `npm run test` | 159 tests, 12 files, all passing (was 121 before the review) |
| `npm run build`, no backend reachable | succeeds; 98 pages, 95 institution directories = manifest rows |
| Production `by-source` probe | `404 {"detail":"Not Found"}` → maps to `institution_not_found` → the not-found state with a link home. Verified end-to-end against the deployed backend. |
