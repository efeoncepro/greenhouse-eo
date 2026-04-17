## Delta 2026-04-17 — alineación con capa de entitlements

TASK-286 fue ampliada para declarar capabilities granulares `client_portal.*` con `defaultScope: 'organization'`. Esta task ahora debe consumir esa capa al implementar la página.

- **View code:** `cliente.sla`
- **Capability:** `client_portal.sla`
- **Actions requeridas:** `view` (read-only scorecard)
- **Scope:** `organization`
- **Guard de página:** combinar `hasAuthorizedViewCode(tenant, 'cliente.sla')` + `can(tenant, 'client_portal.sla', 'view', 'organization')`.
- **Ref canónica:** `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

# TASK-295 — SLA & Performance Scorecard

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `11`
- Domain: `agency`
- Blocked by: `TASK-286` (view code + capability + binding + role defaults)
- Branch: `task/TASK-295-sla-performance-scorecard`

## Summary

Crear scorecard de vendor performance para el client_manager: OTD% vs compromiso, FTR%, cycle time vs baseline, quality gate badges (World-class/Strong/Attention/Critical). Enterprise evalua vendors formalmente — si el portal ya tiene el scorecard listo, el Manager copia y pega en vez de calcularlo.

## Why This Task Exists

Empresas grandes evaluan vendors trimestralmente con scorecards formales. Hoy el Manager tiene que calcular manualmente las metricas, buscar los thresholds, y llenar su formulario interno. Si el portal ya muestra las metricas con las calificaciones (World-class >=98%, Strong >=95%, etc.), le ahorra horas y demuestra profesionalismo.

## Goal

- Pagina `/sla` con scorecard de la agencia
- KPIs con thresholds del Contrato ICO
- Badge system: World-class / Strong / Attention / Critical
- Trend mensual de compliance

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.1 V6
- `docs/architecture/Contrato_Metricas_ICO_v1.md` — thresholds

## Dependencies & Impact

### Depends on

- TASK-286 (view code `cliente.sla`)
- `src/lib/ico-engine/performance-report.ts` — `buildMetricTrustSnapshot()`
- `greenhouse_serving.agency_performance_reports` (materializado)
- Thresholds ICO definidos en contrato

### Blocks / Impacts

- TASK-298 (QBR) — SLA resumen en el QBR

### Files owned

- `src/app/(dashboard)/sla/page.tsx`
- `src/app/api/sla/route.ts`
- `src/views/greenhouse/GreenhouseSLAScorecard.tsx`

## Current Repo State

### Already exists

- `buildMetricTrustSnapshot()` valida 16 metricas con quality gates
- Benchmark types: external (OTD), adapted (RpA), internal (counts)
- Quality gate status: healthy/degraded/broken
- Materializado mensualmente en PG y BQ
- Thresholds: OTD >=98% World-class, >=95% Strong, >=90% Attention, <90% Critical
- FTR >=85% World-class, >=70% Strong, etc.

### Gap

- No hay pagina standalone de scorecard
- No hay API dedicada
- Response time de la agencia no se mide
- No hay badge system visual

## Scope

### Slice 1 — API route

- Crear `/api/sla/route.ts`
- Guard: `requireClientTenantContext()`
- Query: performance report del ultimo mes + historico 6 meses
- Response: metricas con threshold, badge, trend

### Slice 2 — Page y view component

- Crear pagina y view
- Scorecard table: metrica, valor actual, threshold, badge (World-class/Strong/Attention/Critical), trend arrow
- Metricas: OTD%, RpA, FTR%, Cycle Time, Throughput
- Chart: trend de compliance (6 meses)
- Overall score: badge general basado en peor metrica o promedio ponderado

## Out of Scope

- Response time de la agencia (no se mide hoy — follow-up)
- SLAs contractuales custom por cliente (hoy son los thresholds ICO genericos)
- Alertas de SLA breach

## Acceptance Criteria

- [ ] Pagina `/sla` muestra scorecard con 5+ metricas
- [ ] Cada metrica tiene badge visual: World-class (verde), Strong (azul), Attention (amarillo), Critical (rojo)
- [ ] Trend de 6 meses visible como chart
- [ ] Guard y view code check funcionan
- [ ] Solo visible para `client_manager` (resumen en QBR para executive)
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`

## Closing Protocol

- [ ] Actualizar §14.1 V6 readiness

## Follow-ups

- Response time tracking (task futura)
- SLAs custom por cliente
