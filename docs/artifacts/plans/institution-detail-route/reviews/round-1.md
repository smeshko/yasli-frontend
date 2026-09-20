# Adversarial Review — Round 1

**Run:** 2026-09-19 07:25 UTC
**Branch:** feature/yas-11-institution-detail-route
**Base:** staging
**Commits reviewed:** f3b883e..2e3eb7d
**Reviewer:** subagent (`general-purpose`, adversarial framing) — Codex was usage-limited at run time (`You've hit your usage limit … try again at 12:04 PM`), so the shared protocol's Codex-unavailable fallback applied.

## Codex output

<!-- Paste /codex:adversarial-review stdout verbatim below this line. Do not edit. -->

## Verdict
**request-changes** — the branch is well-built, but merging it today regresses the live search screen (F1), and the "serves your address" line can state the wrong match basis for exactly the kindergartens the feature is aimed at (F2).

## Summary
This is unusually disciplined work: the state machine is complete, state is genuinely decided in effects (SSR/hydration agree), the retry race is extracted and deterministically tested, and `normalizeWebsiteUrl` is actually sound — I tried tab/NUL/backslash/protocol-relative smuggling and it holds. The manifest-in-the-search-bundle call is fine at 95 rows (10.8 KB raw); the design concern is not its size but that a *build-time* snapshot is used to gate links against *live* results, and the drift cases resolve to a wrong page rather than a designed state (F1, F4). The biggest risk is deployment ordering: production returns `404 {"detail":"Not Found"}` for `by-source` right now, and the branch both links every card into those pages and removes the one affordance that still worked.

## Findings

### F1 — Merging before the backend deploys turns 95 working cards into dead pages
**Severity:** high
**File:** src/components/SearchResults.tsx:226, src/lib/api/client.ts:148
**What:** I probed the deployed backend: `GET https://yasli-backend-production.up.railway.app/api/institutions/by-source/kindergarten/46` → `404 {"detail":"Not Found"}`. `readNotFoundCode` only accepts a byte-exact `{"error":"institution_not_found"}` body, so FastAPI's route-level 404 falls through to `http_error` → the island renders the **error-with-retry** state, not the designed not-found state. Meanwhile `hasPage ? null : (…Източник…)` removes the source link from every linked card.
**Why it matters:** On merge, a parent clicks any of the 95 in-manifest cards → lands on a page whose body is permanently "Не успяхме да заредим данните за институцията." with a retry button that can never succeed, and the card they came from no longer offers "Източник". Today those cards work. VALIDATION.md records the deploy gap under "Not demonstrated", but does not draw the conclusion that the frontend must not ship first.
**Suggested direction:** Gate the merge on the backend's `main` carrying 1.3, or make the link guard runtime-aware (e.g. treat a non-`institution_not_found` 404 as "route unavailable" and fall back to the source link) so the card is never worse than it is on `staging`.

### F2 — The context line reports the *district* basis for a kindergarten that matched the exact address
**Severity:** high
**File:** src/lib/search/storedSearch.ts:74-79
**What:** `findStoredMatchContext` walks groups in `receptionKindOrder` (nursery first) and returns the first row whose `institution_kind`/`external_id` match. A kindergarten with an infant group appears twice in one match response — once as a `standard` row under `kindergarten` (`match_basis: "address"`) and once as an `infant_group` row under `nursery` (`match_basis: "district"`). The nursery group is walked first, so the district row wins.
**Why it matters:** Parent searches `ул. Преслав 012`, the search screen shows ДГ№5 „Слънчо“ under **Детска градина** as an address match, they click the card, and the detail page says *"Във вашия район — търсихте ул. Преслав 012. Съвпадението е по район, не по точен адрес."* — the opposite of what the search just told them, for the institution that actually serves their address. `storedSearch.test.ts:132` pins this as intended ("the first row in group order"), so the suite re-states the bug instead of catching it. The `offering` component in the card React key (`SearchResults.tsx:187`) confirms the duplicate-row case is real.
**Suggested direction:** Prefer `match_basis === "address"` over `"district"` across all matching rows rather than taking the first in group order, and flip the test to assert the address basis.

### F3 — A malformed `last_seen_at` throws during render and destroys the island
**Severity:** medium
**File:** src/components/InstitutionProfile.tsx:116, src/lib/domain/freshness.ts:16
**What:** `isSnapshotStale` is called during render and `toUtcStartOfDay` throws `Error("snapshot freshness date must be valid")` on an unparsable value; `formatFreshnessDate(new Date(...))` (line 134) throws `RangeError` on the same input. I confirmed the throw by rendering the view with `last_seen_at: "not-a-date"`. There is no error boundary around the island.
**Why it matters:** The schema types `last_seen_at: string` with no format guarantee. One row with `""`, a non-ISO date, or a null that survives serialization → the state update after a successful fetch throws in the commit render, React tears down the island root, and the page shows the manifest header with **nothing below it** — no error, no retry, no way back. The whole point of the state machine is that every failure mode has a designed state; this one bypasses it.
**Suggested direction:** Validate `last_seen_at` where the profile enters the component (treat unparsable as "freshness unknown", suppressing the banner and the line) rather than throwing from a render-path helper.

### F4 — A renamed institution shows the old name in `<h1>` and `<title>` while the island holds the new one
**Severity:** medium
**File:** src/pages/institution/[slug].astro:39
**What:** The heading, `<title>` and the eyebrow number come from the committed manifest and are never reconciled with `profile.name`, which the island fetches and then ignores.
**Why it matters:** The source renames ДГ№14 „Дружба“; the manifest is not regenerated (it never is in CI). Every visitor, and every share of that URL, sees the stale name as the page's `<h1>` sitting directly above live address/contacts for the renamed entity — two sources of truth disagreeing on one screen, with nothing marking which is current. PLAN.md Risks accepts "shows a stale name", but the island already has the correct value in hand, which makes accepting it a harder sell than it was at planning time.
**Suggested direction:** Once the profile loads, render `profile.name` as the heading (the manifest name stays the prerendered placeholder), so the static HTML is still meaningful for sharing but the live page never contradicts itself.

### F5 — `source_url` reaches an `href` unchecked, while `website` is normalized
**Severity:** medium
**File:** src/components/InstitutionProfile.tsx:137, src/components/SearchResults.tsx:228
**What:** Both values come from the same scraped pipeline, but only `website` goes through `normalizeWebsiteUrl`. `source_url` is passed straight into `<a href={...} target="_blank">`. React 19 neutralizes `javascript:` specifically (I verified: it rewrites it to a throwing stub), but it does not touch `data:`, `blob:`, `vbscript:`, `ftp:`, `file:` or a relative value.
**Why it matters:** PLAN.md's acceptance criterion says *every* outbound link has an `http:`/`https:` href; that is enforced for one field and assumed for the other. A `source_url` that is relative or scheme-less silently becomes a same-origin link into the site; the test at `InstitutionProfile.test.tsx:329` only proves the rule holds for a fixture whose `source_url` is already https.
**Suggested direction:** Run `source_url` through the same normalizer in both components and drop the link when it fails, so the criterion is enforced by code rather than by fixture choice.

### F6 — An unknown district code renders "Яслата обслужва район undefined."
**Severity:** medium
**File:** src/lib/domain/districts.ts:15
**What:** `labelForDistrict` is a bare record lookup with no fallback. I rendered a nursery with `district_code: "06"` and got exactly `Яслата обслужва район undefined.`
**Why it matters:** The `"01"…"05"` union is compile-time only and comes from a committed generated file. The backend adding a district code, or a data row carrying one, produces a Bulgarian sentence with the English word `undefined` on a live page — and `nurseryDistrictUnknown` ("Районът на яслата не е потвърден в източника.") already exists as the correct answer for exactly this case.
**Suggested direction:** Make `labelForDistrict` return `null` for an unknown code and route that through the existing unconfirmed-district copy.

### F7 — Scraped `phone`/`email` become `tel:`/`mailto:` with only whitespace removed
**Severity:** low
**File:** src/components/InstitutionProfile.tsx:174, src/components/InstitutionProfile.tsx:182
**What:** `tel:${phone.replace(/\s+/g, "")}` and `mailto:${email}`. A field holding two numbers (`052 612 345 / 052 612 346`) yields `tel:052612345/052612346`; a `;` separator yields `tel:052612345;052612346`, where `;` is the RFC 3966 parameter delimiter. A two-address `email` yields a `mailto:` with a comma-joined list.
**Why it matters:** The phone is the one thing a parent taps from the page, and a malformed `tel:` either fails or dials the wrong number with no visible cue — the link text still reads correctly. **Premise unverified:** I could not sample production `phone` values, because the deployed backend still serves the pre-1.3 detail contract (same blocker as F1), and no test or research note covers multi-value fields.
**Suggested direction:** Before shipping, sample the real `phone`/`email` column for separators; if they occur, link only the first parsed value and render the rest as plain text.

### F8 — The stretched card overlay makes every linked result card's text unselectable
**Severity:** low
**File:** src/pages/index.astro:304
**What:** `.result-card .card-link::after { position: absolute; inset: 0 }` covers the full card, including the name.
**Why it matters:** A parent cannot select and copy an institution's name from the search results any more — dragging across the card starts a link drag instead. The staging behaviour (a plain `<article>` with a separate link) allowed it. VALIDATION.md's "keyboard and middle-click behave like any link" is accurate, but text selection was not among the checks.
**Suggested direction:** Either accept it explicitly in the plan record, or use the common mitigation of cancelling navigation when a selection exists on `click`.

### F9 — The card focus ring is hardcoded to the nursery hue on every group
**Severity:** low
**File:** src/pages/index.astro:316
**What:** `.result-card:has(.card-link:focus-visible) { outline: 2px solid var(--color-section-nursery) }`, while the card already resolves `--tone` per group (used by `.result-card:hover`'s shadow at index.astro:585).
**Why it matters:** Tabbing through results gives kindergarten and preschool cards a nursery-coloured ring that clashes with their own hover shadow — a new inconsistency introduced by this diff in the very affordance the plan added focus rules to protect.
**Suggested direction:** Use `var(--tone)`, as the hover shadow does.

### F10 — A test's name asserts the opposite of its assertion
**Severity:** low
**File:** src/lib/api/client.test.ts:173
**What:** `it("does not map an address_not_found body on the institution route")` then asserts `result.error.code` **is** `"address_not_found"`.
**Why it matters:** `readNotFoundCode` accepts both codes on any route, so the title describes a guard that does not exist. A future reader grepping for route-scoped error mapping will believe it is covered; the behaviour is currently harmless only because the island maps anything but `institution_not_found` to the error state.
**Suggested direction:** Rename the test to describe what it pins, or scope `readNotFoundCode` to the codes each route can actually return.

## Triage

<!--
Verdict values:
  fix    — real bug; address now in this branch
  defer  — has merit but out of scope; capture as a follow-up
  reject — contradicts an explicit Decision in PLAN.md, or is taste/speculation
-->

| # | Finding | Severity | Verdict | Rationale | Commit |
|---|---------|----------|---------|-----------|--------|
| 1 | Production `by-source` 404 maps to the unretryable error state, not the designed not-found state | high | fix | Verified against the deployed backend. Any 404 on the institution route now renders the not-found state with a way back. The merge gate (backend `staging`→`main` first) is recorded in REVIEW.md; restoring "Източник" on linked cards was declined — it reverses VALIDATION.md's "Result cards navigate as a whole". |`633f59a` |
| 2 | `findStoredMatchContext` returns the district-basis row for a kindergarten that matched by address | high | fix | Real: a kindergarten with an infant group appears in both the nursery and kindergarten groups, and nursery is walked first. The page then contradicts the search screen for exactly the institution that does serve the address. |`35385ef` |
| 3 | A malformed `last_seen_at` throws in render and tears down the island | med | fix | Bypasses the state machine entirely — the page is left with a header and nothing below it. `last_seen_at` is typed `string` with no format guarantee. |`fae2124` |
| 4 | `<h1>`/`<title>` keep the manifest name after the island loads the live one | med | reject | Accepted drift: `PLAN.md` § Risks names "an institution renamed or removed from the source after the manifest was generated shows a stale name" outright, with `npm run institutions:manifest` plus a redeploy as the documented re-sync. Confirmed with the plan author. *(Restated after round-2 pushback: the original rationale also claimed the "Static header from the manifest plus an island" Decision rules out a post-load swap. It does not — that Decision rejects rendering the name only after a fetch, and is silent on reconciling afterwards. The rejection rests on the accepted Risk alone. Round 2 added that the stale name is visible across two screens, not one: the result card shows the live name and the page shows the manifest name. Recorded, not acted on.)* | |
| 5 | `source_url` reaches an `href` unchecked while `website` is normalized | med | fix | `PLAN.md`'s acceptance criterion says *every* outbound link has an http(s) href; it was enforced by fixture choice, not by code, for `source_url`. Same scraped pipeline as `website`. |`735fbe7` |
| 6 | An unknown `district_code` renders "Яслата обслужва район undefined." | med | fix | The code union is compile-time only over a generated file; `nurseryDistrictUnknown` already exists as the right answer for this case. |`07bb19d` |
| 7 | Multi-value `phone`/`email` produce malformed `tel:`/`mailto:` hrefs | ~~low~~ high | ~~defer~~ **fix** | **Reclassified after round-2 pushback (round-2 #1).** The original rationale — that no real `phone` values were sampleable because the deployed backend predates 1.3 — was wrong: the data is in this monorepo. `scraper/tests/test_source_jasla.py:41` holds the verbatim live `TEL` for DZ_ID 4 (`\t052 820758 0885665404`), `nursery/4` is a real manifest row with a built page, and the scraper preserves separators by contract with five shapes pinned in its tests. The href was `tel:0528207580885665404`. Fixed here; the Linear follow-up (YAS-22) is closed as done-in-branch. | `701c674` |
| 8 | The stretched card overlay makes result-card text unselectable | low | defer | An inherent cost of the whole-card-link pattern VALIDATION.md deliberately chose; the mitigation (cancel navigation when a selection exists) is a new interaction behaviour with its own edge cases, not a bug fix. Filed as a follow-up. | |
| 9 | The card focus ring is hardcoded to the nursery hue on every group | low | fix | A regression this diff introduced in the affordance the plan added focus rules to protect; `--tone` is already in scope on `.result-card` and used by the hover shadow. |`8770682` |
| 10 | `client.test.ts` test name asserts the opposite of its assertion | low | fix | The title describes a route-scoped guard that does not exist; a misleading test is worse than no test. |`7ac1c3a` |
