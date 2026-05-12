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

## Compose with (Greenhouse skills)

- `greenhouse-ux-writing` — owns copy for loading / empty / error / degraded.
- `forms-ux-greenhouse-overlay` — form pending / success / error.
- `web-perf-design-greenhouse-overlay` — skeleton sizing + CLS.
- `a11y-architect-greenhouse-overlay` — `aria-live`, `role=status`, `role=alert`.

## Version

- **v1.0** — 2026-05-11 — Initial overlay.
