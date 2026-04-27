# TASK-304 — Pulse Revenue Enabled Headline

## Delta 2026-04-27 — TASK-696 Smart Home v2 expone audience-aware Pulse Strip listo para Revenue Enabled

El Smart Home v2 ya tiene un Pulse Strip role-aware (`src/lib/home/loaders/load-pulse-strip.ts`) con 4 KPI cards por audience. Cuando TASK-287 (Revenue Enabled standalone) entregue su API canónica, agregar la card de Revenue Enabled al `buildRealtimeCardsForAudience('admin')` (CEO) y `'internal'` (mid-mgr). Reusar `StatsWithAreaChart` con sparkline 6mo de Revenue Enabled trend.

Capability gate: agregar `home.revenue_enabled.read` al catalog y bind a roles que ya tengan `client_portal.revenue_enabled` (TASK-287 spec). Composer ya soporta `requires: { capability, action }` en el registry.

No bloquea el cierre de TASK-304 — solo apunta el patrón a usar cuando TASK-287 esté ready. Es un commit de ~30 líneas (entry en loader + entry en registry).

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `20`
- Domain: `agency`
- Blocked by: `TASK-287`
- Branch: `task/TASK-304-pulse-revenue-headline`

## Summary

Agregar Revenue Enabled KPI card + SLA compliance badge al dashboard Pulse. Quick win una vez que TASK-287 (Revenue Enabled standalone) existe — reutilizar la API para mostrar el headline en el dashboard.

## Why This Task Exists

El dashboard Pulse es el punto de entrada del portal. Hoy muestra KPIs operativos (RpA, OTD, completados, feedback) pero no el North Star. Agregar Revenue Enabled como headline le da al executive el dato mas importante en los primeros 5 segundos.

## Goal

- KPI card de Revenue Enabled total en Pulse (hero position)
- SLA compliance badge (overall)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.2 M1

## Dependencies & Impact

### Depends on

- TASK-287 (Revenue Enabled API) — reutilizar endpoint

### Files owned

- `src/views/greenhouse/dashboard/` (componentes de dashboard, modificar)
- `src/app/(dashboard)/dashboard/page.tsx` (modificar)

## Scope

### Slice 1 — Revenue Enabled headline

- Agregar `ExecutiveMiniStatCard` con Revenue Enabled total
- Posicion: primera card del grid (hero)
- Attribution class badge
- Trend vs periodo anterior (miniChart)
- Link a `/revenue-enabled` para drill-down

### Slice 2 — SLA badge

- Badge general de compliance: "World-class" / "Strong" / "Attention" / "Critical"
- Basado en peor metrica o promedio ponderado del periodo
- Posicion: junto al hero o como chip en la barra superior

## Out of Scope

- Redisenar el dashboard completo
- Agregar Brand Health al dashboard

## Acceptance Criteria

- [ ] Revenue Enabled KPI visible como primera card del dashboard
- [ ] Attribution class badge presente
- [ ] Trend mini-chart vs periodo anterior
- [ ] SLA compliance badge visible
- [ ] Solo visible si TASK-287 completada (graceful degradation)
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
