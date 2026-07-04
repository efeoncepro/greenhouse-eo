# Endpoints, middleware & sessions

Server-side surfaces beyond pages: API endpoints, request middleware, and
sessions. For "client submits → server does work," prefer **Actions**
(`topics/actions.md`); use raw endpoints when you need a public/stable REST URL,
a webhook target, or full `Response` control.

## Endpoints (API routes)

A `.ts`/`.js` file under `src/pages/` that exports HTTP-method functions and
returns a `Response`.

```ts
// src/pages/api/reports/[id].ts
import type { APIRoute } from 'astro'

export const prerender = false   // dynamic endpoint

export const GET: APIRoute = async ({ params, request, locals }) => {
  const report = await getReport(params.id!)
  if (!report) return new Response('Not found', { status: 404 })
  return new Response(JSON.stringify(report), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()
  // ...validate, write, respond
  return new Response(null, { status: 204 })
}
```

- Export `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `ALL`.
- `APIContext` gives `params`, `request`, `cookies`, `locals`, `redirect`,
  `url`, `site`, `session`.
- Static endpoints (no `prerender = false`) run at build and emit a file — use
  `getStaticPaths` for dynamic static endpoints (e.g. a generated `feed.xml`).

## Middleware

`src/middleware.ts` runs on **every request** (SSR routes). Use for auth gating,
setting `locals`, headers, redirects, logging.

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware'

const auth = defineMiddleware(async (context, next) => {
  const token = context.cookies.get('session')?.value
  context.locals.user = token ? await verify(token) : null
  if (context.url.pathname.startsWith('/app') && !context.locals.user) {
    return context.redirect('/login')
  }
  return next()
})

const headers = defineMiddleware(async (context, next) => {
  const res = await next()
  res.headers.set('X-Content-Type-Options', 'nosniff')
  return res
})

export const onRequest = sequence(auth, headers)
```

- `context.locals` — the canonical way to pass data from middleware to routes
  (typed via `App.Locals` in `env.d.ts`).
- `next()` returns the downstream `Response`; you can read/modify it (headers,
  etc.).
- `sequence(...)` composes multiple middlewares in order.

## Sessions (stable)

`Astro.session` (and `context.session` in endpoints/middleware) is a
server-side, driver-backed session store — no manual cookie juggling.

```ts
// configure a driver in astro.config.mjs
export default defineConfig({
  session: {
    driver: 'redis',                 // unstorage drivers: redis, upstash, fs, etc.
    options: { url: process.env.REDIS_URL },
  },
})
```

```astro
---
export const prerender = false
const cart = (await Astro.session.get('cart')) ?? []
await Astro.session.set('cart', [...cart, item])
// Astro.session.destroy() to clear
---
```

- Sessions force a route to be on-demand (`prerender = false`).
- Choose a driver that fits the deploy target (Redis/Upstash for serverless;
  don't use `fs` on Vercel serverless — ephemeral filesystem).

## Astro 7: Advanced Routing (`src/fetch.ts`)

For full control of the request pipeline (before Astro's own routing), Astro 7
adds a reserved `src/fetch.ts` exporting a standard `fetch(request)` handler
(the Cloudflare/Deno/Bun pattern, Hono-compatible). Use for custom edge logic,
rewrites, or mounting a router in front of Astro. It's advanced — most apps use
middleware + endpoints and never touch it. Config: `fetchFile: './src/router.ts'`
to rename, or `fetchFile: null` to disable. See `topics/adapters-deploy.md`.

## Hard rules

- **NEVER** put a secret-bearing or state-mutating endpoint on a static route —
  set `prerender = false`.
- **NEVER** use the `fs` session/cache driver on ephemeral serverless (Vercel) —
  use Redis/Upstash.
- **SIEMPRE** type `App.Locals` so middleware→route data flow is typed.
- Prefer Actions over endpoints for first-party client/form calls; endpoints for
  public/webhook/REST contracts.
