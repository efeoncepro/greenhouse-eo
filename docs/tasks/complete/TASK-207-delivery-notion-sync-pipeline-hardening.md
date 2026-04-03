# TASK-207 - Delivery Notion Sync Pipeline Hardening & Freshness Gates

## Delta 2026-04-03 — Implementación cerrada

- El hardening runtime quedó implementado sobre el carril canónico actual:
  - `src/lib/integrations/notion-readiness.ts` agrega gate real de frescura por `space_id` contra `notion_ops.tareas` y `notion_ops.proyectos`
  - `src/lib/integrations/readiness.ts` ahora puede exigir `requireRawFreshness` para `notion`
  - `src/app/api/cron/sync-conformed/route.ts` cancela y registra el run si el raw no está listo
  - `src/lib/sync/sync-notion-conformed.ts` preserva `tarea_principal_ids` / `subtareas_ids`, valida paridad `raw -> transformed -> persisted` y escribe estado en `greenhouse_sync.source_sync_runs`
  - `scripts/sync-source-runtime-projections.ts` deja de sobreescribir `greenhouse_conformed.*` salvo que `GREENHOUSE_ENABLE_LEGACY_CONFORMED_OVERWRITE=true`
- Validación cerrada:
  - `pnpm exec vitest run src/lib/integrations/notion-readiness.test.ts src/lib/sync/notion-task-parity.test.ts`
  - `pnpm build`
  - `pnpm lint`
  - `rg -n "new Pool\\(" src scripts`
- Implicación para follow-ons:
  - `TASK-208` ya no tiene que diseñar el contrato base de hardening
  - debe construir monitoreo y alerting sobre gates, snapshots de paridad y control plane ya disponibles

## Delta 2026-04-03 — Audit correction after repo discovery

- La spec no debe asumir que `docs/architecture/schema-snapshot-baseline.sql` refleja por sí sola toda la superficie vigente de este dominio.
  - el snapshot baseline no incluye `greenhouse_sync.integration_registry`
  - las columnas additive más recientes de `greenhouse_delivery.tasks` y `greenhouse_conformed.delivery_tasks` deben leerse junto con:
    - `scripts/setup-postgres-source-sync.sql`
    - `scripts/setup-bigquery-source-sync.sql`
    - `migrations/20260402001400000_integration-registry.sql`
    - `migrations/20260402002007694_integration-registry-platform.sql`
- Corrección de contrato actual:
  - `src/lib/sync/sync-notion-conformed.ts` es el writer runtime activo
  - `scripts/sync-source-runtime-projections.ts` sigue existiendo como carril legacy/manual y todavía puede reescribir `greenhouse_conformed.delivery_tasks` y `greenhouse_delivery.tasks`
  - `greenhouse_delivery.space_property_mappings` no es hoy la source of truth principal del writer activo; sigue siendo dependencia del carril legacy/manual
- Implicación:
  - la convergencia a writer canónico debe cerrarse sobre el carril runtime actual
  - y el hardening de frescura debe validar `notion_ops` real, no la documentación/snapshot por sí solos

## Delta 2026-04-03 — Impact after TASK-205 closure

- `TASK-205` ya dejó evidencia reusable ejecutable:
  - `src/lib/space-notion/notion-parity-audit.ts`
  - `GET /api/admin/tenants/[id]/notion-parity-audit`
  - `pnpm audit:notion-delivery-parity`
- Los buckets ya confirmados sobre casos reales (`Daniela` y `Andrés`, abril 2026) son:
  - `missing_in_conformed`
  - `status_mismatch`
  - `due_date_mismatch`
  - `fresh_raw_after_conformed_sync`
  - `hierarchy_gap_candidate`
- Implicación:
  - esta lane ya no necesita redescubrir el problema base
  - debe consumir el auditor reusable como evidencia de regresión y validación del hardening

## Delta 2026-04-03

- Orden de implementación explícito dentro de la secuencia Notion native integration:
  - `TASK-205` va primero
  - `TASK-207` va segundo
  - `TASK-208` va tercero
- Justificación:
  - esta lane debe tomar como insumo obligatorio la auditoría de paridad contra origen
  - y debe dejar una base suficientemente estable antes de montar monitoreo continuo
- Re-encuadre explícito:
  - esta lane ya no debe leerse como hardening aislado de Delivery
  - queda definida como hardening runtime de la integración nativa de `Notion` en Greenhouse
  - su foundation shared sigue viviendo en `TASK-188` y su referencia específica de Notion sigue siendo `TASK-187`
- Implicación:
  - gates de frescura, convergencia a writer canónico y preservación de jerarquía pasan a ser parte del contrato nativo del integration layer para `Notion`
  - no deben implementarse como bypass o control plane paralelo

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Implementado y validado`
- Rank: `60`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Endurecer el pipeline `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks` para que Greenhouse deje de materializar datos parciales, stale o reinterpretados antes de tiempo.

La lane debe resolver especialmente:

- gates reales de frescura upstream antes de correr `sync-conformed`
- convergencia a un solo writer canónico para `delivery_tasks`
- preservación explícita de jerarquía `task/subtask`
- validaciones automáticas de paridad `raw -> conformed`

Esta task no debe romper lo que hoy sí funciona. Debe cerrar la tubería de sync de forma incremental, auditable y backward-compatible para los consumers que ya leen de `delivery_tasks`.

También debe ejecutarse explícitamente dentro de la integración nativa de `Notion`, no como un carril técnico separado del resto del ecosistema Greenhouse.

## Why This Task Exists

La auditoría reciente dejó varias evidencias fuertes:

- `Estado` y `Estado 1` sí entran correctamente a `notion_ops.tareas`
- `Notion directo` y `notion_ops.tareas` coinciden en distribución de estatus
- el drift nace después, entre raw y conformed
- `greenhouse_delivery.space_property_mappings` no está causando el problema actual porque hoy tiene `0` filas
- `sync-conformed` corre a las `03:45 UTC`, pero el raw auditado de Notion llega con `_synced_at ~ 06:01 UTC`
- `checkIntegrationReadiness('notion')` ya cruza registry + `source_sync_runs` + `space_notion_sources.last_synced_at`, pero todavía no valida frescura real de `notion_ops.*`

Eso deja una lectura fuerte:

- `greenhouse_conformed.delivery_tasks` puede estar construyéndose antes de que el raw de Notion termine de refrescarse
- existe un writer automatizado (`/api/cron/sync-conformed`) y un carril legacy/manual (`scripts/sync-source-runtime-projections.ts`) con capacidad de overwrite sobre la misma tabla
- y la jerarquía `subtareas / tarea_principal` se pierde entre raw y conformed

Sin endurecer esta capa, cualquier métrica downstream seguirá siendo vulnerable aunque el engine calcule bien.

## Goal

- Garantizar que `delivery_tasks` solo se materialice cuando `notion_ops` esté realmente fresco.
- Consolidar un solo writer canónico para el conformed layer de Delivery.
- Preservar la semántica completa de task hierarchy y evitar pérdida silenciosa de filas.
- Agregar validaciones automáticas de paridad y observabilidad para detectar drift antes de contaminar readers downstream.

## Recommended Execution Order

1. Ejecutar `TASK-205` primero.
2. Ejecutar `TASK-207` en segundo lugar.
3. Ejecutar `TASK-208` después de cerrar esta lane.

Razonamiento:

- esta lane implementa el fix estructural
- no debe empezar sin buckets y evidencia cerrados por `TASK-205`
- y debe cerrar antes de que `TASK-208` automatice alertas sobre el contrato endurecido

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- esta lane endurece la integración nativa de `Notion`; no autoriza crear un carril alterno de sync fuera del integration layer
- no romper los readers que hoy ya consumen `greenhouse_conformed.delivery_tasks`
- no mezclar esta lane con redefinición de métricas o publication
- la source of truth del sync debe ser auditable fila por fila
- cualquier gate de frescura debe validar `notion_ops` real, no solo health general del integration registry
- la convergencia a un solo writer debe ser incremental; no eliminar un carril sin dejar sustituto operativo explícito

## Dependencies & Impact

### Depends on

- `TASK-188 - Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model`
- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `TASK-205 - Delivery Notion Origin Parity Audit`
- `TASK-197 - Delivery Source Sync Assignee & Project Relation Parity`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/sync-source-runtime-projections.ts`
- `src/app/api/cron/sync-conformed/route.ts`
- `src/lib/integrations/readiness.ts`
- `notion_ops.tareas`
- `greenhouse_conformed.delivery_tasks`

### Impacts to

- el runtime de la integración nativa de `Notion`
- `TASK-205 - Delivery Notion Origin Parity Audit`
- `TASK-204 - Delivery Carry-Over & Overdue Carried Forward Semantic Split`
- `TASK-206 - Delivery Operational Attribution Model`
- `ICO` readers y materializaciones que consumen `delivery_tasks`
- readers `Person 360`, `Project 360`, `Team`, `Agency`
- cualquier lane futura que asuma que `delivery_tasks` ya es un contrato confiable

### Files owned

- `docs/tasks/complete/TASK-207-delivery-notion-sync-pipeline-hardening.md`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/sync-source-runtime-projections.ts`
- `src/app/api/cron/sync-conformed/route.ts`
- `src/lib/integrations/readiness.ts`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

## Current Repo State

### Ya existe

- `sync-notion-conformed.ts` es el carril activo del cron `sync-conformed`
- `sync-source-runtime-projections.ts` sigue existiendo como carril legacy/manual con lógica propia
- `delivery_tasks` ya preserva campos operativos útiles como `assignee_source_id`, `assignee_member_ids`, `project_source_ids`
- `notion_ops.tareas` ya preserva `subtareas_ids` y `tarea_principal_ids`
- `checkIntegrationReadiness('notion')` ya combina `integration_registry`, `source_sync_runs` y enriquecimiento de frescura desde `space_notion_sources.last_synced_at`
- el carril runtime y el script legacy actuales ya resuelven `space_id` vía `greenhouse_core.space_notion_sources`
- `schema-snapshot-baseline.sql` sirve como referencia base, pero no refleja por sí solo todo el estado actual del dominio

### Gap actual

- no existe gate fuerte de frescura sobre `notion_ops`
- `checkIntegrationReadiness('notion')` todavía no valida que el batch fresco del raw ya esté disponible en `notion_ops.*`
- existe un writer cron canónico y un script manual legacy con semántica no totalmente convergida
- `delivery_tasks` pierde jerarquía parent/subtask
- no existen validaciones automáticas de paridad `raw -> conformed`
- no existe alerta explícita cuando conformed corre contra raw stale o incompleto
- el auditor reusable ya existe, pero el pipeline todavía no lo consume como gate ni como validación runtime

## Scope

### Slice 1 - Upstream freshness gates

- definir criterio mínimo de frescura para `notion_ops.tareas`
- bloquear o reintentar `sync-conformed` cuando el raw del día no esté listo
- dejar trazabilidad explícita de por qué un run se ejecutó o se saltó

### Slice 2 - Single writer convergence

- decidir cuál writer queda como contrato canónico de `delivery_tasks`
- reducir o eliminar drift entre carril activo y carril legacy
- evitar `last writer wins` sobre la misma tabla

### Slice 3 - Hierarchy preservation

- proyectar `tarea_principal_ids` y `subtareas_ids` a conformed
- definir explícitamente el tratamiento de subitems como filas independientes
- asegurar que `Sky` y `Efeonce` sigan un contrato consistente

### Slice 4 - Raw to conformed parity checks

- agregar validaciones automáticas de:
  - conteo total por `space`
  - conteo por `task_status`
  - conteo con/sin assignee
  - conteo con/sin due date
  - missing IDs entre raw y conformed
- fallar o degradar el run si el delta supera umbrales definidos

### Slice 5 - Observability and auditability

- exponer señales de frescura real, drift y row-loss
- dejar `sync_run_id`, timestamps y fuentes suficientes para debugging posterior
- preparar alerting para buckets anómalos como:
  - `missing_in_conformed`
  - drift abrupto por status
  - caída fuerte de rows por `space`

## Out of Scope

- redefinir fórmulas de métricas Delivery
- publication a Notion
- reescribir `ICO` o readers downstream completos
- reabrir el contrato de owner attribution
- corregir la paridad persona por persona fuera del marco estructural del pipeline

## Acceptance Criteria

- [x] `sync-conformed` ya no corre contra raw stale o incompleto sin detectarlo.
- [x] Existe una única semántica canónica de construcción para `greenhouse_conformed.delivery_tasks`.
- [x] `delivery_tasks` preserva explícitamente la jerarquía `tarea_principal_ids` / `subtareas_ids`.
- [x] El pipeline valida automáticamente la paridad básica `raw -> conformed` antes de declararse sano.
- [x] La lane deja observabilidad suficiente para detectar pérdida de filas o drift de status sin auditoría manual ad hoc.
- [x] El endurecimiento es backward-compatible y no rompe los consumers que hoy ya funcionan.

## Verification

- conteo `raw vs conformed` por `space`
- conteo `raw vs conformed` por `task_status`
- diff por `task_source_id`
- auditoría puntual de `Sky / Sin empezar`
- validación de timestamps:
  - raw `_synced_at`
  - conformed `synced_at`
- `pnpm build`
- `pnpm lint`
