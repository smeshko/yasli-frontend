# TASK-008: Final Validation

Depends on: all prior tasks
Suggested commit: `Validate the Дворът migration`

## Goal

Confirm the plan is fully implemented and production-ready, with runtime
evidence for every acceptance criterion.

## Steps

- [ ] All task checkboxes in `PLAN.md` are ticked
- [ ] `npm run lint` passes with no issues
- [ ] `npm run check` passes with no issues
- [ ] `npm run test` passes, and `git diff main -- 'src/**/*.test.*'` is empty
      (no assertion was edited to accommodate the restyle)
- [ ] `npm run build` succeeds; `dist/fonts/` contains the self-hosted woff2
- [ ] Manual smoke test on `npm run dev`: type `прес`, select from the
      autocomplete with the keyboard, switch every filter, reload to confirm
      sessionStorage restores the result, then repeat with the mouse
- [ ] Contrast re-verified against the *shipped* hexes, not the planned ones —
      every text/background pair ≥4.5:1, every UI/graphic pair ≥3:1
- [ ] Bulgarian smoke string `вгдж икпт цщ ю` checked on `/` and `/pravila`
- [ ] No request to `fonts.googleapis.com` / `fonts.gstatic.com` on any page
- [ ] `grep -rn "#2563eb\|#1d4ed8\|#3b82f6\|#60a5fa\|Inter" src/` is empty
- [ ] `showNav` is still `false`
- [ ] Screenshots captured at 1440px and 390px for: idle home, open
      autocomplete, full results, empty-nursery result, district-fallback
      result, error state, `/pravila`, 404
- [ ] `PLAN.md` acceptance criteria all met, each with its Evidence produced
      (test output, screenshot, log) — no criterion ticked on "the code looks
      right"

## Notes

The dev server is the source of truth. A passing `npm run build` proves the
code compiles, not that the design is correct — every visual criterion needs a
screenshot from a running server.
