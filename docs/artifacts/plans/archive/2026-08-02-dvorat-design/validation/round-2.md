# Adversarial Validation — Round 2

**Run:** 2026-08-02 (reviewer: Codex)
**Plan:** dvorat-design
**Status at start:** draft
**Prior rounds in scope:** validation/round-1.md

## Codex output

<!-- Paste /codex:adversarial-review stdout verbatim below this line. Do not edit. -->

# Codex Adversarial Review

Target: branch diff against main
Verdict: needs-attention

No-ship: the revised plan contains a self-blocking validation gate, inconsistent dependency metadata, and fixture scenarios that cannot prove the promised runtime behavior against the real client contract.

Findings:
- [high] TASK-008 requires itself to be complete before it can run (docs/artifacts/plans/dvorat-design/tasks/TASK-008-final-validation.md:16-18)
  The first gate requires every task checkbox in PLAN.md to be ticked, but PLAN.md includes TASK-008 itself. A literal or automated executor cannot begin final validation until final validation is already complete.
  Recommendation: Apply — change the gate to “all prior tasks”; plan files: TASK-008-final-validation.md.
- [high] S7 cannot produce the claimed retry state (docs/artifacts/plans/dvorat-design/tasks/TASK-009-add-a-deterministic-api-fixture-harness-for-runtime-verification.md:35-37)
  S7 makes `/api/match` return 500, which sets the result state to `error`; SearchResults renders only an error message for that state. The existing retry control is instead shown when reference-data loading from `/api/streets` or `/api/addresses` fails. TASK-008 can therefore never capture its promised “Error + retry state” from S7.
  Recommendation: Apply — split match-error and reference-data failure/recovery scenarios, then map retry evidence to the latter; plan files: TASK-009-add-a-deterministic-api-fixture-harness-for-runtime-verification.md and TASK-008-final-validation.md.
- [high] S6-S8 are not deterministically addressable through the real API contract (docs/artifacts/plans/dvorat-design/tasks/TASK-009-add-a-deterministic-api-fixture-harness-for-runtime-verification.md:27-39)
  TASK-009 says every scenario is reachable through a fixed address prefix, but S6-S8 define no addresses and scenario selection is separately delegated to an environment variable. TASK-008 starts the server once and provides no restart or selection commands. Additionally, staleness comes from `/api/institutions` list items, while S8 reaches the stale-address path only with HTTP 404 and exactly `{ "error": "address_not_found" }`; the generated match types do not describe that 404 extension. A conforming-looking fixture can therefore yield fresh data or a generic error instead of the intended states.
  Recommendation: Apply — define each scenario's address ID, endpoint/status/body matrix, CORS headers, and exact launch/reload procedure, including old `/api/institutions` data for S6 and the precise 404 body for S8; plan files: TASK-009-add-a-deterministic-api-fixture-harness-for-runtime-verification.md and TASK-008-final-validation.md.
- [medium] TASK-005 can execute before its required fixture harness (docs/artifacts/plans/dvorat-design/tasks/TASK-005-restyle-results-filters-group-headings-cards-and-empty-states.md:1-4)
  PLAN.md makes TASK-005 depend on TASK-004 and TASK-009, while TASK-005's authoritative header lists only TASK-004. Following the task file permits TASK-005 to reach its required result-state screenshots before the deterministic backend exists, recreating the round-1 reproducibility failure.
  Recommendation: Apply — add TASK-009 to TASK-005's dependency header and keep PLAN.md synchronized; plan files: TASK-005-restyle-results-filters-group-headings-cards-and-empty-states.md and PLAN.md.
- [medium] TASK-008 still accepts evidence that does not prove required behavior (docs/artifacts/plans/dvorat-design/tasks/TASK-008-final-validation.md:44-62)
  PLAN.md requires mouse autocomplete and unchanged nav behavior. TASK-008 proves mouse behavior only with a hovered-row screenshot, which does not exercise selection, and proves nav behavior only by grepping `showNav = false`, which cannot detect changed nav markup or interaction. Both regressions could ship with every matrix row marked complete.
  Recommendation: Apply — require mouse click-through evidence ending in results and a nav markup diff plus temporary enabled-state runtime check; plan files: TASK-008-final-validation.md.

Next steps:
- Remove TASK-008's self-prerequisite and synchronize TASK-005 dependencies.
- Redesign S6-S8 and the retry scenario around the exact client endpoint contracts.
- Replace hover/grep-only evidence with checks that exercise the required behavior.

## Triage

Verified against `src/lib/api/client.ts` and `src/components/SearchResults.tsx`
before triage:

- `requestJson` maps a non-ok response to `address_not_found` **only** when the
  status is exactly 404 *and* the parsed body is `{"error":"address_not_found"}`
  (`client.ts:113-126`). Any other failure becomes `http_error`.
- Endpoints in use: `/api/streets`, `/api/addresses`, `/api/institutions`,
  `/api/match?address_id=<n>`.
- `SearchResults` renders a retry **button** for `status === "stale"` only
  (`Презареди адресите`). A `status === "error"` renders message text with no
  control. The other retry (`Опитайте пак`) belongs to the reference-data
  panel in `SearchExperience`, which fails on `/api/streets` or
  `/api/addresses` — not on `/api/match`.
- Staleness is derived from `last_seen_at` on `/api/institutions` items
  (`newestFreshnessDate`), not from the match response.
- The dev server runs on `:4321` and the fixture server on `:8000`, so the
  harness needs CORS headers or every request fails as `network_error`.

| # | Finding | Severity | Verdict | Rationale | Applied to |
|---|---------|----------|---------|-----------|------------|
| 1 | TASK-008's first gate requires TASK-008 itself to be ticked | high | apply | Literally unsatisfiable; the gate must read "all prior tasks". | TASK-008 |
| 2 | S7 (`/api/match` 500) cannot produce the promised retry control | high | apply | Confirmed: match errors render text only. Retry lives on reference-data failure and on the stale-address state. Scenario split in two. | TASK-009, TASK-008 |
| 3 | S6-S8 are not deterministically reachable through the real contract | high | apply | Confirmed: no address ids, no endpoint/status/body matrix, no CORS, and S8 needs an exact 404 body the generated types do not describe. | TASK-009, TASK-008 |
| 4 | TASK-005's header dependency disagrees with PLAN.md | med | apply | PLAN says `TASK-004,TASK-009`; the task header says `TASK-004`. The task file is what an implementer reads. | TASK-005 |
| 5 | Hover-only mouse evidence and grep-only nav evidence prove nothing | med | apply | A hovered row does not exercise selection; `grep showNav` cannot detect changed nav markup. Both replaced with behavioural checks. | TASK-008 |
