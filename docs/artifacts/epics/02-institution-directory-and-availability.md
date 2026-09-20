# Epic 02 — Institution directory and availability

Status: planned
Created: 2026-08-17
Depends on: Epic 01
Project: institution-profiles
Linear: YAS-5 (https://linear.app/ivo-tsonev/issue/YAS-5)
Milestone: 4a808348-f6ad-4507-b30b-e2cc6b276c55

> **Phase 2.2 deferred 2026-09-19.** The backend read it renders
> ([backend epic 02](../../../../backend/docs/artifacts/epics/02-free-places-api.md))
> is deferred — the source table was measured 88 days stale and byte-identical
> to a copy captured a month earlier. Phase 2.1 is unaffected and carries this
> epic on its own. The 2.2 spec is left below to pick back up. Linear has no
> deferred state, so YAS-15 is tracked there as `Canceled`.

## Overview

A browsable directory: address search can only surface institutions that
publish a catchment, and at least one school — ОУ "Захари Стоянов" — accepts
preschool children while publishing none, so it is currently invisible to every
possible query. A nav-level directory fixes that and answers PRD job #3.

This epic was originally scoped with a second half — free places, a dated
per-cohort availability block on the detail page. That is deferred; see the
note above and backend epic 02 for the measurements.

## Architecture references

- [INSTITUTION_DETAIL_MAP_RESEARCH.md](../../../../openspec/docs/INSTITUTION_DETAIL_MAP_RESEARCH.md) — the free-places payload shape and seasonality (§1.1), the branch rows inside it (§1.3), and the institutions it lists that we don't have (§1.4)
- [PRD.md](../../../../openspec/docs/PRD.md) — FR-13 (browse all), FR-14/FR-15 (freshness), §7.4
- [PRESCHOOL_COVERAGE_RESEARCH.md](../../../../openspec/docs/PRESCHOOL_COVERAGE_RESEARCH.md) — why a school can exist with no catchment, which is the case for the directory
- [s12 freeze change](../../../../openspec/changes/archive/2026-05-12-s12-freeze-remove-institution-pages/proposal.md) — removed the "Всички институции" nav item that phase 2.1 restores

## Dependencies

- **[Epic 01](./01-institution-detail-page.md)** — the directory links to detail pages.

(The former dependency on backend epic 02 phase 2.1 went with phase 2.2.)

## Out of scope

- The free-places fetch, parse and cache — backend epic 02.
- Anything derived from `/lv/api/new-public-last-rating`. It is per-application data with registration numbers; republishing it in a friendlier form is a privacy decision, not a feature. Research §1.2.
- Reconciling the institutions that appear in free-places but not in the institution list (research §1.4). The directory surfaces the gap; closing it means ingesting institutions with no catchment, which is a data-model change and its own epic.
- Free places for nurseries — the source returns `null` for `jasla`.
- Any notification or watch feature on availability.

## Phase 2.1 — Browse-all directory and nav item

**Plan**: _not yet created_

**Linear**: YAS-14 (https://linear.app/ivo-tsonev/issue/YAS-14)

**Goal**: Parents can reach every institution without searching an address, including the ones with no published catchment.

### What to build

- `src/pages/institutions/index.astro`: every institution grouped by kind in reception order (nursery → kindergarten → preschool), alphabetical within a group, each row linking to its detail page and showing the infant-group marker where it applies.
- Restore the "Всички институции" item to `navItems` in `BaseLayout.astro` (s12 removed it), keeping the existing active-state and mobile-toggle behaviour.
- Data comes from `GET /api/institutions`, which already returns a deterministic reception-then-name ordering — reuse it rather than re-sorting client-side.
- The page must work as an entry point: no dependency on prior search state.
- Reuse the existing kind labels and badges from `lib/domain/kinds.ts` rather than restating Bulgarian copy.

### Acceptance criteria

- [ ] All institutions appear, grouped by kind, alphabetical within each group
- [ ] Every row links to a working detail page
- [ ] "Всички институции" appears in the nav on desktop and inside the mobile toggle, with correct `aria-current` on the directory page
- [ ] The page renders on a cold visit with no search history
- [ ] Loading and API-error states match the rest of the app
- [ ] Keyboard navigation and focus indicators hold up; lint/check/test pass

### Validation

Screenshots at mobile and desktop width in both themes, plus the nav in its open mobile state. Confirm the group counts against `GET /api/institutions`.

---

## Phase 2.2 — Free places on the detail page — DEFERRED 2026-09-19

**Plan**: _not created — phase deferred, see the note at the top of this file_

**Linear**: YAS-15 (https://linear.app/ivo-tsonev/issue/YAS-15) — Canceled

Kept verbatim as the specification to pick back up if the backend read is
revived, which would be inside the next admission cycle, around April.

**Goal**: The detail page shows free places per age cohort, dated so a parent can see how current the number is.

### What to build

- A free-places block on the detail page: cohort labels with counts, led by the date the source published them, and visibly distinct from the snapshot freshness line so the two dates are never confused.
- Copy for the seasonal reality: all-zero or months-old data is the normal state outside the admission cycle and must read as "this is what the municipality last published", not "there are no places".
- Branch rows shown under their parent where the source reports them separately.
- Absent, stale and error states: the block is omitted entirely rather than showing a misleading zero when the backend has nothing.

### Acceptance criteria

- [ ] Counts render per cohort with the source's own date shown before the numbers
- [ ] The free-places date and the snapshot freshness date are visually distinct and separately labelled
- [ ] An institution with no free-places data renders the page without the block and without an error
- [ ] An all-zero table reads as published-and-empty, not as a failure
- [ ] Branch rows appear under their parent institution
- [ ] Screen-reader order puts the date before the numbers; lint/check/test pass

### Validation

Screenshots of an institution with non-zero places, one with all zeros, and one with no data at all — in both themes at mobile width.

---

<!-- PHASES -->

## Epic-level acceptance criteria

- [ ] Phase 2.1 merged and its acceptance criteria met (2.2 is deferred, not pending)
- [ ] Every institution is reachable without knowing an address
- [ ] Status row in [EPICS.md](./EPICS.md) updated to `Done`

~~Availability numbers are never shown without the date they were published~~ —
went with phase 2.2.
