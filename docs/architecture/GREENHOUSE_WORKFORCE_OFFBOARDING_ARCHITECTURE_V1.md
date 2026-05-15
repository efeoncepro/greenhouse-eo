# Greenhouse Workforce Offboarding Architecture V1

## Purpose

Definir el contrato arquitectonico canonico para offboarding en Greenhouse.

Este documento cubre:

1. el evento canonico de salida de una relacion de trabajo
2. la separacion entre desactivacion de identidad, cierre operativo y cierre laboral
3. la orquestacion cross-domain entre `People`, `HR`, `Payroll`, `Identity/Access`, `Delivery` y consumers externos
4. el modelo minimo de estados, reglas, consumers y drift detection para V1

Usar junto con:

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

## Status

Contrato arquitectonico nuevo desde 2026-04-25.

Delta 2026-05-05:

- Las transiciones `employee -> contractor/honorarios` deben cerrar la relacion laboral anterior y abrir una relacion contractor separada bajo el mismo `identity_profile`.
- El cierre contractor/proveedor no usa `final_settlements` ni documento de finiquito laboral.
- La arquitectura canonica de pagos contractor vive en `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`.

Estado actual del repo:

- existe soporte de `offboarding` como dominio de approval workflow
- existe el agregado canonico `greenhouse_hr.work_relationship_offboarding_cases`
- existe el aggregate Payroll `greenhouse_payroll.final_settlements`
- existe el aggregate documental `greenhouse_payroll.final_settlement_documents`
- existe offboarding legacy como checklist/template dentro de HRIS
- existe desactivacion de usuarios via Admin Center y SCIM
- no existe todavia orquestacion end-to-end automatica de acceso, assets, handoffs y pago

Este documento fija la direccion canonica para cerrar ese gap.

## Delta 2026-05-04 — TASK-762

El caso de offboarding `internal_payroll` ya puede conectar con documento formal de finiquito:

- `TASK-760` abre y gobierna el caso.
- `TASK-761` calcula/aprueba el settlement final.
- `TASK-762` renderiza, revisa, aprueba, emite y registra firma/ratificacion del documento formal.

La surface visible sigue siendo `/hr/offboarding` / `equipo.offboarding`. El documento no ejecuta acceso, no cierra el caso por si mismo y no crea pagos.

## Core Thesis

Greenhouse no debe modelar offboarding como "desactivar un usuario" ni como "marcar un member inactivo".

La unidad canonica es un **caso de salida de una relacion de trabajo** con snapshot contractual, fecha efectiva, ownership operativo y consumers downstream explicitos.

Por lo tanto:

- `SCIM` es una senal de identidad, no el owner total del offboarding
- `Payroll` consume impacto de salida, pero no es la raiz del caso
- `People` sigue siendo la ficha canonica de la persona
- `HR` sigue siendo la surface operativa principal del proceso
- el checklist legacy de HRIS pasa a ser una herramienta hija del caso, no la fuente de verdad del evento de salida

## Problem Statement

Hoy Greenhouse tiene piezas aisladas:

- `SCIM` y Admin Center pueden desactivar acceso
- `People` y `My Profile` muestran a la persona y su contexto operativo
- `HRIS` ya contempla plantillas y checklists de offboarding
- `Payroll` conoce compensacion, regimen y periodos

Pero falta el contrato que conecte esas piezas.

Consecuencias del gap actual:

- un usuario puede quedar deprovisionado en el IdP pero seguir activo en Greenhouse
- una persona puede seguir visible en directorios, jerarquias o asignaciones activas despues de la salida
- no hay forma canonica de distinguir renuncia, despido, fin de plazo, termino de contractor, conversion o fin de EOR
- no existe snapshot contractual/legal que explique como debe cerrarse el caso
- no hay una capa unica para detectar drift del tipo "identity offboarded, workforce still active"

## Source-of-Truth Boundaries

| Dominio | Authority | Notes |
|--------|-----------|-------|
| Existencia de cuenta y estado de acceso base | Entra / SCIM / Admin Identity | `active`, `deactivated_at`, `user.deactivated` siguen siendo identidad, no separacion laboral |
| Persona canonica | `identity_profiles` | La raiz humana no cambia por offboarding |
| Faceta operativa de colaborador | `members` | `member_id` sigue siendo la faceta de roster/operacion |
| Relacion persona -> entidad legal | `person_legal_entity_relationships` | La salida debe poder resolverse contra la relacion juridica/economica, no solo contra `user` |
| Contexto contractual operativo | `greenhouse_core.members` | `employment_type`, `contract_type`, `pay_regime`, `payroll_via`, `deel_contract_id` son snapshot minimo del caso |
| Transacciones de payroll | `greenhouse_payroll.*` | Payroll consume el caso; no reemplaza al agregado de salida |
| Checklist operativo | `greenhouse_hr.onboarding_*` legacy u objeto sucesor | El checklist ejecuta tareas; no define el evento de separacion |

## Distinciones no negociables

### 1. Identity offboarding no es workforce offboarding

Desactivar login, sesiones o memberships tecnicas no equivale a terminar una relacion laboral o contractual.

### 2. La salida vive sobre una relacion, no solo sobre una persona

Una persona puede:

- salir de una relacion y luego ser recontratada
- pasar de `employee` a `contractor`
- terminar una relacion con una entidad legal sin desaparecer de toda la plataforma

### 3. Historico se conserva siempre

Offboarding no hace hard delete de:

- payroll
- leave
- evaluaciones
- goals
- documentos
- auditoria

Lo que cambia es elegibilidad, visibilidad activa, ownership y acceso.

### 4. SCIM nunca cierra el negocio por si solo

`SCIM DELETE` o `PATCH active=false` abre o actualiza un caso y puede ejecutar carriles tecnicos de acceso, pero no debe actuar como sustituto del proceso laboral/operativo completo.

## Canonical Object

### `WorkRelationshipOffboardingCase`

Greenhouse debe introducir un agregado canonico para representar la salida de una relacion de trabajo.

Nombre sugerido:

- `work_relationship_offboarding_case`

Alias aceptables en UI/documentacion operativa:

- `offboarding_case`
- `separation_case`

### Campos semanticos minimos

| Campo | Semantica |
|------|-----------|
| `offboarding_case_id` | PK del caso |
| `profile_id` | raiz humana canonica |
| `member_id` | faceta operativa afectada, cuando exista |
| `user_id` | principal de acceso afectado, cuando exista |
| `person_legal_entity_relationship_id` | relacion juridica/economica que se termina o transiciona |
| `relationship_type` | `employee`, `contractor`, `eor`, etc. |
| `employment_type` | jornada/categoria operativa |
| `contract_type` | `indefinido`, `plazo_fijo`, `honorarios`, `contractor`, `eor`, etc. |
| `pay_regime` | `chile`, `international`, u otro canon futuro |
| `payroll_via` | `internal`, `deel`, u otro provider futuro |
| `deel_contract_id` | referencia externa cuando aplique |
| `legal_entity_organization_id` | empleador/pagador legal canonico |
| `organization_id` / `space_id` | scope operativo relevante si aplica |
| `country_code` | jurisdiccion laboral o de pago |
| `separation_type` | `resignation`, `termination`, `fixed_term_expiry`, `mutual_agreement`, `contract_end`, `relationship_transition`, etc. |
| `source` | `manual_hr`, `scim`, `contract_expiry`, `admin`, `external_provider`, etc. |
| `status` | lifecycle macro del caso |
| `effective_date` | fecha oficial de efecto |
| `last_working_day` | ultimo dia laboral si difiere |
| `submitted_at` / `approved_at` / `executed_at` | hitos de proceso |
| `reason_code` / `notes` | justificacion operativa/legal |
| `rule_lane` | lane resuelto por matriz: `internal_payroll`, `external_payroll`, `non_payroll`, `identity_only`, etc. |

### Runtime V1 implementado — TASK-760 (2026-05-04)

El agregado canonico quedo materializado en PostgreSQL como:

- `greenhouse_hr.work_relationship_offboarding_cases`
- `greenhouse_hr.work_relationship_offboarding_case_events`

La implementacion V1 vive en `src/lib/workforce/offboarding/**` y expone:

- state machine ejecutable (`draft`, `needs_review`, `approved`, `scheduled`, `blocked`, `executed`, `cancelled`)
- resolucion deterministica de lane (`internal_payroll`, `external_payroll`, `non_payroll`, `identity_only`, `relationship_transition`, `unknown`)
- API `GET/POST /api/hr/offboarding/cases`
- API `POST /api/hr/offboarding/cases/[caseId]/transition`
- API `POST /api/hr/offboarding/cases/contract-expiry/scan` para abrir revisiones por `contract_end_date` proximo/vencido sin ejecutar offboarding
- surface `HR > Offboarding` en `/hr/offboarding`
- card/CTA en People 360 que separa `hireDate`, `contractEndDate`, salida efectiva y ultimo dia trabajado

`contract_end_date_snapshot` es evidencia de revision. No reemplaza `effective_date` y no habilita finiquito por si sola.

Desde TASK-030, el checklist operativo ya existe en runtime como `greenhouse_hr.onboarding_instances` y puede enlazar opcionalmente con el caso mediante `onboarding_instances.offboarding_case_id`.

`legacy_checklist_ref JSONB` se mantiene como campo de compatibilidad/auditoria en el caso canonico. No es la fuente primaria del checklist nuevo y no debe usarse para inferir estado legal, aprobacion, ejecucion ni finiquito.

Frontera no negociable:

- `work_relationship_offboarding_cases` define el proceso formal de salida.
- `onboarding_instances` tipo `offboarding` define tareas operativas hijas.
- completar un checklist no ejecuta el caso, no revoca acceso por si solo y no emite finiquito.

## Four-Lane Model

Todo caso de offboarding debe partirse conceptualmente en cuatro carriles.

### 1. Identity Offboarding

Owner primario:

- Identity / Access

Incluye:

- desactivar autenticacion
- cortar sesiones
- invalidar tokens
- reflejar eventos `user.deactivated`

### 2. Application Access Offboarding

Owner primario:

- Greenhouse authorization/runtime

Incluye:

- roles
- memberships
- route groups
- scopes y visibilidad broad
- acceso a surfaces y acciones

### 3. Work Relationship Separation

Owner primario:

- HR / Person-Legal-Entity model

Incluye:

- causal de salida
- fecha efectiva
- snapshot contractual y legal
- estado de la relacion

### 4. Operational Offboarding

Owners consumidores:

- HR
- Payroll
- Delivery
- Finance
- IT / assets

Incluye:

- reasignacion de reportes directos y approvals
- cierre de assignments
- reconciliacion de leave
- lane de payroll final
- devolucion de activos
- handoff de ownership operativo

## State Model

Estados recomendados V1:

| Estado | Semantica |
|-------|-----------|
| `draft` | caso creado pero aun editable y no aprobado |
| `needs_review` | caso abierto automaticamente por SCIM u otra senal sin validacion humana completa |
| `approved` | salida aprobada, pendiente de fecha/ejecucion |
| `scheduled` | salida futura lista para ejecutarse en `effective_date` |
| `blocked` | no puede ejecutarse por pendientes criticos (`handoff`, `approvals`, `payroll`, etc.) |
| `executed` | carriles obligatorios ejecutados |
| `cancelled` | caso abortado |

Reglas:

- `approved` y `scheduled` no cortan acceso automaticamente antes de `effective_date`, salvo override explicito
- `executed` requiere que los items bloqueantes esten resueltos
- `needs_review` es el estado canonico para casos originados por drift tecnico como SCIM deprovision sin caso previo

## Rule Matrix

El comportamiento del caso no debe depender de `if` dispersos por modulo. Debe resolverse por una matriz explicita.

Dimension minima de la matriz:

- `relationship_type`
- `employment_type`
- `contract_type`
- `pay_regime`
- `payroll_via`
- `country_code`
- `legal_entity_organization_id` cuando existan diferencias regulatorias o de provider

Salidas minimas de la matriz:

- `requires_payroll_closure`
- `requires_leave_reconciliation`
- `requires_hr_documents`
- `requires_access_revocation`
- `requires_asset_recovery`
- `requires_assignment_handoff`
- `requires_approval_reassignment`
- `greenhouse_execution_mode` = `full`, `partial`, `informational`
- `rule_lane`

Ejemplos de lanes:

| Lane | Ejemplo | Consecuencia |
|------|---------|--------------|
| `internal_payroll` | employee Chile con payroll interno | exige cierre payroll + leave + acceso + handoff |
| `external_payroll` | EOR o contractor gestionado por Deel | Greenhouse ejecuta acceso + operacion; payroll legal externo |
| `non_payroll` | contractor sin payroll formal | no abre lane de payroll clasico, pero si cierre operativo |
| `identity_only` | cuenta tecnica o acceso removido sin relacion laboral | no debe desactivar historico laboral inexistente |
| `relationship_transition` | employee -> contractor | cierra una relacion y prepara handoff a una nueva, no "borra" a la persona |

## Trigger Sources

Fuentes autorizadas para abrir o mutar un caso:

- accion manual desde HR
- accion manual desde People detail
- deprovision o deactivation via `SCIM`
- fin de contrato o expiry scheduler
- provider externo futuro (`Deel`, etc.)
- admin override auditable

Regla:

- todas las fuentes convergen sobre el mismo agregado
- ninguna fuente paralela debe ejecutar cascadas completas por fuera del caso

## Relationship with Existing HRIS Offboarding Templates

`Greenhouse_HRIS_Architecture_v1.md` ya define plantillas e instancias de onboarding/offboarding.

Decision canonica nueva:

- esas plantillas dejan de ser la representacion primaria de la salida
- pasan a ser el checklist operativo asociado al caso

Entonces:

- `offboarding_case` define el evento, la semantica contractual, la fecha efectiva y el lane
- el checklist ejecuta tareas humanas u operativas
- puede existir mas de un checklist por caso si el lane lo requiere

## Downstream Consumers

### Identity / Access

- desactivar login y sesiones en `effective_date`
- reconciliar `client_users`, roles y memberships
- aceptar `SCIM` como trigger, no como owner total

### People / Directories / My surfaces

- `People` mantiene la ficha historica
- listas activas deben excluir `offboarded` por default
- detail debe mostrar badge de `scheduled_exit` o `offboarded`
- `My/*` debe dejar de ser accesible al ejecutarse el corte de acceso

### HR Core

- owner de causal, documentos, checklist y auditoria operativa
- reconciliacion de leave y approvals del caso
- reutiliza el dominio `offboarding` de approval workflow ya presente en runtime

### Payroll

- consume `contract_type`, `pay_regime`, `payroll_via`, `effective_date` y lane para decidir:
  - ultimo periodo
  - reliquidacion o cierre final
  - si Greenhouse calcula o solo referencia

#### Delta 2026-05-11 — OffboardingWorkQueue Projection

TASK-867 agrega `OffboardingWorkQueue` como proyeccion read-only para `/hr/offboarding`.

- Source of truth no cambia: casos en `greenhouse_hr.work_relationship_offboarding_cases`, calculos en `greenhouse_payroll.final_settlements`, documentos en `greenhouse_payroll.final_settlement_documents`.
- La proyeccion vive en `src/lib/workforce/offboarding/work-queue/` y compone caso + colaborador + ultimo settlement + ultimo documento + prerequisitos + progreso + proximo paso.
- El endpoint `GET /api/hr/offboarding/work-queue` elimina el N+1 cliente-side de la vista; usa queries batch acotadas e indices existentes.
- Los `primaryAction` y `secondaryActions` son descriptors de UX. No autorizan ni mutan por si solos; cada write endpoint mantiene sus capability checks y validaciones canonicas.
- Access model sin cambios: routeGroup `hr`, view `equipo.offboarding`, capabilities `hr.offboarding_case:read`, `hr.final_settlement:read`, `hr.final_settlement_document:read`.

### Delivery / Assignments / Hierarchy

- bloquear nuevas asignaciones
- reasignar reportes directos
- resolver approvals pendientes
- cerrar o transferir ownership operativo

### External Integrations

- `SCIM` / Entra como input de identidad
- providers externos de payroll/EOR como consumers o fuentes parciales futuras
- HubSpot, Notion u otras integraciones no deben seguir exponiendo usuarios activos cuando el caso ya fue ejecutado

## Views and Entitlements

Este dominio debe diseñarse en ambos planos del portal.

### Plano `views`

Surfaces recomendadas V1:

- `HR > Offboarding` o `HR > Lifecycle`
- seccion/rail de `People/[memberId]` para estado y timeline del caso

Regla:

- `People` sigue siendo la ficha canonica de la persona
- `HR` sigue siendo la surface operativa para crear, aprobar, ejecutar y auditar la salida

### Plano `entitlements`

Capacidades minimas futuras:

- `offboarding_case.create`
- `offboarding_case.review`
- `offboarding_case.approve`
- `offboarding_case.execute`
- `offboarding_case.cancel`
- `offboarding_case.view_confidential`
- `offboarding_case.manage_access`
- `offboarding_case.manage_payroll_lane`

Regla:

- las `views` no reemplazan permisos finos
- los permisos finos no reemplazan las surfaces visibles

## Drift Detection and Invariants

Antes de automatizar todo, Greenhouse debe poder detectar inconsistencias.

Checks minimos:

- deprovisionado en IdP pero `member` aun activo en Greenhouse
- `user` inactivo pero visible en superficies activas de personas/equipos
- offboarding `executed` con assignments activas
- offboarding `executed` con approvals abiertas
- offboarding `executed` con lane de payroll pendiente cuando aplica
- caso con `effective_date` vencida y acceso aun activo

Invariantes:

- no hard delete de historico
- un caso ejecutado nunca reabre la relacion vieja; un rehire crea una relacion nueva
- `SCIM` puede abrir `needs_review`, no saltarse el agregado
- el cambio de estado laboral no debe colgar solo de `client_users.active`

## V1 Scope

Incluye:

- agregado canonico del caso
- matriz de reglas minima
- integration point con SCIM como signal source
- checklist operacional como child object
- state model y drift reporting
- surfaces en `HR` y `People`

No incluye todavia:

- motor legal exhaustivo de finiquitos por pais
- automatizacion full de cada provider externo
- borrado fisico de datos
- unificacion total con onboarding en el mismo agregado

## Migration Direction

Orden recomendado:

1. crear el agregado canonico y su state model
2. enchufar SCIM / Admin / HR manual como trigger sources
3. convertir checklist legacy de HRIS en child object del caso
4. agregar drift reports operativos
5. conectar consumers por prioridad: access -> people visibility -> hierarchy/approvals -> payroll

## Related Runtime Signals

El runtime actual ya aporta piezas reutilizables:

- `user.deactivated` / `user.reactivated` desde Identity & Access
- workflow domain `offboarding` en approval authority
- checklists legacy en HRIS
- snapshot contractual operativo en `members` y `payroll`

La regla nueva es que esas piezas ya no deben actuar como islas; deben converger bajo `WorkRelationshipOffboardingCase`.


## Delta 2026-05-15 — TASK-892 Closure Completeness Aggregate

El work-queue derivation original (`src/lib/workforce/offboarding/work-queue/derivation.ts`) calculaba `primaryAction` desde **una sola dimension** (`closureLane`), ignorando que el cierre operativo real de un offboarding case involucra **4 capas ortogonales**:

1. **Case lifecycle** (`work_relationship_offboarding_cases.status`) — el agregado que dispara el flujo.
2. **Member runtime** (`members.contract_type / payroll_via / pay_regime`) — que declara el member hoy.
3. **Person 360 relationship** (`person_legal_entity_relationships`) — historia legal de las relaciones.
4. **Payroll scope** (TASK-890 `resolveExitEligibilityForMembers`) — esta en scope o no para nomina proyectada.

### Bug class observado live (2026-05-15)

Maria Camila Hoyos: case `executed` (Layer 1 ✅) + member runtime declara contractor/Deel/international (Layer 2 ✅) + relacion legal activa sigue `relationship_type='employee'` (Layer 3 ❌ drift detectado por TASK-890 signal + TASK-891 dialog disponible) + excluida de payroll proyectada (Layer 4 ✅).

Tres de las 4 capas alineadas. La UI mostraba `primaryAction = 'Cerrar con proveedor'` (boton que reabriria Layer 1 ya cerrado) — desalineado de la realidad operativa. Si operador ejecutaba, state machine rechazaba `executed → approved` con 4xx.

### Solucion canonica

Aggregate `closureCompleteness` server-side via helper canonical `computeClosureCompleteness(facts)` (pure function en `src/lib/workforce/offboarding/work-queue/closure-completeness.ts`):

- 4 layer alignment fields (`caseLifecycle`, `memberRuntime`, `personRelationship`, `payrollScope`) con enums cerrados.
- `closureState`: `'pending' | 'partial' | 'complete' | 'blocked'` (4-value enum).
- `pendingSteps[]`: array ordenado por `STEP_PRIORITY = ['case_lifecycle', 'reconcile_drift', 'verify_payroll_exclusion']`.

`primaryAction` se deriva del primer step actionable en `pendingSteps[]` via `derivePrimaryActionFromCompleteness`. Cuando case terminal + drift Layer 3, primaryAction apunta automaticamente a TASK-891 dialog con href `/admin/identity/drift-reconciliation?memberId=<id>`.

### Capability granular reusada

Cada step en `pendingSteps[]` declara su `capability`. UI esconde steps sin capability (defense in depth). `reconcile_drift` reusa la capability canonical `person.legal_entity_relationships.reconcile_drift` (TASK-891, EFEONCE_ADMIN solo).

### Reliability signal

`hr.offboarding.completeness_partial` (kind=drift, severity warning si count>0, steady=0). Cuenta cases terminales con drift Person 360 detectado por el patron canonical (mirror del signal upstream `identity.relationship.member_contract_drift`). Visible en `/admin/operations` bajo `Identity & Access`.

### Reusable pattern cross-flow

El concepto "`pendingSteps[]` decide el primaryAction" es reusable para:

- Onboarding work queue (TASK-875 foundation existe)
- Hiring pipeline / wizards
- Workforce activation (TASK-874)
- Contractor closure (TASK-797 futuro)
- Final settlement document lifecycle (TASK-863)

Cuando emerja una surface con `primaryAction` derivado de una sola dimension pero la realidad operativa involucra multiples capas ortogonales, replicar el patron: pure function + STEP_PRIORITY + state machine cerrado + signal de cierre parcial.
