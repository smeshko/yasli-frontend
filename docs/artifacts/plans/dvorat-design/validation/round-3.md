# Adversarial Validation — Round 3

**Run:** 2026-08-02 (reviewer: Codex)
**Plan:** dvorat-design
**Status at start:** draft
**Prior rounds in scope:** validation/round-1.md, validation/round-2.md

## Codex output

<!-- Paste /codex:adversarial-review stdout verbatim below this line. Do not edit. -->

# Codex Adversarial Review

Target: branch diff against main
Verdict: needs-attention

No-ship. The dependency graph is topologically executable in PLAN.md order, but the plan cannot pass its own untouched-test gate, depends on an unversioned input, and contains validation paths that can report success without proving the acceptance criteria.

Findings:
- [high] Required H1 markup makes the untouched-test gate impossible (docs/artifacts/plans/dvorat-design/tasks/TASK-004-restyle-the-home-hero-search-field-and-suggestion-panel.md:16-26)
  TASK-004 requires splitting the headline into spans, but SearchExperience.test.tsx:10 searches the rendered HTML for the contiguous string `Коя е моята градина?`. React inserts tags between those words, so the test must fail even when the planned markup is correct. This blocks TASK-004 and consequently TASK-008.
  Recommendation: Verdict: apply — authorize one semantic test update and exempt it from the blanket test-diff gate. Plan files: PLAN.md, TASK-004, TASK-008.
- [high] TASK-007 still requires an input absent from a clean checkout (docs/artifacts/plans/dvorat-design/tasks/TASK-007-create-in-repo-docs-design-describing-dvorat.md:14-20)
  The approved reference is copied from `../design-concepts/index.html`, which this plan confirms is outside this repository and version control. Its presence in the current parent workspace does not make it available to a clean frontend checkout, so TASK-007 cannot reproducibly create the required shipped reference.
  Recommendation: Verdict: apply — commit an immutable approved reference under the plan’s versioned assets and make TASK-007 consume it. Plan files: PLAN.md, RESEARCH.md, TASK-007.
- [high] Fixture freshness is deterministic only until its timestamps age (docs/artifacts/plans/dvorat-design/tasks/TASK-009-add-a-deterministic-api-fixture-harness-for-runtime-verification.md:34-44)
  The plan calls for committed JSON fixtures while freshness is calculated against the runtime clock (`new Date()` in results.ts). Unless timestamps are generated relative to startup or the clock is frozen, S1 eventually crosses the 14-day threshold and begins rendering S6’s stale banner, contaminating most baseline evidence. This is an inference from the underspecified timestamp strategy.
  Recommendation: Verdict: apply — require relative-at-startup timestamps or an explicitly frozen clock, and assert both absence in S1 and presence in S6. Plan files: TASK-009, TASK-008, SCENARIOS.md.
- [high] S8’s second screenshot cannot prove retry behavior (docs/artifacts/plans/dvorat-design/tasks/TASK-008-final-validation.md:68)
  Clicking `Презареди адресите` calls `retryReferences`, which reloads streets and addresses but leaves `matchState` as `stale`. After loading completes, the result panel is visually unchanged, so the prescribed second screenshot can pass without demonstrating that requests were retried or recovery works.
  Recommendation: Verdict: apply — require network evidence for new streets/addresses requests, switch to S1, and reselect an address to demonstrate recovery. Plan files: TASK-008, TASK-009, SCENARIOS.md.
- [medium] The font rows do not prove the all-page offline criterion (docs/artifacts/plans/dvorat-design/tasks/TASK-008-final-validation.md:48-52)
  PLAN.md requires that no page contact either third-party font host and that both families render locally with the network blocked. TASK-008 checks only “any page” for absent external rows; existing local files in `dist/fonts` do not prove they are used. The smoke string also exists on none of the three routes, so its screenshots require an unspecified mutation and could show a system fallback.
  Recommendation: Verdict: apply — prescribe offline reloads of every route, local font request/computed-face evidence, and a reproducible temporary glyph-injection method with a clean-diff check. Plan files: TASK-001, TASK-008.

Next steps:
- Apply the five plan corrections, then perform a fourth pass against the revised evidence matrix.

## Triage

Verified before triage:

- `SearchExperience.test.tsx:10` is `expect(html).toContain("Коя е моята градина?")`
  — a contiguous string that cannot survive the H1 being split into spans.
- `src/lib/search/results.ts:75` defaults `comparisonDate` to `new Date()`, so
  committed fixture timestamps age past the 14-day threshold.
- `retryReferences` (`SearchExperience.tsx:136`) clears the reference cache and
  reloads streets/addresses; it does not touch `matchState`, so the stale panel
  is unchanged after a retry.
- `assets/approved-concepts.html` did not exist; the reference lived only in the
  untracked parent workspace.

| # | Finding | Severity | Verdict | Rationale | Applied to |
|---|---------|----------|---------|-----------|------------|
| 1 | The H1 span split makes the "no test edits" gate unsatisfiable | high | apply | Confirmed at `SearchExperience.test.tsx:10`. Carved out exactly one permitted assertion change, tightened so it cannot be loosened into a meaningless substring match. | PLAN.md:Acceptance, TASK-004 |
| 2 | TASK-007 reads an input a clean checkout does not have | high | apply | Confirmed. The approved concept is now committed at `assets/approved-concepts.html` and TASK-007 consumes that. | PLAN.md:Scope, PLAN.md:Decisions, TASK-007, +assets/approved-concepts.html |
| 3 | Frozen fixture timestamps drift into the stale banner | high | apply | Confirmed against `results.ts:75`. Timestamps must be startup-relative; added an explicit S1 anti-regression row. | TASK-009, TASK-008 |
| 4 | S8's second screenshot cannot prove retry behaviour | high | apply | Confirmed: `retryReferences` leaves `matchState` stale, so the panel is visually identical. Replaced with network evidence plus a recovery path. | TASK-008, TASK-009 |
| 5 | Font rows do not prove the offline, all-page criterion | med | apply | Confirmed: the smoke string is not page content, and absent remote rows do not prove local faces are in use. Added per-route offline reloads, `document.fonts.check`, and a reproducible injection method with a clean-tree check. | TASK-008 |

## Round cap

The shared protocol caps validation at three rounds and asks the operator to
decide when a third round still yields action rows. This run was explicitly
authorised to proceed without interruption, so the call was made here:

- All five findings were verified against source and applied.
- The findings narrowed across rounds — round 1 was structural (unversioned
  targets, missing scope), round 2 was contract-level (API shapes, dependency
  metadata), round 3 was evidence methodology. Nothing in round 3 changed the
  plan's shape, task list or sequencing.
- Continuing to a fourth round would refine verification prose, not the plan.

Validation closed after round 3.
