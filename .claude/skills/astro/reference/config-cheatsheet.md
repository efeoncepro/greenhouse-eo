# `astro.config.mjs` cheatsheet (Astro 7)

Annotated config surface. Load the topic file for depth on any key.

```js
import { defineConfig, envField } from 'astro/config'
import { memoryCache } from 'astro/config'
import { logHandlers } from 'astro/config'
import vercel from '@astrojs/vercel'
import sitemap from '@astrojs/sitemap'
import mdx from '@astrojs/mdx'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  // --- Identity (load-bearing for SEO) ---
  site: 'https://think.efeoncepro.com',   // required: canonical, sitemap, RSS, OG
  base: '/',                              // sub-path deploys
  trailingSlash: 'ignore',                // 'always' | 'never' | 'ignore'

  // --- Rendering ---
  output: 'static',                       // 'static' | 'server' (per-route prerender flips it)
  adapter: vercel(),                      // required for any on-demand route

  // --- Integrations & Vite plugins ---
  integrations: [sitemap(), mdx()],
  vite: { plugins: [tailwind()] },        // Tailwind v4 via Vite plugin (NOT @astrojs/tailwind)

  // --- Typed env (astro:env) ---
  env: {
    schema: {
      PUBLIC_SITE_NAME: envField.string({ context: 'client', access: 'public' }),
      GRADER_API_URL:   envField.string({ context: 'server', access: 'public' }),
      GRADER_API_KEY:   envField.string({ context: 'server', access: 'secret' }),
    },
  },

  // --- Images ---
  image: {
    domains: ['cdn.efeoncepro.com'],
    remotePatterns: [{ protocol: 'https', hostname: '**.efeoncepro.com' }],
  },

  // --- Markdown (Astro 7: Sätteri default) ---
  markdown: {
    // processor: unified(),  // opt back into remark/rehype (needs @astrojs/markdown-remark)
    // remarkPlugins: [], rehypePlugins: [], shikiConfig: { theme: 'github-dark' },
  },

  // --- Prefetch ---
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  // --- Route caching (Astro 7: now top-level, was experimental) ---
  cache: memoryCache(),
  routeRules: { '/reports/[...path]': { maxAge: 300, swr: 60 } },

  // --- Logging (Astro 7: top-level; JSON logs for AI agents) ---
  logger: logHandlers.compose(logHandlers.console(), logHandlers.json()),

  // --- i18n ---
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
    fallback: { en: 'es' },
  },

  // --- Redirects ---
  redirects: { '/old': '/new', '/r/[id]': '/reports/[id]' },

  // --- Sessions (forces on-demand on routes that use them) ---
  session: { driver: 'redis', options: { url: process.env.REDIS_URL } },

  // --- Advanced Routing (Astro 7): rename or disable src/fetch.ts ---
  // fetchFile: './src/router.ts',   // or null to disable
})
```

## Astro 7 config deltas (moved out of `experimental`)

| Was `experimental.*` in v6 | Now (v7) |
|---|---|
| `experimental.cache` (+ route rules) | top-level `cache` + `routeRules` |
| `experimental.logger` | top-level `logger` |
| `experimental.queuedRendering` | default (remove the flag) |
| `experimental.rustCompiler` | default (remove the flag) |
| `experimental.advancedRouting` | default `src/fetch.ts` (remove the flag) |

## Removed / changed

- `compressHTML` default: `true` → `'jsx'` (whitespace between inline elements
  stripped). Set `compressHTML: true` to restore v6 behavior.
- `@astrojs/db` removed — use `node:sqlite` (Node 22.5+), Drizzle, Turso, etc.
- `@astrojs/tailwind` deprecated — use `@tailwindcss/vite` (Tailwind v4).
- Node minimum: **22.12+** (even-numbered only; Node 20 dropped).
