# Islands & partial hydration

The island model: the page is static HTML; interactivity is added as isolated,
independently-hydrated "islands." You pay JavaScript **only** for the components
you mark, and each one boots on its own.

## The `client:*` directives

Put a directive on a framework component (React/Vue/Svelte/Solid) to make it an
island. Without a directive, the component renders to HTML at build/request and
ships **zero JS**.

| Directive | Hydrates when | Use for |
|---|---|---|
| `client:load` | Immediately on page load | Above-the-fold, critical interactivity (primary CTA, nav) |
| `client:idle` | When the main thread is idle (`requestIdleCallback`) | Important but not instant (below-fold widgets) |
| `client:idle={{timeout: 500}}` | Idle, or after timeout ms | Bound the wait |
| `client:visible` | When it scrolls into view (`IntersectionObserver`) | Anything below the fold — the default for most islands |
| `client:visible={{rootMargin: '200px'}}` | Just before it enters view | Pre-warm so it's ready on arrival |
| `client:media="(max-width: 640px)"` | When the media query matches | Mobile-only / desktop-only interactivity |
| `client:only="react"` | Never SSR'd — client-only render | Components that can't run on the server (browser-only libs). **Must name the framework.** |

```astro
---
import Counter from '../components/Counter.tsx'
import HeavyChart from '../components/HeavyChart.tsx'
import BrandGraderForm from '../components/BrandGraderForm.tsx'
---
<Counter client:load />
<HeavyChart client:visible={{ rootMargin: '200px' }} />
<BrandGraderForm client:visible />   {/* below-the-fold form */}
```

## Decision tree — "should this be an island?"

1. **Does it need JS to do its job at all?** (state, events, effects) → if no,
   it's a plain `.astro` component. Ship zero JS. Stop.
2. **Is it above the fold and part of the first interaction?** → `client:load`.
3. **Is it below the fold?** → `client:visible` (optionally with `rootMargin` to
   pre-warm). This is the correct default for most forms, tabs, accordions.
4. **Only mobile or only desktop?** → `client:media`.
5. **Can it even render on the server?** (uses `window`, `document`, a
   canvas/WebGL lib) → `client:only="framework"`. Provide a fallback so the
   layout doesn't jump.

**Put the boundary as low as possible.** Hydrate the interactive leaf, not its
wrapper. A `<ReportLayout>` should not be an island just because it contains one
interactive tab — make the tab the island.

## Server islands (`server:defer`)

Stable since Astro 5. Render most of the page statically/cached, but defer a
per-request fragment (personalized greeting, live count, auth-gated block)
without making the whole route SSR.

```astro
---
import Avatar from '../components/Avatar.astro'
---
<Avatar server:defer>
  <div slot="fallback">Cargando…</div>   {/* shown while the island loads */}
</Avatar>
```

The outer page can be static/cached; `Avatar` is fetched separately at request
time. Great for a mostly-static page with one dynamic corner — the opposite
direction from a client island (server islands defer *server* work, not client
interactivity).

## Sharing state between islands

Islands are isolated — no shared component tree. To coordinate:

- **nanostores** (`@nanostores/react` etc.) — a tiny framework-agnostic store.
  Two islands import the same atom and stay in sync. This is the canonical Astro
  answer.
- **Custom events** on `window` / `document` for loose coupling.
- **URL / query params** for state that should survive reload or be shareable.

If two islands need to share a lot of state, that's a smell — consider whether
they should be one island, or whether the state belongs in the URL.

## Anti-patterns

- Hydrating a whole layout/page wrapper because one child is interactive.
- `client:load` on everything "to be safe" — kills the zero-JS advantage.
- A React island that only renders static markup — it should be a `.astro`
  component.
- Reaching for a global state manager (Redux) across islands instead of a small
  store or the URL.

## Hard rules

- **NEVER** put business logic in an island of a dumb-render site — see
  `efeonce-overlay.md`.
- **NEVER** default to `client:load`; default to `client:visible` and justify
  anything eagerer.
- **SIEMPRE** give `client:only` a fallback slot / skeleton to avoid layout
  shift.
