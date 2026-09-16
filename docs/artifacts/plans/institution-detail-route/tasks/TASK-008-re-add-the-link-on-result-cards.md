# TASK-008: Re-add the Детайли link on result cards

Depends on: TASK-007
Suggested commit: `feat(search): link result cards to the institution page`

## Goal

Every result card links to its institution page next to the existing source
link, and the test that guarded the deleted s12 route now asserts the new one.

## Files

- `src/components/SearchResults.tsx` — new prop
  `pageSlugs: ReadonlySet<string>` on `SearchResultsProps`; inside
  `.card-actions`, before the `Източник` anchor, and only when
  `pageSlugs.has(buildInstitutionSlug(institution.institution_kind, institution.external_id))`:
  `<a href={institutionPath(institution.institution_kind, institution.external_id)}>Детайли</a>`.
  The href uses `institution_kind`, not `reception_kind`, so an infant-group
  row listed under nurseries links to the kindergarten's page. A result the
  manifest does not know (an institution added to the backend after the last
  `npm run institutions:manifest`) keeps only `Източник` — never a link to a
  static 404.
- `src/components/SearchExperience.tsx` — import
  `src/data/institutions-manifest.json` and `buildSlugSet`; a module-level
  `const INSTITUTION_PAGE_SLUGS = buildSlugSet(manifest)`; pass
  `pageSlugs={INSTITUTION_PAGE_SLUGS}` to `<SearchResults>` (line ~424). The
  manifest (77 rows of `kind`/`external_id`/`name`) joins the search island
  bundle — a few KB gzipped; record the built-size delta in the commit body.
- `src/components/SearchResults.test.tsx` — a module-level
  `const PAGE_SLUGS = new Set([...])` listing every
  `(institution_kind, external_id)` pair the existing cases render, passed as
  `pageSlugs={PAGE_SLUGS}` in each of the seven existing `<SearchResults`
  render calls (one added line per call; nothing else in those calls
  changes); replace the single assertion
  `expect(html).not.toMatch(/href="\/institutions\//)` (line 95) with
  `expect(html).toContain('href="/institution/kindergarten-42/"')` and
  `expect(html).toContain('href="/institution/nursery-43/"')`; in the
  infant-group case add
  `expect(html.match(/href="\/institution\/kindergarten-42\/"/g)).toHaveLength(2)`;
  one new case: a result whose pair is not in `pageSlugs` renders `Източник`
  but no `Детайли` and no `/institution/` href. No other change to any
  existing assertion.

## Acceptance

- [ ] Every card whose pair is in `pageSlugs` renders `Детайли` then
      `Източник ↗`, in that order; a card whose pair is absent renders
      `Източник ↗` only
- [ ] The `Детайли` href is `/institution/<institution_kind>-<external_id>/`
- [ ] Both rows of a kindergarten with an infant group link to the same
      kindergarten page
- [ ] `git diff -- src/components/SearchResults.test.tsx` touches only the
      hunks named above (the `PAGE_SLUGS` constant, one `pageSlugs` line per
      render call, the assertion swap, the absent-pair case);
      `<h3>ДГ Тест</h3>` at line 203 is byte-identical
- [ ] Runtime (fixture S1, `ул. Преслав 012`): `Детайли` on the ДГ№13 card
      opens its page showing `Обслужва вашия адрес: ул. Преслав 012.`; the
      nursery card's page shows the district-basis line; Back returns to the
      restored results; the `kindergarten/999999` card (TASK-003) shows
      `Източник` only
- [ ] `npm run test` passes

Evidence: `npm run test` output; `git diff --stat`; two screenshots (address
basis, district basis) and one of the restored results after Back.

## Steps

### RED
- [ ] Add `pageSlugs` to the seven render calls, update the three
      assertions, add the absent-pair case, and watch the assertions fail

### GREEN
- [ ] Add the prop, the guard and the anchor; wire the slug set in
      `SearchExperience.tsx`

### REFACTOR
- [ ] Nothing expected; confirm `.card-actions a:focus-visible` applies to the
      new link with a keyboard pass

## Notes

The old assertion used the plural `/institutions/` path from s12, so it would
keep passing with the new singular route — replacing it with positive
assertions is the point, not a loosening.

The link inherits `.card-actions a` sizing; the tap-target finding (a11y M5)
is out of scope.
