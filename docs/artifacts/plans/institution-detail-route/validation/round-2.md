# Adversarial Validation — Round 2

**Run:** 2026-09-16 04:21 UTC
**Plan:** institution-detail-route
**Status at start:** draft
**Reviewer:** Codex (`/codex-local:adversarial-review --wait --scope working-tree`)
**Prior rounds in scope:** validation/round-1.md

## Codex output

<!-- Paste /codex:adversarial-review stdout verbatim below this line. Do not edit. -->

# Codex Adversarial Review

Target: working tree diff
Verdict: needs-attention

Do not execute this plan yet. The round-1 manifest and retry fixes are not verifiable as written, and the chosen navigation design knowingly violates the epic’s direct-visit requirement.

Findings:
- [high] Manifest drift makes the idempotency gate impossible and invalidates earlier evidence (docs/artifacts/plans/institution-detail-route/tasks/TASK-009-final-validation.md:40-45)
  If run 1 changes the tracked manifest, the prescribed second `git diff --quiet` still compares the generated file with the index—not with the post-run-1 output—so it remains non-zero even when generation is perfectly idempotent. Reverting the file before run 2 merely recreates the same drift. Committing a refresh this late also changes the routes after the build, page-count, fixture-slug, and screenshot evidence was collected, allowing final validation to approve a manifest that was never built or exercised.
  Recommendation: Hash or copy the run-1 output, rerun generation, and compare the two outputs directly. Treat live drift separately: require the refresh to be committed, then repeat the backend-off build/page-count check and every fixture check affected by added, removed, or renamed manifest entries.
- [high] Stored search state cannot distinguish result navigation from a direct visit (docs/artifacts/plans/institution-detail-route/DECISIONS.md:84-88)
  The selected design deliberately shows address context on a pasted, bookmarked, or otherwise direct URL whenever the tab retains matching search results. That contradicts the epic criterion that direct visits show no context. Narrowing validation to a fresh private session hides the failure and would let TASK-009 incorrectly mark the epic criterion complete. The claim that the stored result remains “true information” is also unsafe under API or catchment drift because the stored match is not revalidated.
  Recommendation: Add an explicit navigation-provenance marker when “Детайли” is activated, while continuing to derive the address and basis from the existing stored search state. Consume or validate that marker on the detail page, and test a direct visit in the same tab after a matching search—not only a fresh session.
- [medium] The retry-race fix is never exercised (docs/artifacts/plans/institution-detail-route/tasks/TASK-009-final-validation.md:35)
  D3 always returns 500, and retry is only clicked after the first request has completed. The planned evidence therefore proves loading-first behavior and a second request, but it cannot produce overlapping requests or an older failure completing after a newer success—the exact regression the generation counter is meant to prevent. An omitted or broken stale-generation check would pass all specified validation.
  Recommendation: Add a deterministic test or fixture mode with two controllable overlapping requests: resolve the newer request successfully, then resolve the older request as an error, and assert that success remains rendered. Extract the request-generation coordinator for unit testing if the current SSR harness cannot run effects.

Next steps:
- Correct TASK-009’s manifest comparison and rerun requirements.
- Restore the epic’s direct-visit semantics instead of narrowing its acceptance criterion.
- Add deterministic out-of-order request coverage for the retry guard.

## Triage

| # | Finding | Severity | Verdict | Rationale | Applied to |
|---|---------|----------|---------|-----------|------------|
| 1 | Idempotency gate compares run 2 against the index, not run 1; a late refresh invalidates earlier evidence | med | apply | Correct on both counts: `git diff --quiet` cannot prove run-1 == run-2, and a refresh committed after the build/fixture rows would leave those rows exercised against the old file. Row now runs first, uses `shasum` H1 == H2 for idempotency, and on drift commits the refresh and re-checks `SCENARIOS.md` slugs before any other row. | TASK-009 |
| 2 | Same-tab direct visit after a matching search shows the address context, contradicting the epic's "arriving directly shows neither" | med | reject | Contradicts the explicit Decision "Read the existing stored search state", which weighed a click marker (Option 2) and rejected it; surfaced to the user as a vs.-the-request item and they kept the Decision. Clarified rather than narrowed: PLAN.md's criterion now states the same-tab case as designed behaviour and TASK-009 screenshots it (five cases, not three), so validation cannot hide it. | (clarification only) PLAN.md:Acceptance Criteria, TASK-009, DECISIONS.md |
| 3 | The retry-race guard is never exercised: D3 cannot produce overlapping or out-of-order completions | med | apply | Correct — runtime D3 proves loading-first and a second request, not the stale-completion drop. Extracted the guard into a framework-free `createProfileLoader` with a deterministic out-of-order unit test; the island wires it via `useMemo`. | TASK-006, TASK-009 |
