# Routing

Astro routing is **file-based**: files under `src/pages/` become routes. `.astro`
and `.md`/`.mdx` files become pages; `.ts`/`.js` files become endpoints (see
`topics/endpoints-middleware.md`).

## File → route mapping

| File | Route |
|---|---|
| `src/pages/index.astro` | `/` |
| `src/pages/about.astro` | `/about` |
| `src/pages/reports/index.astro` | `/reports` |
| `src/pages/reports/[slug].astro` | `/reports/:slug` (one segment) |
| `src/pages/reports/[...path].astro` | `/reports/*` (rest / catch-all) |
| `src/pages/[lang]/[slug].astro` | `/:lang/:slug` |

Access params with `Astro.params`; access the full URL with `Astro.url` (a
`URL`), query with `Astro.url.searchParams`.

## Static dynamic routes need `getStaticPaths`

For a **static** site, every dynamic route must enumerate its pages at build time:

```astro
---
// src/pages/reports/[slug].astro
import { getCollection } from 'astro:content'

export async function getStaticPaths() {
  const reports = await getCollection('reports')
  return reports.map((r) => ({
    params: { slug: r.id },       // fills [slug]
    props: { report: r },         // passed to the page as Astro.props
  }))
}

const { report } = Astro.props
const { slug } = Astro.params
---
```

- `params` keys must match the `[bracket]` names exactly.
- `props` is how you pass the already-loaded entry to the page (avoids
  re-fetching).
- For `[...rest]`, return the path as a slash-joined string:
  `params: { path: 'a/b/c' }`.

## SSR dynamic routes skip `getStaticPaths`

On an on-demand route (`prerender = false`), you don't enumerate — you read
`Astro.params` at request time and fetch:

```astro
---
export const prerender = false
const { slug } = Astro.params
const report = await getReport(slug)
if (!report) return new Response(null, { status: 404 })
---
```

## Redirects

Config-level (static-friendly, no code):

```js
// astro.config.mjs
export default defineConfig({
  redirects: {
    '/old-report': '/reports/latest',
    '/r/[id]': '/reports/[id]',          // param-preserving
    '/gone': { status: 410, destination: '/' },
  },
})
```

Runtime: `return Astro.redirect('/login', 302)` inside a route.

## i18n routing

Astro has built-in i18n routing config — locale prefixes, default locale,
fallbacks, and helpers (`getRelativeLocaleUrl`, etc.).

```js
export default defineConfig({
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,   // '/' for es, '/en/...' for en
    },
    fallback: { en: 'es' },
  },
})
```

Relevant for Efeonce's international footprint (es-CL default, en-US secondary).
Compose the *content* strategy with `info-architecture` / `seo-aeo` (hreflang);
this is just the Astro wiring.

## Route priority

When multiple routes could match, Astro picks the most specific: static segments
beat dynamic `[param]` beats rest `[...spread]`. Named routes beat catch-alls.
Endpoints and pages share the namespace — don't collide `foo.astro` with
`foo.ts`.

## Hard rules

- **SIEMPRE** enumerate static dynamic routes in `getStaticPaths`; a missing
  entry = a missing page (404), silently.
- **NEVER** re-fetch in the page body what `getStaticPaths` already loaded — pass
  it via `props`.
- **NEVER** collide a page and an endpoint on the same path.
- Prefer config `redirects` over runtime redirects for permanent moves (works in
  static, no SSR cost).
