---
name: state-design-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global state-design skill defaults. Load this first whenever state-design is invoked inside this repo.
type: overlay
overrides: state-design
---

# state-design — Greenhouse Overlay

Load global `state-design/SKILL.md` first → then read this overlay. Where they disagree, **this overlay wins**.

## Pinned decisions

### 1. Honest degradation — `SourceResult<T>` pattern is canonical

Already canonized in CLAUDE.md (Platform Health, finance reliability signals). Every data source returns `{ value, status: 'ok' | 'empty' | 'degraded', reason? }`.

NEVER show `$0` when truth is "unknown". Use `—` or "Pendiente" (es-CL). Use `getMicrocopy('states.pending')` / `getMicrocopy('states.unavailable')`.

### 2. Loading — skeleton via Vuexy `<Skeleton>`, NOT custom

Use `<Skeleton variant="rectangular" />` / `<Skeleton variant="text" />` from MUI. Vuexy theme applies the shimmer.

Skeleton dimensions MUST match final content (CLS prevention — TASK-743 enforced this for tables).

### 3. Empty state — `<EmptyState>` primitive ONLY

Greenhouse has `src/components/greenhouse/EmptyState/index.tsx` primitive with icon + title + description + primary CTA + secondary CTA slots. NEVER raw `<Box><Typography>Sin datos</Typography></Box>`. Enforced by `greenhouse-ui-review`.

### 4. Error state — `<ErrorState>` primitive + Sentry `captureWithDomain`

Use `<ErrorState>` primitive (or compose with Vuexy `<Alert severity='error'>`). Errors auto-emit to Sentry via `captureWithDomain(err, '<domain>', ...)` from `src/lib/observability/capture.ts`.

NEVER `console.error` silently. NEVER `Sentry.captureException` directly (loses `domain` tag for reliability dashboard rollup).

### 5. Optimistic UI — `useOptimistic` from React 19

Already canonized in CLAUDE.md (finance write paths, payment-orders). Pattern:

```tsx
const [optimisticItems, addOptimistic] = useOptimistic(items, reducer)
```

Pending visual: 60% opacity + spinner icon. Rollback via toast `getMicrocopy('feedback.saveFailed')`.

### 6. Loading copy — `getMicrocopy('loading.*')`

Standard: "Cargando…" / "Guardando…" / "Procesando…". NEVER hardcode. Use `getMicrocopy('loading.<key>')`.

### 7. Reliability signals — canonical 5 kinds

Greenhouse signals: `lag | drift | dead_letter | data_quality | incident`. Steady state per signal is defined in `src/lib/reliability/queries/`. UI consumes via `getReliabilityOverview()` → `productionXxx[]` source pattern.

When designing UI states, surface degraded sources to the user with disclosure (banner / per-card "Pendiente"). NEVER hide.

### 8. Real-time — Cloud Scheduler + outbox + reactive consumer

Greenhouse does NOT ship raw WebSocket / SSE in production. Live updates come from polling via TanStack Query OR refresh-on-focus. For "actually fresh" data, use server-revalidation via `revalidatePath` / `revalidateTag` triggered by outbox events.

### 9. Offline — out of scope V1

Greenhouse is desktop-first internal portal. No service worker, no offline mode. If a route is mobile-relevant (rare), discuss before adding offline tooling.

### 10. Stale — show "Última actualización X" when caching

For cached data (TanStack Query, RSC cache with `'use cache'`), show timestamp helper. `formatDistanceToNow(date, { addSuffix: true, locale: es })` from `date-fns` → "hace 5 minutos".

### 11. Scope controls belong to the header, not to each state surface (TASK-1307)

When a screen has scope/filter controls AND empty / degraded / denied surfaces, the controls go in the recipe `header` (`SurfaceRecipe header={…}` renders outside the region plane), not inside the body. Otherwise every state surface has to re-render the controls so the user can leave the state — that duplication is the smell, and it is what the header placement removes. The header stays put; only the body swaps between data, `<EmptyState>` and `<ErrorState>`.

### 12. A finished job has more states than loading / empty / error (TASK-1309)

When a surface renders the **result of an async job** (crawl, import, batch, reconciliation, materializer run), the state model is six, not three — and collapsing any two of them lies to the operator:

| State | Render as | Why it is NOT the neighbour |
|---|---|---|
| **never ran** | `<EmptyState>` + CTA to run it | Nothing is broken; there is simply no result yet. |
| **running** | a fact, with whatever is already known | A job in flight is not an error and not an empty result. |
| **finished, zero findings** | success copy ("sin hallazgos") | `succeeded` with 0 rows ≠ failed. Rendering it as an error teaches the operator to distrust good zeros. |
| **finished, partial** | real but incomplete, stated up front | Something did fail; the reader must not take the total at face value. |
| **hit its ceiling** (page cap, row limit, date window) | the count describes the sample, not the universe | Nothing failed here — that is what separates it from partial. |
| **failed** | `<ErrorState>` with cause + retry | Only this one. |

Corollary of §1 in the same domain: **an uncomputed score and a bad score are different states.** `null → "Pendiente"` + the reason; `0 → 0`. Collapsing them turns an absence of measurement into a verdict — a health score rendered as `0/100` reads as "terrible site" when the truth is "the crawl produced no score".

## Compose with (Greenhouse skills)

- `greenhouse-ux-writing` — owns copy for loading / empty / error / degraded.
- `forms-ux-greenhouse-overlay` — form pending / success / error.
- `web-perf-design-greenhouse-overlay` — skeleton sizing + CLS.
- `a11y-architect-greenhouse-overlay` — `aria-live`, `role=status`, `role=alert`.

## Version

- **v1.2** — 2026-08-08 — TASK-1309: pinned decision 12 (six-state model for async job results; uncomputed ≠ zero, clean ≠ failed, capped ≠ total).
- **v1.1** — 2026-08-07 — TASK-1307: pinned decision 11 (scope controls live in the recipe header, so state surfaces stop duplicating them).
- **v1.0** — 2026-05-11 — Initial overlay.
