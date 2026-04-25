# Greenhouse Workforce Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-25
> **Status:** Canonical architecture draft — lista para bajar a epic y tasks de implementacion

---

## Purpose

Definir la arquitectura canonica de `Workforce` como dominio interno enterprise de Greenhouse para lifecycle laboral, operacion de colaboradores y gobernanza cross-domain sobre personas de trabajo.

Este documento existe para evitar que `People`, `HR`, `Payroll`, `My`, `SCIM` y futuros casos de lifecycle sigan creciendo como piezas validas pero dispersas, sin una capa unificada que responda:

- cual es el estado laboral-operativo real de una persona
- que relacion de trabajo esta vigente
- que drift existe entre identidad, acceso y operacion
- que acciones deben ejecutarse sobre esa persona
- que queues y casos requieren atencion de RRHH / Ops / Payroll

Usar junto con:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`

---

## Core Thesis

`Workforce` no debe modelarse como una copia de `People`, ni como un alias elegante de `HR`, ni como un dashboard de `Payroll`.

Debe tratarse como el dominio interno que unifica, bajo un contrato explicito:

1. la relacion de trabajo de una persona con la entidad legal y la operacion
2. el estado lifecycle laboral-operativo vigente
3. las implicancias sobre acceso, leave, approvals, assignments y payroll
4. las queues operativas y drift que requieren atencion

La regla base es:

> `People` sigue siendo la ficha persona-first.  
> `HR` sigue siendo el owner operativo especializado.  
> `Payroll` sigue siendo owner transaccional de nomina.  
> `Workforce` es la capa unificada de lifecycle, operacion y drift sobre personas de trabajo.

---

## Why This Matters

Hoy Greenhouse ya tiene una base workforce fuerte, pero fragmentada:

- `Person Complete 360` ya consolida facetas `identity`, `assignments`, `organization`, `leave`, `payroll`, `delivery`, `costs`, `staffAug`
- `People` ya muestra roster y ficha
- `HR Core` ya opera permisos, jerarquia, asistencia, approvals, goals y evaluaciones
- `Payroll` ya opera compensacion y nomina
- `SCIM` y Admin Center ya pueden desactivar acceso

El gap es que no existe una capa canonica que diga:

- cual es la relacion laboral actual
- cual es el estado lifecycle actual
- si la persona esta sana, en riesgo, en transicion, en salida o en drift
- que acciones operativas estan pendientes

Sin esa capa:

- el lifecycle queda repartido entre flags, tabs y rutas
- `SCIM` parece mas inteligente de lo que realmente es
- offboarding, rehire y transitions quedan sin owner canonico
- las queues operativas no tienen home claro
- el portal sigue teniendo capacidad workforce, pero no un modulo workforce robusto

---

## Non-Goals

`Workforce` no debe convertirse en:

- una copia de `People`
- un reemplazo de `Payroll`
- una surface cliente-facing de staffing
- un mega-modulo que absorba toda la semantica de `HR`
- un directorio global sin lifecycle ni operaciones

Tampoco debe inventar identidades paralelas para una persona o para una relacion de trabajo que ya tienen anchor canonico en Greenhouse.

---

## Current Runtime Baseline

### Ya existe

1. **Person serving federado**
   - `PersonComplete360` con facetas `identity`, `assignments`, `organization`, `leave`, `payroll`, `delivery`, `costs`, `staffAug`

2. **People surfaces**
   - roster
   - person detail
   - tabs mezclando facets humanos, organizacionales y economicos

3. **HR Core**
   - team
   - hierarchy
   - approvals
   - org chart
   - leave
   - attendance
   - goals
   - evaluations

4. **Payroll**
   - compensation
   - periods
   - payroll entries
   - receipts
   - projected payroll
   - personnel expense

5. **Identity / SCIM**
   - user activation/deactivation
   - provisioning
   - group sync
   - audit lifecycle tecnico

6. **Offboarding partial**
   - checklists legacy en HRIS
   - workflow domain `offboarding`
   - spec especializada nueva para `WorkRelationshipOffboardingCase`

### Todavia falta

- un `workforce` facet canonico dentro de `Person360`
- un workspace `Workforce`
- un lifecycle model unificado
- un contrato explicito para transitions / rehire / offboarding / drift
- una queue operativa para problemas workforce cross-domain

---

## Architectural Position

`Workforce` es un dominio interno enterprise, no cliente-facing.

Se ubica por encima de:

- `Person`
- `Member`
- `Identity`
- `HR`
- `Payroll`
- `Assignments`
- `Person <-> Legal Entity Relationship`

Y por debajo de:

- surfaces operativas
- dashboards de seguimiento
- queues de lifecycle
- automatizaciones de onboarding/offboarding

No reemplaza los write models transaccionales existentes; los coordina y les da un lenguaje comun.

---

## Naming Contract

### Nombre canónico del dominio

- `Workforce`

### Nombre de la vista operativa principal

- `Workforce`
- `Workforce Operations` para contexts mas explícitos

### Alias permitidos

- `Lifecycle`
- `People Operations`
- `Workforce Ops`

### Labels prohibidos por ambiguos

- `People` cuando la surface es operativa y no persona-first
- `HR` cuando la lectura agrega identity, payroll y drift cross-domain
- `Employees` si tambien cubre contractors, EOR u otras relaciones

---

## Canonical Anchors

### Person

Raiz humana canonica:

- `greenhouse_core.identity_profiles.profile_id`

### Operational Actor

Faceta operativa workforce:

- `greenhouse_core.members.member_id`

### Access Principal

Principal de acceso:

- `greenhouse_core.client_users.user_id`

### Legal / Economic Relationship

Relacion persona -> entidad legal:

- `greenhouse_core.person_legal_entity_relationships.relationship_id`

### Payroll Context

Snapshot transaccional de nomina:

- `greenhouse_payroll.compensation_versions`
- `greenhouse_payroll.payroll_entries`

Regla:

- `Workforce` no inventa anclas nuevas para estos planos
- los compone bajo un contrato superior de lifecycle y operacion

---

## Canonical Layers

`Workforce` debe existir en tres capas bien separadas.

### 1. Workforce profile layer

Lectura por persona.

Vive como:

- `Person360.workforce` facet

Responde:

- cual es la relacion de trabajo vigente
- cual es el estado lifecycle vigente
- que impacto tienen leave / payroll / access / assignments
- que casos o drift abiertos existen

### 2. Workforce orchestration layer

Capa de agregados y reglas.

Incluye:

- casos de lifecycle
- matriz de reglas
- estado consolidado
- eventos y consumers
- drift detection

### 3. Workforce workspace layer

Surface operativa multi-persona.

Incluye:

- roster
- queues
- dashboards
- bulk actions
- views de detalle operativas

---

## Canonical Objects

### 1. `WorkforceProfile`

Read model persona-first.

Debe agrupar al menos:

- `identitySummary`
- `relationshipSummary`
- `employmentSummary`
- `lifecycleStatus`
- `managerSummary`
- `accessSummary`
- `payrollAwareness`
- `leaveAwareness`
- `assignmentsAwareness`
- `openCases`
- `driftSignals`

### 2. `WorkRelationship`

Objeto canonico para la relacion de trabajo vigente o historica entre una persona y una entidad legal/operativa.

Campos minimos:

- `relationship_id`
- `profile_id`
- `member_id`
- `legal_entity_organization_id`
- `relationship_type`
- `employment_type`
- `contract_type`
- `pay_regime`
- `payroll_via`
- `country_code`
- `status`
- `effective_from`
- `effective_to`

### 3. `WorkforceLifecycleCase`

Familia de casos operativos de lifecycle.

V1 recomendada:

- `OnboardingCase`
- `OffboardingCase`
- `RelationshipTransitionCase`
- `RehireCase`

Regla:

- no todo entra en V1 runtime
- pero la arquitectura debe dejar la familia explicita para evitar que cada flujo nazca como excepcion aislada

### 4. `WorkforceDriftIssue`

Objeto para inconsistencias cross-domain.

Ejemplos:

- `idp_deprovisioned_but_member_active`
- `scheduled_exit_with_active_access`
- `offboarding_blocked_by_open_approvals`
- `member_inactive_but_visible_in_active_roster`
- `payroll_lane_required_but_not_started`

---

## Workforce State Model

`Workforce` necesita distinguir entre:

- estado de la persona
- estado de la relacion
- estado del caso
- estado del acceso

### Workforce lifecycle status

Estados recomendados V1:

- `onboarding`
- `active`
- `transitioning`
- `scheduled_exit`
- `offboarded`
- `rehired`

Notas:

- `leave` no necesariamente es estado workforce principal; suele ser una condicion operativa o señal complementaria
- `transitioning` cubre cambios tipo employee -> contractor o payroll internal -> Deel

### Access status

Estados resumidos:

- `active`
- `scheduled_revoke`
- `revoked`
- `drift`

### Case status

Cada caso de lifecycle mantiene su propio estado transaccional.  
Ejemplo: `draft`, `approved`, `scheduled`, `executed`, `cancelled`, `blocked`.

---

## Person360 Contract

### Decision canónica

`Workforce` debe entrar al serving federado como un facet propio de `Person Complete 360`.

Nombre canonico:

- `workforce`

### Por qué sí

Porque gran parte de la pregunta workforce es persona-first:

- cual es su relacion vigente
- cual es su estado laboral-operativo
- cual es su manager
- que drift o casos abiertos tiene
- cual es su awareness de nomina y acceso

### Por qué no alcanza solo con eso

Porque `Workforce` tambien necesita surfaces multi-persona:

- roster
- queues
- dashboards
- bulk operations

Regla:

- `facet` abajo
- `workspace` arriba

### Shape sugerido del facet

```ts
interface PersonWorkforceFacet {
  lifecycleStatus: 'onboarding' | 'active' | 'transitioning' | 'scheduled_exit' | 'offboarded' | 'rehired'
  relationship: {
    relationshipId: string | null
    relationshipType: string | null
    legalEntityOrganizationId: string | null
    legalEntityName: string | null
    effectiveFrom: string | null
    effectiveTo: string | null
    status: string | null
  }
  employment: {
    employmentType: string | null
    contractType: string | null
    payRegime: string | null
    payrollVia: string | null
    deelContractId: string | null
    countryCode: string | null
    managerMemberId: string | null
    managerName: string | null
  }
  access: {
    identityActive: boolean
    userStatus: string | null
    accessStatus: 'active' | 'scheduled_revoke' | 'revoked' | 'drift'
    scimProvisioned: boolean | null
  }
  lifecycleCases: {
    onboardingCaseId: string | null
    offboardingCaseId: string | null
    transitionCaseId: string | null
  }
  driftSignals: Array<{
    code: string
    severity: 'info' | 'warning' | 'critical'
    message: string
  }>
}
```

---

## Views and Entitlements

Este dominio debe diseñarse sobre ambos planos.

### Plano `views`

Surfaces objetivo:

- `/workforce`
- `/workforce/roster`
- `/workforce/[memberId]`
- `/workforce/lifecycle`
- `/workforce/offboarding`
- `/workforce/drift`

V1 posible sin abrir route group nuevo:

- bootstrap desde `People` + `HR` + detail rails

Pero la arquitectura objetivo debe asumir un workspace propio.

### Plano `entitlements`

Capacidades minimas futuras:

- `workforce.view`
- `workforce.roster.view`
- `workforce.profile.view`
- `workforce.lifecycle.manage`
- `workforce.offboarding.manage`
- `workforce.drift.view`
- `workforce.access.manage`
- `workforce.payroll_lane.view`
- `workforce.payroll_lane.manage`

Regla:

- nuevas surfaces no deben gatearse solo por route group broad
- nuevas capabilities no deben nacer sin surface clara cuando el caso de uso requiere entrypoint visible

---

## Synergy Contract with Existing Domains

### 1. `People`

`People` sigue siendo la ficha canónica persona-first.

Que toma `Workforce`:

- identidad y person detail
- tabs y contexto de la persona

Que aporta `Workforce`:

- lens operativa y lifecycle-first
- queue y drift
- orchestration cross-domain

Regla:

- `Workforce` no reemplaza `People`
- `People` no debe seguir absorbiendo todo el peso operativo de lifecycle

### 2. `HR Core`

`HR Core` sigue siendo owner de workflows especializados.

Que toma `Workforce`:

- leave
- hierarchy
- approvals
- attendance
- goals y evaluations cuando afecten lifecycle

Que aporta `Workforce`:

- consolidation
- cross-domain queues
- case orchestration

Regla:

- `HR Core` sigue siendo write owner de sus agregados
- `Workforce` coordina y resume

### 3. `Payroll`

`Payroll` sigue siendo owner transaccional de nomina.

Que toma `Workforce`:

- compensacion actual
- pay regime / payroll via
- ultimo payroll entry
- readiness o lane requerido para cambios lifecycle

Que aporta `Workforce`:

- awareness
- triggers de lane
- casos que exigen atencion de payroll

Regla:

- `Workforce` entiende el impacto en payroll
- `Payroll` ejecuta el calculo y cierre

### 4. `SCIM` / Identity

`SCIM` y `Identity` siguen siendo owner del lifecycle tecnico de acceso.

Regla:

- `SCIM` es signal source para `Workforce`, no reemplazo del agregado
- `Workforce` detecta drift entre identidad y operacion

### 5. `Assigned Team`

`Assigned Team` es workforce visibility cliente-facing.

Regla:

- no debe confundirse con `Workforce` interno
- comparten semantica sobre personas de trabajo, pero tienen distinta audiencia y distinto boundary de datos

---

## Rule Matrix

`Workforce` necesita una matriz de reglas explicita, no un set de ifs dispersos.

Dimensiones minimas:

- `relationship_type`
- `employment_type`
- `contract_type`
- `pay_regime`
- `payroll_via`
- `country_code`
- `legal_entity_organization_id`

Decisiones que debe resolver:

- si una persona entra al roster activo
- si requiere payroll lane
- si puede quedar visible en ciertas surfaces
- si una transicion es cambio menor o lifecycle case
- si un drift es informativo o bloqueante
- si Greenhouse es owner total o parcial de la operacion

`Offboarding` consume esta matriz como spec especializada, no al revés.

---

## Workforce Workspace

### V1 target surfaces

1. **Workforce Home**
   - KPIs de roster
   - casos abiertos
   - drift critico
   - exits programadas

2. **Workforce Roster**
   - listado operativo
   - filtros por employment / contract / regime / payroll / status / manager / entidad legal

3. **Workforce Profile**
   - detail operativo por persona
   - timeline lifecycle
   - estado de acceso
   - payroll awareness
   - actions

4. **Workforce Lifecycle**
   - cambios contractuales
   - transitions
   - rehire
   - scheduled changes

5. **Workforce Offboarding**
   - queue y detail de offboarding cases

6. **Workforce Drift**
   - inconsistencias cross-domain y acciones de remediacion

---

## Drift Detection

Antes de automatizar todo, `Workforce` debe volver visible el problema.

Checks minimos:

- usuario deprovisionado en IdP pero `member` activo
- offboarding ejecutado con acceso activo
- salida programada con approvals abiertas
- `member` fuera de roster pero visible en listas activas
- mismatch entre relationship status y lifecycle status
- relationship transition creada sin abrir lane requerida

Los drift issues deben ser first-class dentro del dominio, no notas al pie en logs.

---

## Phased Implementation

### Phase 1 — Architecture and contracts

- spec madre de `Workforce`
- spec especializada de `Offboarding`
- shape de `Person360.workforce`
- state model
- rule matrix base

### Phase 2 — Serving layer

- agregar facet `workforce` a `Person Complete 360`
- readers para lifecycle status y drift
- authorization y redaction para el nuevo facet

### Phase 3 — Cases and orchestration

- `WorkRelationshipOffboardingCase`
- lane de transitions / rehire foundation
- integration points con HR / Payroll / Identity

### Phase 4 — Workspace

- roster
- queues
- profile operativo
- drift dashboard

### Phase 5 — Automation

- SCIM -> workforce drift/case
- effective-date execution
- remediacion y bulk actions

---

## First Tasks Recommended

1. `TASK — Workforce Architecture Foundation`
   - bajar este doc a backlog ejecutable

2. `TASK — Person360 workforce facet`
   - tipos
   - registry
   - reader
   - auth

3. `TASK — Workforce lifecycle state model`
   - status contract + derivation rules

4. `TASK — Workforce drift registry`
   - issue catalog + readers + severity

5. `TASK — Workforce offboarding runtime foundation`
   - basado en la spec ya creada

6. `TASK — Workforce workspace V1`
   - roster + profile + drift queue

---

## Relationship to Offboarding Spec

`docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` queda como documento especializado de un slice concreto del dominio.

Regla:

- `GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md` define el dominio madre
- `GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md` define el slice especializado de alta / inicio de relacion
- `GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` define un subdominio/case family específico

Ninguno reemplaza al otro.

---

## Final Design Rule

Greenhouse ya tiene capabilities workforce.

La direccion correcta no es rehacerlas, sino consolidarlas:

- `Person360` como serving por persona
- `Workforce` como dominio madre de lifecycle y drift
- `HR` y `Payroll` como owners especializados
- `People` como ficha canonica
- `Workforce Workspace` como shell operativa unificada

Si una decision nueva sobre personas de trabajo no explicita:

- si vive en `Person360.workforce`
- si vive en `Workforce workspace`
- si es write owner de `HR` o `Payroll`
- y como se proyecta en `views` y `entitlements`

entonces el diseño todavia esta incompleto.
