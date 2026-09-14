# Validation Summary — dvorat-design

**Rounds:** 3 (reviewer: Codex)
**Plan status at validation:** draft
**Run on:** 2026-08-02

## Rounds

| Round | Findings | Applied | Deferred | Rejected |
|-------|----------|---------|----------|----------|
| 1     | 5        | 5       | 0        | 0        |
| 2     | 5        | 5       | 0        | 0        |
| 3     | 5        | 5       | 0        | 0        |

Every finding was independently verified against the working tree before being
applied; none were taken on the reviewer's word.

## Applied

### Round 1
- `PLAN.md:Scope` / `Out of Scope`, `RESEARCH.md:§5`, `TASK-007`, `TASK-008` —
  the plan targeted `docs/design/*`, which does not exist in this repo; the
  design docs live in the unversioned parent. TASK-007 now creates an in-repo
  `docs/design/`. (round-1 #1)
- `PLAN.md:Acceptance`/`Scope`, `TASK-003`, `TASK-008` — `public/favicon.svg`
  still carried `#2563eb` and `Inter` and doubles as the header brand; the
  `src/`-only audit would have passed while the old identity shipped.
  (round-1 #2)
- `+TASK-009`, `TASK-008`, `RESEARCH.md` — every result state needs a backend
  on `:8000`; added a deterministic fixture harness and replaced TASK-008's
  catch-all smoke test with a criterion-to-evidence matrix. (round-1 #3)
- `TASK-001`, `TASK-004` — no italic Cormorant face was specified, and
  `font-synthesis: none` forbids synthesising one, so `моята` would have
  shipped upright. (round-1 #4)
- `TASK-004`, `PLAN.md:Scope` — the task assumed an unsplit H1, a `data-active`
  hook and a go button that does not exist. Two markup changes are now
  explicitly authorised; the phantom button is out of scope. (round-1 #5)

### Round 2
- `TASK-008` — the first gate required TASK-008 itself to be ticked.
  (round-2 #1)
- `TASK-009`, `TASK-008` — S7 (`/api/match` 500) cannot show a retry control;
  match errors render text only. Split into S7 (match error), S8
  (`address_not_found` + retry) and S9 (reference-data failure + retry).
  (round-2 #2)
- `TASK-009`, `TASK-008` — scenarios were not deterministically reachable:
  added address ids, an endpoint/status/body matrix, CORS, `FIXTURE_SCENARIO`
  selection and per-scenario restart commands, including the byte-exact
  `{"error":"address_not_found"}` body. (round-2 #3)
- `TASK-005` — its header dependency disagreed with `PLAN.md`. (round-2 #4)
- `TASK-008` — hover-only mouse evidence and a `grep` for `showNav` proved
  neither selection nor nav behaviour. (round-2 #5)

### Round 3
- `PLAN.md:Acceptance`, `TASK-004` — splitting the H1 breaks
  `SearchExperience.test.tsx:10`, making the "no test edits" gate
  unsatisfiable. Exactly one assertion change is now permitted, with wording
  that prevents it being loosened. (round-3 #1)
- `PLAN.md`, `TASK-007`, `+assets/approved-concepts.html` — the approved
  reference is now committed with the plan instead of read from the untracked
  parent workspace. (round-3 #2)
- `TASK-009`, `TASK-008` — fixture `last_seen_at` must be startup-relative;
  frozen dates would drift past the 14-day threshold and contaminate every
  baseline screenshot with a stale banner. (round-3 #3)
- `TASK-008`, `TASK-009` — the S8 retry screenshot could pass without proving
  anything, since `retryReferences` leaves the stale panel unchanged. Replaced
  with network evidence plus a recovery path. (round-3 #4)
- `TASK-008` — font verification did not prove the offline, all-page criterion;
  added per-route offline reloads, `document.fonts.check`, and a reproducible
  smoke-string injection with a clean-tree check. (round-3 #5)

## Deferred

None.

## Rejected

None. All fifteen findings were verified as real defects in the plan.

## Note on the round cap

Round 3 still produced action rows, which the shared protocol says should be
put to the operator. This run was authorised to proceed without interruption,
so the call was made in-run and is recorded in `validation/round-3.md`: the
findings narrowed from structural (round 1) to contract-level (round 2) to
evidence methodology (round 3), and none altered the plan's shape, task list or
sequencing. Validation closed after round 3.
