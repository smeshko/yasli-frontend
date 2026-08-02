# Review Summary — dvorat-design

**Rounds:** 1
**Reviewer:** self (Codex usage-limited until 2026-08-08; subagent fallback not
used — see `reviews/round-1.md` § Reviewer note)
**Branch:** feat/dvorat-design
**Run on:** 2026-08-02

## Rounds

| Round | Findings | Fixed | Deferred | Rejected |
|-------|----------|-------|----------|----------|
| 1     | 5        | 2     | 1        | 2        |

## Fixed

- `f9a86b5` — Honour reduced motion on every transitioned element. The restyle
  added transitions to the address field, the retry buttons and `.button`
  without adding them to a `prefers-reduced-motion` block; `pravila.astro`'s
  block also referenced `.summary-chevron`, a selector that never existed, so
  the real chevron and summary transitions were never suppressed. (round-1 #1)
- `8a3c6f0` — Give the address field and controls a real focus ring. The field
  set `outline: 0` and relied on a 2px translate as its only focus affordance.
  (round-1 #2)

## Deferred

- (round-1 #5) The fixture server proves the frontend handles the contract
  declared in `src/lib/api/types.ts`, not that the deployed backend returns
  those shapes. Needs an integration check against staging — out of scope for
  a visual migration branch. Already recorded in `EVIDENCE.md`.

## Rejected

- (round-1 #3) Group heading accessible names now include the result count
  ("Ясла 4"). Accurate rather than defective — the count is part of the
  heading's meaning and is useful to a screen-reader user.
- (round-1 #4) Each card repeats its match basis even where the group note
  already explains it. Deliberate, and present in the approved reference; it
  is the only per-card signal when a group mixes address and district matches.

## Caveat on reviewer independence

This round was not run by an independent reviewer. Codex hit its usage limit
mid-run and the standing session instruction rules out the subagent fallback.
The findings are grounded in the shipped code rather than impression, but a
Codex pass over this branch should still be run before merge.
