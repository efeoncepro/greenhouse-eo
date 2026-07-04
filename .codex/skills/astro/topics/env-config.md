# Environment variables & config

Astro has a **typed** env system (`astro:env`) on top of Vite's `import.meta.env`.
Use `astro:env` for anything that matters — it gives you validation, and a hard
server/client boundary so secrets can't leak into the bundle.

## `astro:env` — typed & boundaried (preferred)

```js
// astro.config.mjs
import { defineConfig, envField } from 'astro/config'

export default defineConfig({
  env: {
    schema: {
      // public: safe in the client bundle
      PUBLIC_SITE_NAME: envField.string({ context: 'client', access: 'public' }),
      // server + secret: never shipped to the client
      GRADER_API_URL: envField.string({ context: 'server', access: 'public' }),
      GRADER_API_KEY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
})
```

```ts
// server code (fence, action, endpoint, middleware)
import { GRADER_API_KEY, GRADER_API_URL } from 'astro:env/server'

// client island
import { PUBLIC_SITE_NAME } from 'astro:env/client'
```

The matrix:

| `context` | `access` | Import from | Shipped to client? |
|---|---|---|---|
| `client` | `public` | `astro:env/client` | Yes |
| `server` | `public` | `astro:env/server` | No |
| `server` | `secret` | `astro:env/server` | No — and Astro guards against client import |

Importing a `server` var from `astro:env/client` is a build error — the boundary
is enforced, not conventional.

## Raw `import.meta.env` (Vite)

Still works: `import.meta.env.PUBLIC_FOO`. Rules:

- Only variables prefixed `PUBLIC_` are exposed to client code.
- Anything without `PUBLIC_` is server-only; referencing it in an island is
  `undefined` at runtime (silent bug — this is why `astro:env` is preferred).
- Built-ins: `import.meta.env.MODE`, `.PROD`, `.DEV`, `.SSR`, `.BASE_URL`.

## `.env` files

`.env`, `.env.production`, `.env.development`, `.env.local` (gitignored). Loaded
by Vite. Secrets go in `.env.local` / the host's env (Vercel), never committed.

## Config essentials (`astro.config.mjs`)

```js
export default defineConfig({
  site: 'https://think.efeoncepro.com',   // required for sitemap, canonical, RSS
  base: '/',                              // sub-path deploys
  output: 'static',
  adapter: vercel(),
  integrations: [/* sitemap(), mdx(), ... */],
  env: { schema: { /* ... */ } },
  image: { domains: [/* ... */] },
  vite: { /* Vite 8 config passthrough */ },
})
```

`site` is load-bearing: `@astrojs/sitemap`, canonical URLs, and RSS all need it.
Set it correctly per environment (see `topics/adapters-deploy.md`).

## Astro 7 notes

- **Vite 8 / Rolldown** underneath — existing `vite.rollupOptions` /
  `vite.esbuild` config is auto-migrated, but review Vite-specific plugins
  against the Vite 8 migration guide.
- Config keys that were under `experimental` in v6 are now top-level (route
  caching `cache`/`routeRules`, `logger`) — see `migration/v6-to-v7.md`.

## Hard rules

- **NEVER** put a secret in a `PUBLIC_`-prefixed var or import it client-side.
- **SIEMPRE** declare secrets as `context: 'server', access: 'secret'` in
  `astro:env` so the boundary is enforced.
- **SIEMPRE** set `site` correctly per environment — SEO/sitemap/canonical depend
  on it.
- Mirror the repo's Vercel env discipline for the deploy target (see
  `CLAUDE.md` Vercel sections; compose with `vercel-ops`).
