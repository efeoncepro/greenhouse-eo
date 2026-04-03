# Greenhouse Operational Attribution Model V1

## Purpose

Definir el modelo canónico de atribución operativa para Greenhouse, separando explícitamente la resolución de identidad de la asignación de crédito operativo.

Este documento cierra la ambiguedad entre "saber quién es una persona" y "decidir a quién se le acredita el trabajo". Antes de esta spec, el repo ya tenía implementaciones correctas (TASK-199 congeló el contrato de owner principal, TASK-198 cerró la cobertura de identidad), pero la separación conceptual vivía dispersa en readers, helpers y deltas de otros documentos.

Este modelo es la referencia canónica que todo consumer cross-module debe respetar.

## Status

- Versión: `V1`
- Fecha: `2026-04-03`
- Origen: `TASK-206`
- Contratos upstream: `TASK-198` (identity coverage), `TASK-199` (owner attribution), `TASK-205` (parity audit), `TASK-209` (sync orchestration)

## Architecture Alignment

Este documento complementa y no reemplaza:

- `GREENHOUSE_IDENTITY_ACCESS_V2.md` — autenticación, roles, sesión
- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — objetos canónicos, regla de identidad única
- `GREENHOUSE_DATA_MODEL_MASTER_V1.md` — modelo físico, campos por tabla
- `GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md` — contrato del scorecard mensual
- `Greenhouse_ICO_Engine_v1.md` — motor de materialización multidimensional
- `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person-org, poblaciones, asignaciones

---

## 1. Las Cuatro Capas del Modelo

La atribución operativa de Greenhouse se organiza en cuatro capas ordenadas. Cada capa consume la anterior sin reinterpretarla.

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4 — ATTRIBUTION ROLE                                     │
│  ¿Cómo se acredita este trabajo para reporting?                 │
│  primary_owner · co_assignee · space_credit · agency_credit     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3 — OPERATIONAL ACTOR                                    │
│  ¿Bajo qué faceta operativa actúa esta persona?                 │
│  member · client_user · external_contact                        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2 — IDENTITY PROFILE                                     │
│  ¿Quién es esta persona canónicamente?                          │
│  identity_profile_id (public_id = EO-PER-XXXX)                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1 — SOURCE IDENTITY                                      │
│  ¿De dónde viene este identificador?                            │
│  Notion user_id · HubSpot owner_id · Azure OID · Google sub    │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 1 — Source Identity

Cada sistema externo emite su propio identificador para una persona. Greenhouse los preserva tal cual sin transformarlos.

| Campo | Tabla | Ejemplo |
|-------|-------|---------|
| `source_object_id` | `identity_profile_source_links` | `242d872b-594c-8178-...` |
| `assignee_source_id` | `delivery_tasks` | Notion `responsable_ids[0]` |
| `notion_user_id` | `members` | Notion workspace user ID |
| `hubspot_owner_id` | `members` | HubSpot CRM owner ID |
| `microsoft_oid` | `client_users` | Azure AD OID |
| `google_sub` | `client_users` | Google OAuth subject |

**Regla**: los source IDs se preservan para trazabilidad. Nunca se transforman ni se usan como clave primaria de atribución.

### Layer 2 — Identity Profile

`greenhouse_core.identity_profiles` es el ancla canónica de persona. Un `identity_profile` unifica todas las identidades externas de la misma persona humana.

| Campo | Descripción |
|-------|-------------|
| `profile_id` | PK interna |
| `public_id` | EO-PER-XXXX (ID público del portal) |
| `profile_type` | `internal_member` · `client_user` · `external_contact` |
| `canonical_email` | Email canónico de la persona |
| `full_name` | Nombre completo canónico |

**Regla**: `identity_profile_source_links` es el backbone que conecta Layer 1 con Layer 2. Un mismo profile puede tener N source links (Notion + HubSpot + Azure + Google).

**Regla**: el identity profile NO decide por sí mismo cómo se acredita el trabajo. Esa decisión pertenece a Layer 3 + Layer 4.

### Layer 3 — Operational Actor

Un mismo `identity_profile` puede manifestarse como distintas facetas operativas según el contexto:

| Actor Type | Tabla canónica | Descripción | Ejemplo |
|------------|---------------|-------------|---------|
| `member` | `greenhouse_core.members` | Colaborador interno Efeonce (empleado, contratista, pasante) | Daniela, Andrés |
| `client_user` | `greenhouse_core.client_users` | Usuario del portal con acceso autenticado. Puede ser externo (cliente) o in-house (colaborador del cliente que trabaja con Efeonce) | Constanza (Sky in-house), ejecutivo cliente |
| `external_contact` | `identity_profiles` con `profile_type = 'external_contact'` | Persona identificada pero sin acceso al portal ni membresía interna | Contacto CRM, proveedor |

**Regla**: la faceta operativa se resuelve mediante la función `classifyLinkedIdentity()` en `src/lib/identity/reconciliation/delivery-coverage.ts`:

```typescript
// Prioridad de clasificación (orden importa):
// 1. member_id presente       → 'member'
// 2. tenant_type = 'client'   → 'client_user'
// 3. profile_type = 'external' → 'external_contact'
// 4. identity_profile_id solo → 'linked_profile_only'
// 5. nada                     → 'unclassified'
```

**Regla**: `client_user` con `member_id` vinculado (caso Efeonce internal) se clasifica como `member` porque la prioridad es `member_id` presente.

### Layer 4 — Attribution Role

Una vez resuelta la identidad (Layer 2) y la faceta operativa (Layer 3), la atribución define cómo se distribuye el crédito del trabajo.

| Attribution Role | Definición | Scope |
|-----------------|------------|-------|
| `primary_owner` | Primer responsable de Notion resuelto por Greenhouse. Es el `assignee_member_id` singular. | Task-level, member-level metrics |
| `co_assignee` | Responsables adicionales preservados en `assignee_member_ids[]`. NO reciben co-crédito en ICO member-level ni Performance Report. | Trazabilidad, contexto operativo |
| `member_credit` | El primary owner, si y solo si resuelve a `member`. Si resuelve a `client_user` o `external_contact`, no hay member credit. | ICO `metrics_by_member`, Top Performer, Person ICO |
| `space_credit` | Toda tarea con `space_id` válido cuenta para métricas de space, independientemente de si el owner resuelve a member o no. | ICO `metric_snapshots_monthly`, agency dashboard |
| `agency_credit` | Extensión de space credit al nivel de agencia/cliente comercial. | Performance Report aggregate |

---

## 2. Contrato Canónico de Campos

### 2.1 Tasks (`greenhouse_delivery.tasks` / `greenhouse_conformed.delivery_tasks`)

| Campo | Tipo | Layer | Descripción | Estado |
|-------|------|-------|-------------|--------|
| `assignee_source_id` | TEXT | L1 | Notion user ID del primer responsable | Implementado (migration 20260402220356569) |
| `assignee_member_id` | TEXT | L3+L4 | Primary owner resuelto a member. NULL si no resuelve a member. | Implementado (original) |
| `assignee_member_ids` | TEXT[] | L3 | Todos los responsables resueltos a member IDs. Para trazabilidad. | Implementado (migration 20260402220356569) |

### 2.2 View enriquecido (`ico_engine.v_tasks_enriched`)

| Campo | Tipo | Layer | Derivación |
|-------|------|-------|------------|
| `primary_owner_source_id` | STRING | L1 | `= assignee_source_id` |
| `primary_owner_member_id` | STRING | L3+L4 | `= assignee_member_id` |
| `primary_owner_type` | STRING | L3 | `'member'` / `'non_member'` / `'unassigned'` |
| `has_co_assignees` | BOOL | L4 | `ARRAY_LENGTH(assignee_member_ids) > 1` |
| `assignee_member_ids` | ARRAY<STRING> | L3 | Fallback: `[assignee_member_id]` si el array está vacío |

### 2.3 Projects (`greenhouse_delivery.projects`)

| Campo | Tipo | Layer | Descripción | Estado |
|-------|------|-------|-------------|--------|
| `owner_member_id` | TEXT | L3+L4 | Miembro dueño del proyecto | Implementado |

### 2.4 Snapshots (`ico_engine.delivery_task_monthly_snapshots`)

Hereda los campos de `v_tasks_enriched` al momento del snapshot:

| Campo | Tipo | Layer |
|-------|------|-------|
| `assignee_member_id` | STRING | L3+L4 |
| `assignee_source_id` | STRING | L1 |
| `assignee_member_ids` | ARRAY<STRING> | L3 |
| `primary_owner_source_id` | STRING | L1 |
| `primary_owner_member_id` | STRING | L3+L4 |
| `primary_owner_type` | STRING | L3 |
| `has_co_assignees` | BOOL | L4 |

---

## 3. Política de Atribución

### 3.1 Constante canónica

```typescript
// src/lib/ico-engine/shared.ts:89
export const OWNER_ATTRIBUTION_POLICY = 'primary_owner_first_assignee'
```

### 3.2 Reglas de acreditación por dimensión

| Dimensión ICO | Column key | Quién recibe crédito | Regla |
|---------------|-----------|---------------------|-------|
| `space` | `space_id` | Todas las tareas del space | Independiente del actor type |
| `project` | `project_source_id` | Todas las tareas del proyecto | Independiente del actor type |
| `member` | `primary_owner_member_id` | Solo el primary owner si resuelve a member | `WHERE primary_owner_member_id = @memberId` |
| `client` | `client_id` | Derivado de space → client | Agregado comercial |
| `sprint` | `sprint_source_id` | Todas las tareas del sprint | Independiente del actor type |
| `business_unit` | `operating_business_unit` | Todas las tareas de la BU | Independiente del actor type |

### 3.3 Reglas de borde

| Caso borde | Comportamiento |
|------------|---------------|
| Tarea sin responsable (`assignee_source_id IS NULL`) | `primary_owner_type = 'unassigned'`. Cuenta para space/agency. No acredita a member. |
| Owner resuelve a `client_user` (ej: Constanza/Adriana en Sky) | `primary_owner_type = 'non_member'`. Cuenta para space/agency. No acredita a member. |
| Owner resuelve a `external_contact` | Mismo tratamiento que `client_user` para crédito. |
| Tarea con múltiples responsables | Solo el primero es `primary_owner`. Los demás son `co_assignees` preservados en el array. |
| `member_id` en `assignee_member_ids` pero no es `assignee_member_id` | Es co-assignee. No recibe member credit en ICO/Performance Report. |

---

## 4. Guía de Consumo por Reader

### 4.1 Matriz de consumo

| Consumer | Qué lee | Nivel de atribución | Fuente ejecutable |
|----------|---------|--------------------|--------------------|
| **ICO metrics_by_member** | `primary_owner_member_id` | Member credit (primary owner only) | `shared.ts` → `ICO_DIMENSIONS.member.column` |
| **ICO metric_snapshots_monthly** | `space_id` | Space credit (all tasks) | `shared.ts` → `ICO_DIMENSIONS.space.column` |
| **ICO metrics_by_project** | `project_source_id` | Project credit (all tasks) | `shared.ts` → `ICO_DIMENSIONS.project.column` |
| **Performance Report** | `primary_owner_member_id` | Member credit for Top Performer | `performance-report.ts` |
| **Person ICO Profile** | `primary_owner_member_id` | Member credit via materialized snapshots | `get-person-ico-profile.ts` |
| **Person Delivery Context** | `assignee_member_id` | Member tasks (primary owner) | `get-person-delivery.ts` |
| **Project Detail** | `owner_member_id` | Project owner (singular) | `get-project-detail.ts` |
| **Agency Dashboard** | `space_id` aggregate | Space/agency credit | `agency-performance-report.ts` |
| **Reviews Queue** | `assignee_member_id` | Responsable singular | `reviews/queue/route.ts` |
| **Delivery Coverage Audit** | `assignee_source_id` + identity graph | Classification audit | `delivery-coverage.ts` |

### 4.2 Regla para nuevos consumers

Todo nuevo módulo que necesite atribuir trabajo DEBE:

1. **Consultar este documento** para decidir qué nivel de atribución necesita.
2. **Usar `primary_owner_member_id`** si necesita member-level credit.
3. **Usar `assignee_member_ids`** solo para contexto operativo o UI de trazabilidad (nunca para reporting credit).
4. **Usar `space_id`** para agregados que no dependen de quién hizo el trabajo.
5. **No reinterpretar** las reglas de acreditación. Si un consumer necesita una regla distinta, debe proponer un delta a este documento antes de implementar.

---

## 5. Flujo de Resolución End-to-End

```
Notion Task (raw)
  │
  │  responsables_ids[]: ["242d872b-...", "abc123-..."]
  │
  ▼
Layer 1 — Source Identity
  │  assignee_source_id = responsables_ids[0]
  │
  ▼
Layer 2 — Identity Profile (via identity_profile_source_links)
  │  source_object_id → profile_id
  │  "242d872b-..." → identity_profile "EO-PER-0042"
  │
  ▼
Layer 3 — Operational Actor (via classifyLinkedIdentity)
  │  profile → member? → 'member' (assignee_member_id = member_id)
  │  profile → client_user? → 'client_user' (assignee_member_id = NULL)
  │  profile → external? → 'external_contact' (assignee_member_id = NULL)
  │
  ▼
Layer 4 — Attribution Role (via OWNER_ATTRIBUTION_POLICY)
  │  assignee_member_id IS NOT NULL → primary_owner_type = 'member'
  │  → member credit: ICO, Performance Report, Person 360
  │  assignee_member_id IS NULL → primary_owner_type = 'non_member'/'unassigned'
  │  → space/agency credit only
  │
  ▼
ICO Engine Materialization
  ├─ metrics_by_member  (primary_owner_member_id)
  ├─ metric_snapshots   (space_id)
  ├─ metrics_by_project (project_source_id)
  └─ frozen snapshots   (all fields preserved)
  │
  ▼
Downstream Consumers
  ├─ Person ICO (member credit)
  ├─ Agency Dashboard (space credit)
  ├─ Top Performer (member credit)
  ├─ Project 360 (project credit)
  └─ Delivery Surfaces (operational context)
```

---

## 6. Backward Compatibility & Incremental Closure

### 6.1 Lo que NO cambia

- `assignee_member_id` sigue siendo el campo canónico de owner en `delivery_tasks`
- `assignee_member_ids` sigue existiendo para trazabilidad
- `v_tasks_enriched` sigue siendo la fuente para ICO materialization
- `identity_profile_source_links` sigue siendo el backbone de identidad
- Todos los readers ya hardened por TASK-199 siguen operando sin modificación

### 6.2 Lo que este documento agrega

- Separación formal de 4 capas que antes estaban implícitas
- Taxonomía explícita de actor types con prioridad de clasificación
- Matriz de consumo que previene drift futuro entre consumers
- Reglas de borde documentadas para casos edge (sin asignar, client_user owner, co-assignees)
- Guía prescriptiva para nuevos consumers

### 6.3 Garantía de no-ruptura

Este modelo fue diseñado para formalizar decisiones ya implementadas, no para cambiar comportamiento runtime. Específicamente:

- Ningún reader existente necesita modificación
- Ninguna migración de schema es necesaria
- Ningún cambio de SQL o materialización es necesario
- El código fuente ya implementa estas reglas — este documento las hace explícitas y auditables

---

## 7. Implementación de Referencia

| Concepto | Archivo fuente | Línea/función clave |
|----------|---------------|---------------------|
| Attribution policy constant | `src/lib/ico-engine/shared.ts` | `OWNER_ATTRIBUTION_POLICY` (L89) |
| ICO dimensions by column | `src/lib/ico-engine/shared.ts` | `ICO_DIMENSIONS` (L80-87) |
| v_tasks_enriched DDL | `src/lib/ico-engine/schema.ts` | Primary owner aliases (L39-66) |
| Actor classification | `src/lib/identity/reconciliation/delivery-coverage.ts` | `classifyLinkedIdentity()` (L92-100) |
| Canonical person resolution | `src/lib/identity/canonical-person.ts` | `getCanonicalPersonsByMemberIds()` |
| Person-360 ID resolver | `src/lib/person-360/resolve-eo-id.ts` | `resolvePersonIdentifier()` |
| Person delivery context | `src/lib/person-360/get-person-delivery.ts` | `getPersonDeliveryContext()` |
| Person ICO profile | `src/lib/person-360/get-person-ico-profile.ts` | `getPersonIcoProfile()` |
| Sync assignee resolution | `src/lib/sync/sync-notion-conformed.ts` | `buildRawAssigneeIdsExpression()` |
| Materialization | `src/lib/ico-engine/materialize.ts` | `materializeDeliveryTaskMonthlySnapshot()` |
| Performance Report | `src/lib/ico-engine/performance-report.ts` | Report builder |

---

## Non-Negotiable Rules

1. **Identity =/= Attribution.** Resolver quién es una persona (Layer 2) no define automáticamente cómo se acredita su trabajo (Layer 4).
2. **Primary owner = first assignee.** La política `primary_owner_first_assignee` es la regla canónica. Cambiarla requiere un delta formal a este documento.
3. **Member credit es exclusivo del primary owner.** Co-assignees NO reciben co-crédito en ICO member-level ni Performance Report.
4. **Space credit es inclusivo.** Toda tarea con `space_id` cuenta para space/agency metrics sin importar quién es el owner.
5. **Consumers no reinterpretan.** Si un reader necesita una regla de atribución distinta, debe escalar a un delta de este documento antes de implementar.
6. **Backward-compatible by default.** Cualquier cambio al modelo debe ser incremental y no puede romper carriles de atribución que ya funcionan.

---

## Documentos que se Deben Actualizar

Si un agente futuro cambia:
- la política de atribución (`OWNER_ATTRIBUTION_POLICY`)
- la clasificación de actor types
- los campos canónicos de atribución en tasks/projects
- las reglas de consumo por reader

Debe actualizar:
- este documento
- `GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `Greenhouse_ICO_Engine_v1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`
