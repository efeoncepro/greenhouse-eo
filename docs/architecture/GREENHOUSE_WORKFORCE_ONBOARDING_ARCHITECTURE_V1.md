# Greenhouse Workforce Onboarding Architecture V1

## Purpose

Definir el contrato arquitectonico canonico para onboarding en Greenhouse.

Este documento cubre:

1. el evento canonico de inicio de una relacion de trabajo
2. la separacion entre provisioning de identidad, activacion laboral y readiness operativa
3. la orquestacion cross-domain entre `People`, `HR`, `Payroll`, `Identity/Access`, `Assignments` y consumers externos
4. el modelo minimo de estados, reglas, consumers y drift detection para V1

Usar junto con:

- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

## Status

Contrato arquitectonico nuevo desde 2026-04-25.

Estado actual del repo:

- existe onboarding legacy como checklist/template dentro de HRIS
- existe soporte parcial de `onboarding` como dominio de approval workflow
- `SCIM` y Admin Center ya cubren partes del provisioning tecnico de acceso
- `members` y `People` ya pueden mostrar una persona activa en runtime
- no existe todavia un agregado canonico que orqueste el inicio laboral, acceso, readiness operativa y lane de payroll end-to-end

Este documento fija la direccion canonica para cerrar ese gap.

## Core Thesis

Greenhouse no debe modelar onboarding solo como:

- crear un usuario
- activar un `member`
- enviar una invitacion
- instanciar un checklist

La unidad canonica es un **caso de inicio de una relacion de trabajo** con snapshot contractual, fecha efectiva, readiness operativa y consumers downstream explicitos.

Por lo tanto:

- `SCIM` puede ser una senal de provisioning, pero no es el owner total del onboarding
- `Payroll` consume readiness e impacto contractual, pero no es la raiz del caso
- `People` sigue siendo la ficha canonica de la persona
- `HR` sigue siendo la surface operativa principal del proceso
- el checklist legacy de HRIS pasa a ser una herramienta hija del caso, no la fuente de verdad del evento de alta

## Problem Statement

Hoy Greenhouse tiene piezas aisladas:

- `SCIM` y Admin Identity pueden crear/provisionar cuentas
- `HRIS` ya contempla plantillas e instancias de onboarding
- `People`, `My Profile` y roster consumen personas ya activas
- `Payroll` ya conoce taxonomía contractual y compensacion
- `Staff Aug` ya tiene su propio onboarding de placement

Pero falta el contrato que conecte esas piezas.

Consecuencias del gap actual:

- puede existir provisioning tecnico sin readiness laboral real
- puede existir un `member` creado sin manager, sin lane contractual clara o sin lane payroll resuelta
- onboarding HRIS puede existir como checklist sin un caso canonico que explique el alta
- puede haber drift del tipo "user provisioned, workforce relationship incomplete"
- rehire y transitions corren riesgo de modelarse como altas nuevas sin semantica explicita

## Source-of-Truth Boundaries

| Dominio | Authority | Notes |
|--------|-----------|-------|
| Existencia de cuenta y acceso base | Entra / SCIM / Admin Identity | provisioning tecnico, invitacion, activacion de acceso |
| Persona canonica | `identity_profiles` | la raiz humana no nace en onboarding; onboarding la usa |
| Faceta operativa de colaborador | `members` | `member_id` sigue siendo la faceta workforce operativa |
| Relacion persona -> entidad legal | `person_legal_entity_relationships` | el onboarding debe poder resolverse contra la relacion juridica/economica que comienza |
| Contexto contractual operativo | `greenhouse_core.members` | `employment_type`, `contract_type`, `pay_regime`, `payroll_via`, `deel_contract_id` son snapshot minimo del caso |
| Transacciones de payroll | `greenhouse_payroll.*` | payroll consume el caso; no define el inicio de relacion |
| Checklist operativo | `greenhouse_hr.onboarding_*` legacy u objeto sucesor | el checklist ejecuta tareas; no define el evento de alta |

## Distinciones no negociables

### 1. Provisioning de identidad no es workforce onboarding

Crear o activar un usuario no equivale a completar la entrada laboral/operativa de la persona.

### 2. El alta vive sobre una relacion, no solo sobre una cuenta

Una persona puede:

- ser recontratada
- pasar de contractor a employee
- entrar a una entidad legal o lane contractual distinta
- tener onboarding workforce y onboarding de placement separados

### 3. Onboarding y onboarding de placement no son lo mismo

`HRIS onboarding` = entrada a Efeonce / al workforce interno.  
`Staff Aug onboarding` = entrada del colaborador a un cliente o placement especifico.

Pueden ser secuenciales o parcialmente concurrentes, pero no deben colapsarse en un solo objeto ambiguo.

### 4. SCIM nunca completa el negocio por si solo

`SCIM POST/PATCH` puede abrir o actualizar un caso y puede resolver carriles tecnicos de acceso, pero no debe actuar como sustituto del proceso laboral/operativo completo.

## Canonical Object

### `WorkRelationshipOnboardingCase`

Greenhouse debe introducir un agregado canonico para representar el inicio de una relacion de trabajo.

Nombre sugerido:

- `work_relationship_onboarding_case`

Alias aceptables en UI/documentacion operativa:

- `onboarding_case`
- `start_case`

### Campos semanticos minimos

| Campo | Semantica |
|------|-----------|
| `onboarding_case_id` | PK del caso |
| `profile_id` | raiz humana canonica |
| `member_id` | faceta operativa afectada, cuando exista |
| `user_id` | principal de acceso afectado, cuando exista |
| `person_legal_entity_relationship_id` | relacion juridica/economica que comienza o se reactiva |
| `relationship_type` | `employee`, `contractor`, `eor`, etc. |
| `employment_type` | jornada/categoria operativa |
| `contract_type` | `indefinido`, `plazo_fijo`, `honorarios`, `contractor`, `eor`, etc. |
| `pay_regime` | `chile`, `international`, u otro canon futuro |
| `payroll_via` | `internal`, `deel`, u otro provider futuro |
| `deel_contract_id` | referencia externa cuando aplique |
| `legal_entity_organization_id` | empleador/pagador legal canonico |
| `organization_id` / `space_id` | scope operativo relevante si aplica |
| `country_code` | jurisdiccion laboral o de pago |
| `start_type` | `new_hire`, `rehire`, `relationship_transition`, `contractor_start`, `eor_start`, etc. |
| `source` | `manual_hr`, `scim`, `admin`, `hiring_handoff`, `external_provider`, etc. |
| `status` | lifecycle macro del caso |
| `start_date` | fecha oficial de inicio |
| `first_working_day` | primer dia laboral si difiere |
| `submitted_at` / `approved_at` / `activated_at` | hitos de proceso |
| `manager_member_id` | manager inicial esperado |
| `reason_code` / `notes` | justificacion operativa/legal |
| `rule_lane` | lane resuelto por matriz: `internal_payroll`, `external_payroll`, `non_payroll`, `identity_only`, etc. |

## Four-Lane Model

Todo caso de onboarding debe partirse conceptualmente en cuatro carriles.

### 1. Identity Provisioning

Owner primario:

- Identity / Access

Incluye:

- provisioning o activacion de cuenta
- invitacion / sesion inicial
- grupos / memberships tecnicas base
- eventos de activacion de acceso

### 2. Application Access Readiness

Owner primario:

- Greenhouse authorization/runtime

Incluye:

- roles baseline
- route groups
- scopes iniciales
- surfaces visibles necesarias para operar

### 3. Work Relationship Activation

Owner primario:

- HR / Person-Legal-Entity model

Incluye:

- fecha de inicio
- snapshot contractual y legal
- manager inicial
- estado de la relacion

### 4. Operational Onboarding

Owners consumidores:

- HR
- Payroll
- Delivery
- IT / assets
- futuras integraciones de provider

Incluye:

- checklist de ingreso
- readiness de leave/policies
- readiness de payroll
- readiness de assignments o placement
- equipamiento y herramientas

## State Model

Estados recomendados V1:

| Estado | Semantica |
|-------|-----------|
| `draft` | caso creado pero aun editable y no aprobado |
| `needs_review` | caso abierto automaticamente por SCIM u otra senal sin validacion humana completa |
| `approved` | alta aprobada, pendiente de activacion o fecha efectiva |
| `scheduled` | alta futura lista para activarse en `start_date` |
| `blocked` | no puede activarse por pendientes criticos (`manager`, `contract`, `payroll`, `access`, etc.) |
| `active` | relacion activada y carriles obligatorios minimos resueltos |
| `cancelled` | caso abortado |

Reglas:

- `approved` y `scheduled` no implican que la persona ya este plenamente operativa
- `active` requiere readiness minima por lane
- `needs_review` es el estado canonico para casos originados por drift tecnico como provisioning sin alta workforce completa

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

- `requires_identity_provisioning`
- `requires_payroll_readiness`
- `requires_leave_policy_bootstrap`
- `requires_hr_documents`
- `requires_assignment_bootstrap`
- `requires_manager_assignment`
- `requires_equipment_or_access_setup`
- `greenhouse_execution_mode` = `full`, `partial`, `informational`
- `rule_lane`

## Trigger Sources

Fuentes autorizadas para abrir o mutar un caso:

- accion manual desde HR
- accion manual desde Admin / Identity
- hiring handoff futuro
- provisioning via `SCIM`
- alta desde provider externo futuro (`Deel`, etc.)
- rehire o transition manager

Regla:

- todas las fuentes convergen sobre el mismo agregado
- ninguna fuente paralela debe ejecutar el onboarding completo por fuera del caso

## Relationship with Existing HRIS Onboarding Templates

`Greenhouse_HRIS_Architecture_v1.md` ya define plantillas e instancias de onboarding.

Decision canonica nueva:

- esas plantillas dejan de ser la representacion primaria del alta
- pasan a ser el checklist operativo asociado al caso

Entonces:

- `onboarding_case` define el evento, la semantica contractual, la fecha de inicio y el lane
- el checklist ejecuta tareas humanas u operativas
- puede coexistir con onboarding de placement sin mezclarse con el

## Relationship with Staff Aug Onboarding

La arquitectura HRIS ya explicita que:

- `HRIS onboarding` = entrada a Efeonce
- `Staff Aug onboarding` = entrada a un cliente/placement

Decision canonica nueva:

- `WorkRelationshipOnboardingCase` vive en workforce interno
- el onboarding de placement sigue como agregado especializado de delivery / staff augmentation
- ambos pueden relacionarse, pero no deben colapsarse en un solo caso ambiguo

## Downstream Consumers

### Identity / Access

- provisionar o activar login y sesiones
- reconciliar `client_users`, grupos, roles y memberships tecnicas base
- aceptar `SCIM` como trigger, no como owner total

### People / My surfaces

- `People` muestra a la persona una vez materializada/visible segun policy
- `My/*` requiere readiness suficiente para que la persona opere
- detail puede mostrar badge de `onboarding` o `scheduled_start`

### HR Core

- owner de checklist, documentos y auditoria operativa
- owner de manager inicial, leave bootstrap y readiness de politicas
- reutiliza el dominio `onboarding` de approval workflow ya presente en runtime

### Payroll

- consume `contract_type`, `pay_regime`, `payroll_via`, `start_date` y lane para decidir:
  - readiness de compensacion
  - inclusion en periodo
  - si Greenhouse calcula o solo referencia

### Delivery / Assignments / Placement

- si aplica, bootstrap de assignments o linkage posterior
- para staff aug, onboarding de placement sigue downstream y separado

### External Integrations

- `SCIM` / Entra como input de identidad
- providers externos de payroll/EOR como consumers o fuentes parciales futuras
- integraciones operativas pueden leer readiness del caso para activar cuentas o tooling

## Views and Entitlements

Este dominio debe diseñarse en ambos planos del portal.

### Plano `views`

Surfaces recomendadas V1:

- `HR > Onboarding` o `HR > Lifecycle`
- seccion/rail de `People/[memberId]` para estado y timeline del caso
- `My > Onboarding` cuando exista instancia/caso activo para el colaborador

Regla:

- `People` sigue siendo la ficha canonica de la persona
- `HR` sigue siendo la surface operativa para crear, aprobar, activar y auditar el ingreso

### Plano `entitlements`

Capacidades minimas futuras:

- `onboarding_case.create`
- `onboarding_case.review`
- `onboarding_case.approve`
- `onboarding_case.activate`
- `onboarding_case.cancel`
- `onboarding_case.view_confidential`
- `onboarding_case.manage_access`
- `onboarding_case.manage_payroll_lane`

## Drift Detection and Invariants

Antes de automatizar todo, Greenhouse debe poder detectar inconsistencias.

Checks minimos:

- `user` provisionado pero sin `member` o relacion workforce consistente
- onboarding `active` sin access listo cuando el lane lo exige
- onboarding `active` sin manager inicial
- onboarding `active` sin lane payroll iniciada cuando aplica
- onboarding `scheduled` vencido sin activacion real
- rehire materializado como usuario nuevo en vez de nueva relacion/caso

Invariantes:

- onboarding no debe crear identidad humana paralela
- un rehire no reabre ciegamente el caso anterior; crea un caso nuevo o case family conectada
- `SCIM` puede abrir `needs_review`, no saltarse el agregado
- el cambio de estado laboral no debe colgar solo de `client_users.active`

## V1 Scope

Incluye:

- agregado canonico del caso
- matriz de reglas minima
- integration point con SCIM como signal source
- checklist operacional como child object
- state model y drift reporting
- surfaces en `HR`, `People` y `My`

No incluye todavia:

- automatizacion exhaustiva de hire packet legal por pais
- integracion full con `Hiring / ATS` como owner runtime del handoff
- unificacion total con onboarding de placement
- borrado o merge agresivo de flows legacy existentes

## Migration Direction

Orden recomendado:

1. crear el agregado canonico y su state model
2. enchufar `SCIM`, Admin y HR manual como trigger sources
3. convertir checklist legacy de HRIS en child object del caso
4. agregar drift reports operativos
5. conectar consumers por prioridad: access -> people/my visibility -> manager/readiness -> payroll -> assignments

## Related Runtime Signals

El runtime actual ya aporta piezas reutilizables:

- `SCIM` provisioning
- workflow domain `onboarding` en approval authority
- checklists legacy en HRIS
- snapshot contractual operativo en `members` y `payroll`
- `My onboarding` y rutas `HR onboarding` ya documentadas a nivel HRIS

La regla nueva es que esas piezas ya no deben actuar como islas; deben converger bajo `WorkRelationshipOnboardingCase`.
