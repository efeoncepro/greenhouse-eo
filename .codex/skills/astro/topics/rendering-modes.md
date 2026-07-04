# Rendering modes

Astro renders each route in one of three ways. The mode is chosen by the site's
`output` config **plus** a per-route `prerender` flag. Getting this right is the
single highest-leverage architecture decision in an Astro app.

## The three modes

| Mode | When HTML is built | Needs an adapter | Use for |
|---|---|---|---|
| **Static (SSG)** | Build time, once | No | Content that's the same for everyone: reports, landings, docs, blogs |
| **On-demand / SSR** | Per request, on the server | Yes (Vercel/Node/etc.) | Personalized, auth-gated, request-time data |
| **Prerendered inside a server build** | Build time, but app can also SSR other routes | Yes | Mostly-static app with a few dynamic routes |

## `output` config

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'

export default defineConfig({
  output: 'static', // default — every route prerendered unless it opts out
  // output: 'server', // adapter required — every route SSR unless it opts out
  adapter: vercel(),
})
```

- `output: 'static'` (default) — routes are prerendered. You can still opt a
  single route **into** on-demand rendering with `export const prerender = false`
  (requires an adapter).
- `output: 'server'` — routes are SSR by default. Opt a route **out** (make it
  static) with `export const prerender = true`.

> There is no separate `'hybrid'` value anymore. "Hybrid" is just picking a
> default with `output` and flipping individual routes with `prerender`.

## Per-route control (the important part)

```astro
---
// src/pages/dashboard.astro  (in an output:'server' app)
export const prerender = false   // this route runs at request time
---
```

```astro
---
// src/pages/about.astro  (in the same server app)
export const prerender = true    // this one is baked at build → served from CDN
---
```

**Decision rule:** default the whole app to the mode the *majority* of routes
want, then flip the minority. A report hub is `output: 'static'` and flips the
one or two routes that truly need request-time data. An app is `output: 'server'`
and prerenders its marketing/static routes.

## What forces SSR on a route

A route cannot be prerendered if it needs any of these **at request time**:
`Astro.request` headers, `Astro.cookies` reads, `Astro.session`, dynamic
`Astro.params` not enumerated by `getStaticPaths`, per-user data, server islands
that defer. If a route uses none of those, prerender it.

## Astro 7 note — route caching softens the static/SSR tradeoff

Astro 7 makes **route caching** stable. An SSR route can cache its response with
HTTP semantics, so "needs request-time data" no longer means "recompute every
hit." See `topics/performance.md` for `Astro.cache` + `routeRules` + CDN cache
providers. This lets you keep a route SSR (for correctness) while serving it like
static (for speed).

## 4-pillar

- **Safety** — SSR routes can read auth/session; static routes cannot leak
  per-user data by construction.
- **Robustness** — prerender failures surface at build, not in production.
- **Resilience** — static routes are CDN-served and survive origin outages;
  cache SWR keeps SSR routes serving stale-but-valid on upstream failure.
- **Scalability** — SSG scales to CDN for free; keep the SSR surface small and
  cache-guarded.

## Hard rules

- **SIEMPRE** declare `prerender` explicitly per route in a server/hybrid app.
- **NEVER** SSR a route that has no request-time dependency — it's pure cost.
- **NEVER** assume a route is static because "it looks static" — a single
  `Astro.cookies.get()` silently forces SSR.
