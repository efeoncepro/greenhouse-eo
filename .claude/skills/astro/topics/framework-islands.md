# Framework islands (React / Vue / Svelte / Solid)

Use a UI-framework component when you need client interactivity. Add the
integration, import the component, mark it with a `client:*` directive. See
`topics/islands-hydration.md` for *which* directive; this file covers the
integration mechanics and cross-framework concerns.

## Add an integration

```bash
npx astro add react     # or vue / svelte / solid / preact
```

This installs `@astrojs/react`, adds it to `astro.config.mjs`, and wires the JSX
tsconfig. You can mix frameworks in one project, but prefer **one** island
framework unless there's a strong reason — each adds runtime weight.

```js
// astro.config.mjs
import react from '@astrojs/react'
export default defineConfig({ integrations: [react()] })
```

## Passing props & children

Props pass from `.astro` (server) into the island and must be
**serializable** — they cross the server→client boundary as JSON. No functions,
no class instances, no Dates-as-methods (Dates serialize but arrive as strings on
some paths — pass ISO strings and parse in the island).

```astro
---
import ScoreDial from '../components/ScoreDial.tsx'
const report = await getReport()
---
<ScoreDial client:visible score={report.score} label={report.brand} />
```

You can pass `.astro` children into a framework island via slots/`children`, but
those children render on the server — they're static HTML handed to the island,
not reactive.

## Shared state across islands

Islands don't share a tree. Canonical answer: **nanostores**.

```ts
// stores/filters.ts
import { atom } from 'nanostores'
export const $engine = atom<string | null>(null)
```

```tsx
// two different islands, any framework, stay in sync
import { useStore } from '@nanostores/react'
import { $engine } from '../stores/filters'
const engine = useStore($engine)
```

Alternatives: custom `window` events (loose coupling), or URL query params (state
that should be shareable / survive reload).

## `client:only` — client-rendered islands

For components that can't render on the server (use `window`, `document`, canvas,
WebGL, a browser-only chart lib): `client:only="react"`. They're skipped at SSR,
so **provide a fallback** to avoid layout shift, and size the container.

```astro
<HeatMap client:only="react">
  <div slot="fallback" class="skeleton" style="height:320px" />
</HeatMap>
```

## Framework choice for this repo

Greenhouse's own portal is React/Next — so **React** is the path of least
friction for Astro islands too (shared mental model, shared component patterns).
But an island is not a Next component: no RSC, no Next router, no `next/*`
imports. Keep islands small and self-contained.

## Anti-patterns

- Two island frameworks "because a snippet used Vue" — pick one.
- Passing non-serializable props (functions, live objects) across the boundary.
- A giant island that's really the whole page — push the boundary down.
- Importing server-only code (secrets, db clients) into an island — it ships to
  the browser. Server work stays in the `.astro` fence, an action, or an
  endpoint.

## Hard rules

- **NEVER** import server-only modules (db, secrets) into a `client:*` component.
- **NEVER** pass non-serializable props to an island.
- **SIEMPRE** give `client:only` a sized fallback.
- Keep to one island framework unless justified; default React in this
  ecosystem.
