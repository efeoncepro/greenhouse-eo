# Migrating to Astro 7

Astro 7.0 shipped **2026-06-22**. It's a low-risk upgrade whose breaking changes
are **narrow and loud** (clear errors, not silent regressions), plus real speed
wins from a Rust rewrite. This file pins the concrete deltas verified against the
official 7.0 release notes + v7 upgrade guide.

## Upgrade command

```bash
npx @astrojs/upgrade      # bumps astro + official integrations together
# or: npm install astro@latest && update @astrojs/* to matching majors
```

Then work through the breaking changes below and run `astro check` + `astro build`.

## Requirements

- **Node 22.12+** — even-numbered versions only. **Node 20 is dropped.** Bump
  local, CI, and the deploy host (Vercel project Node version, Cloud Run image).

## Under-the-hood rewrites (mostly free, verify plugins)

- **Rust `.astro` compiler** (replaces the Go compiler; oxc parser + Lightning
  CSS; native binaries with WASM fallback). Faster — and **stricter** (see HTML
  below).
- **Vite 8 + Rolldown** (Rust bundler replacing esbuild/Rollup, "10–30× faster
  than Rollup" in benchmarks). Existing `vite.esbuild` / `vite.rollupOptions` are
  auto-converted, but **review custom Vite plugins** against the Vite 8 migration
  guide.
- **Sätteri** Rust Markdown/MDX processor (replaces unified/remark/rehype default).
- **Queued rendering** now default (~2.4× vs the old recursive renderer).
- Net: real builds report **15–61% faster**.

## Breaking changes (act on these)

### 1. Stricter HTML parsing (the one most likely to bite)
The Rust compiler no longer auto-corrects invalid HTML — it **errors** with
file+line. Fix the markup; it's catching real bugs.
```astro
<!-- Before: silently accepted / restructured -->
<p>Hello world<p>Hello world</p>
<p><div>Content</div></p>
<!-- After: required valid markup -->
<p>Hello world</p><p>Hello world</p>
<div><div>Content</div></div>
```

### 2. Whitespace: `compressHTML` default `true` → `'jsx'`
Whitespace between inline elements is stripped (JSX rules).
```astro
<span>hello</span><em>world</em>   {/* now renders "helloworld" */}
<span>hello</span> <em>world</em>  {/* add a literal space, or {' '} */}
```
Restore v6 behavior: `compressHTML: true` in config.

### 3. Experimental flags graduated → remove them
Delete these from `astro.config.mjs` (behavior is now default or top-level):
| Remove | Because |
|---|---|
| `experimental.rustCompiler` | default compiler |
| `experimental.queuedRendering` | default renderer |
| `experimental.advancedRouting` | default (`src/fetch.ts`) |
| `experimental.logger` | move to top-level `logger` |
| `experimental.cache` (+ route rules) | move `cache` + `routeRules` to top-level |

### 4. Markdown processor default = Sätteri
If you use remark/rehype plugins, opt back in:
```bash
npm install @astrojs/markdown-remark
```
```js
import { unified } from '@astrojs/markdown-remark'
export default defineConfig({ markdown: { processor: unified() } })
```

### 5. `src/fetch.ts` is now reserved (Advanced Routing)
If you already have that file: `fetchFile: './src/router.ts'` to rename, or
`fetchFile: null` to disable Advanced Routing.

## Removed

- **`@astrojs/db`** — entirely removed. Replace with `node:sqlite` (Node 22.5+),
  Drizzle ORM, Turso/PlanetScale/Neon, etc.
- **`astro:transitions` internal constants** — `TRANSITION_BEFORE_PREPARATION`,
  `TRANSITION_AFTER_SWAP`, `TRANSITION_PAGE_LOAD`, `isTransitionBefore*Event()`,
  `createAnimationScope()`, etc. Use the lifecycle **event strings** directly:
  `'astro:before-preparation'`, `'astro:after-swap'`, `'astro:page-load'`, …

## Deprecated (update now)

- **Container API renderer import path** →
  `import { getContainerRenderer } from '@astrojs/react/container-renderer'`
  (same for preact/solid-js/svelte/vue/mdx).
- **`@astrojs/tailwind` integration** → Tailwind v4 via `@tailwindcss/vite`
  (CSS-first `@theme` config).

## New in 7 worth adopting

- **Route caching (stable)** — `Astro.cache.set({ maxAge, swr, tags })`,
  `routeRules`, `cache.invalidate({ tags })`; CDN cache providers
  (`cacheVercel`/`cacheNetlify`/`cacheCloudflare`, experimental).
- **Advanced Routing** — `src/fetch.ts` standard fetch handler (Hono-compatible).
- **Background dev server** — `astro dev --background`, `astro dev status|stop|logs`,
  health at `/_astro/status`; auto-enables when it detects an AI agent.
- **JSON logs** — `astro dev --json` / `logHandlers.json()` — machine-readable
  logs for agents/CI.
- **Live loaders** with cache hints (tags + last-modified) for precise content
  invalidation.

## Upgrade checklist

1. Node → 22.12+ (local + CI + host).
2. `npx @astrojs/upgrade`; align all `@astrojs/*` majors.
3. Remove graduated `experimental.*` flags; move `logger`/`cache`/`routeRules`
   top-level.
4. `astro build` → fix every strict-HTML error (real bugs).
5. Audit whitespace-sensitive inline markup (`compressHTML: 'jsx'`).
6. Markdown plugins? add `@astrojs/markdown-remark` + `processor: unified()`.
7. Using `@astrojs/db` / `TRANSITION_*` / `@astrojs/tailwind` / old container
   imports? migrate per above.
8. Review custom Vite plugins for Vite 8.
9. `astro check` green; verify the deployed build; bump host Node.
