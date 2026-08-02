# TASK-004: Restyle the home hero, search field and suggestion panel

Depends on: TASK-002
Suggested commit: `Restyle the hero and address search`

## Goal

Rebuild the above-the-fold search experience in the Дворът register: Cormorant
display headline, the pill field with its hard shadow, and the rounded
suggestion panel.

## Files

- `src/pages/index.astro` — hero, `.search-field`, `.suggestion-panel`,
  `.validation-message`, `.freshness-line` styles
- `src/components/SearchExperience.tsx` — only if a wrapper element is needed
  for the kicker; no behavioural change

## Acceptance

- [ ] H1 renders in Cormorant Garamond with `моята` italic in the nursery hue
      and `градина` underlined in the kindergarten hue
- [ ] Search field is the cream pill with a 2px ink border and a 5px hard
      offset shadow; focus-within shifts it 2px and shrinks the shadow
- [ ] Input font-weight is 500 (not the old 700) and the placeholder is legible
      at AA
- [ ] Suggestion panel is the rounded card with the ink border; the active row
      is tinted with the nursery hue and driven by `data-active`, keeping the
      existing `aria-selected` and `role="option"` contract
- [ ] ArrowUp / ArrowDown / Enter / Escape and mouse selection all behave
      exactly as before
- [ ] The hero still collapses when `[data-has-results]` is set
- [ ] Reduced-motion users get no transition on the collapse
- [ ] `npm run test` passes untouched

Evidence: screenshots of idle hero, open autocomplete with an active row, and
the collapsed hero with results; a keyboard walk-through recorded as a GIF or
as a sequence of screenshots.

## Steps

### RED
- [ ] Capture the current hero, open panel and collapsed states

### GREEN
- [ ] Restyle the hero copy block and headline
- [ ] Restyle `.search-field`, its focus state and the go button
- [ ] Restyle `.suggestion-panel` rows, the active state and the status rows
      (`Зареждаме адресите…`, error + retry, `Няма точен адрес…`)
- [ ] Re-verify keyboard and mouse selection by hand

### REFACTOR
- [ ] Fold duplicated spacing into the token scale from TASK-002

## Notes

`.suggestion-panel` doubles as the container for the loading and error status
rows (`.status-panel`). Restyle both or the error state inherits half the old
design.

The mock's centred hero left-aligns below 620px — keep that; rule 10 of the
anti-slop doc wants the field reachable on mobile.
