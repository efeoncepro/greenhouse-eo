# EPIC-007 — Reliability Control Plane

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Owner: `unassigned`
- Branch: `epic/EPIC-007-reliability-control-plane`
- GitHub Issue: `[optional]`

## Summary

Construir un control plane de confiabilidad para Greenhouse que una `Ops Health`, `Cloud & Integrations`, `Sentry`, smoke tests, freshness operativa y costo cloud en una lectura común por módulo. El objetivo es que el portal detecte regresiones antes de que lleguen por soporte o aparezcan sorpresivamente en una revisión manual.

## Why This Epic Exists

Greenhouse ya tiene buenas piezas aisladas de observabilidad:

- `Admin Center`, `Cloud & Integrations` y `Ops Health`
- `getOperationsOverview()` y `GET /api/internal/health`
- incidentes Sentry visibles en el portal
- Playwright smoke base autenticado
- data quality recurrente para Notion
- baseline FinOps con guards de BigQuery y Billing Export habilitado

Pero todavía no existe una capa que haga de sistema de confianza continua. Hoy las señales están dispersas y el operador todavía debe correlacionar manualmente:

- qué módulo está roto
- desde cuándo
- qué deploy lo precedió
- si la falla es runtime, data freshness, costo, auth o drift
- si el sistema sigue siendo confiable después de cambios paralelos de varios agentes

Resolver eso bien excede una sola task porque mezcla registro canónico por módulo, ingestión/normalización de señales, verificaciones sintéticas, surfaces administrativas y gates de verificación por impacto.

## Outcome

- Greenhouse cuenta con un modelo canónico de confiabilidad por módulo, con rutas críticas, señales, dependencias y tests asociados.
- `Admin Center` puede mostrar salud, confidence y regresiones de forma accionable sin depender de GCP Console o revisión manual ad hoc.
- La plataforma correlaciona señales de runtime, tests, freshness y costo cloud sobre un lenguaje común.
- Los cambios futuros pueden gatillar una matriz de verificación por impacto en vez de confiar solo en memoria humana.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/operations/PLAYWRIGHT_E2E.md`

## Child Tasks

- `TASK-586` — observabilidad visible de Notion Sync + Billing Export dentro de `Cloud & Integrations` / `Ops Health`
- `TASK-599` — lane preventiva de tests para Finance como primer bloque de confianza continua por módulo
- `TASK-600` — foundation del Reliability Registry + modelo de señales + correlación básica dentro del portal

## Existing Related Work

- `src/lib/operations/get-operations-overview.ts`
- `src/app/api/internal/health/route.ts`
- `src/lib/cloud/observability.ts`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `docs/tasks/in-progress/TASK-103-gcp-budget-alerts-bigquery-guards.md`
- `docs/tasks/complete/TASK-208-delivery-data-quality-monitoring-auditor.md`
- `docs/tasks/in-progress/TASK-585-notion-bq-sync-cost-efficiency-hardening.md`
- `docs/tasks/to-do/TASK-586-notion-sync-billing-observability.md`
- `docs/tasks/to-do/TASK-599-finance-preventive-test-lane.md`

## Exit Criteria

- [ ] existe un registro canónico de módulos críticos con rutas, señales, dependencias y tests asociados
- [ ] `Admin Center` puede leer salud y confianza por módulo desde una capa común, no desde cards aisladas sin contrato
- [ ] las señales de runtime, tests, freshness y costo cloud se normalizan a un lenguaje compartido
- [ ] existe al menos una primera estrategia de verificación por impacto para cambios cross-module
- [ ] `Ops Health` y `Cloud & Integrations` quedan claramente posicionados como consumers del control plane, no como islands sueltas

## Non-goals

- reemplazar `Sentry`, `GCP Billing` o `Playwright` como herramientas fuente
- crear un agente mutante que actúe automáticamente en producción
- rehacer por completo `Admin Center` antes de que exista el registro/contrato base
- prometer observabilidad total de todos los módulos en la primera iteración

## Delta 2026-04-24

Epic creado para institucionalizar un `Reliability Control Plane` repo-native sobre la base ya existente de `Ops Health`, `Cloud & Integrations`, `Sentry`, smoke tests y freshness/data quality. La primera ola se centra en registro canónico, señales unificadas y surfaces accionables, no en automatización mutante.
