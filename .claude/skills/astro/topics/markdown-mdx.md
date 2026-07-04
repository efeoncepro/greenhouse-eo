# Markdown & MDX

Astro renders `.md` and `.mdx`. Prefer authoring content as **Content Collection
entries** (`topics/content-layer.md`) so it's typed and validated, rather than
loose `.md` pages.

## Astro 7: Sätteri is the default processor

Astro 7 replaced the unified (remark/rehype) pipeline with **Sätteri**, a
Rust-powered Markdown/MDX processor — much faster on large sites. Built-in
features: GFM, smart punctuation, heading IDs, containers, math,
superscript/subscript, wikilinks, frontmatter.

**If you depend on remark/rehype plugins**, opt back into unified:

```bash
npm install @astrojs/markdown-remark
```

```js
// astro.config.mjs
import { unified } from '@astrojs/markdown-remark'
export default defineConfig({
  markdown: {
    processor: unified(),
    remarkPlugins: [/* … */],
    rehypePlugins: [/* … */],
    shikiConfig: { theme: 'github-dark' },
  },
})
```

Only switch back if you actually need specific plugins — Sätteri is the faster
path and covers most needs natively.

## MDX (components in Markdown)

```bash
npx astro add mdx
```

```mdx
---
title: Reporte de marca
---
import ScoreDial from '../../components/ScoreDial.tsx'

# {frontmatter.title}

Texto normal, y un componente interactivo embebido:

<ScoreDial client:visible score={82} />
```

- `.mdx` lets you import and render components (including islands with `client:*`)
  inside prose. `.md` cannot.
- `frontmatter` is available in the MDX body.

## Rendering collection entries

```astro
---
import { getEntry, render } from 'astro:content'
const entry = await getEntry('reports', Astro.params.slug!)
const { Content, headings } = await render(entry!)
---
<Content />
{/* headings → build a table of contents */}
```

- `render(entry)` returns `{ Content, headings }`. `headings` (from IDs) powers a
  TOC.
- Pass components to MDX content via `<Content components={{ h2: MyHeading }} />`.

## Markdown pages (`src/pages/*.md`)

A `.md` file in `src/pages/` is a route directly; its frontmatter can set
`layout:` to wrap it. Fine for a few one-off pages, but structured content
belongs in a collection.

## Hard rules

- **SIEMPRE** model structured content as a Content Collection (typed +
  validated), not loose `.md` pages.
- **NEVER** install `@astrojs/markdown-remark` unless you actually need
  remark/rehype plugins — Sätteri is the faster default.
- Use `.mdx` only when you need components in prose; plain `.md` otherwise.
- `render()` returns `{ Content, headings }` — use `headings` for the TOC.
