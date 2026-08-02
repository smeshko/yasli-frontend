# Adversarial Review — Round 1

**Run:** 2026-08-02
**Plan:** dvorat-design
**Branch:** feat/dvorat-design (base main)
**Reviewer:** self — see note below

## Reviewer note

Codex was unavailable: the run returned

    You've hit your usage limit. ... try again at Aug 8th, 2026 7:17 AM.

The shared protocol's fallback is a clean `general-purpose` subagent. This
session carries a standing instruction not to spawn agents unless asked, and
the request that started this run authorised the review step, not agent use —
so the round was run as a manual adversarial pass instead. That is a weaker
reviewer than Codex on novel logic bugs, and it is not independent of the
author. **A Codex pass should be run before merge**, once quota resets.

The pass was still evidence-driven rather than impressionistic: every finding
below was confirmed by reading the shipped CSS/TSX and, where visual, by
rendering it.

## Method

- Enumerated every CSS rule carrying an active `transition` across the four
  restyled files with a parser, then cross-checked each against the
  `prefers-reduced-motion: reduce` blocks.
- Re-read the diff of `SearchExperience.tsx` and `SearchResults.tsx` against
  the ARIA and keyboard contract described in `PLAN.md`.
- Re-ran the contrast gate and the fixture scenarios after each fix.
- Checked the adapted assertion in `SearchExperience.test.tsx` still fails on
  a wrong headline (it compares stripped text content, not a substring of it).

## Findings

### 1. Transitions added by the restyle were exempt from reduced motion — med

`.search-field`, `.status-panel button`, `.results-status button` and
`.button` all gained transitions, but none appeared in any
`prefers-reduced-motion: reduce` block. `PLAN.md` lists reduced motion as a
rule that remains binding.

Separately, `pravila.astro`'s reduced-motion block referenced
`.summary-chevron`, **a selector that does not exist** — the chevron is
`.info-details > summary::after`. Both it and the summary's own colour
transition therefore ran regardless of the user's setting. That one is
pre-existing, not introduced here, but it is in scope of the same rule.

Verdict: **fix**.

### 2. The address field had no visible focus indicator — med

`.search-field input` sets `outline: 0`, and the only focus affordance was
`:focus-within { transform: translate(2px, 2px) }` plus a shadow swap. A 2px
displacement is not a focus indicator for a keyboard user. The filter pills,
card source links and retry buttons also relied on the UA default outline,
which is low contrast against the ink-filled active filter.

Verdict: **fix**.

### 3. Group heading accessible name now includes the count — low

The count chip lives inside the `h2` that each group's `aria-labelledby`
points at, so the section's accessible name became e.g. "Ясла 4" rather than
"Ясла". This is accurate rather than wrong — a screen-reader user hears the
result count with the group name — and the count is genuinely part of the
heading's meaning.

Verdict: **reject** (not a defect).

### 4. `.match-basis` duplicates the nursery group note — low

Every card now states "по вашия район", which for the nursery group repeats
what the group note already explains. Redundant but not incorrect, and it is
the only per-card signal of match basis when a group mixes both.

Verdict: **reject** (deliberate, and the reference design shows it).

### 5. Fixture server cannot prove the production contract — low

`scripts/fixture-server.mjs` is written against `src/lib/api/types.ts`, so it
proves the frontend handles the declared contract — not that the deployed
backend returns those shapes. Already recorded as a limitation in
`EVIDENCE.md` § "Not demonstrated".

Verdict: **defer** — belongs to an integration check against staging, not to
this branch.

## Triage

| # | Finding | Severity | Verdict | Rationale | Commit |
|---|---------|----------|---------|-----------|--------|
| 1 | Restyle transitions exempt from reduced motion; stale `.summary-chevron` selector | med | fix | Contradicts a rule PLAN.md keeps binding; confirmed by parsing every transitioned rule. | f9a86b5 |
| 2 | Address field and controls had no visible focus ring | med | fix | `outline: 0` with only a 2px shift is not a focus indicator. | 8a3c6f0 |
| 3 | Group heading accessible name includes the count | low | reject | Accurate and useful; the count is part of the heading's meaning. | — |
| 4 | Per-card match basis duplicates the nursery note | low | reject | Deliberate and present in the approved reference. | — |
| 5 | Fixture server cannot prove the production contract | low | defer | Needs an integration check against a real backend, out of scope here. | — |
