## Delta 2026-04-17 — alineación con capa de entitlements

TASK-286 fue ampliada para declarar capabilities granulares `client_portal.*` con `defaultScope: 'organization'`. Esta task ahora debe consumir esa capa al implementar la página.

- **View code:** `cliente.revenue_enabled`
- **Capability:** `client_portal.revenue_enabled`
- **Actions requeridas:** `view` (read-only)
- **Scope:** `organization`
- **Guard de página:** combinar `hasAuthorizedViewCode(tenant, 'cliente.revenue_enabled')` + `can(tenant, 'client_portal.revenue_enabled', 'view', 'organization')`.
- **Ref canónica:** `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

# TASK-287 — Revenue Enabled Standalone View

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `3`
- Domain: `agency`
- Blocked by: `TASK-286` (view code + capability + binding + role defaults)
- Branch: `task/TASK-287-revenue-enabled-standalone-view`

## Summary

Promover Revenue Enabled de card dentro del Creative Hub a vista standalone del portal cliente. Es el North Star metric: impacto en revenue por velocidad, iteracion y throughput. Para un VP Marketing de aerolinea o banco, esta vista justifica la inversion en la agencia ante su CFO.

## Why This Task Exists

Revenue Enabled es la metrica mas importante para clientes enterprise — la unica que traduce operacion creativa en impacto de negocio. Hoy esta enterrada como card dentro del Creative Hub capability module, solo visible para tiers Pro/Enterprise. Un VP Marketing no deberia tener que navegar a un modulo secundario para ver el ROI de su relacion con la agencia.

## Goal

- Pagina standalone en `/revenue-enabled` con las 3 palancas de revenue
- API route dedicada que sirva los datos de Revenue Enabled
- Attribution class visible (observed/range/estimated) con explicacion
- Trend trimestral (no solo snapshot)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §11.1, §12.1, §14.1 V1
- `docs/architecture/Contrato_Metricas_ICO_v1.md` — Revenue Enabled contract

Reglas obligatorias:

- Respetar attribution classes: observed/range/estimated/unavailable
- Mostrar quality gate reasoning cuando la metrica es degraded
- No inventar datos — si unavailable, mostrar empty state honesto

## Dependencies & Impact

### Depends on

- TASK-286 (view code `cliente.revenue_enabled` registrado)
- `src/lib/ico-engine/revenue-enabled.ts` — measurement model
- `src/lib/capability-queries/helpers.ts` — `buildCreativeRevenueCardData()`

### Blocks / Impacts

- TASK-298 (QBR) — necesita Revenue Enabled acumulado
- TASK-301 (Analytics enrichment) — necesita Revenue Enabled trend
- TASK-304 (Pulse headline) — necesita Revenue Enabled KPI

### Files owned

- `src/app/(dashboard)/revenue-enabled/page.tsx`
- `src/app/api/revenue-enabled/route.ts`
- `src/views/greenhouse/GreenhouseRevenueEnabled.tsx`

## Current Repo State

### Already exists

- `src/lib/ico-engine/revenue-enabled.ts` (217 lineas) — `buildRevenueEnabledMeasurementModel()` completo con tests
- 3 palancas: Early Launch Advantage, Iteration Velocity Impact, Throughput Expandido
- Attribution classes y quality gates implementados
- `buildCreativeRevenueCardData()` en `src/lib/capability-queries/helpers.ts` (L289-334)
- `CreativeVelocityReviewContract` como fuente de datos
- Componentes reutilizables: `MetricStatCard`, `ExecutiveMiniStatCard`
- Recharts + ApexCharts disponibles

### Gap

- No hay pagina standalone — solo card en Creative Hub
- No hay API route dedicada
- No hay trend trimestral (solo snapshot del periodo actual)
- No hay desglose por campana

## Scope

### Slice 1 — API route

- Crear `/api/revenue-enabled/route.ts`
- Guard: `requireClientTenantContext()`
- View code check: `cliente.revenue_enabled`
- Reutilizar `buildRevenueEnabledMeasurementModel()` con datos del tenant
- Response: 3 palancas con attribution class, quality gate status, trend data

### Slice 2 — Page y view component

- Crear pagina `src/app/(dashboard)/revenue-enabled/page.tsx`
- Crear view `src/views/greenhouse/GreenhouseRevenueEnabled.tsx`
- Layout: hero con North Star total + 3 cards de palancas + attribution badges
- Cada palanca muestra: valor, trend vs periodo anterior, attribution class badge, quality gate reasoning si degraded
- Empty state si unavailable

### Slice 3 — Trend trimestral

- Agregar query de historico (3-4 trimestres) a la API
- Chart de trend con Recharts o ApexCharts
- Mostrar evolucion del Revenue Enabled total y por palanca

## Out of Scope

- Desglose por campana (follow-up)
- Comparacion con otros clientes (benchmarking)
- Exportar como PDF (eso es TASK-288)
- Modificar el Creative Hub existente — las cards originales siguen ahi

## Acceptance Criteria

- [ ] Pagina `/revenue-enabled` renderiza las 3 palancas de Revenue Enabled
- [ ] Attribution class (observed/range/estimated) visible con badge por palanca
- [ ] Quality gate reasoning visible cuando una palanca es degraded
- [ ] Empty state honesto cuando unavailable
- [ ] Chart de trend trimestral (3-4 quarters)
- [ ] Guard `requireClientTenantContext()` protege la pagina
- [ ] View code `cliente.revenue_enabled` se valida
- [ ] Solo visible para `client_executive` (y resumen en Pulse para otros)
- [ ] `pnpm build` y `pnpm test` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Preview con cuenta de test client_executive

## Closing Protocol

- [ ] Actualizar §14.1 V1 readiness a 100%

## Follow-ups

- TASK-304: Pulse Revenue Enabled headline (depende de esta API)
- TASK-298: QBR con Revenue Enabled acumulado
- Desglose por campana (task futura)
