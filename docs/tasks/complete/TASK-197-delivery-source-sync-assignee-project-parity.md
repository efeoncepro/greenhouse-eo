# TASK-197 - Delivery Source Sync Assignee & Project Relation Parity

## Status

- Lifecycle: `in-progress`
- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `53`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Corregir la paridad de ingestión `Notion -> notion_ops -> greenhouse_conformed -> PostgreSQL` para que `Tareas` y `Proyectos` preserven correctamente responsables, relaciones de proyecto y arrays de IDs entre spaces con variantes de schema como `Efeonce` y `Sky Airline`.

Esta task aísla el problema más mecánico de la lane: hoy `Sky` sí trae `responsable_ids` en origen, pero los pierde antes de llegar a `delivery_tasks`. Sin cerrar este carril, cualquier métrica por persona o por proyecto seguirá saliendo incompleta.

## Delta 2026-04-02

- La auditoría de implementación confirmó que el repo no tiene un solo sync path sino dos:
  - cron moderno en `src/lib/sync/sync-notion-conformed.ts`
  - script legacy/manual en `scripts/sync-source-runtime-projections.ts`
- La sospecha principal para la pérdida de `Sky` ya no es el cron moderno sino el carril legacy/manual, porque ese script sigue leyendo solo `responsables_ids` y no `COALESCE(responsables_ids, responsable_ids)`.
- PostgreSQL runtime no tiene todavía paridad mínima con `greenhouse_conformed` para este dominio:
  - falta `assignee_source_id`
  - falta `assignee_member_ids`
  - falta `project_source_ids`
- La implementación de esta task debe ser aditiva y backward-compatible para no romper `ICO`, `Person 360`, `Project Detail` ni `team-queries`.
- Slice implementado en este turno:
  - `greenhouse_conformed.delivery_tasks` ahora preserva `project_source_ids`
  - `sync-notion-conformed.ts` ahora valida cobertura de assignee por `space_id`
  - `scripts/sync-source-runtime-projections.ts` ya soporta `responsable_ids` y proyecta arrays de proyecto/assignee al runtime
  - `team-queries.ts` ya soporta `responsable_ids`
  - `get-project-detail.ts` ya considera `proyecto_ids` además del proyecto primario
  - se creó migración aditiva para `greenhouse_delivery.tasks`
- Bloqueo encontrado:
  - `pnpm migrate:up` no puede avanzar hasta reconciliar un drift preexistente entre `public.pgmigrations` y el archivo local de una migración anterior de Notion governance

## Delta 2026-04-02 (follow-up)

- El supuesto del bloqueo de migraciones quedó desactualizado:
  - `public.pgmigrations` ya estaba reconciliado
  - `pnpm migrate:up` sí pudo avanzar y aplicó `20260402222438783_delivery-runtime-space-fk-canonicalization.sql`
- La causa raíz del gap de `Sky` en `greenhouse_conformed` era más específica:
  - `sync-notion-conformed.ts` usaba `COALESCE(responsables_ids, responsable_ids)`
  - en BigQuery, `[]` no cae al fallback, así que `responsable_ids` de `Sky` se perdía cuando `responsables_ids` venía vacío
  - se corrigió con un `CASE` que prioriza arrays no vacíos
- Verificación real en `greenhouse_conformed.delivery_tasks` para marzo 2026:
  - `Sky`: `190/190` con `project_source_ids`
  - `Sky`: `187/190` con `assignee_source_id`
  - `Sky`: `151/190` con `assignee_member_ids`
  - `Efeonce`: `116/116` con `assignee_source_id`
- La proyección runtime arrastraba drift estructural adicional:
  - `greenhouse_delivery.{projects,sprints,tasks}.space_id` seguía con FK a `greenhouse_core.notion_workspaces`
  - el DDL base de `scripts/setup-postgres-source-sync.sql` también seguía referenciando `notion_workspaces`
  - se canonicalizó todo hacia `greenhouse_core.spaces(space_id)` y la migración backfillea `space_id` legacy (`space-efeonce`, `hubspot-company-*`, `greenhouse-demo-client`) a `spc-*`
- `scripts/sync-source-runtime-projections.ts` también quedó endurecido:
  - ya no pierde `responsable_ids` cuando `responsables_ids = []`
  - ya no intenta persistir `NULL` en `assignee_member_ids` o `project_source_ids`
  - ya resuelve `client_id` desde `space_notion_sources -> spaces`, en vez de asumir que `space_id` canónico también es `client_id`
- Estado real al cierre de este turno:
  - `conformed` quedó reparado y verificado
  - `runtime PostgreSQL` quedó reparado y reseedeado por completo
  - verificación final marzo 2026 en `greenhouse_delivery.tasks`:
    - `Sky`: `190/190` con `project_record_id`, `190/190` con `project_source_ids`, `187/190` con `assignee_source_id`, `151/190` con `assignee_member_ids`
    - `Efeonce`: `116/116` con `project_record_id`, `116/116` con `project_source_ids`, `116/116` con `assignee_source_id`, `116/116` con `assignee_member_ids`
  - `greenhouse_delivery.{projects,sprints,tasks}.space_id` ya quedó canónico con FK a `greenhouse_core.spaces(space_id)`

## Why This Task Exists

La auditoría real de `Marzo 2026` confirmó dos cosas:

- `Sky Airline` usa `Responsable` en singular, no `Responsables`
- `sync-notion-conformed.ts` ya hace `COALESCE(responsables_ids, responsable_ids)`, por lo que el nombre de la propiedad no explica el gap

Sin embargo, el resultado materializado sigue roto:

- en `notion_ops.tareas`, `Sky Airline` trae `responsable_ids` en `187/190` tareas del período
- en `greenhouse_conformed.delivery_tasks`, ese mismo space queda con `0/188` `assignee_source_id`
- además, la relación `Proyecto -> Tareas` hoy se reduce a la primera relación disponible y no preserva el array completo para auditoría o joins más ricos

La auditoría del repo agregó dos precisiones críticas:

- el carril que más probablemente sigue causando el gap es `scripts/sync-source-runtime-projections.ts`
- aunque BigQuery ya guarda `assignee_source_id` y `assignee_member_ids`, PostgreSQL runtime sigue siendo una proyección degradada

La lane de paridad del `Performance Report` no puede avanzar si el carril de source sync sigue perdiendo identidad y relaciones básicas.

## Goal

- Preservar correctamente la atribución de responsables desde Notion hasta `delivery_tasks`.
- Preservar la relación `Proyecto -> Tareas` con suficiente fidelidad para reporting y reconciliación.
- Eliminar la asimetría de materialización entre spaces con schemas equivalentes pero nombres de propiedad distintos.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/tasks/in-progress/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`

Reglas obligatorias:

- la capa `conformed` debe preservar fidelidad suficiente de IDs y relaciones para auditoría
- no asumir que todos los spaces usan exactamente el mismo nombre de propiedad en Notion
- no degradar relaciones many-to-many a un solo valor sin preservar también el array original cuando sea relevante
- no cerrar esta task solo con documentación; debe quedar un carril técnico implementable y verificable

## Dependencies & Impact

### Depends on

- `TASK-186 - Delivery Metrics Trust: Notion Property Audit & Conformed Contract Hardening`
- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/sync-source-runtime-projections.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-postgres-source-sync.sql`
- datasets `notion_ops.*`, `greenhouse_conformed.*`, `greenhouse_delivery.*`

### Impacts to

- `TASK-198 - Delivery Notion Assignee Identity Coverage`
- `TASK-199 - Delivery Performance Owner Attribution Contract`
- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- cualquier reader por proyecto o por miembro en `ICO`

### Files owned

- `docs/tasks/complete/TASK-197-delivery-source-sync-assignee-project-parity.md`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/sync-source-runtime-projections.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-postgres-source-sync.sql`
- `src/lib/team-queries.ts`
- `src/lib/person-360/get-person-delivery.ts`
- `src/lib/projects/get-project-detail.ts`
- `src/lib/ico-engine/schema.ts`

## Current Repo State

### Ya existe

- `notion_ops.tareas` ya materializa ambas variantes de propiedad de responsable
- `sync-notion-conformed.ts` ya hace `COALESCE(responsables_ids, responsable_ids)`
- `delivery_tasks` ya persiste `assignee_source_id`, `assignee_member_id` y `assignee_member_ids`
- `delivery_tasks` ya persiste `project_source_id`
- la resolución `notion_user_id -> member_id` ya existe y es reutilizable
- `ICO` ya consume `assignee_member_ids` con fallback compatible para filas legacy

### Gap actual

- el repo tiene dos sync paths activos o reutilizables, con contratos distintos
- `Sky Airline` pierde `assignee_source_id` en el resultado materializado aunque en origen trae `responsable_ids`
- el tramo más sospechoso hoy es `scripts/sync-source-runtime-projections.ts`
- el pipeline actual no deja suficientemente trazable por `space` dónde se cae esa atribución
- la relación de proyecto se reduce a una asociación primaria sin preservar explícitamente el array completo
- PostgreSQL runtime no preserva la misma fidelidad de responsables y proyecto que BigQuery conformed
- `team-queries` todavía usa solo `responsables_ids`, no `responsable_ids`
- no existe una verificación automatizada por space para detectar drift de paridad en responsables y proyectos

## Scope

### Slice 1 - Assignee source parity

- aislar el tramo exacto donde `responsable_ids` de `Sky` se pierde
- corregir la materialización de `assignee_source_id`
- dejar verificación por `space` para `source -> conformed`
- alinear el carril legacy/manual con el contrato del sync moderno

### Slice 2 - Project relation fidelity

- preservar `project_source_ids` además del `project_source_id` primario
- validar que la lectura `Proyecto -> Tareas` no dependa solo de rollups opacos
- dejar preparado el modelo para `Project 360` y reporting por proyecto

### Slice 3 - Runtime projection parity

- alinear BigQuery y PostgreSQL runtime projections para responsables y proyecto
- validar que el runtime no vuelva a degradar lo que ya quedó correcto en `conformed`
- mantener compatibilidad hacia atrás con readers actuales que siguen usando `project_source_id` y `assignee_member_id`

## Out of Scope

- resolver la identidad humana completa de cada `notion_user_id`
- definir la fórmula canónica de `OTD`, `Late Drop` u `Overdue`
- construir el reporte mensual completo

## Acceptance Criteria

- [ ] `Sky Airline` preserva `assignee_source_id` en `greenhouse_conformed.delivery_tasks` para las tareas con responsable en origen.
- [ ] `delivery_tasks` preserva el array de proyecto además del proyecto primario.
- [ ] Existe verificación documentada por `space` para `responsables_ids/responsable_ids -> assignee_source_id`.
- [x] BigQuery y PostgreSQL runtime projections mantienen la misma fidelidad mínima de responsables y proyecto.
- [x] El carril legacy/manual deja de divergir del sync moderno para variantes `Responsables/Responsable`.
- [x] `ICO`, `Person 360`, `Project Detail` y `team-queries` siguen funcionando con contrato aditivo y compatible.

### Estado de aceptación al 2026-04-02

- [x] `Sky Airline` preserva `assignee_source_id` en `greenhouse_conformed.delivery_tasks` para las tareas con responsable en origen.
- [x] `delivery_tasks` preserva el array de proyecto además del proyecto primario en `greenhouse_conformed` y en el contrato runtime.
- [x] Existe verificación documentada por `space` para `responsables_ids/responsable_ids -> assignee_source_id`.
- [x] BigQuery y PostgreSQL runtime projections mantienen la misma fidelidad mínima de responsables y proyecto.
- [x] El carril legacy/manual deja de divergir del sync moderno para variantes `Responsables/Responsable`.
- [x] `ICO`, `Person 360`, `Project Detail` y `team-queries` siguen funcionando con contrato aditivo y compatible.

## Verification

- query de cobertura por `space` en `notion_ops.tareas`
- query de cobertura por `space` en `greenhouse_conformed.delivery_tasks`
- query de cobertura en runtime PostgreSQL para tareas materializadas
- `pnpm migrate:up`
- `pnpm build`
- `pnpm lint`
