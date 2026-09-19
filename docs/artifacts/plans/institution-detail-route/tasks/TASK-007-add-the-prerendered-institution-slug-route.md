# TASK-007: Add the prerendered /institution/[slug] route

Depends on: TASK-001,TASK-003,TASK-006
Suggested commit: `feat(institution): prerender the institution detail route`

## Goal

`npm run build` emits one `/institution/<kind>-<external_id>/` page per
manifest row with a static header, the island below it, page styles in the
Дворът system, visible focus rings, and the site 404 for unknown slugs.

## Files

- `src/pages/institution/[slug].astro` — new. Frontmatter imports the
  manifest JSON, `manifestToStaticPaths`, `parseInstitutionNumber`,
  `labelForReceptionKind`, `BaseLayout`, `InstitutionProfile`;
  `export const getStaticPaths = () => manifestToStaticPaths(manifest)`;
  `type Props = InferGetStaticPropsType<typeof getStaticPaths>`.
  Markup: `<BaseLayout title={`${name} — Ясли Варна`} description={`${kindLabel}: адрес, контакти, район на прием и филиали.`}>`,
  `<article class="profile section-stack" data-kind={kind}>`,
  `<a class="profile-back" href="/">← Обратно към търсенето</a>`,
  `<p class="eyebrow">{kindLabel}{number ? ` №${number}` : ""}</p>`,
  `<h1>{name}</h1>`, `<InstitutionProfile client:load kind={kind} externalId={external_id} />`.
  `<style is:global>` for every `profile-*` class the island emits.
- `src/layouts/BaseLayout.astro` — add one standalone `.stale-banner` rule
  with the merged result of the two `index.astro` groups it currently shares
  with `.results-status`: `border: 2px solid var(--color-border-error)`,
  `border-radius: var(--radius-surface)`, `margin-top: 18px`,
  `background: var(--color-bg-error-soft)`, `color: var(--color-text-error)`,
  `font-weight: 500`, `padding: 16px 18px`.
- `src/pages/index.astro` — drop `.stale-banner` from the two grouped
  selectors (`.results-status, .stale-banner` at ~288 and
  `.results-status.error, .stale-banner` at ~298); the `.results-status`
  declarations stay exactly as they are.
- `docs/ARCHITECTURE.md` — routes list and "Source layout" updated.

Styles (tokens only; no new colours):

- `.profile[data-kind="…"]` sets `--tone` from the matching
  `--color-section-*`, the same way `.result-group[data-kind]` does
- `.profile section` — surface card: `background: var(--color-bg-surface)`,
  `border: 2px solid var(--color-border-card)`, `border-radius: var(--radius-surface)`,
  `box-shadow: var(--shadow-hard)`; `h2` in the display face
- `.profile-context` — the `.group-note` treatment (`border-left: 4px solid var(--tone)`)
- `.profile-status` / `.profile-status--error` — the `.results-status` /
  `.results-status.error` look, using the same tokens
  (`--color-border-card`, `--color-bg-surface`, `--color-text-muted`;
  error: `--color-border-error`, `--color-bg-error-soft`, `--color-text-error`)
- `.profile dl` — two-column grid on desktop, stacked under 720px
- `.profile-coverage li` — street label bold, numbers wrapping inline
- `.profile-empty`, `.profile-note`, `.profile-meta` — muted text
- `.profile a:focus-visible, .profile button:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 3px; }`
- no transitions or animations added (nothing for reduced-motion to override)

## Acceptance

- [ ] With no backend running, `npm run build` succeeds and
      `ls dist/institution | wc -l` equals the manifest row count;
      `dist/institution/kindergarten-46/index.html` contains the `<h1>` name,
      the eyebrow with `№13`, and the island's loading markup
- [ ] `npm run preview`: `curl -s -o /dev/null -w '%{http_code}' localhost:4321/institution/kindergarten-999999/`
      → `404`, and the body is the site 404 page
      (`Страницата не е намерена`)
- [ ] `npm run dev` + fixture: the five TASK-003 slugs render their states
      (full kindergarten, nursery, preschool, empty kindergarten, in-page
      not-found); `D2` shows the stale banner; `D3` shows the error state,
      its retry switches to the loading state at once (the button is gone
      while the request is in flight) and re-issues the request (network
      panel shows a second request)
- [ ] Tab from the top of the page reaches the back link, every contact link,
      the source link and (in error state) the retry button, each with a
      visible ring, in light and dark
- [ ] `/` with `FIXTURE_SCENARIO=S6` still renders the stale banner styled as
      before (the rule moved, not changed)
- [ ] `npm run lint`, `npm run check`, `npm run test` pass

Evidence: the `ls … | wc -l` line next to
`node -e "console.log(require('./src/data/institutions-manifest.json').length)"`;
the `curl` status line; screenshots of the five states, the D2 banner, D3
error, and the focus walk in both themes at 390px.

## Steps

### RED
- [ ] Build once before the route exists and record `ls dist/institution`
      failing — the before-state

### GREEN
- [ ] Create the route with `getStaticPaths` and the static header
- [ ] Mount the island; move `.stale-banner`; write the page styles

### REFACTOR
- [ ] Walk the page at 390px in both themes and tighten spacing where a
      section breaks the `section-stack` rhythm

## Notes

`astro dev` also honours `getStaticPaths`, so only manifest slugs resolve —
the fixture keys in TASK-003 are real slugs for this reason.

The eyebrow and `<h1>` come from the manifest, not from the API response; a
renamed institution shows the manifest name until
`npm run institutions:manifest` is re-run. This is a known limitation, not a
bug to fix here.

`showNav` stays `false`; the back link is the page's only way home besides
the brand mark.
