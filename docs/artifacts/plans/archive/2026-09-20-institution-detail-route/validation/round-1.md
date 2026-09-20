# Adversarial Validation — Round 1

**Run:** 2026-09-16 03:47 UTC
**Plan:** institution-detail-route
**Status at start:** draft
**Reviewer:** Codex (`/codex-local:adversarial-review --wait --scope working-tree`)

## Codex output

<!-- Paste /codex:adversarial-review stdout verbatim below this line. Do not edit. -->

# Codex Adversarial Review

Target: working tree diff
Verdict: needs-attention

Do not execute this plan yet. Two acceptance gates are impossible as written, final validation can corrupt the production manifest, and the static-route design lacks protection against backend drift.

Findings:
- [high] Real-backend contact acceptance cannot pass with known production data (docs/artifacts/plans/institution-detail-route/PLAN.md:194-196)
  Verdict: apply — PLAN requires kindergarten/46 to render contacts from the deployed backend, while RESEARCH.md:111-112 states production contacts remain NULL until a separate scraper rollout. TASK-006 correctly renders an empty-contact state, so backend phase 1.3 may ship successfully while this phase remains permanently unvalidatable.
  Recommendation: Update PLAN.md, DECISIONS.md, TASK-006 and TASK-009: either add the contact-data scraper rollout as a hard dependency or accept the real empty-contact state and validate populated contacts only through fixtures.
- [high] TASK-004 requires an existing schema to remain unchanged while enriching it (docs/artifacts/plans/institution-detail-route/tasks/TASK-004-gate-on-backend-1-3-regenerate-the-api-types.md:31-37)
  Verdict: apply — the new fields must be added to the existing InstitutionDetail used by /api/institutions/{institution_id}, but the gate requires all six existing paths and their schemas to be unchanged. Regenerated types therefore cannot satisfy both conditions even for a fully backward-compatible backend implementation.
  Recommendation: Change TASK-004 to preserve existing operations and prohibit removals or incompatible changes while explicitly permitting the expected additive InstitutionDetail fields and new by-source operation.
- [high] Final validation can overwrite the production manifest with fixture rows (docs/artifacts/plans/institution-detail-route/tasks/TASK-009-final-validation.md:22-43)
  Verdict: apply — the matrix runs the fixture server on localhost:8000, then invokes npm run institutions:manifest twice without YASLI_INSTITUTIONS_URL. The generator defaults to that same localhost endpoint, so validation can replace the committed production manifest with the fixture's small synthetic list, invalidating prior page-count and route evidence.
  Recommendation: Update TASK-009 to stop fixtures and pass the deployed production URL explicitly for both runs, fail on unexpected manifest changes, and repeat the backend-off build/page-count checks afterward.
- [high] New backend institutions will produce result-card links to static 404s (docs/artifacts/plans/institution-detail-route/PLAN.md:167-175)
  Verdict: apply — search results are fetched dynamically, but detail routes exist only for entries captured in a manually generated manifest that never runs in CI. The drift mitigation covers renamed and removed institutions but not additions; any institution introduced after the last frontend build will immediately receive a Детайли link whose static route does not exist.
  Recommendation: Revise PLAN.md, DECISIONS.md, TASK-001, TASK-008 and TASK-009 with an enforceable refresh/redeploy cadence or a manifest-membership guard that prevents emitting broken links; test an API result absent from the manifest.
- [medium] Retry handling has an unaddressed stale-response race (docs/artifacts/plans/institution-detail-route/tasks/TASK-006-build-the-institutionprofile-island-with-every-state-and-section.md:20-31)
  Verdict: apply — the island is specified to issue requests from an effect and let the error button call onRetry, but it defines no abort, request generation, loading transition, or retry disabling. Rapid retries can overlap; an older failure completing after a newer success can restore the error state and misrepresent available data.
  Recommendation: Update TASK-006 and TASK-009 to serialize or abort superseded requests, ignore stale completions, disable retry while loading, and test out-of-order retry responses.
- [medium] Scraped website values are rendered without a safe-scheme boundary (docs/artifacts/plans/institution-detail-route/tasks/TASK-006-build-the-institutionprofile-island-with-every-state-and-section.md:41-67)
  Verdict: apply — website is an arbitrary nullable string in the current scraper/backend contract, yet the plan accepts any existing scheme and renders it as href. Malformed or hostile schemes can create unsafe or broken outbound controls; the validation checks target/rel/marker but not the URL protocol.
  Recommendation: Update TASK-002 or TASK-006, PLAN.md and TASK-009 with a tested URL normalizer that allows only http/https, treats invalid values as absent, and covers javascript, data, protocol-relative and malformed inputs.

Next steps:
- Resolve the backend/contact dependency before treating phase 1.1 as executable.
- Correct TASK-004 and TASK-009's contradictory or destructive gates.
- Choose an explicit operational strategy for manifest additions before adding links to every dynamic result.
- Add retry-race and outbound-URL cases to the task-level acceptance criteria.

## Triage

| # | Finding | Severity | Verdict | Rationale | Applied to |
|---|---------|----------|---------|-----------|------------|
| 1 | Real-backend contacts acceptance unverifiable (contacts NULL in production) | med | apply | Premise is a stale research line: scraper epic 01 is `done` and its acceptance shows all 77 institutions carry `phone`/`email`/`director` in the production snapshot, which backend 1.1 ingests; 1.3 only exposes them. Corrected the fact and made TASK-004's gate prove non-null contacts end to end. | RESEARCH.md:Architecture Facts, TASK-004 |
| 2 | TASK-004 requires pre-existing schemas unchanged while 1.3 enriches `InstitutionDetail` | med | apply | Real wording contradiction — the id route shares the detail schema, so "schemas unchanged" cannot hold; reworded to "additive only: no path/field removed or retyped". | TASK-004 |
| 3 | TASK-009's bare `npm run institutions:manifest` overwrites the production manifest from the fixture server | high | apply | Confirmed: `scripts/fixture-server.mjs:190` serves `/api/institutions` on :8000, the script's default URL. User chose to keep the localhost default (mirrors `api:types`) and make every invocation explicit: TASK-009 stops fixtures and passes the prod URL for both runs with a drift/idempotency split; the summary line names the source URL; new Risk. | TASK-009, TASK-001, RESEARCH.md:Useful Commands, PLAN.md:Risks |
| 4 | Institutions added after the manifest run get a "Детайли" link to a static 404 | high | apply | Genuine gap in the drift risk (renames/removals only). User chose the manifest-membership guard: `SearchResults` gets a `pageSlugs` prop built once in `SearchExperience` from the committed JSON; absent pairs render `Източник` only; unit-tested plus an S1 `999999` card for a runtime demo. | TASK-001, TASK-003, TASK-008, TASK-009, PLAN.md:Scope, PLAN.md:Risks, PLAN.md:Acceptance Criteria, DECISIONS.md |
| 5 | Retry has a stale-response race (overlapping requests, older failure overwriting newer success) | med | apply | Real: the island spec named the effect and `onRetry` with no serialisation. Added a `useRef` generation counter (stale completions discarded) and loading-first retry (button unmounts). Not unit-testable under `renderToStaticMarkup`; demonstrated at runtime in TASK-007/TASK-009 D3. | TASK-006, TASK-007, TASK-009 |
| 6 | Scraped `website` rendered as `href` with any scheme | med | apply | Real: the spec only prefixed `https://` when a scheme was missing, so `javascript:`/`data:` would pass through. Added a tested `normalizeWebsiteUrl` (http/https only, else absent) in TASK-002, used by TASK-006; AC and TASK-009 check every href scheme. | TASK-002, TASK-006, PLAN.md:Scope, PLAN.md:Acceptance Criteria, TASK-009 |
