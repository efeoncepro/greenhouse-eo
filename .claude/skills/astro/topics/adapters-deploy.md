# Adapters & deploy

An **adapter** teaches Astro how to run on a host. You need one for any
on-demand (SSR) rendering; a pure-static site needs none (just deploy the built
`dist/`). efeonce-think deploys to **Vercel**.

## When you need an adapter

- `output: 'static'` with **no** `prerender = false` routes → **no adapter**;
  deploy `dist/` to any static host / CDN.
- Any on-demand route, server island, session, or `output: 'server'` → **adapter
  required**.

## Vercel adapter

```bash
npx astro add vercel
```

```js
// astro.config.mjs
import vercel from '@astrojs/vercel'

export default defineConfig({
  output: 'static',            // or 'server'
  adapter: vercel(),
  site: 'https://think.efeoncepro.com',
})
```

Options worth knowing: `webAnalytics`, `imageService` (use Vercel's image
optimization), ISR (`isr: { expiration }`), and edge vs node functions. For a
mostly-static hub, keep it static and let Vercel serve from CDN.

## Other adapters

- `@astrojs/node` — self-hosted / container (Cloud Run). `mode: 'standalone'` for
  a runnable server; `'middleware'` to mount in an existing Node server.
- `@astrojs/cloudflare` — Workers/Pages (edge runtime; watch for Node-API gaps).
- `@astrojs/netlify` — Netlify Functions/Edge.

Pick by where it deploys. This repo's default is Vercel; a worker-style service
would use Node on Cloud Run (compose with `greenhouse-cloud-run-integrations`).

## `site`, `base`, environments

- `site` is the canonical absolute URL — **required** for sitemap, canonical
  tags, RSS. Set per environment (prod vs preview).
- `base` for sub-path deploys (`/docs`). Prepend it to absolute internal links
  (`import.meta.env.BASE_URL`).

## Astro 7 deploy-relevant changes

- **Vite 8 / Rolldown** build — faster; verify any custom Vite plugins.
- **Node 22.12+** minimum — set the runtime on the host (Vercel project Node
  version, Cloud Run base image, CI). Node 20 is no longer supported.
- **CDN cache providers (experimental)** — `cacheVercel` /`cacheNetlify` /
  `cacheCloudflare` let route caching push to the host's edge cache. See
  `topics/performance.md`.
- **Advanced Routing (`src/fetch.ts`)** — full request-pipeline control if the
  host runtime supports the fetch-handler pattern.

## Vercel discipline (this repo)

Follow `CLAUDE.md`'s Vercel rules even for efeonce-think's separate project:

- Never create a duplicate Vercel project auto-linked from a stray CLI call —
  always confirm the canonical `.vercel/project.json` or pass `--scope` explicitly
  (ISSUE-013/076 pattern).
- Never manually create `VERCEL_AUTOMATION_BYPASS_SECRET`.
- Env vars don't hot-reload — redeploy after changing them (Runtime Rollout
  Completion Gate).
- Compose deploy ops with `vercel-ops`.

## Deploy checklist

1. `output` + `prerender` audited; adapter present iff SSR routes exist.
2. `site` set to the environment's canonical URL.
3. Host Node runtime = 22.12+.
4. Env vars set on the host (secrets server-only) + **redeploy**.
5. `astro build` clean locally (Vite 8); `astro check` green.
6. Static: verify `dist/`; SSR: verify functions region + cold-start.

## Hard rules

- **NEVER** ship SSR routes without an adapter — build fails or routes 404.
- **NEVER** forget to bump the host to Node 22.12+ for Astro 7.
- **SIEMPRE** set `site` correctly per environment.
- **SIEMPRE** redeploy after env changes; follow repo Vercel scope discipline.
