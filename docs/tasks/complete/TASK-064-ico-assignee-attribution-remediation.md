# TASK-064 - ICO Assignee Attribution Remediation

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Avanzada`
- Rank: `1`
- Domain: `data`
- GitHub Project: `TBD`
- GitHub Issue: `TBD`

## Summary

Remediar de forma sistémica la pérdida de atribución de responsables entre `notion_ops.tareas` y `greenhouse_conformed.delivery_tasks`, para que `ico_engine.metrics_by_member` vuelva a producir KPI por persona (`OTD`, `RpA`, throughput y derivados) y `Payroll` pueda calcular bonos variables con datos reales.

La task cubre fix del sync hacia adelante, backfill histórico, rematerialización de métricas por miembro, wiring reactivo vía outbox/projections y guardrails operativos para detectar tempranamente tareas completadas sin assignee canónico.

## Why This Task Exists

La auditoría de `Payroll projected` y nómina oficial para marzo 2026 mostró que colaboradores con trabajo real, como Andrés, aparecen con `OTD = 0` y `RpA = 0` no porque el motor de payroll esté mal, sino porque `ICO` no recibe tareas atribuidas a persona.

Hallazgos concretos de auditoría:

- `greenhouse.team_members` sí tiene al miembro `andres-carlosama` con `notion_user_id = 2a4d872b-594c-8161-9250-000270ffdfea`
- `notion_ops.tareas` sí contiene múltiples tareas completadas en marzo con `responsables_ids = ['2a4d872b-594c-8161-9250-000270ffdfea']`
- `greenhouse_conformed.delivery_tasks` no contiene esas tareas de Andrés y, además, las filas presentes llegan sin `assignee_source_id`, `assignee_member_id` ni `assignee_member_ids`
- `ico_engine.metrics_by_member` depende exclusivamente de `UNNEST(assignee_member_ids)`, por lo que con arrays vacíos no puede materializar KPI por persona
- `Payroll` hace fallback materialized -> live correctamente, pero sin datos atribuidos termina con `missingMembers > 0` y bonos variables en cero

Esto es un incidente cross-module porque rompe:

- KPI individuales en `ICO`
- `Payroll` oficial y proyectado
- `person_intelligence`
- cualquier consumer que dependa de `metrics_by_member` o derivados por miembro

## Goal

- Restaurar la atribución canónica de responsables a nivel de tarea para todos los colaboradores
- Backfillear histórico relevante y rematerializar KPI por persona sin depender de fixes manuales caso a caso
- Dejar señales reactivas y guardrails que impidan que la pérdida de assignees vuelva a pasar silenciosamente

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- `greenhouse_conformed.delivery_tasks` es la frontera canónica para atribución de tareas; `Payroll` no debe reconstruir responsables por su cuenta
- `ico_engine.metrics_by_member` debe seguir derivando desde la capa conformed, no desde joins ad hoc por consumer
- los refresh de consumers derivados deben salir de cambios persistidos y eventos canónicos, no de recálculos oportunistas escondidos en rutas UI
- el fix debe ser sistémico: forward sync + backfill + rematerialización + observabilidad

## Dependencies & Impact

### Depends on

- `notion_ops.tareas`
- `greenhouse.team_members`
- `greenhouse_conformed.delivery_tasks`
- `ico_engine.v_tasks_enriched`
- `ico_engine.metrics_by_member`
- `TASK-061` por impacto directo en nómina go-live
- `TASK-063` por impacto directo en nómina proyectada

### Impacts to

- `TASK-011` Person/ICO integration
- `TASK-045` Reactive Projection Refresh
- `TASK-061` Payroll Go-Live Readiness Audit
- `TASK-063` Payroll Projected Payroll Runtime
- `person_intelligence`
- `member_capacity_economics`
- rutas y vistas que consuman `metrics_by_member`

### Files owned

- `src/lib/sync/sync-notion-conformed.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/sync/projections/ico-member-metrics.ts`
- `src/lib/sync/projections/person-intelligence.ts`
- `src/lib/outbox/**`
- `scripts/**` para backfill/rematerialización
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

## Current Repo State

### Ya existe

- lectura de responsables desde `COALESCE(responsables_ids, responsable_ids)` en `notion_ops.tareas`
- mapeo `notion_user_id -> member_id` vía `greenhouse.team_members`
- materialización `metrics_by_member` basada en `UNNEST(te.assignee_member_ids)`
- consumer de payroll que usa snapshots materializados y fallback live
- surfaces de nómina oficial y proyectada listas para consumir KPI por miembro

### Gap actual

- tareas con responsables reales en `notion_ops.tareas` no están llegando a `greenhouse_conformed.delivery_tasks`
- las filas presentes en `delivery_tasks` están entrando sin assignee resuelto
- no existe un health check fuerte para `% de tareas completadas sin assignee`
- no existe remediación/backfill canónica para reconstruir assignees históricos
- los downstream consumers no reciben una señal reactiva explícita cuando cambia la atribución de tarea o se rematerializan métricas por persona

## Scope

### Slice 1 - Root Cause Hardening en Sync Conformed

- auditar y corregir el path completo `notion_ops.tareas -> greenhouse_conformed.delivery_tasks`
- verificar runtime desplegado vs código actual para evitar desfase entre repo y cron real
- garantizar persistencia consistente de:
  - `assignee_source_id`
  - `assignee_member_id`
  - `assignee_member_ids`
- agregar verificaciones que fallen o alerten cuando `responsables_ids` exista en origen pero se pierda en conformed

Estado 2026-03-27:
- En progreso avanzado.
- `sync-notion-conformed` ya falla explícitamente si el origen trae tareas con `responsables_ids` y `delivery_tasks` persiste `0` filas con `assignee_source_id`.
- El sync ya expone métricas de validación en su resultado:
  - `sourceTasksWithResponsables`
  - `conformedTasksWithAssigneeSource`
  - `conformedTasksWithAssigneeMember`
  - `conformedTasksWithAssigneeMemberIds`

### Slice 2 - Backfill Histórico de Atribución

- crear script canónico para repoblar `greenhouse_conformed.delivery_tasks` desde `notion_ops.tareas`
- remapear responsables con el catálogo actual de `greenhouse.team_members`
- cubrir histórico necesario para nómina y KPI individuales
- dejar estrategia clara para reruns idempotentes

Estado 2026-03-27:
- En progreso avanzado.
- Se creó `scripts/remediate-ico-assignee-attribution.ts` para:
  - correr sync conformed
  - registrar before/after de atribución
  - rematerializar `ICO`
  - verificar `metrics_by_member` del período afectado

### Slice 3 - Rematerialización ICO por Miembro

- recomputar `ico_engine.v_tasks_enriched` si aplica por dependencia de view/campos
- rematerializar `ico_engine.metrics_by_member` para períodos afectados
- resincronizar cualquier tabla serving/postgres derivada
- verificar que miembros con trabajo real vuelvan a tener `OTD`, `RpA`, `completed_tasks`

### Slice 4 - Wiring Reactivo y Outbox

- introducir o completar evento canónico cuando cambie la atribución de una tarea, por ejemplo:
  - `delivery.task_assignment_upserted`
- introducir o completar evento de rematerialización por miembro/período, por ejemplo:
  - `ico.member_metrics.materialized`
- usar outbox para disparar refresh reactivo donde aporte:
  - `projected payroll`
  - `payroll readiness`
  - `person_intelligence`
  - otros consumers persona-first

Estado 2026-03-27:
- Parcial.
- Ya existe y quedó validado el camino reactivo derivado:
  - `materializeMonthlySnapshots()` publica `ico.materialization.completed` por miembro/período
  - `projected_payroll` ya reacciona a `ico.materialization.completed`
  - `person_intelligence` ya reacciona a `ico.materialization.completed`
- Siguiente paso recomendado:
  - introducir el evento base `delivery.task_assignment.upserted` para refresh dirigido de `ico_member_metrics`, sin bloquear la remediación urgente actual

### Slice 5 - Guardrails Operativos

- health endpoint o chequeo batch para:
  - `% de tareas completadas sin assignee`
  - `% por space`
  - `% por período`
- umbrales de alerta
- reporting explícito de `missingMembers` en payroll cuando exista variable configurada
- tests unitarios y, donde valga la pena, tests de integración livianos sobre el pipeline de mapeo

## Out of Scope

- rediseñar fórmulas de `OTD` o `RpA`
- cambiar políticas de compensación o umbrales de bonos en `Payroll`
- rehacer el modelo de identidad de miembros fuera de lo necesario para mapping `notion_user_id -> member_id`
- refactorizar masivamente `ICO` fuera de atribución, backfill y refresh derivados

## Root Cause Snapshot

Estado auditado al 2026-03-27:

- `greenhouse.team_members`: Andrés existe y está mapeado a Notion
- `notion_ops.tareas`: sí hay tareas de Andrés en marzo con `responsables_ids`
- `greenhouse_conformed.delivery_tasks`: no aparecen esas tareas de Andrés y las filas existentes están sin assignee
- `ico_engine.v_tasks_enriched`: no hay filas para `assignee_member_id = andres-carlosama`
- `ico_engine.metrics_by_member`: no hay snapshot para Andrés en marzo 2026
- `Payroll`: refleja correctamente ausencia de KPI, pero eso deriva en bonos variables cero

Esto indica que la causa raíz principal está antes de la materialización `ICO`, en la persistencia conformed o en el job/runtime que la pobla.

## Delta 2026-03-27

- Se verificó que el código actual de `sync-notion-conformed` sí resuelve correctamente `responsables_ids -> notion_user_id -> member_id`; la pérdida de atribución observada estaba en el estado persistido del runtime, no en la lógica vigente del repo.
- Se ejecutó una remediación operativa completa con:
  - rerun de `syncNotionToConformed()`
  - rerun de `materializeMonthlySnapshots(2026, 3)`
- Resultado validado en datos reales:
  - `greenhouse_conformed.delivery_tasks` pasó a persistir atribución nuevamente
    - `with_assignee_source = 1063`
    - `with_assignee_member = 714`
    - `with_assignee_member_ids = 792`
  - `ico_engine.metrics_by_member` volvió a generar KPI para miembros afectados, incluido `andres-carlosama`
- KPI recuperado para Andrés en marzo 2026:
  - `completed_tasks = 30`
  - `otd_pct = 60`
  - `rpa_avg = 1.44`
- Hallazgo adicional en `Payroll projected`:
  - el batch mezclaba miembros activos sin compensación vigente real
  - un `memberId` nulo hacía fallar `fetchKpisForPeriod()` y por el `.catch(() => new Map())` dejaba a todo el período sin KPI
  - se corrigió endureciendo `fetchKpisForPeriod()` contra `null/blank` y filtrando `hasCompensationVersion` en `projectPayrollForPeriod()`

## Proposed Event Model

### Incoming signals

- `source_sync.notion_tasks_synced`
- `source_sync.team_members_synced`
- `delivery.task_assignment_upserted` o equivalente nuevo

### Outgoing signals

- `delivery.task_assignment_upserted`
- `ico.member_metrics.materialized`
- `finance.payroll_projection.refresh_requested`
- `person_intelligence.refresh_requested`

### Reactive consumers

- projection `ico-member-metrics`
- projection `person-intelligence`
- projected payroll runtime
- payroll readiness / audit flows

## Verification Data Points

Casos mínimos que deben verificarse con datos reales:

- Andrés y al menos otros dos colaboradores con trabajo real en marzo deben aparecer en `metrics_by_member`
- `notion_ops.tareas` con `responsables_ids` no puede terminar en `delivery_tasks` con assignee vacío
- `fetchKpisForPeriod()` debe dejar de reportar `missingMembers` para miembros con tareas atribuidas
- `Payroll projected` y nómina oficial deben recuperar bonos variables para miembros que califican

## Acceptance Criteria

- [ ] `greenhouse_conformed.delivery_tasks` persiste `assignee_source_id`, `assignee_member_id` y `assignee_member_ids` de forma consistente para tareas con responsables en `notion_ops.tareas`
- [ ] existe backfill idempotente para repoblar atribución histórica y fue validado al menos sobre marzo 2026
- [ ] `ico_engine.metrics_by_member` vuelve a generar filas para miembros afectados con trabajo real
- [ ] `Payroll` oficial y proyectado dejan de mostrar `OTD/RpA = 0` cuando la ausencia venía solo por pérdida de atribución upstream
- [ ] hay al menos un guardrail operativo que detecta porcentaje anómalo de tareas completadas sin assignee
- [ ] el refresh de consumers derivados se dispara mediante eventos/outbox donde corresponda
- [ ] la arquitectura y el catálogo de eventos quedan documentados

## Verification

- `pnpm test`
- `pnpm exec eslint ...`
- validación de consultas BigQuery antes/después:
  - conteo de tareas con `responsables_ids` en `notion_ops.tareas`
  - conteo de tareas con `assignee_member_ids` en `greenhouse_conformed.delivery_tasks`
  - filas en `ico_engine.metrics_by_member` por miembro/período
- validación manual en UI:
  - `Payroll projected`
  - nómina oficial del período afectado
  - cualquier surface de KPI persona que consuma `metrics_by_member`

## Rollout Notes

- no correr el backfill sin definir primero el período mínimo a recomputar para no mezclar trabajo operativo de nómina en curso
- coordinar el rerun con `TASK-061` porque cambia montos de variable y puede modificar el veredicto go-live
- si el runtime desplegado está desalineado del repo, corregir primero la versión desplegada antes de diagnosticar más profundamente los datos

## Follow-ups

- cerrar o actualizar `TASK-061` con el resultado de la remediación sobre nómina real
- actualizar `TASK-063` para que projected payroll exponga de forma más explícita cuando el KPI falte por pipeline roto vs dato realmente inexistente
- considerar un dashboard operativo de calidad de atribución delivery/ICO
