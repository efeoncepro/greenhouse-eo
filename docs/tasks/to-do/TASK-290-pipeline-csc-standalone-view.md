# TASK-290 — Pipeline CSC Standalone View

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo-Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `6`
- Domain: `agency`
- Blocked by: `TASK-286`
- Branch: `task/TASK-290-pipeline-csc-standalone-view`

## Summary

Promover el pipeline de Creative Supply Chain de card en Creative Hub a vista standalone. Un Marketing Manager de aerolinea en temporada alta necesita ver que 15 assets estan en Produccion, 8 en Aprobacion y 3 estan stuck hace 72h — sin navegar a un capability module.

## Why This Task Exists

El pipeline CSC es informacion operativa critica para el client_manager. Hoy solo es accesible dentro del Creative Hub capability module. El backend esta 100% implementado (phase mapping, stuck detection, bottleneck, velocity). Solo falta la pagina standalone con filtros por proyecto/campana.

## Goal

- Pagina standalone en `/pipeline` con pipeline CSC completo
- Filtros por proyecto y campana
- Stuck detection con alertas visuales
- Bottleneck identification

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.1 V4
- `docs/architecture/Contrato_Metricas_ICO_v1.md` — CSC phases

## Dependencies & Impact

### Depends on

- TASK-286 (view code `cliente.pipeline` registrado)
- `src/lib/ico-engine/schema.ts` — CSC phase mapping
- `src/lib/capability-queries/helpers.ts` — `buildCreativePipelineCardData()`, `buildCreativeCscMetricsCardData()`
- `/api/ico-engine/stuck-assets` — API existente
- `src/components/agency/StuckAssetsDrawer.tsx`

### Blocks / Impacts

- Ninguno directo

### Files owned

- `src/app/(dashboard)/pipeline/page.tsx`
- `src/app/api/pipeline/route.ts`
- `src/views/greenhouse/GreenhousePipelineCSC.tsx`

## Current Repo State

### Already exists

- CSC phase mapping completo en `src/lib/ico-engine/schema.ts` (6 fases)
- `buildCreativePipelineCardData()` — distribucion por fase
- `buildCreativeCscMetricsCardData()` — cycle time, bottleneck, velocity, stuck count
- `/api/ico-engine/stuck-assets` — API funcional con detalle por asset
- `StuckAssetsDrawer` — componente de stuck assets
- Cards pipeline, metrics-row, alert-list en Creative Hub

### Gap

- No hay pagina standalone
- No hay filtro por proyecto ni campana
- No hay trend de distribucion por fase

## Scope

### Slice 1 — API route

- Crear `/api/pipeline/route.ts`
- Guard: `requireClientTenantContext()`
- Reutilizar builders existentes: pipeline data + CSC metrics + stuck assets
- Soportar query params: `?projectId=X&campaignId=Y`

### Slice 2 — Page y view component

- Crear pagina y view component
- Layout: pipeline visualization (fases como columnas/funnel con counts), metrics row (cycle time, bottleneck, velocity, stuck), stuck assets list con severity
- Filtros: dropdown de proyecto, dropdown de campana
- Reutilizar `StuckAssetsDrawer` o incorporar inline

## Out of Scope

- Trend historico de distribucion por fase (follow-up)
- Acciones sobre stuck assets (reasignar, escalar)
- Version simplificada para specialist (se filtra via view code access)

## Acceptance Criteria

- [ ] Pagina `/pipeline` muestra pipeline CSC con counts por fase
- [ ] Filtro por proyecto funciona y actualiza el pipeline
- [ ] Stuck assets (>48h) visibles con severity badges
- [ ] Bottleneck (fase con mas assets) identificado visualmente
- [ ] Metrics row: cycle time, velocity, stuck count
- [ ] Guard y view code check funcionan
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Preview con datos reales

## Closing Protocol

- [ ] Actualizar §14.1 V4 readiness a 100%

## Follow-ups

- Trend historico de CSC phases (task futura)
- Version simplificada para specialist con filtro personal
