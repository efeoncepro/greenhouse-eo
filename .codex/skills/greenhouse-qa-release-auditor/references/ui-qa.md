# UI QA

UI changes require visual evidence, not just TypeScript/tests.

Required questions:

- What route/surface/state changed?
- Is there GVC evidence for desktop and mobile?
- Were the PNG frames actually inspected?
- Are loading, empty, error, degraded, success, and permission states honest?
- Is keyboard/focus/reduced-motion behavior covered when interactive?
- Are console errors, hydration errors, 4xx/5xx, overflow, clipping, tiny targets,
  color-only state, and nested cards checked?
- Is reusable visible copy in `src/lib/copy/*` or canonical nomenclature?
- Are Greenhouse primitives/tokens used instead of parallel local UI?

Preferred gates:

- `pnpm fe:capture <scenario> --env=local`
- `pnpm fe:capture:review <scenario-or-capture-dir>`
- `pnpm design:lint`
- `greenhouse-gvc-playwright`
- `greenhouse-ui-enterprise-review`

Blockers:

- No GVC/screenshot evidence for visible UI.
- Mobile is a squeezed desktop or clips content.
- Partial/degraded data appears complete.
- Important state is color-only.
- The visible behavior differs from the accepted mockup/runtime contract.
