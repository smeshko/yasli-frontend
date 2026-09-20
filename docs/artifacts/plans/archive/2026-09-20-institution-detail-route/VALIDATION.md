# Validation Summary — institution-detail-route

**Rounds:** 3 (pre-implementation)
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

---

# Final Validation — TASK-009

**Run on:** 2026-09-19 · **Branch:** `feature/yas-11-institution-detail-route` · **Commits:** 10

Every `PLAN.md` acceptance criterion is ticked except one, which cannot be
demonstrated yet and is recorded below rather than claimed.

## Gates

| Gate | Result |
|---|---|
| Every prior task ticked | TASK-001…008 done |
| `npm run lint` | clean |
| `npm run check` | 0 errors, 0 warnings, 0 hints |
| `npm run test` | 121 tests, 11 files, all passing |
| `npm run build`, backend stopped | succeeds; 98 pages |
| Pre-existing test assertions | exactly one changed (the TASK-008 swap) |

## Environment

The runtime walk ran against `scripts/fixture-server.mjs` (scenarios S1, D2,
D3) and `astro dev`, driven through the Chrome DevTools Protocol in headless
Chrome. The Claude-in-Chrome extension was not connected in this session, so
the driver is a ~150-line CDP helper in the session scratchpad using Node's
global `WebSocket`; no dependency was added to the repo. All 28 screenshots
live in the session scratchpad under `evidence/final/`.

## Criterion-to-evidence

| PLAN criterion | Evidence |
|---|---|
| Manifest: no drift, idempotent, not in CI | Fixtures stopped. Two runs against the production URL both printed `wrote 95 institutions from https://yasli-backend-production.up.railway.app/api/institutions`; `git diff --stat` on the manifest was empty (no drift since TASK-001); `shasum -a 256` H1 == H2 = `7c6e2757…f364bb`; `grep -c manifest .github/workflows/ci.yml` = 0 |
| Build with no backend, one page per row | `ls dist/institution \| wc -l` = 95 = manifest rows. A build against an unreachable base URL (`http://127.0.0.1:9`) also succeeds, which proves nothing is fetched at build time |
| ДГ№13 „Мир“ on the real backend | **DEPLOY-PENDING — see below** |
| Nursery район / preschool §5 / kindergarten empty line | `nursery-4` renders `Яслата обслужва район Приморски.` + the admission note with **no** `.profile-coverage` node; `preschool-12` renders the §5 sentence verbatim; `kindergarten-34` renders its own line plus `Няма публикувани контакти.` and `Адресът не е публикуван в източника.` |
| Context by basis; absent without a matching stored search; present on a same-tab direct visit | Following "Детайли" on ДГ№13 → `Обслужва вашия адрес: ул. Преслав 012.`; on ДЯ № 4 → the district-basis sentence; fresh tab direct visit → none; same-tab direct visit after that search → the context, **by design**; same-tab visit to `kindergarten-34` (not in those results) → none |
| Unknown slug → HTTP 404 and the site 404 page | `astro preview`: `/institution/kindergarten-999999/` → `404` and the body contains `Страницата не е намерена`; a real slug → `200` |
| Missing profile → in-page not-found | `kindergarten-35` (a real manifest slug with no fixture profile) renders the not-found alert with its `href="/"` link home |
| Error state, working retry, loading visible, stale completions dropped | D3: the error block is `role="alert"` with a retry button; clicking it shows the loading block and removes the error block *and its button* in the same frame; the `by-source` request count goes 1 → 2. The out-of-order completion case is deterministic in `profileLoader.test.ts` |
| Stale banner past 14 days only; Bulgarian freshness line | D2 → the banner plus `Последна актуализация: 20.08.2026 г.`; D1 (2 days) → no banner |
| Cards carry Детайли + Източник; absent-from-manifest card does not | S1 at `ул. Преслав 012`: 6 of 7 cards carry `Детайли` then `Източник ↗`; `ДГ „Нова градина“` (`kindergarten/999999`, outside the manifest) carries `Източник` only; the infant-group card links to `/institution/kindergarten-38/` via `institution_kind` |
| Keyboard-only with a visible focus ring | Tab reaches the back link, phone, email, website and source link — 5 stops, every one with a 2px ring, in light and dark. In the D3 error state the retry button also rings in both themes |
| Bulgarian only; external links marked and http(s)-only | Audited across 20 renders (5 slugs × 390/1440 × light/dark): no `href` outside `http(s):`/`tel:`/`mailto:`/site-relative, no Latin-letter copy, exactly one `<h1>`, and every outbound link carries `target="_blank" rel="noreferrer"` and the `↗` marker. The `javascript:` website case is unit-tested |
| lint/check/test; one pre-existing assertion changed | See Gates. The only deleted assertion is the s12 `/institutions/` guard; the only other deleted line is an import statement in `domain.test.ts`. `<h3>ДГ Тест</h3>` is byte-identical |
| Legible at 390px and 1440px in both themes | 20 full-page screenshots. No horizontal overflow at 390px on any of the five states in either theme |

## Not demonstrated

**ДГ№13 „Мир“ against the deployed backend.** Backend phase 1.3 is merged on
the backend repo's `staging` (`507ebe1`, epic phase 1.3 `status: done`,
YAS-8, archived after its PR #3), but Railway's `backend-api` service deploys
from the backend's `main` branch, and `main` does not yet have those commits.
`https://yasli-backend-production.up.railway.app` therefore still serves the
pre-1.3 contract: no `by-source` route, and `InstitutionDetail` without
`address`, contacts, `district_code`, `location` or `branches`.

What *is* proven: the page renders every section correctly from a fixture
profile that matches the real `InstitutionDetail` schema field for field, and
`src/lib/api/types.ts` was generated from a local run of the merged backend
(TASK-004), with a schema-by-schema comparison against the deployed OpenAPI
confirming the change is additive only.

What is **not** proven: that the production data path returns four branches
and non-null `phone`/`email`/`director` for `kindergarten/46`. The local
database this was schema-checked against has no rows, and populating it needs
R2 credentials.

**To close it:** merge the backend's `staging` into `main` so Railway
redeploys, then re-run TASK-004's `curl` check and this row:

```bash
curl -s https://yasli-backend-production.up.railway.app/api/institutions/by-source/kindergarten/46 \
  | jq '{phone, email, director, branches: (.branches | length)}'
PUBLIC_YASLI_API_BASE_URL=https://yasli-backend-production.up.railway.app npm run dev
```

If the regenerated types differ from the committed ones, TASK-004's rule
applies: stop and amend the plan rather than adapt silently.

## Deviations from the plan text

- **`has_infant_group` on `InstitutionDetail`, and `has_infant_group` +
  `location` on `InstitutionListItem`.** Backend 1.3 shipped three fields the
  plan had not anticipated. All additive; recorded in `RESEARCH.md` in
  TASK-004 and mirrored into the fixture profiles so a fixture response
  matches the real schema. The detail page renders none of them.
- **The freshness line reads `Последна актуализация: 20.08.2026 г.`** — with a
  trailing ` г.`, not the bare `dd.mm.yyyy` the criterion writes. That is what
  `Intl.DateTimeFormat("bg-BG", …)` produces for a numeric Bulgarian date, in
  both Node and Chrome, and the formatter was moved out of
  `SearchExperience.tsx` verbatim in TASK-002 as that task required. The
  search screen's footer has always rendered the same suffix. Changing it
  would mean hand-formatting dates and would change the home page too, so it
  is flagged here rather than silently "fixed".
- **`InstitutionProfileView` takes an explicit `kind` prop**, which TASK-006's
  prop list omits. The per-kind honesty rules then follow the manifest kind
  that chose the route and the page header, so the page tells one story even
  if the manifest and the API disagree, and the rules still apply in the
  states that have no profile.
- **Two pre-existing test files were extended, not just `SearchResults.test.tsx`.**
  TASK-009's gate says the test diff should be the TASK-008 changes plus new
  files, but TASK-002 and TASK-005 explicitly name `domain.test.ts` and
  `client.test.ts` as files to extend. Both diffs are additions only; no
  pre-existing assertion in either file changed. `results.test.ts` gained two
  fields in one fixture, which the 1.3 type regeneration made mandatory.

## Defect found and fixed during implementation

Regenerating the types in TASK-004 made `npm run check` fail with three
errors: `InstitutionListItem` gained two required fields that
`results.test.ts`'s `newestFreshnessDate` fixtures did not satisfy. Vitest
does not type-check, so the suite stayed green and only `astro check` and CI
saw it. It was reported as clean at the time because the check output was
truncated to the last three lines, which cut off the error count. Fixed in
`2c18686` and the full output is read in the Gates table above.

---

# Post-review changes — 2026-09-19

Three changes made after final validation, on the author's review of the
running page. Both of the first two contradict something the plan or the PRD
committed to, so they are recorded here rather than absorbed quietly.

## Catchment list removed

**What changed.** The street-by-street catchment list is no longer rendered.
The section now appears only when it has something to *state*: a nursery names
the район it serves, and a kindergarten or preschool with no published
catchment keeps its researched empty-state copy. A kindergarten or preschool
that *has* a catchment renders no section at all.

**Why.** Real catchments are far larger than the plan assumed. ДГ№13 „Мир“
covers 93 streets and 1888 addresses; the list rendered as a wall of numbers
that pushed the branches and freshness line off the screen. The plan's
mitigation for this risk was "per-street rows with inline numbers, no
truncation", which measured against real data is not a mitigation. The search
screen already answers "does this institution serve my address" exactly, so
the list added length without adding an answer.

**What it costs.** This diverges from **PRD FR-12**, which asks for the
catchment grouped by street and naturally sorted. The data is still in the API
response and the backend still guarantees its ordering, so restoring it behind
a disclosure later costs nothing. Considered and not taken now: a collapsed
"покажи адресите" toggle.

**Criteria touched.** The ДГ№13 criterion in `PLAN.md` and in the epic no
longer names the catchment. The per-kind empty-state criterion is unchanged
and still passes, because that copy survives.

## Result cards navigate as a whole

**What changed.** A card whose institution is in the manifest is now itself a
link: the whole card navigates, and the separate "Детайли" and "Източник"
links are gone from it. A card the manifest does not know is not a link and
keeps "Източник" as its only affordance.

**Why.** Two links on a card competed with each other, and the card already
looked clickable. Keeping "Източник" on unlinked cards was a deliberate
choice over removing it everywhere: those are the 18 stale nursery rows in
production plus anything added since the last manifest run, and with no link
and no click they would have become dead cards.

**How it is built.** The link wraps the card's text block and its `::after` is
stretched over the card. The first attempt put the link inside the `<h3>`,
which is `position: relative`, so the overlay covered only the name and
clicking the rest of the card did nothing. Moving the link to be a direct
child of the card fixed it. One focusable control per card, labelled with the
institution's name, so keyboard and middle-click behave like any link and no
interactive element is nested inside another.

**Verified at runtime** (headless Chrome, local backend with real data):
clicking the far corner of a card navigates; the card is reached in 5 tab
stops and carries a 2px focus ring in light and dark; Enter navigates; a card
outside the manifest has no link and keeps its source link.

**Criteria touched.** The result-card criterion in `PLAN.md` and the epic's
"Re-add the Детайли link" bullet now describe whole-card navigation.

## Fragile test assertion fixed

The kindergarten test asserted that no district *name* appears anywhere in the
markup, by substring. Real Varna has a boulevard called "Осми Приморски Полк",
which contains "Приморски", so that assertion would have failed for the wrong
reason as soon as a realistic street reached the fixture. It now asserts on
the rendered district sentence instead.

## Known pre-existing failure, not caused by this branch

Frontend CI has been red on `staging` since 2026-09-14 and is red on this
branch's every push. `.github/workflows/ci.yml` never sets
`PUBLIC_YASLI_API_BASE_URL`, and `resolveApiBaseUrl` throws without it
outside dev, so `npm run build` fails in CI while succeeding locally whenever
the variable is set. This branch does not touch CI config or that resolver.
The fix is one `env:` entry on the build step, which belongs to its own
change.
