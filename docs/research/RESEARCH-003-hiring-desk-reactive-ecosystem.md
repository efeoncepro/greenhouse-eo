# RESEARCH-003 - Hiring Desk Reactive Ecosystem

## Status

- Lifecycle: `Research Brief`
- State: `Active`
- Domain: `agency` + `people` + `hris` + `finance` + `notifications`
- Owner: `Greenhouse product / operations`
- Date: `2026-03-31`

## Summary

Definir cómo debería integrarse un futuro `Hiring Desk` o mini ATS para `Staff Augmentation` dentro del ecosistema reactivo de Greenhouse.

Este research no propone todavía una implementación ni una task de build. Su objetivo es fijar:
- el modelo de eventos de outbox que tendría el dominio
- qué proyecciones downstream deberían reaccionar
- cómo se conecta con `People`, `HRIS`, `Staff Augmentation`, `Finance`, `Payroll`, `Identity` y `shared assets`
- qué señales justifican notificación `in_app` y cuáles justifican email
- qué partes deberían vivir dentro de `greenhouse-eo` y cuáles deben seguir tratándose como upstream externos

La tesis central es:

> `Hiring` debe ser la capa de fulfillment previa a `Staff Augmentation`, no un ATS corporativo genérico ni un duplicado de `People`.

## Delta 2026-03-31 — candidate como Person temprana

Decisión de modelado refinada:

- cada `candidate` debe vivir dentro del grafo `Person`, no como identidad humana paralela
- la separación correcta no es `candidate vs person`, sino `person` con distintas `facets` o capacidades activadas
- por lo tanto:
  - `candidate` no equivale a `member`
  - `candidate` sí equivale a una `Person` temprana o parcial
  - `Person 360` debe poder sostener el journey longitudinal desde candidate hasta assignments, placements e historial multi-cliente

Esto preserva una historia unificada de la persona y reduce duplicados al momento de conversión.

## Delta 2026-03-31 — staffing request como capa upstream

Decisión adicional de modelado:

- antes de `HiringOpening` debe existir una capa de demanda llamada `StaffingRequest`
- esta capa captura la solicitud de búsqueda originada por cliente, prospecto o equipo interno
- `StaffingRequest` no equivale a `placement`
- `StaffingRequest` tampoco equivale todavía a un `opening` detallado

La secuencia recomendada pasa a ser:

- `staffing_request -> hiring_opening -> application/person -> member facet -> assignment -> placement`

Esto permite separar:
- la demanda comercial-operativa
- la ejecución del proceso de búsqueda
- la operación comercial del placement ya activo

## Why This Brief Exists

Hoy el reclutamiento para necesidades de `Staff Augmentation` puede ocurrir por correo y coordinación manual. Eso vuelve opaco:
- el intake de openings
- el pipeline de candidatos
- los puntos de decisión
- la cobertura real frente a un placement o una demanda comercial
- las notificaciones relevantes para operación, HR y comerciales

Greenhouse ya tiene suficientes foundations para no modelar esto desde cero:
- outbox canónico en `greenhouse_sync.outbox_events`
- projection registry y consumer reactivo por dominio
- `NotificationService` multi-canal (`in_app` + `email`)
- delivery centralizado de emails con persistencia y retry
- `shared assets` para CVs, portfolios y anexos privados
- identidad canónica y dedup persona-centrado
- módulo `Staff Augmentation` ya operativo sobre `assignment -> placement`

Lo que falta no es infraestructura base, sino un contrato de dominio coherente.

## Product Thesis

`Hiring` debe resolver la parte previa al placement activo sin mezclar:
- el ciclo HR de una persona ya contratada
- el runtime comercial-operativo de un placement
- el intake informal vía correo

En una frase:

> `Hiring` gobierna la búsqueda, evaluación y conversión de talento para cubrir una necesidad de servicio; `HRIS` gobierna a la persona incorporada; `Staff Augmentation` gobierna el placement vendido y operado.

Refinamiento:

> `Hiring` no crea una segunda identidad humana; abre una faceta temprana de `Person` para seguir a alguien desde candidate hasta eventual member, assignment y placement.

Refinamiento adicional:

> `StaffingRequest` captura la demanda; `Hiring` llena esa demanda; `Staff Augmentation` opera el resultado cuando ya existe assignment/placement.

## Core Design Principles

1. `Candidate` externo no es `member`, pero sí debe ser una `Person` temprana dentro del grafo Greenhouse.
2. `Hiring` no reemplaza `People`; extiende `Person` con una faceta de candidate y decide cuándo esa persona debe pasar a ser `member`.
3. `Hiring` no reemplaza `Staff Augmentation`; prepara la cobertura que luego deriva en `assignment` y `placement`.
4. El pipeline debe expresarse como objetos transaccionales y eventos de dominio, no como notas de correo.
5. Las notificaciones deben apoyarse en el control plane existente; no crear un bus paralelo.
6. El email debe reservarse para eventos de decisión, riesgo o SLA vencido; no para micro-movimientos del pipeline.
7. La conversión canónica debe ser explícita:
   - `person(candidate facet) -> member facet -> assignment -> placement`
8. `Person 360` debe poder ver el viaje completo, pero sin habilitar prematuramente capacidades HR, payroll o portal access.
9. La solicitud de búsqueda debe existir como capa propia de demanda antes del opening detallado.

## Recommended Domain Shape

### Canonical objects involved

- `StaffingRequest`
  - solicitud comercial-operativa de búsqueda
  - puede nacer por cliente existente, prospecto, reemplazo, expansión o señal interna
  - puede derivar en uno o varios openings
- `HiringOpening`
  - necesidad real a cubrir
  - opening concreto derivado de una demanda comercial-operativa
- `Person`
  - identidad humana canónica
  - puede existir sin todas las capacidades internas activadas
  - puede vivir en estado:
    - `candidate`
    - `known_person`
    - `member`
- `CandidateFacet`
  - capa de datos de reclutamiento asociada a `Person`
  - source, CV, readiness, notas, stage y señales de match
- `HiringApplication`
  - relación `person -> opening`
  - contiene stage, owner, señales y decisión
- `HiringSignal`
  - alertas o recomendaciones institucionales derivadas del pipeline

### Structural decision

El dominio debe modelarse como `Hiring` y no como extensiones ad hoc de `placement`.

Modelo recomendado:
- `StaffingRequest` es la unidad upstream de demanda
- `Opening` es la unidad de demanda
- `Person` es la identidad base
- `CandidateFacet` es la unidad de oferta evaluable dentro de esa persona
- `Application` es la unidad transaccional del pipeline
- `Signal` es la unidad reactiva de alerta, readiness o riesgo

Esto evita tres errores:

1. usar `placement` como contenedor del reclutamiento antes de que exista persona lista
2. crear `member` demasiado pronto para candidatos externos
3. duplicar la identidad humana entre `candidate` y `person`
4. mezclar notas de screening con el runtime HR o payroll
5. usar `opening` como si fuera equivalente a la solicitud comercial original

### Demand model recomendado

La capa correcta de demanda debería ser:

- `StaffingRequest`
  - request comercial-operativa
  - puede venir de:
    - cliente existente
    - prospecto
    - reemplazo de placement
    - expansión de capacidad
    - señal interna de Agency / staffing
- `HiringOpening`
  - vacante concreta derivada de esa request
  - una request puede abrir:
    - un opening
    - varios openings
    - ninguna apertura todavía si queda en calificación

Esto permite modelar casos reales como:
- “cliente existente pide 2 perfiles”
- “prospecto en negociación pide benchmark de talento”
- “placement termina pronto y necesitamos reemplazo”
- “forecast detecta gap y pide abrir búsqueda”

### Existing client vs prospect

`StaffingRequest` no debería obligar a que el cliente ya exista plenamente canonizado.

Target model sugerido:

- para cliente existente:
  - `organizationId`
  - `clientId`
  - `spaceId?`
- para prospecto o demanda todavía no canonizada:
  - `prospectRef`
  - `dealRef`
  - `externalAccountRef`
  - `requestedCompanyName`

Regla:

- la búsqueda no debe bloquearse por no tener aún el objeto cliente consolidado
- cuando el prospecto se canoniza, la request debe poder reconciliarse con `organization/client/space`

### Facet model recomendado

La separación correcta debería ser por capacidades de la persona:

- `Person core`
  - identidad base
  - email canónico
  - nombre visible
  - dedup / identity links
  - historial relacional mínimo
- `Candidate facet`
  - source
  - stage actual
  - openings activos
  - CV / portfolio
  - readiness
  - comentarios y señales de evaluación
- `Member facet`
  - datos HR internos
  - contract type
  - payroll / compensation
  - onboarding interno
- `Commercial / Delivery facets`
  - assignments
  - placements
  - performance por cliente

Implicación:

- una `Person` puede nacer solo con `candidate facet`
- luego ganar `member facet`
- y más adelante acumular historia comercial-operativa

## Identity and journey decision

La recomendación explícita de este brief es:

- no tratar `candidate` como aggregate de identidad humana aparte
- sí permitir que `Hiring` publique eventos semánticos del ciclo de candidate
- pero anclados siempre a `personId`

Journey recomendado:

- `staffing request created`
- `opening created from request`
- `person created as candidate`
- `candidate facet enriched`
- `application created`
- `application hired`
- `member facet activated`
- `assignment created`
- `placement created`

En lectura de producto:

- `Person 360` debe poder mostrar:
  - openings donde participó
  - shortlist/hire history
  - si fue candidate antes de ser member
  - clientes donde terminó operando después

## Event Model

## Aggregate types recomendados

- `staffing_request`
- `hiring_opening`
- `hiring_application`
- `hiring_signal`
- `person`

## Outbox events salientes recomendados

### Staffing request lifecycle

- `staffing_request.created`
- `staffing_request.updated`
- `staffing_request.status_changed`
- `staffing_request.opening_created`
- `staffing_request.closed`

Payload sugerido:
- `requestId`
- `origin`
  - `client_request`
  - `prospect_request`
  - `replacement`
  - `expansion`
  - `capacity_gap`
  - `manual_internal`
- `requestedByUserId`
- `ownerUserId`
- `organizationId?`
- `clientId?`
- `spaceId?`
- `prospectRef?`
- `dealRef?`
- `externalAccountRef?`
- `requestedCompanyName?`
- `businessUnit`
- `requestedRole`
- `requestedSeats`
- `requestedSkills`
- `targetStartDate?`
- `priority`
- `status`

### Opening lifecycle

- `hiring.opening.created`
- `hiring.opening.updated`
- `hiring.opening.status_changed`
- `hiring.opening.closed`

Payload sugerido:
- `openingId`
- `requestId?`
- `origin`
  - `staff_aug_request`
  - `capacity_gap`
  - `replacement`
  - `expansion`
  - `manual`
- `requestedByUserId`
- `ownerUserId`
- `organizationId`
- `spaceId`
- `clientId`
- `businessUnit`
- `requestedRole`
- `requestedSkills`
- `targetStartDate`
- `priority`
- `status`

### Candidate lifecycle

- `person.created`
- `person.updated`
- `hiring.candidate_facet.created`
- `hiring.candidate_facet.updated`
- `hiring.candidate_facet.archived`
- `hiring.candidate_facet.promoted_to_member`

Payload sugerido:
- `personId`
- `source`
  - `inbound_email`
  - `manual`
  - `referral`
  - `bench_internal`
  - `hubspot`
  - `import`
- `canonicalEmail`
- `identityProfileId?`
- `memberId?`
- `personStage`
  - `candidate`
  - `known_person`
  - `member`
- `candidateFacetStatus`
  - `active`
  - `archived`
  - `promoted`
- `skills`
- `availabilityWindow`
- `seniority`

### Application lifecycle

- `hiring.application.created`
- `hiring.application.stage_changed`
- `hiring.application.shortlisted`
- `hiring.application.rejected`
- `hiring.application.hired`
- `hiring.application.withdrawn`

Payload sugerido:
- `applicationId`
- `openingId`
- `personId`
- `stage`
- `previousStage?`
- `decisionOwnerUserId`
- `score?`
- `blockingIssues?`
- `matchScore?`
- `eventReason?`

### Signal lifecycle

- `hiring.signal.shortlist_ready`
- `hiring.signal.coverage_risk`
- `hiring.signal.opening_stalled`
- `hiring.signal.capacity_gap_detected`
- `hiring.signal.handover_ready_for_hr`

Payload sugerido:
- `signalId`
- `signalType`
- `severity`
- `openingId`
- `applicationId?`
- `personId?`
- `placementId?`
- `daysOpen?`
- `daysInStage?`
- `coverageDate?`
- `explanation`

## Incoming events Hiring should consume

El dominio no debe depender solo de sus propios writes. También debe escuchar señales ya existentes.

### From Greenhouse runtime

- `assignment.created`
- `assignment.updated`
- `assignment.removed`
- `person.created`
- `person.updated`
- `member.created`
- `member.updated`
- `identity.profile.linked`
- `compensation_version.created`
- `compensation_version.updated`
- `staff_aug.placement.created`
- `staff_aug.placement.updated`
- `staff_aug.placement.status_changed`
- `accounting.margin_alert.triggered`

### From capacity / agency intelligence

El sistema ya anticipa recomendaciones de hiring por gap de capacidad. Eso debería terminar materializándose como uno de estos contratos:

- `staffing_request.created`
- `hiring.signal.capacity_gap_detected`
- o un evento upstream que `Hiring` traduzca a esa señal

Payload mínimo esperado:
- `businessUnit`
- `role`
- `requiredFte`
- `availableFte`
- `gapFte`
- `targetMonth`
- `source`

### From upstream ecosystems

No todo debe nacer dentro de `greenhouse-eo`.

Repos externos que pueden originar demanda o candidatos:
- `hubspot-bigquery`
  - oportunidad comercial, expansion y signals CRM
- `kortex`
  - si en el futuro se orquestan recommendations o scoring fuera del portal
- correo inbound / parsing
  - puede originar intake, pero no debe ser source of truth final del pipeline

Regla:
- los upstream pueden originar señales
- el source of truth transaccional del pipeline de `Hiring` debe quedar en Greenhouse

## Projection Strategy

## Recommendation

No abrir un dominio reactivo nuevo en la primera iteración.

El dominio `Hiring` puede montarse sobre proyecciones repartidas en dominios ya existentes:
- `organization`
- `people`
- `finance`
- `notifications`

Esto mantiene bajo el costo operativo inicial y reaprovecha:
- crons existentes
- observabilidad existente
- recovery cron existente
- dedup y retry ya institucionalizados

## Recommended projections

### 0. `staffing_requests_snapshot`

- Domain: `organization`
- Purpose:
  - vista institucional de requests abiertas por cliente, prospecto, BU y owner
- Trigger events:
  - `staffing_request.*`
  - `hiring.opening.*`
  - `hiring.signal.*`
- Scope:
  - `request`
- Consumers:
  - `Agency`
  - `Staff Aug`
  - futuros desks comerciales

Debe responder:
- qué búsquedas fueron solicitadas
- cuáles vienen de cliente existente vs prospecto
- cuáles ya derivaron a openings
- cuáles están estancadas antes del opening

### 1. `hiring_openings_snapshot`

- Domain: `organization`
- Purpose:
  - vista institucional de openings por organización, espacio y BU
- Trigger events:
  - `hiring.opening.*`
  - `hiring.application.*`
  - `hiring.signal.*`
  - `staff_aug.placement.status_changed`
- Scope:
  - `organization` o `space`
- Consumers:
  - `Agency`
  - `Organization 360`
  - `Space 360`
  - `Staff Aug`

Debe responder:
- qué openings están abiertos
- cuáles están estancados
- cuáles tienen shortlist
- cuáles cubren reemplazo vs crecimiento

### 2. `hiring_candidates_snapshot`

- Domain: `people`
- Purpose:
  - vista del universo de personas con candidate facet y su readiness
- Trigger events:
  - `person.*`
  - `hiring.candidate_facet.*`
  - `hiring.application.*`
  - `member.*`
  - `identity.profile.linked`
- Scope:
  - `person`
- Consumers:
  - `Hiring Desk`
  - `People`
  - futuros desks de talento interno

Debe responder:
- si la persona ya existe como identidad canónica
- si tiene riesgo de duplicado
- si está bench-ready
- qué openings matchea

### 3. `hiring_fulfillment_snapshot`

- Domain: `finance`
- Purpose:
  - visibilidad de fulfillment comercial y económico
- Trigger events:
  - `hiring.opening.*`
  - `hiring.application.hired`
  - `hiring.signal.coverage_risk`
  - `compensation_version.*`
  - `staff_aug.placement.*`
- Scope:
  - `opening` o `client`
- Consumers:
  - `Agency`
  - `Finance`
  - `Cost Intelligence`

Debe responder:
- openings sin cobertura
- costo esperado vs rate esperado
- riesgo de margen si la cobertura se retrasa
- impacto de reemplazos no resueltos

### 4. Reuse `notification_dispatch`

- Domain: `notifications`
- Purpose:
  - no crear un dispatcher paralelo
- Trigger events:
  - subset de `hiring.application.*`
  - subset de `hiring.signal.*`
- Scope:
  - `notification`
- Consumers:
  - inbox del portal
  - email delivery

## Notification Model

Greenhouse ya tiene:
- categorías configurables
- preferencias por usuario
- recipients persona-centrados
- soporte `email-only`
- dedup por `eventId`

`Hiring` debe entrar ahí, no abrir otro canal.

## Recommended notification categories

- `hiring_pipeline`
  - audience: `internal`
  - default channels: `in_app`
  - priority: `normal`
- `hiring_risk`
  - audience: `internal`
  - default channels: `in_app`, `email`
  - priority: `high`

## Events that should trigger in-app by default

- `hiring.application.created`
- `hiring.application.stage_changed`
- `hiring.application.shortlisted`
- `hiring.candidate_facet.promoted_to_member`
- `hiring.signal.shortlist_ready`

Estas señales son frecuentes y operativas. Deben vivir primero en inbox interno.

## Events that justify email

- `hiring.signal.coverage_risk`
- `hiring.signal.opening_stalled`
- `hiring.signal.handover_ready_for_hr`
- `hiring.application.hired`

Regla:
- el email debe dispararse cuando existe un punto de decisión, riesgo real o handoff cross-team
- no enviar email por cada cambio de etapa

## Suggested recipient patterns

### Request owners

- owner comercial
- owner staffing
- owner operativo si existe

Estos recipients son los naturales para señales de:
- request creada
- request sin opening derivado
- request bloqueada por falta de definición

### Opening owners

- owner comercial
- owner operativo
- fallback admin del módulo

### HR / People handoff

- HR manager
- HR payroll solo si la contratación ya deriva a régimen/costo real

### Staff Aug / Agency handoff

- owner del placement potencial
- responsables de capacidad / staffing

### Email-only recipients

El modelo actual ya soporta personas sin `userId` de portal pero con email. Esto es útil para:
- stakeholders operativos que aún no entran al portal
- fallback temporal mientras no exista user provisioning completo

## Ecosystem Synergies

## With Staff Augmentation

`Hiring` debe verse como una capa previa al placement, y `StaffingRequest` como una capa previa a `HiringOpening`.

Secuencia canónica:
- `Staffing Request`
- `Opening`
- `Person`
- `Candidate facet`
- `Application`
- `Member facet`
- `Assignment`
- `Placement`

No usar `placement` como pipeline previo.

### Ownership recommendation

La lectura recomendada es:

- `StaffingRequest`
  - frontera `Agency / Commercial / Staff Aug`
- `HiringOpening` + pipeline
  - frontera `Hiring`
- `Placement`
  - frontera `Staff Augmentation`

Conclusión:

- esta capa tiene muchísima sinergia con `Staff Aug`
- pero no debe modelarse como simple extensión del `placement`
- debe funcionar como intake upstream que alimenta `Hiring` y luego desemboca en `Staff Aug`

## With People / HRIS

- `People` debe seguir siendo el hogar del objeto `Person`, incluso antes de que exista `member`
- `Hiring` activa y opera la faceta de candidate sobre esa misma persona
- `Hiring` decide cuándo una `Person` con candidate facet debe pasar a `member`
- `HRIS onboarding` comienza después del `hired`, no durante screening

## With Identity

- usar email canónico y linking de identidad para evitar candidatos duplicados
- si la persona ya existe, se enriquece su candidate facet; no se crea una segunda identidad

## With Payroll / Compensation

- `Hiring` no fija el source of truth salarial
- puede capturar expectativa o rango comercial
- el costo canónico sigue viniendo de `compensation_version` cuando la persona ya fue incorporada

## With Finance / Cost Intelligence

- openings críticos pueden derivar en riesgo comercial o erosión de margen
- `Hiring` debería exponer fulfillment risk, no recalcular toda la economía localmente

## With Shared Assets

CVs, portfolios, propuestas, anexos y scorecards deben ir por el carril shared:
- `greenhouse_core.assets`
- private assets
- ownership ligado a aggregates del dominio `Hiring`

Eso evita storage paralelo y deja audit trail homogéneo.

## With upstream repos

- `hubspot-bigquery`
  - puede originar demanda comercial
- parsing de correo inbound
  - puede originar candidate intake
- `kortex`
  - puede proveer matching o scoring futuro

Pero:
- el pipeline transaccional final debe vivir en Greenhouse

## Anti-patterns to avoid

1. Hacer un ATS generalista para toda la empresa en la primera iteración.
2. Modelar candidato externo como `member` desde el día 1.
3. Modelar candidato externo como identidad humana paralela a `Person`.
4. Crear un bus de notificaciones paralelo al `NotificationService`.
5. Enviar emails por cada micro-cambio del pipeline.
6. Usar correo entrante como source of truth definitivo.
7. Duplicar costos, contratos o estados que ya viven en HRIS, Payroll o Staff Aug.
8. Abrir un dominio reactivo nuevo sin necesidad antes de validar el throughput real del módulo.
9. Usar `opening` como único objeto de demanda cuando todavía falta modelar la solicitud original del cliente/prospecto.

## Recommended decisions matrix

Esta sección traduce las preguntas abiertas más importantes en una recomendación operativa inicial para `P0`.

### Product and model

| Tema | Recomendación | Alternativa aceptable | Riesgo si no se adopta |
|---|---|---|---|
| `StaffingRequest` sin `HiringOpening` | Sí. Debe poder existir sola como intake/calificación de demanda durante `7-14` días antes de derivar a opening o marcarse `stalled` | Forzar apertura inmediata de opening solo para requests muy maduras | Se mezclan demanda comercial y ejecución de búsqueda demasiado pronto |
| Una request con múltiples openings | Sí. Una request puede derivar en varios openings | Limitar a 1 request = 1 opening en P0 si la UX necesita simplicidad | No se modelan búsquedas reales con múltiples perfiles o seniorities |
| Tipos de demanda | Modelar explícitamente `replacement`, `growth`, `backfill`, `bench_activation`, `prospect_exploration` | Reducir a `replacement` vs `growth` en P0 | Se pierden SLAs, riesgo y prioridad reales |
| Persona en múltiples openings | Sí, con guardrails. Permitido mientras no esté en tramo final exclusivo | Bloquearlo desde el inicio | Se vuelve rígido y no representa la operación real |
| Talent pool transversal | No como objeto complejo en P0. Derivarlo desde `Person + candidate facet` | Crear vista simple de pool sin mutaciones propias | Se sobrediseña demasiado pronto |
| `candidate facet -> member facet` | Handoff asistido por HR/People, no automático | Auto-promoción solo en flujos internos muy acotados | Se promueven personas sin validaciones mínimas |
| Prospecto a cliente canónico | Reconciliar la misma `StaffingRequest` cuando exista `organization/client/space` | Crear una request nueva y cerrar la vieja | Se rompe el trail histórico y se duplican búsquedas |

### Operation and governance

| Tema | Recomendación | Alternativa aceptable | Riesgo si no se adopta |
|---|---|---|---|
| Permisos | Separar `Agency/Staffing`, `HR`, `Finance` y viewers | Internal-only total en P0 si aún no hay ACL fino | Exposición indebida de CVs, notas o compensation hints |
| Retención | Definir retención por defecto para descartados y assets de candidato | Archivo manual temporal hasta formalizar política | Acumulación de datos sensibles sin governance |
| Consentimiento / compliance | Guardar source, fecha de ingreso y base mínima de tratamiento | Capturarlo en metadata libre durante P0 | Riesgo legal y operacional con datos personales |
| Audit trail | Obligatorio para stage changes, rejects, shortlist, hire, merge y promotion | Audit trail parcial solo para eventos críticos | Se pierde trazabilidad de decisiones humanas |
| SLA operativos | Medir `time to first review`, `time in stage`, `days without owner`, `days request without opening` | Solo aging por opening en P0 | El módulo no ayuda a gestionar bloqueos reales |
| Ownership | Cada request/opening debe tener `commercial owner` + `staffing owner`; `HR owner` entra al handoff | Un solo owner visible con secundarios en metadata | Ambigüedad de responsabilidad y alertas mal ruteadas |
| Duplicados | Resolver persona-centrado por email/identity; enriquecer `Person` antes de crear otra | Cola de posibles duplicados para revisión manual | Fragmentación del journey longitudinal |
| Client-facing visibility | No en P0. Mantener interno-only | Exponer solo estatus macro de búsqueda más adelante | Se filtra pipeline sensible demasiado temprano |

### System and ecosystem

| Tema | Recomendación | Alternativa aceptable | Riesgo si no se adopta |
|---|---|---|---|
| Intake real | Source of truth manual en portal, aceptando inputs desde HubSpot/capacity/email luego | Solo manual en P0 | El intake queda demasiado cerrado o demasiado dependiente de upstreams |
| Communication log | Timeline estructurado, no CRM completo ni inbox completo | Solo notas y eventos de estado en P0 | Se intenta reconstruir correo/CRM dentro del portal |
| Assets | Usar `shared assets` privados para CV, portfolio, assessment, proposal y references | Links externos temporales solo como transición | Se fragmenta storage y se pierde auditabilidad |
| Notificaciones | `in_app` para stage/handoff; `email` solo para riesgo, stall y decision points | Solo `in_app` en P0 si el canal email aún no está afinado | Ruido excesivo o falta de visibilidad en eventos críticos |
| Reporting | KPIs mínimos: `open requests`, `open openings`, `time to shortlist`, `time to hire`, `stall rate`, `source effectiveness` | Solo KPIs operativos de aging en P0 | El módulo no demuestra impacto ni permite mejorar |
| Sinergia con Staff Aug | Staff Aug debe entrar desde `StaffingRequest`, no recién en placement | Ingreso en `HiringOpening` si P0 necesita menos actores | Se pierde continuidad entre demanda y fulfillment |
| Sinergia con Finance | Exponer señales de `revenue risk`, `replacement risk` y `cost expectation`, no cálculo profundo | Solo `coverage risk` en P0 | El costo comercial del no-fulfillment queda invisible |
| Sinergia con Identity | Permitir crear `Person` mínima con email + nombre base | Exigir más campos solo para hires | Se frena el intake y reaparecen procesos por correo |
| Rollout | `internal-only` dentro de `Agency / Staff Aug / Hiring` | Alpha en un tenant interno controlado | Exponerlo demasiado pronto complica permisos y UX |

### P0 recommendation

El corte recomendado para `P0` es:

- `StaffingRequest`
- `HiringOpening`
- `Person` con `candidate facet`
- `HiringApplication`
- `NotificationService` reutilizado
- `shared assets` reutilizado
- analytics operativa básica

Fuera de `P0` deberían quedar:

- scorecards complejos
- entrevistas estructuradas de alto detalle
- client-facing visibility
- automatización fuerte por correo inbound
- workflows avanzados de oferta/contrato

## Ready for Task looks like

Este research queda listo para bajar a task cuando haya acuerdo explícito sobre:

1. alcance P0 del módulo
   - staffing requests
   - intake
   - openings
   - candidates
   - shortlist
   - hire handoff
2. objetos transaccionales mínimos
3. eventos canónicos a publicar
4. proyecciones mínimas a construir
5. categorías de notificación a registrar
6. criterios de activación de `candidate facet -> member facet`

## Candidate follow-on tasks

- task de arquitectura y data model del dominio `Hiring`
- task de outbox events + projection wiring
- task de Hiring Desk UI
- task de intake de candidatos por email o carga manual
- task de handoff `hired -> HR onboarding -> assignment -> placement`

## Open Questions

1. ¿El primer intake de openings nace manualmente o desde señales CRM/capacity?
2. ¿`StaffingRequest` debe existir siempre antes del opening o permitimos openings directos en casos internos rápidos?
3. ¿El pipeline debe distinguir explícitamente candidatos internos vs externos en UI y analytics?
4. ¿El hire handoff activa `member facet` automáticamente o abre un workflow asistido por HR?
5. ¿La shortlist es por opening o también debe existir un talent pool transversal?
6. ¿El mail inbound se parsea dentro de `greenhouse-eo` o queda como upstream posterior?
7. ¿Qué stakeholders deben poder ser `email-only` en P0?
8. ¿Hace falta un scorecard formal en P0 o basta con stage + notes + readiness?
9. ¿`Person 360` debe mostrar desde P0 el journey completo candidate -> member -> assignment -> placement o primero solo un resumen hiring-aware?

## References

- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
