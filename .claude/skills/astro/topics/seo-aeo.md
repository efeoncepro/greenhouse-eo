# SEO / AEO wiring in Astro

This file is **only the Astro mechanics**. SEO/AEO *strategy* — what to optimize,
structured-data content, `llms.txt` policy, citability, per-engine tactics — is
owned by the **`seo-aeo`** skill. Load that for the "what"; use this for the
"how in Astro." For a site that is itself graded by an AI-visibility tool
(efeonce-think), crawlable HTML + CWV are first-order signals.

## `<head>` / metadata

Centralize in a `<SEO>` component or the base `Layout`, driven by props/content.

```astro
---
// components/SEO.astro
interface Props { title: string; description: string; canonical?: string; ogImage?: string }
const { title, description, canonical, ogImage } = Astro.props
const canonicalURL = new URL(canonical ?? Astro.url.pathname, Astro.site)
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonicalURL} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalURL} />
{ogImage && <meta property="og:image" content={ogImage} />}
<meta name="twitter:card" content="summary_large_image" />
```

`Astro.site` (from `site` config) is required for absolute canonical/OG URLs —
set it per environment.

## Sitemap

```bash
npx astro add sitemap
```

```js
import sitemap from '@astrojs/sitemap'
export default defineConfig({ site: 'https://think.efeoncepro.com', integrations: [sitemap()] })
```

Generates `/sitemap-index.xml` at build. Reference it in `robots.txt`. Needs
`site` set.

## RSS

```ts
// src/pages/rss.xml.ts
import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'

export async function GET(context) {
  const reports = await getCollection('reports', ({ data }) => !data.draft)
  return rss({
    title: 'Efeonce Think',
    description: '…',
    site: context.site,
    items: reports.map((r) => ({
      title: r.data.title, pubDate: r.data.publishedAt, link: `/reports/${r.id}/`,
    })),
  })
}
```

## Structured data (JSON-LD)

Emit JSON-LD in the `<head>` for rich results / entity signals. **Content** of
the schema (which type, which properties, E-E-A-T) is a `seo-aeo` decision;
Astro just prints it.

```astro
---
const jsonLd = { '@context': 'https://schema.org', '@type': 'Report', name: report.data.title /* ... */ }
---
<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} is:inline />
```

## `llms.txt` / AI crawler files

Serve `llms.txt` (and `robots.txt`) from `public/` (stable path) or generate at
build via an endpoint. **What goes in them** is `seo-aeo`'s call; Astro just
serves the file. Since efeonce-think is graded by AI engines, this is part of the
product's own visibility surface.

## Astro's SEO advantages

- **Zero-JS HTML** — content is in the initial HTML, fully crawlable by search
  and AI engines (no JS-execution dependency). This is the biggest structural SEO
  win of the island model.
- **Fast builds → fresh content**, **fast pages → CWV**.
- Server-rendered `<head>` per route with real content, not client-injected.

## Hard rules

- **SIEMPRE** set `site` — canonical/sitemap/RSS/OG all depend on it.
- **SIEMPRE** keep primary content in server-rendered HTML (not client-injected)
  so it's crawlable.
- **NEVER** decide SEO/AEO *strategy* here — load `seo-aeo` for that; this file is
  the wiring only.
