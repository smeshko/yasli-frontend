# Adversarial Validation — Round 1

**Run:** 2026-08-02 (reviewer: Codex)
**Plan:** dvorat-design
**Status at start:** draft

## Codex output

<!-- Paste /codex:adversarial-review stdout verbatim below this line. Do not edit. -->

# Codex Adversarial Review

Target: branch diff against main
Verdict: needs-attention

No-ship: the plan targets unversioned files, misses a loaded blue/Inter asset, cannot reproducibly validate its acceptance criteria, and under-specifies required font and markup changes. The four requested baseline claims are current: the bare <h3> assertion is at line 198, showNav gates the nav, index/pravila have global styles, and tests do not assert class names.

Findings:
- [high] TASK-007 targets files that are outside the repository (docs/artifacts/plans/dvorat-design/tasks/TASK-007-update-docs-design-to-describe-and-record-the-superseded-rules.md:11-17)
  The frontend repository contains no docs/design directory; the existing documents are under ../docs/design in a parent that RESEARCH.md identifies as non-git. RESEARCH.md also gives a nonexistent ../../../../design-concepts path—the source is ../design-concepts from the repository root. A clean checkout therefore cannot execute TASK-007, and edits made to the parent would not ship with this branch. Verdict: apply.
  Recommendation: Apply — revise PLAN.md, RESEARCH.md, TASK-007 and TASK-008 to establish repository ownership and an explicit vendoring/import task with correct source and destination paths before implementation starts.
- [high] The source-only audit leaves the loaded favicon blue and Inter-based (docs/artifacts/plans/dvorat-design/PLAN.md:101-102)
  public/favicon.svg still contains #2563eb and font-family="Inter" and is loaded on every page as both favicon and the current brand image. Because PLAN.md restricts its zero-hit criterion to src/ and TASK-003 omits the favicon, every planned check can pass while the old visual identity remains shipped. Verdict: apply.
  Recommendation: Apply — update PLAN.md and TASK-001/002/003/008 to replace public/favicon.svg and audit both src/ and public/ for retired colors and fonts.
- [high] TASK-008 cannot reproducibly prove the behavioral acceptance criterion (docs/artifacts/plans/dvorat-design/tasks/TASK-008-final-validation.md:19-33)
  The single `прес` walkthrough and screenshot list omit explicit ArrowUp/ArrowDown/Escape checks, freshness, stale/retry, missing-district, kindergarten and preschool empty states, 404 font verification, nav behavior, and the docs audit required by PLAN.md. The frontend also defaults to a separate localhost:8000 backend, but no fixture dataset or scenario addresses are specified, so result-state evidence depends on mutable backend data. RESEARCH.md additionally points to a contrast script that TASK-008 does not contain. The catch-all checkbox at line 31 is not reproducible evidence. Verdict: apply.
  Recommendation: Apply — revise RESEARCH.md, TASK-005 and TASK-008 with a deterministic fixture/mock-state harness, an explicit scenario-to-criterion matrix, all-page font checks, nav/docs checks, and an executable contrast script with the complete shipped pair inventory.
- [medium] The font task does not ship the italic face required by the design (docs/artifacts/plans/dvorat-design/tasks/TASK-001-self-host-sofia-sans-and-cormorant-garamond-retire-inter.md:40-45)
  TASK-004 requires genuine italic Cormorant Garamond for `моята`, but TASK-001 only requires family/weight files and never specifies a separate italic asset or `font-style: italic` face. Current BaseLayout has `font-synthesis: none` at line 153, so a roman-only font cannot synthesize the required italic. TASK-001's BaseLayout.astro:146 anchor is also stale; that line is the shadow token. Verdict: apply.
  Recommendation: Apply — update TASK-001 and TASK-004 to require, subset, declare and verify separate Cormorant Garamond roman and italic woff2 faces, including network evidence that the italic file loads.
- [medium] TASK-004 assumes markup and hooks that do not exist (docs/artifacts/plans/dvorat-design/tasks/TASK-004-restyle-the-home-hero-search-field-and-suggestion-panel.md:14-29)
  SearchExperience.tsx currently has one unsplit H1 text node, uses className="active" for the selected option, and has no go button. TASK-004 nevertheless treats editing that component as optional, requires per-word H1 styling and data-active, and instructs implementers to restyle a nonexistent go button. Following it either leaves acceptance unmet or introduces an unplanned control and markup changes contrary to the presentation-only constraint. Verdict: apply.
  Recommendation: Apply — revise TASK-004 and PLAN.md to explicitly authorize the necessary headline spans and active-state hook, preserve the existing ARIA behavior, and remove the nonexistent go-button step unless its new behavior is deliberately brought into scope.

Next steps:
- Resolve repository ownership for design documentation before implementation begins.
- Amend the asset, font and SearchExperience task scopes.
- Replace TASK-008's catch-all validation with deterministic, criterion-by-criterion evidence.

## Triage

All five findings were independently verified against the working tree before triage:

- `ls frontend/docs/` returns only `ARCHITECTURE.md` — there is no in-repo `docs/design`.
- `public/favicon.svg` contains `fill="#2563eb"` and `font-family="Inter, …"`, and is rendered
  as the header brand image (`BaseLayout.astro:45`).
- `SearchExperience.tsx:254` is a single unsplit text node; `:299` uses
  `className={index === activeIndex ? "active" : undefined}`; there is no go button
  (the only `<button>` is the reference-data retry at `:287`).
- `font-synthesis: none` is at `BaseLayout.astro:153`, not `:146` (`:145` is `--shadow-field`).
- The API client defaults to `http://localhost:8000`, so every result state depends on a
  running backend with mutable data.

| # | Finding | Severity | Verdict | Rationale | Applied to |
|---|---------|----------|---------|-----------|------------|
| 1 | TASK-007 targets `docs/design/*`, which does not exist in this repo | high | apply | Confirmed: the design docs live in the non-git parent. Work that cannot ship on the branch cannot be a task. Design docs become in-repo, and the parent copies are noted as advisory-only. | PLAN.md:Scope, PLAN.md:Out of Scope, RESEARCH.md:§5, TASK-007, TASK-008 |
| 2 | `public/favicon.svg` keeps `#2563eb` + Inter and is the header brand | high | apply | Confirmed by reading the file. The `src/`-only grep would pass while the old identity still ships on every page. | PLAN.md:Acceptance, PLAN.md:Scope, TASK-003, TASK-008 |
| 3 | TASK-008 cannot reproducibly prove the behavioural criteria | high | apply | Confirmed: result states need a backend on :8000 that this repo does not provide. Without a deterministic fixture, "demonstrated at runtime" is unverifiable. | +TASK-009, TASK-008, RESEARCH.md:Useful Commands |
| 4 | No italic Cormorant face; `font-synthesis: none` forbids faking it | med | apply | Confirmed at `BaseLayout.astro:153`. The design's italic `моята` would silently render roman. Stale line anchor fixed too. | TASK-001, TASK-004 |
| 5 | TASK-004 assumes an unsplit H1, `data-active`, and a go button | med | apply | Confirmed at `SearchExperience.tsx:254/299`; no go button exists. Task must authorise the two markup changes and drop the phantom control. | TASK-004, PLAN.md:Scope |
