# TASK-198 - Delivery Notion Assignee Identity Coverage

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `54`
- Domain: `identity`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Cerrar la cobertura de identidad entre usuarios de Notion asignados en Delivery y `members` canónicos de Greenhouse para que la atribución de tareas no dependa de coincidencias parciales o spaces internos únicamente.

La auditoría de `Sky Airline` mostró que el problema ya no es solo de sync: en marzo 2026 hay `5` `notion_user_id` distintos y solo `3` están presentes en `greenhouse.team_members`.

## Why This Task Exists

Greenhouse no puede acreditar tareas, carga o desempeño a personas si el `notion_user_id` no existe en el grafo de identidad que consumen `delivery_tasks`, `ICO` y los readers por miembro.

Hoy el caso real es:

- `daniela-ferreira`, `melkin-hernandez` y `andres-carlosama` sí resuelven
- `constanza rojas` y `Adriana` no resuelven
- además existen casos `Sin asignar` y asignaciones compartidas

Sin un contrato explícito de cobertura de identidad, el reporte mensual seguirá siendo inestable y también quedarán ambiguas las métricas de capacidad, throughput y accountability.

## Goal

- Completar o formalizar el mapping `notion_user_id -> member_id` necesario para Delivery.
- Definir qué personas cliente o externas deben existir como `member`, `person`, bridge temporal o quedar fuera de atribución.
- Dejar verificable la cobertura mínima de identidad para el scope `Efeonce + Sky`.

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

## Dependencies & Impact

### Depends on

- `TASK-141 - Canonical Person Identity Consumption`
- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption`
- `TASK-197 - Delivery Source Sync Assignee & Project Relation Parity`
- `src/lib/identity/reconciliation/discovery-notion.ts`
- `greenhouse.team_members`
- `greenhouse_core.members`

### Impacts to

- `TASK-199 - Delivery Performance Owner Attribution Contract`
- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- readers `ICO` y métricas por miembro
- futuras métricas de staffing y capacity que lean Delivery

### Files owned

- `docs/tasks/to-do/TASK-198-delivery-notion-assignee-identity-coverage.md`
- `src/lib/identity/reconciliation/discovery-notion.ts`
- scripts de backfill o reconciliación de identidad que se creen para esta lane
- surfaces o datasets canónicos de `team_members` / `members` que se modifiquen

## Current Repo State

### Ya existe

- `notion_user_id` ya participa en el match de miembros del sync de Delivery
- `greenhouse.team_members` ya resuelve parte de los responsables de `Efeonce` y `Sky`
- existe foundation de discovery para identidad Notion

### Gap actual

- faltan al menos `constanza rojas` y `Adriana` para el scope auditado
- no existe todavía una política cerrada para responsables cliente dentro del reporte mensual
- no existe un check visible de cobertura de identidad para Delivery por período y por space

## Scope

### Slice 1 - Audit de cobertura

- inventariar `notion_user_id` reales usados por Delivery en `Efeonce + Sky`
- clasificar quién ya resuelve y quién no
- distinguir internos, cliente, externos y `Sin asignar`

### Slice 2 - Resolución canónica

- resolver los IDs faltantes mediante el modelo de identidad vigente
- documentar si deben existir como `member`, bridge temporal o exclusión explícita
- dejar criterio para altas futuras de responsables Delivery

### Slice 3 - Guardrails

- dejar queries o checks de cobertura de identidad reutilizables
- definir umbral mínimo para considerar confiable una corrida mensual

## Out of Scope

- redefinir la semántica del reporte mensual
- arreglar el sync de arrays y relaciones de proyecto
- materializar snapshots históricos por sí solo

## Acceptance Criteria

- [ ] Existe inventario documentado de `notion_user_id` de Delivery para el scope de calibración.
- [ ] Los IDs faltantes críticos del caso `Efeonce + Sky / Marzo 2026` quedan resueltos o explícitamente clasificados.
- [ ] Existe una política documentada para responsables cliente, externos y `Sin asignar`.
- [ ] La cobertura de identidad queda verificable antes de recalcular el reporte mensual.

## Verification

- query de `notion_user_id` distintos por space y período
- query de match contra `greenhouse.team_members` y/o `greenhouse_core.members`
- validación de cobertura final sobre `delivery_tasks`

