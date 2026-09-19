# TASK-009: Final Validation

Depends on: all prior tasks
Suggested commit: `chore: final validation for institution-detail-route`

## Goal

Prove every `PLAN.md` acceptance criterion with reproducible evidence,
criterion by criterion, against the fixture server and — for the one
criterion that needs it — the deployed backend.

## Gates

- [ ] Every prior task is ticked in `PLAN.md`; this task is the last
- [ ] `npm run lint`, `npm run check`, `npm run test` pass
- [ ] `git diff staging -- 'src/**/*.test.*'` shows only: the TASK-008
      changes in `SearchResults.test.tsx` (the `PAGE_SLUGS` constant, one
      `pageSlugs` prop line per render call, the assertion swap, the
      absent-pair case), and new test files
- [ ] `npm run build` with the backend stopped succeeds

## Criterion-to-evidence matrix

Run `npm run fixtures` (scenario per row) alongside `npm run dev`; use
`npm run preview` for the 404 row. Slugs are the ones `SCENARIOS.md` names.

| PLAN criterion | Scenario / check | Evidence |
|---|---|---|
| Manifest: no drift, idempotent, not in CI — **run this row first** | **Fixture server stopped** (it answers `/api/institutions` on the script's default URL and would replace the production manifest). Run 1: `YASLI_INSTITUTIONS_URL=https://<backend>/api/institutions npm run institutions:manifest`; `git diff --stat -- src/data/institutions-manifest.json`. Empty = no drift since TASK-001. Non-empty = the live list changed: commit the refreshed file as its own `chore(build): refresh institutions manifest` (row-count delta in the body), re-pick any `SCENARIOS.md` slug that disappeared, and only then continue — every later row must run against the manifest that will ship. `shasum -a 256 src/data/institutions-manifest.json` → H1. Run 2: the same command; `shasum -a 256 …` → H2. **H1 == H2 is the idempotency proof** — not `git diff`, which compares against the index rather than run 1. Both summary lines name the production URL and the same row count. `grep -c manifest .github/workflows/ci.yml` → `0` | both summary lines, the run-1 diff stat (and the refresh commit hash if any), H1/H2, the grep count |
| Build with no backend, one page per row | backend stopped; `npm run build` | `ls dist/institution \| wc -l` beside the manifest length |
| ДГ№13 „Мир“ direct visit on the real backend | `PUBLIC_YASLI_API_BASE_URL=https://<backend>` dev run, `/institution/kindergarten-46/` | screenshot showing address, contacts, catchment by street, four branch lines |
| Nursery district / preschool §5 / kindergarten empty line | D1: nursery slug, preschool slug, empty-kindergarten slug | three screenshots; nursery shows no coverage node |
| Context from a result card; none on a direct visit without a matching stored search; present on a same-tab direct visit after a matching search (by design — DECISIONS.md) | S1 → `Детайли` on ДГ№13 and on the nursery; a fresh session (new private window) direct visit to ДГ№13; a same-tab direct visit to a slug *not* in the S1 results (the empty-kindergarten slug); a same-tab paste of the ДГ№13 URL after the search | five screenshots — the last one shows the context line and is expected to |
| Unknown slug → 404 page | `npm run preview`, `curl -s -o /dev/null -w '%{http_code}'` plus browser | status line + screenshot of the site 404 |
| Missing profile → in-page not-found | D1, the deliberately absent slug | screenshot with the `Към търсенето` link |
| Error state with working retry; loading visible; stale completions discarded | D3 → click retry with the network panel open: the loading block replaces the error block at once, then the second request appears; throttle to see loading on first load. The out-of-order case is deterministic in `profileLoader.test.ts` (TASK-006) | screenshot of the loading state right after retry + network rows showing the second request + the `npm run test` line for the out-of-order case |
| Stale banner at >14 days only; Bulgarian freshness line | D2 (banner) and D1 (no banner) | two screenshots |
| Cards carry Детайли + Източник with the right href; absent-from-manifest card has Източник only | S1 (`ул. Преслав 012`): the ДГ№13 and nursery cards, plus the `kindergarten/999999` card | screenshot showing both card shapes + `npm run test` lines for the infant-group and absent-pair cases |
| Keyboard-only with visible focus | Tab through the full kindergarten page, light then dark | two screenshots mid-walk, one per theme |
| Bulgarian only; external links marked and http(s)-only | `grep -n` review of string literals in `InstitutionProfile.tsx` and `[slug].astro`; DOM check of `target`/`rel`/`↗` on every outbound link and that every `href` on the page is `http(s):`, `tel:`, `mailto:` or site-relative; `npm run test` line for the `javascript:` website case | grep output + one DOM screenshot + the test line |
| lint/check/test; one pre-existing assertion changed | the Gates above | tails of each command |
| Legible at 390px and 1440px in both themes | full kindergarten, nursery, preschool — 2 widths × 2 themes each | twelve screenshots (six required by the epic, six extra) |

The manifest row runs first so drift is resolved before any build,
page-count, fixture or screenshot evidence exists; if a refresh was
committed, every `SCENARIOS.md` slug must still be present in the new file
before the fixture rows run.

## Steps

- [ ] With fixtures stopped, run the manifest row; resolve any drift
- [ ] Start the fixture server and dev server; walk the rest of the matrix
      top to bottom
- [ ] Run the one real-backend row last, with `PUBLIC_YASLI_API_BASE_URL`
      pointed at the deployed backend with phase 1.3
- [ ] Tick each `PLAN.md` criterion only once its row has produced its artefact
- [ ] Record anything not demonstrable, and why, in `VALIDATION.md` — never
      tick it

### Epic update

- [ ] Tick this phase's `### Acceptance criteria` in
      `docs/artifacts/epics/01-institution-detail-page.md`, plus any
      epic-level criteria this phase satisfies
- [ ] Mark the phase done:
      `python3 ~/.claude/skills/create-epic/scripts/link_plan.py 01 --phase 1.1 --plan institution-detail-route --status done`
- [ ] Update the epic's row in `docs/artifacts/epics/EPICS.md` to
      `In progress` (first phase of epic 01 to merge); note that epic 02's
      phase 2.1 is still blocked on 1.2

## Notes

A green build proves the pages exist, not that they are right. Every visual
row needs an artefact from a running server; the ДГ№13 row needs the real
backend because the fixture's Мир profile is synthetic.
