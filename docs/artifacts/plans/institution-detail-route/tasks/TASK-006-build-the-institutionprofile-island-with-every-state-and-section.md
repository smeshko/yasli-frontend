# TASK-006: Build the InstitutionProfile island with every state and section

Depends on: TASK-002,TASK-005
Suggested commit: `feat(institution): add the InstitutionProfile island`

## Goal

A React island that loads one institution by `(kind, external_id)` and
renders every section and state the phase names, with per-kind honesty rules,
all copy in Bulgarian, and every state asserted by SSR-markup tests.

## Files

- `src/components/InstitutionProfile.tsx` — new. Two exports:
  - `InstitutionProfileView(props)` — pure presentation:
    `{ status, profile, context, now?, onRetry }` where `status` is
    `"loading" | "success" | "error" | "not_found"`, `profile` is
    `InstitutionProfile | null`, `context` is `StoredMatchContext | null`,
    `now` defaults to `new Date()` (passed explicitly in tests).
  - `InstitutionProfile({ kind, externalId })` — the island. Owns state;
    in `useEffect` on mount it calls `getInstitutionBySource` and reads
    `findStoredMatchContext(loadStoredSearchState(), kind, externalId)`.
    Renders the View. Nothing touches `window` or `Date` during render.
    Requests go through `createProfileLoader` (below), built once per
    `(kind, externalId)` with `useMemo`: the mount effect calls `load()`,
    `onRetry` calls `load()` again. `onStart` sets `status` to `"loading"`
    synchronously — the error block and its button unmount, so a double
    click cannot start two requests — and only the newest request's result
    ever reaches state.
- `src/lib/institutions/profileLoader.ts` — new, framework-free:
  `createProfileLoader<T>({ fetch: () => Promise<T>, onStart: () => void, onResult: (result: T) => void })`
  → `{ load(): Promise<void> }`. Each `load()` calls `onStart()`, bumps a
  generation counter, awaits `fetch()`, and calls `onResult` only if its
  generation is still the latest; a completion from an older `load()` is
  dropped. This is the retry-race guard, extracted so it can be unit-tested
  without effects.
- `src/lib/institutions/profileLoader.test.ts` — new.
- `src/components/InstitutionProfile.test.tsx` — new.

Sections and copy (constants at the top of the file):

- **Loading** — `<p className="profile-status" role="status">Зареждаме данните за институцията…</p>`
- **Error** — `<div className="profile-status profile-status--error" role="alert">` with
  `Не успяхме да заредим данните за институцията.` and a
  `<button type="button">Опитайте отново</button>` calling `onRetry`
- **Not found** — same container, `Институцията вече не е в източника. Възможно е да е премахната или преименувана.`
  plus `<a className="button" href="/">Към търсенето</a>`
- **Context** (only when `context` is set) — `<p className="profile-context" role="note">`;
  basis `address`: `Обслужва вашия адрес: {addressLabel}.`;
  basis `district`: `Във вашия район — търсихте {addressLabel}. Съвпадението е по район, не по точен адрес.`
- **Stale banner** — `<div className="stale-banner">{STALE_BANNER_TEXT}</div>`
  when `isSnapshotStale(profile.last_seen_at, now)`
- **Адрес** — `<section aria-labelledby>` + `<h2>`; `address` text, or
  `<p className="profile-empty">Адресът не е публикуван в източника.</p>`
- **Контакти** — `<dl>` with a row per non-null field: `Телефон` →
  `<a href="tel:<digits, whitespace stripped>">`; `Имейл` → `mailto:`;
  `Директор` → text; `Уебсайт` → external link whose `href` is
  `normalizeWebsiteUrl(profile.website)` (TASK-002; the row is omitted when
  it returns `null`, so a `javascript:` or malformed value never becomes a
  link), `target="_blank" rel="noreferrer"`,
  `<span aria-hidden="true">↗</span>`. No row rendered (all four null, or
  the only non-null one normalised away) →
  `<p className="profile-empty">Няма публикувани контакти.</p>`
- **Catchment, per kind** (`labelForReceptionKind` never appears here):
  - `nursery` — `<h2>Район</h2>`; `district_code` →
    `Яслата обслужва район {labelForDistrict(code)}.`; null →
    `Районът на яслата не е потвърден в източника.`; always followed by
    `<p className="profile-note">` with the existing `NURSERY_ADMISSION_NOTE`
    text. **Never** renders `coverage`, even if non-empty.
  - `preschool` — `<h2>Район на прием</h2>`; empty `coverage` →
    `<p className="profile-empty">` with the §5 copy verbatim
    (`Няма публикувано райониране за това адресно местоположение. Подайте заявление в избрано от вас училище — Община Варна не задължава да се запишете в конкретно.`);
    else the street list
  - `kindergarten` — `<h2>Район на прием</h2>`; empty →
    `Няма публикуван район на прием за тази градина в източника.`; else the
    street list. **Never** prints a district.
  - Street list — `<ul className="profile-coverage">`, one `<li>` per
    `coverage` group in API order: `<strong>{formatStreetLabel(street)}</strong>`
    then the numbers via `formatAddressNumber`, joined with `, `
- **Филиали** — only when `branches.length > 0`: `<h2>` + `<ul>`; each item
  is text: `label — address` when both are non-blank, otherwise whichever is;
  `location` is ignored here (phase 1.2)
- **Meta** — `<p className="profile-meta">Последна актуализация: {formatFreshnessDate(new Date(last_seen_at))}</p>`
  and `<a href={source_url} target="_blank" rel="noreferrer">Официален източник <span aria-hidden="true">↗</span></a>`

## Acceptance

- [ ] `renderToStaticMarkup(<InstitutionProfile kind="kindergarten" externalId="46" />)`
      renders the loading state (effects do not run in SSR)
- [ ] View tests: loading has `role="status"`; error has `role="alert"` and the
      retry button; not-found has `href="/"`
- [ ] Kindergarten success: address, `href="tel:…"` and `href="mailto:…"`,
      website with `target="_blank" rel="noreferrer"` and `↗`, the three
      street labels appear in the given order (assert by index), numbers
      rendered as `014, 014А, 015 вх.А`, four branch lines, the source link,
      the freshness line; no district name anywhere
- [ ] Nursery with non-empty `coverage`: district name present, no
      `profile-coverage` node, the admission note present
- [ ] Preschool with empty `coverage`: the §5 sentence verbatim
- [ ] Kindergarten with empty `coverage` and all contacts null: its own line
      and `Няма публикувани контакти.`
- [ ] Stale: `last_seen_at` 30 days before `now` → banner; 2 days → none
- [ ] Context: both basis strings; `context: null` → no `profile-context` node
- [ ] Website: `website: "javascript:alert(1)"` with the other three contacts
      null renders no `Уебсайт` row and the `Няма публикувани контакти.`
      line; `website: "dg13.bg"` renders `href="https://dg13.bg"`
- [ ] `profileLoader.test.ts` (deterministic, two controllable promises):
      `load()` twice; the second fetch resolves with success, then the first
      resolves with an error → `onResult` called exactly once, with the
      success; `onStart` called twice. A single `load()` forwards its result.
      A third `load()` after both settled forwards its own result
- [ ] The island wiring of the loader (loading-first retry, second request)
      is demonstrated at runtime in TASK-007 (D3) — effects do not run
      under `renderToStaticMarkup`
- [ ] Every user-facing string in the file is Bulgarian
- [ ] `npm run lint`, `npm run check`, `npm run test` pass

Evidence: `npm run test` output listing each case above; a
`grep -n "[A-Za-z]\{4,\}" ` review of string literals showing no English copy.

## Steps

### RED
- [ ] Write the View test matrix with a `profile()` factory (like
      `matchResult()` in `SearchResults.test.tsx`) and a fixed `now`

### GREEN
- [ ] Implement `createProfileLoader` (RED first: the out-of-order test),
      the View, then the island container wiring the loader and the
      stored-search read in its mount effect

### REFACTOR
- [ ] Extract section components only where it shortens the file; keep all
      copy as named constants

## Notes

`formatStreetLabel` and `formatAddressNumber` already exist
(`addressSuggestions.ts`, `address.ts`); `StreetSummary` matches
`formatStreetLabel`'s parameter structurally. Do not re-sort `coverage`.

Treat `""` and `null` alike for branch `label`/`address` and for contacts
(`trim()` falsy = absent) — backend 1.3 promises `null`, real CSV rows carry
`""`.

The `data-kind` tone and all styling belong to TASK-007; this task ships
class names only.
