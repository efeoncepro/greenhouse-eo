# View Transitions (`<ClientRouter />`)

Astro's built-in SPA-like navigation + shared-element animations, built on the
native View Transitions API. Note the component is **`<ClientRouter />`** (from
`astro:transitions`) — renamed from the old `<ViewTransitions />`.

## Enable

Add `<ClientRouter />` to the `<head>` of your base layout. Navigation between
pages then swaps the DOM (no full reload), with an optional cross-fade.

```astro
---
// Layout.astro
import { ClientRouter } from 'astro:transitions'
---
<html>
  <head>
    <ClientRouter />
  </head>
  <body><slot /></body>
</html>
```

This alone gives smooth same-origin nav. It's opt-in and progressive — without
JS, links are normal full-page loads.

## Named transitions (shared elements)

Give an element the same `transition:name` on both pages to morph it across
navigation (e.g. a report card that expands into the report page).

```astro
<!-- list page -->
<article transition:name={`report-${id}`}>…</article>
<!-- detail page -->
<h1 transition:name={`report-${id}`}>…</h1>
```

`transition:animate` picks the animation: `fade` (default), `slide`, `none`, or a
custom animation. `transition:persist` keeps a component's DOM/state across nav
(e.g. a playing `<video>`, an island you don't want to re-init).

## Lifecycle events

Hook navigation with real event names (Astro 7 removed the old
`TRANSITION_*` constant exports — use the strings):

```ts
document.addEventListener('astro:before-preparation', () => {/* start loading UI */})
document.addEventListener('astro:after-swap', () => {/* re-run per-page init */})
document.addEventListener('astro:page-load', () => {/* runs on first load + every nav */})
```

- `astro:page-load` is the important one: use it instead of `DOMContentLoaded`
  for code that must run on every navigation (islands re-init automatically, but
  vanilla `<script>` setup does not unless you listen here).

## Gotchas

- Scripts that ran on first load don't automatically re-run after a transition —
  move their init into an `astro:page-load` listener.
- `transition:persist` an island to keep its state; otherwise it re-hydrates
  fresh on each nav.
- Respect `prefers-reduced-motion` — the API/CSS should disable morphs; compose
  motion doctrine with `motion-design`.
- Works best with `prefetch` (`topics/performance.md`) for instant-feeling nav.

## When to use it

- Multi-page content sites that want app-like smoothness without becoming an SPA
  (efeonce-think: list → report detail morph).
- Not needed for a single-page landing.
- Don't reach for a full client-side router — `<ClientRouter />` gives 90% of the
  feel with none of the SPA cost.

## Hard rules

- **SIEMPRE** use `<ClientRouter />` (not the removed `<ViewTransitions />`).
- **SIEMPRE** move per-navigation vanilla init into `astro:page-load`.
- **SIEMPRE** honor `prefers-reduced-motion` (compose `motion-design`).
- **NEVER** use raw `TRANSITION_*` constant imports (removed in v7) — use the
  `'astro:before-*'` / `'astro:after-*'` event strings.
