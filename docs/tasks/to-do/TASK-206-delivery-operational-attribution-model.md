# TASK-206 - Delivery Operational Attribution Model

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `59`
- Domain: `identity`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Diseñar la capa canónica de atribución operativa para Delivery encima del backbone de identidad existente, separando explícitamente:

- resolución de identidad (`identity_profile_source_links`)
- resolución de actor operativo (`member`, `client_user`, `external_contact`)
- regla de atribución de trabajo (`primary owner`, `co-assignees`, `member credit`, `space credit`)

Sin esta capa, Greenhouse puede saber correctamente quién es una persona y aun así atribuir mal tareas, proyectos, scorecards o readers downstream.

Esta task no debe romper lo que hoy ya funciona en `Delivery`, `ICO` y readers existentes. Su objetivo es cerrar correctamente el modelo, endurecer contratos y eliminar ambigüedad sin reintroducir drift en los carriles que ya quedaron estables.

## Why This Task Exists

La auditoría reciente confirmó algo importante:

- `identity_profile_source_links` sí ayuda a unificar identidades externas de la misma persona (`Notion`, `HubSpot`, `Google`, `Microsoft`, etc.)
- pero ese grafo no define por sí mismo cómo debe acreditarse el trabajo operativo

Problema actual:

- una tarea puede traer un `person id` de Notion correcto
- ese `person id` puede estar bien enlazado a un `identity_profile`
- incluso puede terminar resolviendo a `member` o `client_user`
- pero todavía falta decidir cómo contar esa asignación para:
  - `tasks`
  - `projects`
  - `ICO`
  - `Person 360`
  - `Project 360`
  - scorecards de performance

Hoy el repo ya tiene contratos parciales:

- `TASK-198` cerró la cobertura de identidad de responsables Notion
- `TASK-199` congeló la regla de owner principal para el `Performance Report`

Pero sigue faltando una capa reusable y transversal de atribución operativa que no viva dispersa en readers o en decisiones ad hoc de cada módulo.

## Goal

- Definir el modelo canónico para traducir una identidad externa a un actor operativo atribuible.
- Separar de forma explícita identidad, ownership, colaboración y crédito analítico.
- Dejar contrato reusable para tareas, proyectos y consumers cross-module.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- `identity_profile_source_links` sigue siendo backbone de identidad, no motor de atribución
- la atribución operativa debe ser auditable fila por fila
- un mismo `identity_profile` puede resolver a distintas facetas operativas (`member`, `client_user`, `external_contact`) según el contexto
- los consumers downstream no deben reinterpretar por su cuenta quién recibe crédito
- la implementación debe ser backward-compatible con los carriles que hoy ya funcionan; cualquier cambio nuevo debe endurecer el modelo sin romper `Delivery`, `ICO`, `Person 360`, `Project 360` o scorecards ya estabilizados

## Dependencies & Impact

### Depends on

- `TASK-198 - Delivery Notion Assignee Identity Coverage`
- `TASK-199 - Delivery Performance Owner Attribution Contract`
- `TASK-205 - Delivery Notion Origin Parity Audit`
- `greenhouse_core.identity_profiles`
- `greenhouse_core.identity_profile_source_links`
- `greenhouse_core.members`
- `greenhouse_core.client_users`
- `greenhouse_conformed.delivery_tasks`
- `greenhouse_conformed.delivery_projects`

### Impacts to

- `TASK-204 - Delivery Carry-Over & Overdue Carried Forward Semantic Split`
- readers `Person 360`, `Project 360`, `Team`, `ICO`, `Delivery`
- futuros scorecards por persona, proyecto, staffing y capacity
- cualquier lane que necesite atribuir trabajo entre equipo interno y colaboradores cliente

### Files owned

- `docs/tasks/to-do/TASK-206-delivery-operational-attribution-model.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `src/lib/identity/**`
- `src/lib/ico-engine/**`
- `src/lib/person-360/**`
- `src/lib/projects/**`

## Current Repo State

### Ya existe

- `identity_profile_source_links` ya unifica identidades externas contra una persona canónica
- `Delivery` ya preserva `assignee_source_id`, `assignee_member_id` y `assignee_member_ids`
- `TASK-199` ya dejó congelado el contrato de owner principal para el scorecard member-level
- `Constanza` y `Adriana` ya están resueltas como colaboradoras in-house de `Sky` vía `client_user + identity_profile`

### Gap actual

- no existe una capa canónica que diga cómo pasar de identidad a atribución operativa reusable
- parte del repo todavía asume que resolver identidad ya equivale a poder atribuir tareas correctamente
- no existe contrato transversal para `primary_owner`, `co_assignees`, `member_credit` y `client_collaboration`
- `projects` y otros consumers todavía pueden divergir respecto de `tasks`
- falta dejar explícito cómo cerrar esta capa sin invalidar ni reemplazar de forma abrupta el comportamiento ya sano del runtime actual

## Scope

### Slice 1 - Modelo conceptual

- definir las capas:
  - `source identity`
  - `identity profile`
  - `operational actor`
  - `attribution role`
- definir qué significa:
  - `primary owner`
  - `co-assignee`
  - `member credit`
  - `space/agency credit`

### Slice 2 - Contrato de datos

- proponer campos canónicos para `tasks` y `projects`, por ejemplo:
  - `assignee_identity_profile_id`
  - `primary_owner_identity_profile_id`
  - `primary_owner_member_id`
  - `primary_owner_client_user_id`
  - `primary_owner_actor_type`
  - `co_assignee_actor_ids`
  - `has_external_owner`

### Slice 3 - Consumers downstream

- definir qué consumers deben leer esta capa
- dejar claro qué readers pueden usar pluralidad de responsables y cuáles deben usar owner principal
- evitar que `ICO`, `Person 360`, `Project 360` y reporting vuelvan a divergir

## Out of Scope

- corregir el undercount `Notion vs Greenhouse` de tareas
- redefinir fórmulas de métricas
- implementar publicación a Notion
- resolver SCIM o identidad general fuera del caso operativo Delivery
- rehacer desde cero readers, materializaciones o scorecards que hoy ya están funcionando sin antes ofrecer compatibilidad y migración clara

## Acceptance Criteria

- [ ] Existe una definición explícita que separa identidad de atribución operativa.
- [ ] Existe propuesta canónica de campos para `tasks` y `projects`.
- [ ] El contrato deja claro cómo tratar `member`, `client_user`, `external_contact` y co-asignados.
- [ ] El documento deja una guía reusable para futuras implementaciones en `ICO`, `Person 360` y `Project 360`.
- [ ] La task deja explícito que el cierre del modelo debe ser incremental y no puede romper los carriles de atribución que hoy ya funcionan.

## Verification

- revisión arquitectónica contra `GREENHOUSE_IDENTITY_ACCESS_V2.md`
- revisión cruzada contra `TASK-198`, `TASK-199` y `TASK-205`
- validación conceptual con casos reales:
  - `Daniela`
  - `Constanza`
  - `Adriana`
  - tarea compartida `cliente + member`
