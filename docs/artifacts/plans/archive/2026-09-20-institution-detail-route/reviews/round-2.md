# Adversarial Review — Round 2

**Run:** 2026-09-19 07:49 UTC
**Branch:** feature/yas-11-institution-detail-route
**Base:** staging
**Commits reviewed:** f3b883e..7ac1c3a
**Prior rounds in scope:** reviews/round-1.md
**Reviewer:** subagent (`general-purpose`, adversarial framing) — Codex was still usage-limited (`try again at 12:04 PM`), so the shared protocol's Codex-unavailable fallback applied again.

## Codex output

<!-- Paste /codex:adversarial-review stdout verbatim below this line. Do not edit. -->

## Verdict
**request-changes** — all seven round-1 fixes hold (133 tests, `tsc`, `eslint`, `astro build` → 95 pages, all green), but F7's deferral rests on a premise the triage called unverifiable that is in fact verified inside this monorepo: `/institution/nursery-4/` will render a `tel:` link that dials a 19-digit number.

## Round-1 fix verification

| Finding | Fix commit | Sufficient? | Note |
|---|---|---|---|
| F1 | `633f59a` | partial | Plumbing is sound: opt-in per route, only on 404, only when no recognised code was read; the match route's degradation is pinned by its own test. Two gaps. (a) I re-probed today — `GET …/by-source/nursery/4` is still `404` on production, so merging before the backend's `main` ships makes all 95 pages assert "Институцията вече не е в източника. Възможно е да е премахната или преименувана.", a confidently false claim. The real mitigation is still the merge gate, which lives in `VALIDATION.md` §"Not demonstrated" (l.87–110), not in the `REVIEW.md` the triage table cites — no such file exists. (b) `client.ts:74-79` says "Any 404 here is … whatever the body says", but a 404 body of `{"error":"address_not_found"}` is still taken at its word and lands in the unretryable error state. Unreachable against the real backend; the comment overstates the code. |
| F2 | `35385ef` | yes | Correct for every shape of `grouped`: missing group → `?? []`, address wins across groups, `fallbackBasis ??=` preserves the old first-in-group-order result when no address row exists, `null` only when nothing matched. `match_basis` is a closed two-value union in `types.ts:302`, so there is no third basis to mis-bucket, and the guards on `status`/`selectedAddress`/`grouped` are unchanged — no new case returns a context. |
| F3 | `fae2124` | yes | Every render-path site is covered. `InstitutionProfile.tsx` is the only caller that touches a raw `last_seen_at`, and both uses are behind `parseFreshnessDate`. The other chain is already safe: `results.ts:55-71` skips `NaN` itself and `shouldShowStaleBanner`/`SearchExperience` only ever pass a `Date | null`. Residual: `isSnapshotStale`'s signature is still `Date | string` and `toUtcStartOfDay` still throws, so the invariant is held by callers rather than by the type — narrowing it to `Date` would close it permanently. |
| F5 | `735fbe7` | yes — verified against real data | All 95 live `source_url` values from `GET /api/institutions` are absolute https (83 `dg.uslugi.io`, 12 `newkg.uslugi.io`); every fixture-server `source_url` is absolute https; the scraper writes absolute page URLs into a `String(512)` column. **No valid production `source_url` is dropped.** `normalizeExternalUrl` differs from `normalizeWebsiteUrl` only in refusing to complete a bare host, which is the right call here. See N2 for the one criterion this shifts. |
| F6 | `07bb19d` | yes | `Object.hasOwn` is the right guard. The only other bare record lookup over a union is `receptionKindLabels` (`kinds.ts:11`). Two of its three call sites are safe by construction (the local `receptionKindOrder` const; the manifest `kind`, validated against `KIND_ORDER` by the generator). The third, `institution.institution_kind` at `SearchResults.tsx:216`, is live data — but an unknown kind there renders a *blank* label and no link, because React drops an `undefined` child, so it cannot reproduce the "район undefined" class. `NOT_FOUND_MESSAGES` is keyed by a closed local union. Nothing else. |
| F9 | `8770682` | yes | `--tone` is declared on `.result-group` (`index.astro:396-405`) and inherits to `.result-card`; it is the same custom property `.result-card:hover`'s shadow reads at `index.astro:587`. Resolves per kind for all three groups. |
| F10 | `7ac1c3a` | yes | Name now matches the assertion, and the assertion widened to the whole result. |

## Triage pushback

**F7 (defer) — wrong, and it is now demonstrable.** The rationale is "no real `phone` values were sampleable". They are, one directory over. `scraper/tests/test_source_jasla.py:28` carries `LIVE_JASLA_ROW`, commented *"Verbatim row from the live `jasla` reception (DZ_ID 4), captured 2026-09-15"*, with `TEL: "\t052 820758 0885665404"`; `source.py:43-46` states the contract explicitly — *"`phone` keeps every separator the source packs into `TEL` — slashes included — so multiple numbers survive"*; `test_source.py:222-232` pins five real shapes under ids `single`, `tab-separated`, `double-space`, `slash-separated`, `leading-tab`; `backend/src/yasli/ingest/pipeline.py:348` and `routes/institutions.py:373` pass `phone` through verbatim. DZ_ID 4 is `nursery/4` — a real manifest row with a built page and its own fixture profile. So on `/institution/nursery-4/` the link text reads `052 820758 0885665404` and the href is `tel:0528207580885665404` (checked: `"052 820758 0885665404".replace(/\s+/g,"")`). The slash form gives `tel:0885/665-940052/820-764`. The premise is verified; the fix is small (link the first parsed number, render the remainder as plain text) and the field is the page's primary action. I'd move this to *fix*.

**F4 (reject) — the call stands, but the stated ground is not the one in the doc.** The DECISIONS.md entry rejects Option 2 (*an empty `<h1>`, name only after a fetch*); it says nothing about reconciling the heading post-load, so "reintroduces the content shift that Decision avoids" is an argument the Decision does not actually make. One angle round 1 did not raise: the result card shows the *live* name while the page shows the *manifest* name, so after a rename the parent clicks "ДГ №14 Нова" and lands on a heading reading "ДГ №14 Дружба" — the mismatch is between two screens, not just within one. Not asking for a change given the author confirmed; asking that the rationale be restated honestly as "accepted drift per PLAN § Risks".

**F8 (defer) — agreed.** Inherent to the pattern chosen in VALIDATION.md, and the mitigation is new interaction behaviour.

## New findings

### N1 — The fixture server documents a guard `633f59a` removed
**Severity:** low
**File:** `scripts/fixture-server.mjs:336-337`
**What:** The comment above the by-source 404 reads *"Byte-exact, like S8: the client maps a 404 to `institution_not_found` only when the body is exactly `{"error":"institution_not_found"}`."* Since `633f59a` that is false for this route — `getInstitutionBySource` passes `notFoundFallback: "institution_not_found"`, so **any** 404 body maps.
**Why it matters:** Same defect class as F10, and on the one route whose behaviour just changed. A reader validating scenario D1 will believe the byte-exact body is load-bearing and will not think to test FastAPI's `{"detail":"Not Found"}` — which is precisely the body production returns today. The match-route comment forty lines below is still correct, so the two read as one consistent rule when they are now different rules.
**Suggested direction:** Say that by-source maps any 404 and that the byte-exact body is what the real backend sends, keeping the S8 note as the contrast.

### N2 — A non-manifest card with an unusable `source_url` is now affordance-free
**Severity:** low
**File:** `src/components/SearchResults.tsx:231`
**What:** `735fbe7` changed the guard to `hasPage || !sourceUrl ? null : …`. A card that is absent from the manifest *and* whose `source_url` fails `normalizeExternalUrl` now renders no link at all.
**Why it matters:** PLAN.md's acceptance criterion states "A result absent from the manifest is not a link and keeps 'Источник' as its only affordance, **so no card is a dead end**". That invariant is no longer enforced by the code. **I cannot demonstrate a failure with real data** — all 95 production `source_url` values are absolute https, so the branch is unreachable today; this is criterion drift, not an observable bug.
**Suggested direction:** Either amend that criterion to "keeps 'Източник' when the source URL is usable", or render the raw value as non-linked text so the card still names its source.

## Triage

| # | Finding | Severity | Verdict | Rationale | Commit |
|---|---------|----------|---------|-----------|--------|
| 1 | F7 pushback: multi-value `phone` is verified real data, not an unverifiable premise | high | fix | Overturns round-1 #7's `defer`. Confirmed independently: `scraper/tests/test_source_jasla.py:41` carries the verbatim live `TEL` for DZ_ID 4 — `"\t052 820758 0885665404"` — and `nursery/4` is a real manifest row with a built page. `"052 820758 0885665404".replace(/\s+/g,"")` gives `tel:0528207580885665404`; the slash shapes give `tel:0885/665-940052/820-764` and `tel:052/613039/052/613040`. The scraper deliberately preserves separators (`source.py:43-46`) and five shapes are pinned in `test_source.py:222-232`, so this is contractual, not incidental. Round-1 #7 is reclassified `fix` and its Linear follow-up (YAS-22) closed as done-here. |`701c674` |
| 2 | F4 pushback: the rejection rationale cites an argument `DECISIONS.md` does not make | low | fix | Correct — the "Static header" Decision rejects Option 2 (an empty `<h1>`, name only after a fetch); it says nothing about reconciling the heading post-load, so the content-shift argument was mine, not the document's. The rejection itself stands on `PLAN.md` § Risks, which accepts stale names outright. Round-1 #4's rationale is restated to cite only that, and the cross-screen angle the reviewer added is recorded. |docs — amended in `round-1.md` |
| 3 | N1: the fixture server's comment documents a byte-exact guard that `633f59a` removed | low | fix | Same defect class as #1.10, on the one route whose behaviour just changed, and it would send a reader validating D1 away from the exact body production returns. `client.ts`'s own comment overstates the code the same way and is corrected with it. |`3aeb868` |
| 4 | N2: a non-manifest card whose `source_url` fails normalization now has no affordance | low | fix | `735fbe7` introduced this, and it drops `PLAN.md`'s "so no card is a dead end" invariant. Unreachable with today's data — all 95 production values are absolute https — but the plan record is immutable here, so the code moves to meet the criterion rather than the criterion being quietly relaxed. |`92382dd` |
| 5 | F3 residual: `isSnapshotStale` still accepts `Date \| string` and `toUtcStartOfDay` still throws | low | reject | The reviewer marks the fix itself sufficient and this a type-level hardening: every caller now passes a `Date` or is already NaN-guarded (`results.ts:55-71`), so no runtime path can reach the throw. Narrowing the signature would edit `results.ts` and three test call sites for no behaviour change — out of scope for a review branch. | |
