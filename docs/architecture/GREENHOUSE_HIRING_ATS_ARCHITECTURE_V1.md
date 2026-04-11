# Greenhouse Hiring / ATS Architecture V1

## Purpose

Definir la arquitectura canónica del dominio `Hiring / ATS` dentro de Greenhouse como capa de fulfillment de talento para Efeonce.

Este documento fija:

- cómo debe modelarse la demanda de talento antes de HR o Staff Aug
- cuáles son los objetos canónicos del dominio
- qué ownership conserva cada módulo vecino
- cómo se resuelve el handoff hacia `member`, `assignment` y `placement`
- qué surfaces UI deberían existir
- cómo debe convivir una landing pública de vacantes con el ATS interno

## Status

- Lifecycle: `Architecture`
- State: `Canonical`
- Domain: `agency` + `people` + `hris` + `staff augmentation` + `finance` + `capacity`
- Date: `2026-04-11`

## Why This Document Exists

Efeonce no necesita un ATS corporativo genérico aislado del resto del negocio.

Greenhouse opera un ecosistema de agencias con dos grandes stakeholders:

- `colaboradores`
- `clientes`

Y la demanda de talento aparece en cuatro combinaciones reales:

- interno + `on_demand`
- interno + `on_going`
- cliente/staffing + `on_demand`
- cliente/staffing + `on_going`

Por eso el dominio no puede modelarse solo como `job posting -> applicant -> hire`.

La capa correcta debe resolver:

- intake de demanda
- búsqueda y shortlist
- evaluación
- decisión
- handoff

sin duplicar `Person`, `People`, `HRIS`, `Staff Augmentation`, `Finance` ni `Team Capacity`.

## Canonical Positioning

### Naming

- `ATS` queda aceptado como shorthand conversacional.
- El nombre arquitectónico preferido del dominio es `Hiring`.
- La capa upstream de demanda ya no debe modelarse solo como `StaffingRequest`; el nombre canónico más amplio pasa a ser `TalentDemand`.

Regla:

- `StaffingRequest` puede existir como subtipo, vista o alias funcional de una `TalentDemand`
- pero el objeto raíz del dominio debe soportar tanto necesidades internas como de staffing

## Core Thesis

Greenhouse debe tratar `Hiring / ATS` como una capa canónica de fulfillment de talento.

En una frase:

> `Hiring / ATS` gobierna la conversión de una demanda de talento en una cobertura seleccionada y lista para handoff; `HRIS` gobierna la persona ya incorporada; `Staff Augmentation` gobierna el placement vendido y operado.

## Non-Negotiable Rules

1. `Hiring / ATS` no reemplaza `People`; reutiliza `Person` como raíz humana canónica.
2. `Hiring / ATS` no reemplaza `HRIS`; activa o enriquece el journey hasta el punto donde corresponde crear o promover `member`.
3. `Hiring / ATS` no reemplaza `Staff Augmentation`; prepara el resultado que luego deriva en `assignment` y `placement`.
4. El intake debe modelarse como demanda explícita, no como notas sueltas o vacantes aisladas.
5. La unidad visual del pipeline debe ser `Application`, no la persona sola ni el opening solo.
6. El handoff hacia runtime operativo debe ser explícito y auditable.
7. `Finance`, `Payroll`, `Cost Intelligence` y `Team Capacity` siguen siendo dueños de su verdad; `Hiring / ATS` consume y contextualiza.
8. El dominio debe soportar una entrada pública para candidatos sin exponer datos internos del pipeline.

## Demand Matrix

La demanda debe poder expresarse sobre cuatro cuadrantes sin cambiar de modelo:

| Stakeholder | Engagement | Ejemplo | Destino probable |
|---|---|---|---|
| `internal` | `on_demand` | refuerzo temporal para un delivery o iniciativa interna | reassignment, contractor, partner |
| `internal` | `on_going` | contratación estable o capacidad estructural | internal hire, internal reassignment |
| `client` | `on_demand` | cobertura puntual para un cliente o proyecto acotado | contractor, staff augmentation, partner |
| `client` | `on_going` | servicio continuo o squad estable | staff augmentation, internal hire, partner |

## Canonical Objects Involved

### `TalentDemand`

Objeto raíz de demanda.

Debe capturar:

- `stakeholderType`
  - `internal`
  - `client`
- `engagementType`
  - `on_demand`
  - `on_going`
- `fulfillmentMode`
  - `internal_reassignment`
  - `internal_hire`
  - `staff_augmentation`
  - `contractor`
  - `partner`
- `demandOrigin`
  - `client_request`
  - `prospect_request`
  - `replacement`
  - `expansion`
  - `capacity_gap`
  - `manual_internal`
- contexto comercial u operativo:
  - `organizationId?`
  - `clientId?`
  - `spaceId?`
  - `businessUnit?`
  - `serviceId?`
- intención de cobertura:
  - `requestedRole`
  - `requestedSeats`
  - `requestedSkills`
  - `targetStartDate`
  - `priority`
  - `duration`
  - `timezone`
  - `language`
  - `budgetBand?`
  - `rateBand?`

### `HiringOpening`

Opening concreto derivado de una demanda.

Reglas:

- una `TalentDemand` puede abrir cero, uno o varios openings
- un opening no reemplaza a la demanda
- el opening debe poder cerrarse o pausarse sin destruir la demanda madre

Capas adicionales recomendadas:

- `visibility`
  - `internal_only`
  - `private_sourcing`
  - `public_listed`
- `publicationStatus`
  - `draft`
  - `ready_for_review`
  - `published`
  - `paused`
  - `closed`
- `public copy`
  - `publicTitle`
  - `publicSummary`
  - `publicDescription`
  - `publicRequirements`
  - `publicLocationMode`
  - `publicEmploymentMode`
  - `applyUrl?` solo si existe desvío externo excepcional

Regla:

- no todo opening debe ser público
- el opening público es una proyección controlada del opening interno, no otra identidad

### `Person`

Raíz humana canónica del grafo Greenhouse.

Regla:

- `Hiring / ATS` no crea una identidad humana paralela
- un candidato externo debe poder vivir como `Person` temprana o parcial

### `CandidateFacet`

Faceta de reclutamiento asociada a `Person`.

Debe capturar:

- `source`
- `readiness`
- `availability`
- `seniority`
- `expectedRate`
- `portfolio/cv assets`
- señales de verificación o confianza
- signals de bench, historial y elegibilidad

### `HiringApplication`

Relación `Person -> Opening`.

Esta es la unidad transaccional del pipeline.

Debe capturar:

- `applicationId`
- `openingId`
- `personId`
- `ownerUserId`
- `stage`
- `score`
- `matchScore`
- `blockingIssues`
- `nextStepAt`
- `source`
- notas y explainability

### `HiringEvaluation`

Entidad de evaluación.

Debe capturar:

- entrevista
- scorecard
- feedback
- pruebas
- checks relevantes

Regla:

- no reducir toda la evaluación a comments sueltos dentro de `application`

### `HiringDecision`

Resultado formal sobre una `application`.

Valores típicos:

- `selected`
- `backup_selected`
- `rejected`
- `withdrawn`
- `on_hold`

### `HiringHandoff`

Contrato explícito de salida del dominio.

Debe indicar:

- qué application fue seleccionada
- cuál es el destino operativo
- qué prerequisites siguen pendientes
- qué módulo recibe ownership del siguiente tramo

### `HiringSignal`

Señales operativas o institucionales del dominio.

Ejemplos:

- `shortlist_ready`
- `coverage_risk`
- `opening_stalled`
- `capacity_gap_detected`
- `handoff_ready`

## Structural Decisions

### 1. Demand-first, not opening-first

El módulo no debe arrancar desde vacantes sueltas.

La secuencia canónica recomendada es:

`talent_demand -> hiring_opening -> person(candidate facet) -> hiring_application -> hiring_decision -> hiring_handoff`

### 2. Person-first, not candidate-first

`candidate` no debe ser una identidad humana paralela.

La distinción correcta es:

- `Person core`
- `CandidateFacet`
- `Member facet`
- `Commercial / Delivery facets`

### 3. Application is the pipeline unit

El kanban y las colas operativas deben mover `applications`.

No deben mover:

- personas genéricas sin contexto
- openings como si fueran candidatos

### 4. Handoff is a first-class object

El paso hacia HR, Staffing o procurement no debe resolverse con side effects implícitos.

Debe existir `HiringHandoff` explícito para auditar:

- quién fue seleccionado
- para qué demanda/opening
- con qué destino
- con qué prerequisitos pendientes

### 5. Demand must not require a fully canonized client on day 0

La demanda debe poder nacer aunque el cliente todavía esté en estado prospecto o pre-canonización.

Campos aceptables en ese estado:

- `prospectRef`
- `dealRef`
- `externalAccountRef`
- `requestedCompanyName`

Regla:

- la búsqueda no debe bloquearse por no tener aún `organization/client/space` consolidados

## Lifecycle Model

### TalentDemand lifecycle

- `draft`
- `qualified`
- `open`
- `sourcing`
- `partially_fulfilled`
- `fulfilled`
- `stalled`
- `cancelled`
- `archived`

### HiringOpening lifecycle

- `draft`
- `active`
- `paused`
- `filled`
- `cancelled`
- `closed`

### HiringApplication lifecycle

- `sourced`
- `screening`
- `qualified`
- `shortlisted`
- `client_review`
- `interview`
- `decision_pending`
- `selected`
- `backup`
- `rejected`
- `withdrawn`
- `handoff_ready`
- `closed`

### HiringHandoff lifecycle

- `pending`
- `approved`
- `in_setup`
- `completed`
- `blocked`
- `cancelled`

## Handoff Rules By Fulfillment Mode

### `internal_reassignment`

Destino esperado:

- ajuste de capacity / assignment / team allocation

Regla:

- no crear `member` nuevo
- no crear `placement`

### `internal_hire`

Destino esperado:

- activación de `member facet`
- onboarding interno
- posterior asignación operativa

Regla:

- `Hiring / ATS` no se vuelve owner del onboarding HR

### `staff_augmentation`

Destino esperado:

- creación o enlace de `assignment`
- luego `placement`

Regla:

- `Hiring / ATS` no crea un `placement` como efecto colateral silencioso
- el carril correcto es `selected application -> handoff -> assignment -> placement`

### `contractor`

Destino esperado:

- engagement contractual
- setup operativo
- provider/procurement lane si aplica

### `partner`

Destino esperado:

- coordinación con provider / partner
- eventual linking a provider-facing runtime

## Ownership Boundaries

### With People

`People` sigue siendo owner de:

- identidad humana
- historial longitudinal de persona
- facetas visibles de perfil y relaciones

`Hiring / ATS` devuelve a `People`:

- demanda cubierta o intentada
- openings donde participó
- history de applications y decisions
- readiness y señales de cobertura

### With HRIS

`HRIS` sigue siendo owner de:

- `member`
- contract taxonomy
- onboarding interno
- lifecycle laboral formal
- payroll readiness

`Hiring / ATS` no debe:

- crear payroll truth
- absorber onboarding
- redefinir contract type como source of truth

### With Staff Augmentation

`Staff Augmentation` sigue siendo owner de:

- `placement`
- onboarding con cliente
- relación comercial-operativa activa
- margin y governance del placement

`Hiring / ATS` solo prepara la cobertura previa.

### With Team Capacity / Agency

`Team Capacity` y `Agency` siguen siendo sources de:

- capacity gap
- over/under allocation
- forecast de necesidad
- señales de bottleneck

`Hiring / ATS` consume esas señales para abrir o priorizar demanda.

### With Finance / Payroll / Cost Intelligence

Estos módulos siguen siendo owners de:

- costo canónico
- compensation truth
- loaded cost
- margin y explain financiero

`Hiring / ATS` puede consumir:

- bands
- impacto esperado
- riesgo económico

pero no recalcular localmente toda la economía.

## Recommended UI Surfaces

### 0. Public Vacancies Landing

Surface pública para atraer candidatos y permitir postulación.

Objetivo:

- listar openings publicables
- permitir discovery por rol, seniority, modalidad y ubicación
- abrir detalle público de cada vacante
- capturar postulaciones hacia el ATS interno

Reglas:

- esta landing no expone `TalentDemand` completa
- no expone score, owners internos, rate bands internos, riesgo, notas ni contexto sensible de cliente
- consume solo la proyección pública del opening

Bloques recomendados:

- hero o first fold con búsqueda
- filtros por:
  - área
  - seniority
  - modalidad
  - ubicación/timezone
  - tipo de vínculo
- lista de vacantes
- detalle público de vacante
- CTA claro de postulación

### 0.1 Public Opening Detail

Vista pública por vacante.

Debe mostrar solo campos publicables:

- título
- resumen
- responsabilidades
- requisitos
- nice-to-have
- modalidad
- ubicación / timezone
- tipo de engagement
- seniority
- proceso esperado

No debe mostrar:

- score interno
- owners internos
- shortage/risk
- cliente si el caso requiere confidencialidad
- economics internos
- señales internas del pipeline

### 0.2 Public Apply Flow

Formulario público de postulación.

Debe permitir:

- datos básicos de contacto
- CV / portfolio / links
- disponibilidad
- compensation expectations si aplica
- consentimiento y autorización de tratamiento
- source attribution

Resultado canónico:

- crear o reconciliar `Person`
- activar o actualizar `CandidateFacet`
- crear `HiringApplication` contra el `HiringOpening`

Regla:

- una postulación pública no debe crear un aggregate paralelo de candidato
- entra al mismo pipeline interno que sourcing manual, referral o bench

### 1. Demand Desk

Lista institucional de demandas y openings.

Debe responder rápido:

- qué requests están abiertas
- cuál es su origen
- qué stakeholder espera cobertura
- cuáles están stalled o sin owner claro

### 2. Talent Pool

Vista unificada de talento evaluable.

Debe mezclar:

- internos
- bench
- externos
- freelancers
- históricos verificados
- partners cuando aplique

### 3. Pipeline Board

Vista kanban de `applications`.

Regla UI:

- la tarjeta del board debe representar una `HiringApplication`
- no una persona suelta
- no un opening como pseudo-candidato

### 4. Application 360

Vista detallada de una application.

Bloques mínimos:

- overview
- evaluations
- timeline
- notes
- blockers
- decision
- handoff

### 5. Demand 360

Vista detallada de la demanda.

Bloques mínimos:

- requester / stakeholder
- contexto organization/space/service
- openings
- shortlist
- risk
- fulfillment progress

### 6. Handoffs

Cola explícita de salida del dominio.

Debe responder:

- qué candidatos ya fueron elegidos
- quién está listo para HR
- quién está listo para assignment / placement
- qué casos siguen bloqueados

### 7. Publication Desk

Surface interna para gobernar qué openings se publican externamente.

Debe responder:

- qué openings están listos para publicarse
- qué openings ya están publicados
- cuáles están pausados o vencidos
- qué copy pública o compliance falta antes de publicar

Acciones esperadas:

- revisar copy pública
- aprobar publicación
- pausar
- cerrar
- ver métricas de conversión básicas

## Public Candidate Entry Model

### Public entry is a controlled lens, not a second ATS

La landing pública de vacantes no debe modelarse como módulo separado del ATS.

Debe ser:

- una surface pública de discovery
- una surface pública de apply
- conectada al mismo dominio `Hiring / ATS`

### Publication model

Cada `HiringOpening` debe poder distinguir entre:

- truth interna del opening
- payload público derivado

Campos internos siempre canónicos:

- owner
- stakeholder
- demand origin
- budget/rate
- risk
- notes
- shortlist logic

Campos publicables derivados:

- title
- description
- requirements
- location/mode
- seniority
- visible hiring process notes

### Candidate source normalization

El ATS debe registrar la fuente de entrada del candidato.

Fuentes mínimas:

- `public_careers`
- `manual`
- `referral`
- `bench_internal`
- `partner`
- `hubspot`
- `import`

### Privacy, consent and abuse guardrails

La entrada pública debe contemplar:

- consentimiento explícito de tratamiento de datos
- retención y borrado según policy
- assets privados para CV/portfolio cuando corresponda
- rate limiting / captcha / anti-spam
- email verification opcional si el volumen lo justifica

Regla:

- el ATS no debe abrir write lanes públicos sin guardrails mínimos de abuso y consentimiento

### Multi-tenant / brand stance

La primera iteración recomendada es:

- una landing pública de marca Efeonce / Greenhouse
- openings publicados desde el dominio central

Se permite evolución futura hacia:

- lenses por cliente o por practice
- branding parcial por demand/opening

Pero no conviene arrancar con micrositios por tenant como requisito base del dominio.

## Event Model

## Aggregate types recomendados

- `talent_demand`
- `hiring_opening`
- `hiring_application`
- `hiring_evaluation`
- `hiring_handoff`
- `hiring_signal`
- `person`

## Outbox events recomendados

### Demand lifecycle

- `talent_demand.created`
- `talent_demand.updated`
- `talent_demand.status_changed`
- `talent_demand.opening_created`
- `talent_demand.fulfilled`

### Opening lifecycle

- `hiring.opening.created`
- `hiring.opening.updated`
- `hiring.opening.status_changed`
- `hiring.opening.closed`
- `hiring.opening.published`
- `hiring.opening.unpublished`

### Candidate facet lifecycle

- `hiring.candidate_facet.created`
- `hiring.candidate_facet.updated`
- `hiring.candidate_facet.archived`
- `hiring.candidate_facet.promoted_to_member`

### Application lifecycle

- `hiring.application.created`
- `hiring.application.stage_changed`
- `hiring.application.shortlisted`
- `hiring.application.selected`
- `hiring.application.rejected`
- `hiring.application.withdrawn`
- `hiring.application.handoff_ready`

### Public application lifecycle

- `hiring.public_application.submitted`
- `hiring.public_application.confirmed`
- `hiring.public_application.deduplicated`

### Handoff lifecycle

- `hiring.handoff.created`
- `hiring.handoff.approved`
- `hiring.handoff.blocked`
- `hiring.handoff.completed`

### Signal lifecycle

- `hiring.signal.shortlist_ready`
- `hiring.signal.coverage_risk`
- `hiring.signal.opening_stalled`
- `hiring.signal.capacity_gap_detected`
- `hiring.signal.handoff_ready`

## Decisions Locked By This Document

1. **`Hiring / ATS` es un dominio canónico propio de Greenhouse** y no una nota futura difusa colgada de `Staff Augmentation`.
2. **El objeto raíz del dominio es `TalentDemand`**, no el opening aislado.
3. **`StaffingRequest` queda absorbido como subtipo o lectura especializada de `TalentDemand`** para casos de staffing.
4. **`Person` sigue siendo la raíz humana canónica**; `candidate` vive como faceta, no como identidad paralela.
5. **`HiringApplication` es la unidad transaccional del pipeline** y la unidad visual del kanban.
6. **`HiringHandoff` es obligatorio como contrato de salida del dominio** antes de tocar `member`, `assignment` o `placement`.
7. **`Hiring / ATS` no es owner de `member`, `assignment`, `placement`, `compensation` ni `margin`**.
8. **La demanda puede nacer sin cliente totalmente canonizado** mientras exista trazabilidad hacia prospecto/deal/upstream.
9. **El dominio debe soportar interno vs cliente y on-demand vs on-going sin cambiar de objeto raíz**.
10. **El dominio debe soportar una landing pública de vacantes y postulación** sin crear un pipeline paralelo al ATS interno.
11. **El opening público es una proyección controlada del `HiringOpening` interno**, no una identidad nueva.
12. **La primera iteración recomendada de la landing pública es centralizada y de marca Efeonce**, no multi-tenant por cliente desde el día 1.
13. **El rollout inicial debe priorizar publicación controlada y guardrails de consentimiento/abuso** antes de abrir variaciones más complejas de portal público.

## Relationship To Existing Research

- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md` sigue siendo válido como research reactivo y evento-driven.
- Esta spec eleva a arquitectura canónica tres decisiones:
  - el dominio deja de verse solo como mini ATS para Staff Aug
  - `TalentDemand` generaliza al `StaffingRequest`
  - el handoff explícito pasa a ser contrato obligatorio

## References

- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
