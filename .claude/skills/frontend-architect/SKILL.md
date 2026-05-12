---
name: frontend-architect-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global frontend-architect skill defaults. Load this first whenever frontend-architect is invoked inside this repo.
type: overlay
overrides: frontend-architect
---

# frontend-architect — Greenhouse Overlay

Load global `frontend-architect/SKILL.md` first → then read this overlay. Where they disagree, **this overlay wins**.

## Pinned decisions

### 1. Stack — Next.js 16 App Router + React 19 + MUI 7.x + Vuexy

- Routing: App Router (`src/app/`).
- State: server-first (RSC) + URL search params + TanStack Query for client state where needed.
- UI: MUI 7.x + Vuexy Custom wrappers + `mergedTheme.ts` runtime.
- Forms: React 19 `useActionState` + Server Actions + Zod validation.
- DB: Cloud SQL Postgres via Kysely + Cloud SQL Connector.

### 2. RSC vs Client — push `'use client'` to leaf

Greenhouse default = Server Component. Client only when needed (state, effects, browser APIs, MUI sx-heavy surfaces). The pattern:

```tsx
// page.tsx (server)
import ClientView from './ClientView'

export default async function Page() {
  const session = await requireServerSession()
  const data = await getDataFromPg(session.user.id)
  return <ClientView session={session} data={data} />
}

// ClientView.tsx ('use client')
'use client'
export default function ClientView({ session, data }) {
  // interactive surface
}
```

NEVER fetch in `useEffect`. NEVER `fetch('/api/...')` from client when Server Action + RSC works.

### 3. Auth — `requireServerSession()` canonical pattern

Already canonized in CLAUDE.md. Use `requireServerSession()` from `@/lib/auth/require-server-session` for layouts/pages that require auth. `getOptionalServerSession()` for pages that optionally check.

Combine with `export const dynamic = 'force-dynamic'` to avoid prerender phase.

API routes use `getServerAuthSession()` directly.

### 4. Server Actions — Greenhouse pattern

```tsx
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerAuthSession } from '@/lib/auth'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { captureWithDomain } from '@/lib/observability/capture'

const schema = z.object({...})

export async function createSomethingAction(prevState, formData: FormData) {
  const session = await getServerAuthSession()
  if (!session) return { error: 'No autorizado' }

  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  try {
    await db.something.create(parsed.data)
    revalidatePath('/something')
    return { ok: true }
  } catch (err) {
    captureWithDomain(err, '<domain>', { extra: { ... } })
    return { error: redactErrorForResponse(err) }
  }
}
```

### 5. Edge runtime — middleware ONLY

`middleware.ts` runs on Edge. All `route.ts` handlers run on Node (Cloud SQL Connector + Kysely + `@google-cloud/secret-manager` require Node).

NEVER `export const runtime = 'edge'` on a route handler that hits PG / GCP Secret Manager.

### 6. Caching — `'use cache'` (Next.js 16 Cache Components) when stable

For RSC fetches that are stable (e.g., user's tenant config, list of services), wrap with `'use cache'` + `cacheLife('hours')` + `cacheTag(...)`. Invalidate via `revalidateTag()` after mutations.

NEVER cache user-specific writable data without tag-based invalidation.

### 7. State hierarchy

| Tier | When |
|---|---|
| URL search params | Filters, sort, page, selected, tab |
| `useState` | Modal open/close, hover, inline edit |
| Context | Theme (Vuexy), session (next-auth), locale |
| TanStack Query | Client-side cached server data (rare; prefer RSC) |
| Server state | Default — RSC fetch + revalidate |

NEVER Zustand / Redux / Jotai. Greenhouse doesn't need a global store; URL + RSC + Context cover everything.

### 8. Error boundaries — `error.tsx` per segment

Every major segment has `error.tsx`:

```
app/finance/error.tsx
app/hr/error.tsx
app/admin/error.tsx
```

Each error.tsx uses `captureWithDomain(err, '<domain>', ...)` automatically (already wired via `<RouteError>` primitive in `src/components/greenhouse/`).

### 9. Loading.tsx — Suspense fallback per segment

Each major segment ships `loading.tsx` with skeleton matching final content (TASK-743 + CLS prevention). Avoid page-level spinners.

### 10. Parallel routes — Reserved for specific patterns

Greenhouse uses parallel routes sparingly:

- Modal-over-route via intercepting routes `(.)id/page.tsx` (already in `/clients`, etc.)
- Independent KPI + table streams (only when KPIs and table genuinely diverge in load time)

NEVER stack parallel routes for unrelated content. The mental model gets confusing.

### 11. Suspense — explicit boundaries at meaningful split points

```tsx
<>
  <Header />
  <Suspense fallback={<KpiSkeleton />}>
    <SlowKpi />
  </Suspense>
  <Suspense fallback={<TableSkeleton />}>
    <SlowTable />
  </Suspense>
</>
```

Place Suspense where the fallback is meaningful — splitting too granular is noisy.

### 12. Hydration cost — RSC + small client trees

Greenhouse INP is monitored. Hot spots fixed via:

- RSC for read-heavy pages
- Suspense for slow data
- `useDeferredValue` for filter inputs
- TanStack Query staleness for cached lookups
- `dynamic(() => import('./Heavy'), { ssr: false })` for below-fold heavy widgets (ECharts, react-pdf)

## Compose with (Greenhouse skills)

- `greenhouse-dev` — implements per this topology.
- `web-perf-design-greenhouse-overlay` — perf budgets.
- `state-design-greenhouse-overlay` — states inhabit components.
- `info-architecture-greenhouse-overlay` — IA dictates topology.
- `a11y-architect-greenhouse-overlay` — interactivity needs client.

## Version

- **v1.0** — 2026-05-11 — Initial overlay.
