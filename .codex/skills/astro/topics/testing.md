# Testing

Three layers: type/build checks (`astro check`), component/unit tests (Container
API + Vitest), and end-to-end (Playwright). For efeonce-think, mirror the repo's
GVC/Playwright discipline for visual verification.

## `astro check` — types + diagnostics

```bash
npx astro check     # type-checks .astro + TS, reports template/type errors
```

Run in CI and locally before shipping. Astro 7's stricter compiler also surfaces
invalid-HTML errors at `astro build`. Treat both as gates.

## Component tests — Container API + Vitest

The Container API renders an Astro component to a string in a test, no browser.

```ts
// vitest, e.g. ScoreDial.test.ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { expect, test } from 'vitest'
import ScoreDial from '../src/components/ScoreDial.astro'

test('renders the score', async () => {
  const container = await AstroContainer.create()
  const html = await container.renderToString(ScoreDial, { props: { score: 82, label: 'Marca' } })
  expect(html).toContain('82')
})
```

For islands (React/Vue components), test them with their framework's testing
tools (Testing Library) directly — they're plain framework components.

> **v7 note:** Container renderer imports moved to the `container-renderer`
> entrypoint: `import { getContainerRenderer } from '@astrojs/react/container-renderer'`.
> Register renderers on the container when testing components that embed islands.

## E2E — Playwright

For real navigation, hydration, forms, and View Transitions, use Playwright
against a running preview:

```bash
astro build && astro preview   # serve the production build
npx playwright test
```

Assert on: island hydration (interaction works after `client:*`), form
submission + progressive enhancement (works with JS disabled), View Transition
navigation, and no console/network errors.

## Visual verification (efeonce-think)

Follow the repo's GVC / Playwright rules for visual review (desktop + mobile
frames, look at the real frame, don't trust assertion-only gates). For a public
render like efeonce-think, verify the actual rendered artifact — see
`efeonce-overlay.md` and the repo's `greenhouse-gvc-playwright` skill.

## What to test where

| Layer | Tool | Catches |
|---|---|---|
| Types + invalid HTML | `astro check` / `astro build` | Template/type/markup errors |
| Component output | Container API + Vitest | Server-render correctness |
| Island behavior | Testing Library | Client interactivity |
| Full flow + visual | Playwright / GVC | Hydration, forms, nav, regressions |

## Hard rules

- **SIEMPRE** run `astro check` + `astro build` as gates (build catches v7
  strict-HTML errors).
- **SIEMPRE** e2e the form's progressive enhancement (works without JS).
- Verify the real rendered frame for public output — don't ship on green
  assertions alone (repo GVC discipline).
