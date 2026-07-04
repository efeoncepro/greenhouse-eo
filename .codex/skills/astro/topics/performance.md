# Performance

Astro's default *is* the performance win: zero JS unless you opt in. Most perf
work is (1) not undoing that default and (2) using route caching for SSR. Deep
CWV budgets/thresholds live in `web-perf-design` — this file is the Astro wiring.

## The default you must not undo

- Ship zero JS for static content; hydrate only interactive leaves
  (`topics/islands-hydration.md`).
- Prefer `.astro` over framework components for static markup.
- Prefer `client:visible` over `client:load`; each eager island is main-thread
  cost at load.

## Prefetch

Astro can prefetch links so navigation feels instant.

```js
// astro.config.mjs
export default defineConfig({
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' }, // 'hover'|'tap'|'viewport'|'load'
})
```

Or per link: `<a href="/reports" data-astro-prefetch="viewport">`. Pairs well
with View Transitions for near-instant nav (`topics/view-transitions.md`).

## Route caching (Astro 7, stable)

SSR routes no longer mean "recompute every hit." Cache the response with HTTP
semantics — this closes most of the gap between static and SSR.

```astro
---
export const prerender = false
Astro.cache.set({ maxAge: 120, swr: 60, tags: ['reports'] })
const data = await getLiveReports()
---
```

- `maxAge` — fresh window (seconds).
- `swr` — stale-while-revalidate window; serve stale, refresh in background
  (resilience against upstream blips).
- `tags` — group responses for targeted invalidation: `cache.invalidate({ tags: ['reports'] })`.

Configure a provider once and route rules globally:

```js
import { memoryCache } from 'astro/config'
export default defineConfig({
  cache: memoryCache(),                       // dev / single-node
  routeRules: { '/reports/[...path]': { maxAge: 300, swr: 60 } },
})
```

**CDN cache providers (experimental)** push caching to the host edge:
`cacheVercel` (`@astrojs/vercel/cache`), `cacheNetlify`, `cacheCloudflare`.

## Live loaders + cache hints

A Content Layer live loader can return **cache hints** (tags + last-modified) so
content-backed routes invalidate precisely when the source changes — no blunt
full rebuild. See `topics/content-layer.md`.

## Images

Use `astro:assets` (`<Image>`/`<Picture>`) — optimized, lazy, responsive by
default. Give the LCP image explicit dimensions + `fetchpriority="high"`. See
`topics/images-assets.md`.

## Build performance (Astro 7)

Astro 7 is the fastest yet: Rust `.astro` compiler, Rust Markdown/MDX (Sätteri),
queued rendering (stable, ~2.4× vs recursive), Vite 8 / Rolldown. Real builds
report 15–61% faster. You mostly get this for free by upgrading — just verify
custom Vite plugins against Vite 8.

## Measuring

- `astro build` prints per-route output; watch bundle size of island chunks.
- Lighthouse / CWV on the deployed URL (compose thresholds with
  `web-perf-design`; for efeonce-think use GVC per repo tooling).
- The site being AEO-graded means CWV + crawlable HTML are *ranking/citation*
  signals, not just UX — see `topics/seo-aeo.md`.

## Hard rules

- **NEVER** trade the zero-JS default for convenience (blanket `client:load`).
- **SIEMPRE** cache SSR routes that fetch upstream (`maxAge` + `swr`).
- **SIEMPRE** size + prioritize the LCP image.
- Defer CWV budgets/thresholds to `web-perf-design`; this is the wiring.
