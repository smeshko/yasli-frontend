# Validation Summary — institution-detail-route

**Rounds:** 3
**Plan status at validation:** draft
**Run on:** 2026-09-16

## Rounds

| Round | Findings | Applied | Deferred | Rejected |
|-------|----------|---------|----------|----------|
| 1     | 6        | 6       | 0        | 0        |
| 2     | 3        | 2       | 0        | 1        |
| 3     | 0        | 0       | 0        | 0        |

Reviewer: Codex (`/codex-local:adversarial-review --scope working-tree`) in all three rounds. Round 3 verdict: approve, no findings.

## Applied

### Round 1
- `RESEARCH.md:Architecture Facts`, `TASK-004` — the "contacts are NULL in production" line was stale: scraper epic 01 is done and all 77 institutions carry `phone`/`email`/`director` in the production snapshot, which backend 1.1 ingests; the fact is corrected and TASK-004's gate now proves non-null contacts on `by-source/kindergarten/46` (round-1 #1)
- `TASK-004` — "pre-existing schemas unchanged" contradicted the additive detail-schema change the id route shares; reworded to "additive only: no path or field removed or retyped" (round-1 #2)
- `TASK-009`, `TASK-001`, `RESEARCH.md:Useful Commands`, `PLAN.md:Risks` — the fixture server serves `/api/institutions` on the manifest script's default URL; every documented invocation now passes `YASLI_INSTITUTIONS_URL` explicitly, the summary line names the source URL, TASK-009 stops fixtures before the manifest row, and a new Risk records the hazard (round-1 #3)
- `TASK-001`, `TASK-003`, `TASK-008`, `TASK-009`, `PLAN.md:Scope/Risks/Acceptance Criteria`, `DECISIONS.md` — result cards render "Детайли" only for `(institution_kind, external_id)` pairs in the committed manifest (`buildSlugSet` → `pageSlugs` prop), so an institution added after the last manifest run gets no link instead of a link to a static 404; unit-tested plus an S1 `kindergarten/999999` card for the runtime demo; recorded as a fourth Decision (round-1 #4)
- `TASK-006`, `TASK-007`, `TASK-009` — retry race: loading-first retry (button unmounts) and a request-generation guard so a stale completion never overwrites a newer result (round-1 #5)
- `TASK-002`, `TASK-006`, `PLAN.md:Scope/Acceptance Criteria`, `TASK-009` — `normalizeWebsiteUrl` (http/https only; any other scheme, protocol-relative or unparsable value is treated as absent) with a test matrix; the island renders the website row only for a non-null result; TASK-009 checks every `href` scheme on the page (round-1 #6)

### Round 2
- `TASK-009` — the idempotency gate used `git diff`, which compares against the index rather than run 1, and a late manifest refresh would invalidate earlier evidence; the manifest row now runs first, proves idempotency with `shasum` H1 == H2, and on drift commits the refresh and re-checks `SCENARIOS.md` slugs before any other row (round-2 #1)
- `TASK-006`, `TASK-009` — the retry-race guard from round 1 was not exercisable (D3 cannot produce out-of-order completions); extracted into a framework-free `createProfileLoader` in `src/lib/institutions/profileLoader.ts` with a deterministic out-of-order unit test; the island wires it via `useMemo` (round-2 #3)

## Deferred

- None.

## Rejected

- (round-2 #2) A same-tab direct visit after a matching search shows the "serves your address" context, which Codex read as contradicting the epic's "arriving directly shows neither" — contradicts the explicit Decision "Read the existing stored search state" in `DECISIONS.md`, which weighed a click-time marker (Option 2) and rejected it; surfaced to the plan's author as a vs.-the-request item and kept. The context is true information (the institution does serve that address). Instead of narrowing, `PLAN.md`'s acceptance criterion now states the same-tab case as designed behaviour and TASK-009 screenshots five cases including it, so validation cannot hide it.
