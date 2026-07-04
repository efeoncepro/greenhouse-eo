# Content Collections + Content Layer

Astro's typed, validated content system. For a content-driven site (a report
hub, blog, docs, marketing pages backed by structured data), **model content as
collections** — never scatter raw `fs` / `import.meta.glob` reads.

## Where config lives (v5+)

The collection config file is **`src/content.config.ts`** (moved from the old
`src/content/config.ts`). This is the single source of truth for your content
shape.

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content'
import { glob, file } from 'astro/loaders'

const reports = defineCollection({
  // Content Layer loader: where the entries come from
  loader: glob({ pattern: '**/*.md', base: './src/content/reports' }),
  // Zod schema: validated at build; wrong content = build error, not runtime bug
  schema: z.object({
    title: z.string(),
    brand: z.string(),
    score: z.number().min(0).max(100),
    publishedAt: z.coerce.date(),
    engines: z.array(z.enum(['chatgpt', 'gemini', 'perplexity', 'copilot', 'google'])),
    draft: z.boolean().default(false),
  }),
})

const authors = defineCollection({
  loader: file('./src/content/authors.json'), // a single JSON/YAML file of entries
  schema: z.object({ id: z.string(), name: z.string(), avatar: z.string().optional() }),
})

export const collections = { reports, authors }
```

## The Content Layer

The **Content Layer** is the loader system. A collection's `loader` decides
where entries come from:

- **`glob({ pattern, base })`** — many files (Markdown/MDX/JSON/YAML) matched by
  a glob. The default for file-backed content.
- **`file(path)`** — one file containing an array/record of entries.
- **A custom loader** — a function that fetches from anywhere (CMS, API,
  database, the Greenhouse headless model) at build time and returns entries.
  This is the key extension point.

```ts
// Custom loader: pull report data from an external API at build time
import type { Loader } from 'astro/loaders'

function graderLoader(opts: { endpoint: string }): Loader {
  return {
    name: 'grader-loader',
    async load({ store, logger, parseData, generateDigest }) {
      const res = await fetch(opts.endpoint)
      const items = await res.json()
      store.clear()
      for (const item of items) {
        const data = await parseData({ id: item.slug, data: item })
        store.set({ id: item.slug, data, digest: generateDigest(data) })
      }
    },
  }
}
```

> **Astro 7:** *live loaders* can attach a **cache hint** (tags + last-modified)
> to the data they return, so route caching can invalidate content precisely.
> See `topics/performance.md`.

## Reading content

```astro
---
import { getCollection, getEntry, render } from 'astro:content'

// All non-draft reports, newest first
const reports = (await getCollection('reports', ({ data }) => !data.draft))
  .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime())

// One entry
const entry = await getEntry('reports', Astro.params.slug!)
if (!entry) return Astro.redirect('/404')

// Render Markdown/MDX body to a component
const { Content, headings } = await render(entry)
---
<article>
  <h1>{entry.data.title}</h1>
  <Content />
</article>
```

- `getCollection(name, filter?)` — all entries, optional filter.
- `getEntry(name, id)` — one entry by id (the file slug / `id` field).
- `render(entry)` — returns `{ Content, headings }`; `<Content />` renders the
  body. (Replaces the old `entry.render()` method.)
- `data` is fully typed from your Zod schema — autocomplete + build-time
  validation.

## Generating routes from a collection

```astro
---
// src/pages/reports/[slug].astro  (static site)
import { getCollection, render } from 'astro:content'

export async function getStaticPaths() {
  const reports = await getCollection('reports')
  return reports.map((r) => ({ params: { slug: r.id }, props: { report: r } }))
}

const { report } = Astro.props
const { Content } = await render(report)
---
<h1>{report.data.title}</h1>
<Content />
```

## Why collections over raw reads

- **Type safety** — `data` is typed; a typo in a field is a compile/build error.
- **Validation at build** — bad content fails the build, not production.
- **Loader abstraction** — swap file-backed for API-backed without touching call
  sites (SSOT for content shape).
- **Performance** — the Content Layer builds an optimized store, not N filesystem
  reads per page.

## Hard rules

- **NEVER** `import.meta.glob` structured content that has a schema — use a
  collection so it's validated.
- **NEVER** duplicate the content shape across call sites — the Zod schema in
  `content.config.ts` is the SSOT.
- **SIEMPRE** filter drafts in `getCollection` (don't leak `draft: true`).
- For efeonce-think specifically: a custom loader that pulls the Greenhouse
  headless model keeps the "dumb render" contract — Astro validates and renders,
  the model computes. See `efeonce-overlay.md`.
