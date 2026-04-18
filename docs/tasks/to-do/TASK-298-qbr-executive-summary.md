## Delta 2026-04-17 — alineación con capa de entitlements

TASK-286 fue ampliada para declarar capabilities granulares `client_portal.*` con `defaultScope: 'organization'`. Esta task ahora debe consumir esa capa al implementar la página y el export de QBR.

- **View code:** `cliente.qbr`
- **Capability:** `client_portal.qbr`
- **Actions requeridas:** `view`, `export` (QBR trimestral exportable a PDF/slides)
- **Scope:** `organization`
- **Guard de página:** combinar `hasAuthorizedViewCode(tenant, 'cliente.qbr')` + `can(tenant, 'client_portal.qbr', 'view', 'organization')`.
- **Guard de export:** los endpoints de export a PDF/slides deben chequear `can(tenant, 'client_portal.qbr', 'export', 'organization')`. Un rol con solo `view` ve la página pero el botón de export queda disabled.
- **Dependencia sobre TASK-287 y TASK-296:** estas entregan las capabilities `client_portal.revenue_enabled` y `client_portal.brand_health` vía TASK-286. QBR consume ambas capabilities + la propia `client_portal.qbr`.
- **Ref canónica:** `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

# TASK-298 — QBR Executive Summary

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `14`
- Domain: `agency`
- Blocked by: `TASK-286` (view code + capability con actions view/export), `TASK-287` (Revenue Enabled page + capability), `TASK-296` (Brand Health page + capability)
- Branch: `task/TASK-298-qbr-executive-summary`

## Summary

Crear pagina de Executive Summary / QBR trimestral: composicion multi-fuente (Revenue Enabled + Brand Health + Performance + milestones), narrativa automatica, exportable en PDF. El QBR es un rito enterprise — generarlo automaticamente ahorra 4-6 horas de preparacion.

## Why This Task Exists

Enterprise marketing teams presentan QBRs trimestrales a su liderazgo. Hoy el account manager de Efeonce prepara el deck manualmente. Si el portal genera un Executive Summary con deltas de KPIs, Revenue Enabled acumulado, Brand Health y recomendaciones, el VP Marketing tiene un entregable profesional listo para presentar.

## Goal

- Pagina `/qbr` con resumen del quarter actual
- Composicion multi-fuente: Revenue Enabled, Brand Health, Performance, milestones
- Narrativa automatica (building on `buildExecutiveSummary()`)
- Exportable en PDF

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.1 V3

## Dependencies & Impact

### Depends on

- TASK-286 (view code `cliente.qbr`)
- TASK-287 (Revenue Enabled) — datos de Revenue Enabled
- TASK-296 (Brand Health) — datos de Brand Health
- `src/lib/ico-engine/performance-report.ts` — narrativa y performance data
- TASK-288 (Reports Center) — template PDF base

### Blocks / Impacts

- Ninguno directo

### Files owned

- `src/app/(dashboard)/qbr/page.tsx`
- `src/app/api/qbr/route.ts`
- `src/views/greenhouse/GreenhouseQBR.tsx`
- `src/lib/reports/generate-qbr-pdf.tsx`

## Current Repo State

### Already exists

- `buildExecutiveSummary()` en performance-report.ts — genera narrativa mensual
- `buildAlertText()` — genera alertas criticas
- MetricTrustSnapshot con quality gates
- Trend analysis (improving/stable/degrading)
- `@react-pdf/renderer` instalado
- Datos materializados en PG y BQ

### Gap

- No hay pagina de QBR
- Narrativa es mensual, no trimestral
- No hay composicion multi-fuente (Revenue Enabled + Brand Health + Performance)
- No hay template PDF de QBR
- No hay seccion de recomendaciones
- No hay tabla de milestones/hitos del periodo

## Scope

### Slice 1 — API de composicion trimestral

- Crear `/api/qbr/route.ts`
- Agregar: Revenue Enabled del quarter, Brand Health snapshot, Performance deltas vs quarter anterior
- Narrativa trimestral (extender `buildExecutiveSummary()` para aggregar 3 meses)

### Slice 2 — Page y view component

- Secciones: Executive Summary (narrativa), Revenue Enabled (3 palancas), Performance Scorecard (deltas), Brand Health (snapshot), Alertas/Recomendaciones
- Cada seccion con trend vs quarter anterior
- Overall assessment badge

### Slice 3 — PDF export

- Template PDF con `@react-pdf/renderer`
- Branding Efeonce
- Mismo contenido que la pagina, formateado para impresion/sharing
- Boton "Descargar QBR" en la pagina

## Out of Scope

- Recomendaciones generadas por AI (usar text manual o template fijo primero)
- Tabla de milestones (simplificar a hitos auto-detectados: metricas que cruzaron threshold)
- Presentacion tipo deck/PowerPoint

## Acceptance Criteria

- [ ] Pagina `/qbr` muestra resumen trimestral con Revenue Enabled, Performance y Brand Health
- [ ] Deltas vs quarter anterior visibles para cada KPI
- [ ] Narrativa automatica generada
- [ ] PDF exportable con branding Efeonce
- [ ] Solo visible para `client_executive`
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- PDF generado abre correctamente

## Follow-ups

- Recomendaciones AI-generated
- Milestones auto-detectados
