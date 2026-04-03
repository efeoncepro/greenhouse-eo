# TASK-198 - Delivery Notion Assignee Identity Coverage

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Complete`
- Rank: `54`
- Domain: `identity`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Cerrar la cobertura de identidad entre responsables de Notion asignados en Delivery y el grafo canónico de identidad de Greenhouse para que la atribución de tareas no dependa de coincidencias parciales, drift BigQuery/PostgreSQL o spaces internos únicamente.

La auditoría posterior a `TASK-197` mostró que el problema ya no es solo de sync: Delivery ya preserva `assignee_source_id`, pero todavía existe cobertura parcial de identidad humana y dualidad de autoridad entre `greenhouse.team_members` y `greenhouse_core.*`.

## Why This Task Exists

Greenhouse no puede acreditar tareas, carga o desempeño a personas si el `notion_user_id` no entra al grafo de identidad que consumen `delivery_tasks`, `ICO` y los readers por miembro.

Hoy el caso real es:

- `Efeonce` ya cierra cobertura de responsables en el scope auditado
- `Sky` sigue teniendo `assignee_source_id` sin `assignee_member_id`
- además existen casos `Sin asignar`, asignaciones compartidas y responsables cliente/externos

La evidencia verificable de marzo 2026 hoy es:

- en `greenhouse_conformed.delivery_tasks` quedan `2` `assignee_source_id` sin resolver en `Sky`
- esos dos IDs acumulan `29` y `13` tareas respectivamente
- la cola de reconciliación actual no los está capturando de forma suficientemente visible por `space` y período

Sin un contrato explícito de cobertura de identidad, el reporte mensual seguirá siendo inestable y también quedarán ambiguas las métricas de capacidad, throughput y accountability.

## Goal

- Formalizar el contrato canónico `notion_user_id -> identity_profile -> member/client_user` necesario para Delivery.
- Definir qué personas cliente o externas deben existir como `member`, solo como `identity_profile`, además como `client_user`, bridge temporal o quedar fuera de atribución.
- Dejar verificable la cobertura mínima de identidad para el scope `Efeonce + Sky` por `space` y período.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/tasks/complete/TASK-141-canonical-person-identity-consumption.md`
- `docs/tasks/in-progress/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`

Reglas obligatorias:

- no inventar `member_id` para cerrar métricas rápido sin contrato de identidad
- distinguir explícitamente identidad interna, cliente y externa cuando aplique
- cualquier bridge temporal debe quedar documentado como tal
- la cobertura de identidad debe ser auditable por `notion_user_id`
- el cierre de la task debe reducir la dualidad de autoridad entre BigQuery y PostgreSQL, no ampliarla

## Dependencies & Impact

### Depends on

- `TASK-141 - Canonical Person Identity Consumption`
- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption`
- `TASK-197 - Delivery Source Sync Assignee & Project Relation Parity`
- `src/lib/identity/reconciliation/discovery-notion.ts`
- `greenhouse.team_members`
- `greenhouse_core.members`
- `greenhouse_core.identity_profiles`
- `greenhouse_core.identity_profile_source_links`
- `greenhouse_core.client_users`
- `greenhouse_sync.identity_reconciliation_proposals`

### Impacts to

- `TASK-199 - Delivery Performance Owner Attribution Contract`
- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- readers `ICO` y métricas por miembro
- `Person 360`, `Project Detail`, `Team`, `Campaign 360`, `Reviews Queue`
- futuras métricas de staffing y capacity que lean Delivery

### Files owned

- `docs/tasks/complete/TASK-198-delivery-notion-assignee-identity-coverage.md`
- `src/lib/identity/reconciliation/discovery-notion.ts`
- `src/lib/identity/reconciliation/reconciliation-service.ts`
- `src/lib/identity/reconciliation/apply-link.ts`
- scripts de backfill o reconciliación de identidad que se creen para esta lane
- surfaces o datasets canónicos de `team_members` / `members` que se modifiquen

## Current Repo State

### Ya existe

- `notion_user_id` ya participa en el match de miembros del sync de Delivery
- `greenhouse.team_members` ya resuelve parte de los responsables de `Efeonce` y `Sky`
- existe workflow casi completo de reconciliación para identidad Notion: discovery, matching, proposals, admin resolve y cron
- `greenhouse_core.members` ya expone columnas fuente como `notion_user_id`, `notion_display_name`, `azure_oid` y `hubspot_owner_id`
- `greenhouse_core.client_users` ya tiene `member_id` e `identity_profile_id`

### Gap actual

- la reconciliación actual sigue siendo híbrida entre BigQuery y PostgreSQL, aunque esta task ya endureció la exclusión de IDs enlazados en ambos carriles
- varios consumers runtime siguen leyendo `assignee_member_id` singular mientras `ICO` acredita por `assignee_member_ids`
- la semántica final de atribución para tareas compartidas, `Sin asignar` y responsables cliente sigue perteneciendo a `TASK-199`

## Scope

### Slice 1 - Audit de cobertura

- inventariar `assignee_source_id` / `notion_user_id` reales usados por Delivery en `Efeonce + Sky`
- clasificar quién ya resuelve y quién no por `space` y período
- distinguir internos, cliente, externos y `Sin asignar`

### Slice 2 - Resolución canónica

- resolver los IDs faltantes mediante el modelo de identidad vigente
- documentar si deben existir como `member`, `identity_profile` solo, `client_user`, bridge temporal o exclusión explícita
- dejar criterio para altas futuras de responsables Delivery

### Slice 3 - Guardrails

- dejar queries o checks de cobertura de identidad reutilizables
- dejar visible la diferencia entre cobertura BigQuery y cobertura PostgreSQL
- definir umbral mínimo para considerar confiable una corrida mensual

## Out of Scope

- redefinir la semántica del reporte mensual
- arreglar el sync de arrays y relaciones de proyecto
- materializar snapshots históricos por sí solo

## Acceptance Criteria

- [x] Existe inventario documentado de `notion_user_id` de Delivery para el scope de calibración.
- [x] Los IDs faltantes críticos del caso `Efeonce + Sky / Marzo 2026` quedan resueltos o explícitamente clasificados por faceta canónica.
- [x] Existe una política documentada para responsables cliente, externos y `Sin asignar`.
- [x] La cobertura de identidad queda verificable antes de recalcular el reporte mensual por `space` y período.
- [x] La spec deja explícita la dualidad actual BigQuery/PostgreSQL y el camino de cierre de esa brecha.

## Verification

- query de `notion_user_id` o `assignee_source_id` distintos por `space` y período
- query de match contra `greenhouse.team_members`, `greenhouse_core.members` e `identity_profile_source_links`
- validación de cobertura final sobre `delivery_tasks`

## Delta 2026-04-02

- La auditoría formal mostró que `TASK-197` ya cerró el problema de source sync; `TASK-198` pasa a enfocarse en autoridad canónica de identidad, policy de facetas y coverage audit por `space` y período.
- La spec ya no trata `greenhouse.team_members` y `greenhouse_core.members` como equivalentes y explicita la dualidad actual entre BigQuery y PostgreSQL.
- `discovery-notion.ts` dejó de depender solo de `greenhouse.team_members` y ahora excluye IDs ya enlazados tanto en BigQuery como en PostgreSQL, además de corregir la normalización `responsables_ids` vs `responsable_ids`.
- `reconciliation-service.ts` ahora carga candidates desde `greenhouse_core.members` primero y cae a BigQuery solo como fallback.
- `apply-link.ts` ahora persiste también en `greenhouse_core.identity_profile_source_links` y completa `client_users.member_id` cuando el perfil ya tiene principal.
- Se agregó el guardrail reusable `delivery-coverage.ts` + `GET /api/admin/identity/reconciliation/coverage` para medir cobertura por `space_id` y mes de `due_date`.
- Se clasificaron explícitamente los dos IDs abiertos de `Sky / Marzo 2026` como colaboradoras in-house del cliente, no miembros de Efeonce:
  - `242d872b-594c-8178-9f19-0002c0cda59c` → `Constanza Rojas` → `client_user + identity_profile`, sin `member`
  - `242d872b-594c-819c-b0fe-0002083f5da7` → `Adriana Velarde` → `client_user + identity_profile`, sin `member`
- Se versionó y ejecutó `scripts/backfill-delivery-notion-client-assignee-links.ts` para sembrar esos `notion source links` en BigQuery y PostgreSQL.
- Verificación final marzo 2026:
  - `Efeonce`: `116/116` tareas con `assignee_member_id`
  - `Sky` raw coverage: `145/187` con `assignee_member_id`, `151/187` con `assignee_member_ids`
  - `Sky` contact classification: `42` tareas quedan correctamente clasificadas como contactos cliente (`Constanza` `29`, `Adriana` `13`)
  - `Sky` collaborator coverage: `145/145 = 100%`
- Política fijada para esta lane:
  - responsables Efeonce internos se resuelven a `member`
  - diseñadores in-house del cliente que conviven en el mismo teamspace se resuelven a `client_user + identity_profile`, no a `member`
  - `Sin asignar` queda fuera del denominador de coverage colaborador y su semántica final de atribución se cierra en `TASK-199`
