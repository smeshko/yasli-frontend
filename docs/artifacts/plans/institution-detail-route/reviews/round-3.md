# Adversarial Review — Round 3

**Run:** 2026-09-19 11:30 UTC
**Branch:** feature/yas-11-institution-detail-route
**Base:** staging
**Commits reviewed:** f3b883e..3aeb868
**Prior rounds in scope:** reviews/round-1.md, reviews/round-2.md
**Reviewer:** subagent (`general-purpose`, adversarial framing) — Codex remained usage-limited for all three rounds (`try again at 12:04 PM`), so the shared protocol's Codex-unavailable fallback applied throughout.

## Codex output

<!-- Paste /codex:adversarial-review stdout verbatim below this line. Do not edit. -->

## Verdict
**approve-with-comments** — all four round-2 fixes hold (152 tests, `tsc`, `eslint`, `astro build` → 98 pages, all green; manifest verified 95/95 in sync with production, zero name drift), and `contacts.ts` is correct for every phone shape that exists in this monorepo's data; the two remaining items are a doc that still states the guard `633f59a` removed, and a parser edge that I can construct but cannot show occurring.

## Round-2 fix verification

| Finding | Fix commit | Sufficient? | Note |
|---|---|---|---|
| #1 / F7 — multi-value phone | `701c674` | yes — verified against the real corpus | I ran `splitPhone` over every phone-shaped literal in the monorepo. All five shapes pinned at `scraper/tests/test_source.py:222-232` produce the right `dial` (`052/613039`→`052613039`, `0885/665-940 052/820-764`→`0885665940`, `052/613039 / 052/613040`→`052613039`, …); ДЯ № 4's verbatim live `TEL` (`052 820758 0885665404`, `test_source_jasla.py:41`) → `052820758`, not the 19-digit href; `052/740 659` (the other live-derived shape, `test_source.py:190`) → `052740659`. I also ran all 12 `+359 …` values from `backend/scripts/fixtures/overpass_education.json`, including the `;`-joined three-number one — every one is correct. 0700/0800 numbers, `02 9155 555`, 2-digit `вътр.` extensions, trailing `(Иван)`, `;`/`,` separators all resolve correctly. **No throw path**: `present()` guarantees a non-empty trimmed string, and the body is `search`/`match`/string concat only — empty, whitespace, `"няма"`, `"—"`, `"0"` all return `dial: null`. See N2 for the one construction that misfires. |
| #4 / N2 — source named when unlinkable | `92382dd` | yes | `{institution.source_url}` is a React text child — escaped, no `dangerouslySetInnerHTML` anywhere in the branch, and the test asserts `not.toContain("<a ")`. `.card-source-text` is sound at 390px by inspection: `overflow-wrap: anywhere` (not `break-word`) is the variant that shrinks a flex item's automatic minimum size, so a long raw URL inside `display:flex` `.card-actions` wraps instead of overflowing the card. Not screenshot-verified — the branch is unreachable with today's data, which is also why I did not chase it further. |
| #3 / N1 — false comments | `3aeb868` | partial | Both code comments are now accurate against `client.ts:96-98` (`readNotFoundCode(response) ?? (404 ? notFoundFallback : null)`). But the same false claim is still in `docs/ARCHITECTURE.md` — see N1. |
| #2 — F4 rationale restated | docs only | yes | `round-1.md`'s F4 row now rests on PLAN § Risks alone and records the cross-screen angle. Worth noting: the manifest is currently byte-identical to production on all 95 `(kind, external_id, name)` triples, so the accepted drift is at zero today. |

Unchanged from round 2, not a new finding: production's OpenAPI still lists only `/api/institutions/{institution_id}` — there is no `by-source` path and no `phone` field in the detail response. The merge gate on the backend's `main` still stands.

## New findings

### N1 — `ARCHITECTURE.md` still documents the byte-exact 404 guard as a system-wide rule
**Severity:** low
**File:** `docs/ARCHITECTURE.md:57`
**What:** The line added by `ddfaab5` reads: *"`readNotFoundCode` matches that body against a closed list, so a 404 with any other shape stays a generic `http_error` rather than becoming a state the UI treats as authoritative."* `633f59a` made that false for `by-source`, and `3aeb868` corrected the two code comments (`client.ts`, `fixture-server.mjs`) but not this one — which is the copy that states the rule for the whole API layer rather than for one call site.
**Why it matters:** Exactly the defect class of #1.10 and #2.3, in the document a newcomer reads *before* the code. Today `GET /api/institutions/by-source/nursery/4` on production returns FastAPI's `{"detail":"Not Found"}`; the doc says that lands in `http_error`, the code maps it to `institution_not_found`. Anyone reasoning about the deploy gap from the architecture doc reaches the wrong conclusion about what parents will see, and the next person to touch `readNotFoundCode` will believe the closed list is the whole story.
**Suggested direction:** Add the exception where the rule is stated — `by-source` opts into `notFoundFallback: "institution_not_found"`, so any 404 on that route maps; the closed list still governs every other route.

### N2 — `firstWholeNumber` absorbs adjacent digit groups that are not part of the number
**Severity:** low
**File:** `src/lib/domain/contacts.ts:35-64`
**What:** The accumulator takes digit groups left to right and stops only when the *next* group would overflow `max`. Any short group sitting next to a complete number is therefore swallowed rather than treated as a boundary. Two constructions, both run against the real module:
- `"+359 (0)52 613039"` → `dial: "+359052613039"`. The `(0)` trunk prefix is accumulated, giving 12 digits that fit `INTERNATIONAL.max` — a well-formed but undialable international number. The mobile spelling fails the other way: `"+359 (0) 888 123 456"` → `dial: null`, a valid number silently dropped.
- `"052 613039 вътр. 1"` → `dial: "0526130391"` (and `"052 613 039 / 1"` → the same). A 9-digit landline plus a 1-digit extension fits `NATIONAL.max = 10`, so the href dials a different, valid-looking subscriber while the text still reads correctly. `вътр. 12` and longer are handled correctly — only the 1-digit case overflows into the wrong number.

Same root cause as the bug `701c674` fixed, one notch smaller. `splitEmail` has the analogous greediness: `"dg@example.bg."` → `mailto:dg@example.bg.` (the trailing dot is inside `[^\s,;/]+`), and a label with no space, `"имейл:dg@example.bg"`, → `mailto:имейл:dg@example.bg`. No `@`, unicode domains and empty input all behave (`null` / correct, never a throw).
**Why it matters:** The module's own stated contract is that a second number is *"never guessed at in an href"*; these are the cases where it is. A wrong-but-plausible `tel:` is the failure mode the round-2 fix existed to prevent.
**I cannot demonstrate either input occurring.** The dg.uslugi.io `TEL` corpus in this repo contains no `+`, no parentheses and no `вътр.` at all, and production does not yet serve `phone`, so this is constructed, not observed. It is a hardening question, not a live bug — reasonable to defer if you would rather not touch new parsing code again this late.
**Suggested direction:** If taken: treat a `(0)` immediately after `+359` as a trunk prefix to skip, and require the *first* group to look like a prefix (`0` + 1–3 digits) while refusing to append a final group shorter than 2 digits. For the email, trim trailing `.` from the match and anchor the local part on a word boundary.

## Triage

| # | Finding | Severity | Verdict | Rationale | Commit |
|---|---------|----------|---------|-----------|--------|
| 1 | `ARCHITECTURE.md` still states the byte-exact 404 rule that `633f59a` made false for `by-source` | low | fix | Third instance of this defect class in the review (#1.10, #2.3), and the one that states the rule for the whole API layer rather than one call site — the copy a newcomer reads before the code. One paragraph. | `928b146` |
| 2 | `firstWholeNumber` absorbs a `(0)` trunk prefix and a lone trailing extension digit | low | fix | Reproduced all three shapes against the real module: `"052 613039 вътр. 1"` → `tel:0526130391` (a different, valid-looking subscriber), `"+359 (0)52 613039"` → an undialable `+359052613039`, `"+359 (0) 888 123 456"` → `null` for a valid number. A wrong-but-plausible `tel:` is exactly what round-2 #1 existed to prevent, and the module's own contract says a number is never guessed at. Not present in the dg.uslugi.io corpus today — no `+`, no parentheses, no `вътр.` — so this is hardening, not an observed bug; the reviewer offered deferral and the plan author chose to fix. Every previously-correct shape verified unchanged. | `11c0157` |
