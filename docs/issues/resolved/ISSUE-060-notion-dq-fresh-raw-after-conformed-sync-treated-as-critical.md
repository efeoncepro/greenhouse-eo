# ISSUE-060 — Notion Delivery Data Quality marca lag eventual de sync como crítico/broken

## Ambiente

staging + production (Reliability Control Plane / Admin Center)

## Detectado

2026-04-26 — Admin Center mostraba `Delivery` y `Notion Integration` en `crítico/broken` con AI summary "2 spaces, 0 sanos, 2 rotos". Investigación: ambos spaces (Sky Airline y Efeonce) tenían `qualityStatus='broken'` con un único check failing — `fresh_raw_after_conformed_sync` con 689 + 162 casos.

## Síntoma

- Dashboard pintaba módulos Delivery y Notion Integration con 🔴 chip de severidad máxima.
- Summary genérico "2 con falla" sin detalle de qué check específico estaba rojo.
- Slack alerts disparadas en cada cron run de DQ (cada hora).
- On-call se desensibilizaba — no había acción técnica posible (el lag se resuelve solo cuando el conformed sync se pone al día).

## Causa raíz

`fresh_raw_after_conformed_sync` detecta cuando las tablas raw de Notion (`notion_ops.{tareas,proyectos,sprints}`) tienen filas con `_synced_at` posterior al `conformed_synced_at` de las proyecciones canónicas (`delivery_tasks`, `delivery_projects`). Esto es **eventual consistency normal** entre dos pipelines independientes:

- Notion → BQ raw (cron `notion-bq-sync` Cloud Run, repo aparte)
- BQ raw → PG conformed (cron interno greenhouse-eo)

El check estaba en `HARD_BUCKETS` de `notion-delivery-data-quality-core.ts`, que dispara `severity='error'` y `qualityStatus='broken'`. La data quality logic NO distinguía:

1. **Lag transitorio auto-recoverable** (`fresh_raw_after_conformed_sync` solo) — esperado, se resuelve sin intervención
2. **Drift real** (rows missing en raw o en conformed, parity mismatches) — requiere investigación humana

Adicionalmente: el signal del Reliability Control Plane (`buildNotionDataQualitySignals`) no surfacing qué check específico estaba rojo — solo decía "2 con falla".

## Impacto

- Dashboard inutilizable para el módulo Delivery — siempre rojo.
- Slack alerts crónicas sin acción posible.
- On-call pierde confianza en las señales reales (cuando hay un drift de verdad, queda enmascarado).

## Solución

Reclasificación + visibilidad mejorada:

- Nuevo concepto `recoveryClass: 'auto_recoverable' | 'manual' | 'healthy'` por space en `IntegrationDataQualitySpaceSnapshot`.
- Set `AUTO_RECOVERABLE_CHECK_KEYS = { 'fresh_raw_after_conformed_sync' }` en `notion-delivery-data-quality.ts`. Cuando un space tiene SOLO checks auto-recoverable, su `recoveryClass='auto_recoverable'`.
- Nuevo `IntegrationDataQualityOverview.totals.autoRecoverableSpaces`.
- `buildNotionDataQualitySignals` (en `signals.ts`) ahora calcula `manualBrokenSpaces = brokenSpaces - autoRecoverableSpaces`. Solo `manualBrokenSpaces > 0` mantiene severidad `broken`. Resto baja a `degraded`.
- Summary del signal incluye los check keys reales: "checks: fresh_raw_after_conformed_sync (851)" en lugar de "2 con falla".
- `buildNotionDeliveryDataQualitySubsystem` (subsystem read) también respeta auto-recoverable: `manualBrokenSpaces > 0 ? 'down' : 'degraded'`.
- UI: `AdminOpsHealthView` ahora pinta chip "auto" al lado del status para spaces auto-recoverable y baja el tone del KPI Critical de error → warning.

## Verificación

- ✅ Live staging post-deploy: `Notion Delivery Data Quality` status `degraded` con summary "2 con lag auto-recuperable (conformed sync se pondrá al día)".
- ✅ `recoveryClass: 'auto_recoverable'` presente en ambos spaces.
- ✅ `totals.autoRecoverableSpaces=2`, `brokenSpaces=2`, `manualBrokenSpaces=0`.
- ✅ Reliability signal severity es `degraded` (no `broken`).

## Estado

resolved

## Relacionado

- Commits: `bd278687`, `5975a3dc`, `3da3a9b8` — fix(reliability) + fix(admin-ui)
- Archivos: `src/lib/integrations/notion-delivery-data-quality.ts`, `src/lib/reliability/signals.ts`, `src/lib/operations/get-operations-overview.ts`, `src/types/integration-data-quality.ts`, `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- Spec relacionada: `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
