# TASK-513 — `@tanstack/react-query` adoption (server state)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto` (gap crítico — performance + consistencia + DX)
- Effort: `Alto` (migración progresiva)
- Type: `platform` + `refactor` + `dependency`
- Status real: `Backlog — Ola 1 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `platform` + `ui`
- Blocked by: `none`
- Branch: `task/TASK-513-tanstack-react-query-adoption`

## Summary

Instalar `@tanstack/react-query` 5 como cache layer canónico para server state. Linear, Stripe, Vercel, Ramp, Notion todos lo usan. Hoy el portal rueda `useEffect + useState + fetch` disperso, sin cache global, sin refetch on focus, sin optimistic updates.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 1.

## Why This Task Exists

Sin React Query el portal sufre de:
- Duplicación de fetches al cambiar de tab / volver a un screen (cada mount re-fetch).
- No hay invalidación coordinada (mutas una quote → tienes que refetch manualmente listas, snapshots, etc.).
- Loading/error states los cosemos a mano en cada consumer (boilerplate).
- Sin optimistic updates — cada mutación fuerza un round-trip antes de mostrar feedback.

React Query cubre todo esto nativamente + integración con Suspense + Streaming SSR.

## Goal

1. Instalar `@tanstack/react-query` + `@tanstack/react-query-devtools`.
2. Configurar `QueryClientProvider` en el root layout con defaults sanos (staleTime, refetchOnWindowFocus, etc.).
3. Crear `src/lib/react-query/` con helpers (`queryKeys` factory, custom hooks patterns).
4. Migrar 3-5 fetches estratégicos como ejemplo (ej. lista de quotes, pricing config, team members).
5. Documentar el pattern en `GREENHOUSE_UI_PLATFORM_V1.md` para que futuras features adopten el convention.
6. Roadmap de migración progresiva del resto (no bloquea este task — se hace per-feature).

## Acceptance Criteria

- [ ] `@tanstack/react-query` 5.x instalado.
- [ ] `QueryClientProvider` wrapping el portal (client component).
- [ ] `@tanstack/react-query-devtools` solo en dev.
- [ ] Queryn keys factory canónico en `src/lib/react-query/keys.ts`.
- [ ] Al menos 3 consumers migrados como ejemplo.
- [ ] Docs `GREENHOUSE_UI_PLATFORM_V1.md` tiene sección "Server state con React Query".
- [ ] Gates tsc/lint/test/build verdes.

## Scope

### Setup
- `src/providers/QueryClientProvider.tsx` — wrapper client-side con config default.
- `src/lib/react-query/keys.ts` — query key factory.
- `src/lib/react-query/hydrate.ts` — helpers para Server Components → Client Components hydration (Next App Router pattern).

### Migration examples (para validar el pattern)
- `useQuotes()` — lista en `/finance/quotes`.
- `usePricingConfig()` — `/api/finance/quotes/pricing/config` (hoy se fetchea en el shell con useEffect).
- `useTeamMembers()` — en la vista de equipo.

## Out of Scope

- Migrar el 100% de fetches en una sola task (ese es trabajo progresivo).
- Decidir sobre RTK Query — esta task es aditiva; RTK Query puede coexistir hasta que se audite.
- Suspense mode (defer a TASK futura).

## Follow-ups

- Audit: ¿qué hace hoy `@reduxjs/toolkit` en el repo? Si es solo cache de server → candidato a migrar. Si es UI state → Zustand futuro.
- SSR hydration patterns para Next 16 App Router + React Query.
