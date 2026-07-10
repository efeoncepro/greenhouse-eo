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

## Delta 2026-07-10 — Candidate document capture: scan/quarantine, resolver unificado y retención (TASK-1362)

### Contexto: superficie abierta, no preventivo

El upload público de CV (TASK-354/1367) estaba vivo validando con `file.type` — el MIME que declara el navegador.
Ningún byte se inspeccionaba. Un binario renombrado a `.pdf` entraba al bucket privado y quedaba `attached`. El
escaneo dejó de ser un preventivo y se implementó como remediación, antes que el resto de la task.

### Escaneo de assets — puerto provider-neutral

`src/lib/storage/asset-scan/` es un puerto (mismo patrón que la signature platform de TASK-490):

- `structural` — magic bytes, coherencia MIME↔contenido, hazards de PDF (`/Launch`, `/EmbeddedFile`, `/RichMedia`,
  `/XFA` bloquean; `/JavaScript` y `/OpenAction` son advisory porque los emiten exportadores legítimos). Corre
  SIEMPRE, in-process, sin infraestructura.
- `clamav-http` — behind `ASSET_MALWARE_SCAN_ENABLED` (default OFF). Composición, no reemplazo: el peor veredicto gana.

Lifecycle: `pending → scan → attached | quarantined`. `quarantined` es terminal — los bytes se preservan para triage
forense, el asset nunca se adjunta y `downloadPrivateAsset` lo rechaza sin importar la capability del actor.

`greenhouse_core.asset_scan_results` es append-only por trigger: sólo las columnas `resolution_*` (triage humano)
pueden mutar. Outbox `asset.quarantined`; signal `storage.asset_scan.open_quarantine` (steady 0; `infected`/`error`
escalan a error).

### Invariantes operativos para agentes — Candidate document capture

- **NUNCA** confiar en `file.type` (ni en la extensión) para decidir el tipo de un upload. Es un valor del cliente. El
  tipo real lo determinan los magic bytes vía `scanAssetBytes`.
- **NUNCA** adjuntar un asset que venga de la web pública sin escanearlo. El camino ergonómico es
  `scanAndGateUploadedAsset` (`src/lib/storage/asset-scan/gate.ts`), que opera sobre **bytes + assetId** (NO sobre un
  `File`) para que cualquier upload lo pueda reusar. La red de seguridad es estructural:
  `attachAssetToAggregate` **rechaza** los contextos `hiring_application_cv` / `hiring_candidate_portfolio_file` sin un
  veredicto `clean` registrado (`asset_scan_required` / `asset_scan_blocking:<verdict>`). Un camino de upload nuevo
  (Growth Forms, TASK-1372/1373) que olvide el gate **falla en el attach**, no pasa en silencio.
- **NUNCA** asumir que reusar `submitPublicHiringApplication` arrastra el escaneo: sólo escanea cuando se le pasa un
  `File`. Un consumer reactivo del worker nunca tiene bytes (sólo JSON de PG), así que el escaneo debe ocurrir en el
  upload síncrono y el worker adjuntar un asset ya escaneado.
- **NUNCA** decidir "el último veredicto gana" mirando el scan más reciente: dos scans con el mismo `scanned_at` se
  desempatan por `scan_id` y un `clean` podría taparle el paso a un `infected`. El guard agrega sobre TODOS los
  veredictos del asset; un bloqueante `open` veta el attach hasta que el triage humano lo resuelva.
- **NUNCA** degradar en silencio a "sin antivirus": con `ASSET_MALWARE_SCAN_ENABLED=true` y sin
  `ASSET_MALWARE_SCAN_ENDPOINT`, el veredicto es `error` (bloqueante). Fail-closed.
- **NUNCA** hacer fallar la postulación porque su archivo quedó en cuarentena: confirmaría al atacante qué payload fue
  rechazado. La postulación se acepta; el documento se resuelve como `quarantined` y el signal levanta la mano.
- **NUNCA** hacer `UPDATE`/`DELETE` sobre `asset_scan_results` fuera de las columnas `resolution_*` (el trigger aborta).
- **NUNCA** autorizar documentos de candidato por routeGroup. El predicado canónico es
  `canAccessHiringCandidateDocument` (capability `hiring.application.read` + `client_*` denegado por `tenantType`).
  El check por routeGroup `hr` le daba los CV a roles sin ninguna capability de Hiring (`hr_payroll`).
- **NUNCA** anclar un documento de candidato por `member_id`: un candidato no tiene member hasta el handoff
  (TASK-356). Se ancla por `identity_profile_id` / `candidate_facet_id` / `application_id`.
- **NUNCA** pedir el documento de identidad en el apply público. `captureCandidateIdentityDocument` exige actor
  autenticado Y una decisión favorable (`selected`/`backup_selected`) — el guardrail es código, no comentario.
- **NUNCA** exponer `value_full` de un documento de identidad por el resolver. Sale sólo por el reveal auditado de
  TASK-784 (capability + reason ≥5 chars + audit append-only).
- **NUNCA** crear una columna de portafolio nueva: `candidate_facet.portfolio_url`/`linkedin_url` existen desde
  TASK-1367 y ya vienen saneados (`isSafeHttpUrl`, https-only, sin fetch server-side).
- **NUNCA** borrar documentos de candidatos automáticamente. `retention.ts` detecta y alerta; el borrado de PII de
  personas reales es un comando gobernado con humano en el loop (owner People Ops).

### Resolver unificado

`resolveCandidateDocuments` (`src/lib/hiring/documents/`) reúne archivos + enlaces + identidad enmascarada. Un
primitive, muchos consumers (desk TASK-355, handoff TASK-356, Nexa/MCP por construcción vía
`GET /api/hiring/candidate-facets/[candidateFacetId]/documents`). No degrada en silencio: si una fuente falla, la
excepción sube — "sin documentos" y "la consulta falló" no pueden verse iguales.

Detalle load-bearing: los assets `pending`/`quarantined` tienen `owner_aggregate_id = NULL` (el INSERT lo deja así),
así que el resolver los encuentra por `metadata_json->>'candidateFacetId'`. Omitir esa rama haría desaparecer del desk
justo los documentos bloqueados por el escáner.

### Retención (Ley 21.719)

Política declarada: **12 meses** desde `rejected`/`withdrawn`. Consentimiento retirado vence sin ventana. Los
contratados quedan fuera (les aplica la retención laboral). Signal `hiring.candidate_document.retention_overdue`
(warning; `consent_withdrawn` escala a error). El borrado es follow-up gobernado.

## Delta 2026-07-09 — Structured vacancy publication operator (TASK-1371)

Hiring vacancy publication now has a canonical backend-data operator:
`src/lib/hiring/vacancy-publication-operator.ts`. It accepts a structured brief
and supports `dryRun | execute | publish`; CLI wrapper
`pnpm hiring:publish-vacancy --file <brief.json>` and internal endpoint
`POST /api/hiring/vacancy-publications` must reuse this command.

The public opening projection gained additive structured fields:
`public_work_mode`, `public_hiring_region`, `public_city`, `public_country`,
`public_office_location`, `public_area`, `public_skill_tags`,
`public_compensation_band` and internal `publication_source_ref`.
`public_location_mode` remains legacy compatibility only and must be derived
from structured fields, not authored as free copy. `publishOpening` now guards
required public structured fields before an opening can become `public_listed`.

Compensation is explicitly optional in V1: `public_compensation_band` can be
provided, but publish does not require it until finance/payroll/legal define the
approved band governance.

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

## Delta 2026-07-07 — TASK-353: Domain foundation implementada (schema `greenhouse_hiring`)

La foundation transaccional del dominio quedó materializada (local-first, verificada contra PG dev). Schema nuevo **`greenhouse_hiring`** con 4 aggregates:

- **`talent_demand`** (`demand_id` `tdmn-{uuid}`, `public_id` `EO-TDM-####`) — objeto raíz. `stakeholder_type` (internal/client) × `engagement_type` (on_demand/on_going) × `fulfillment_mode` (5) × `demand_origin` (6); contexto comercial nullable (`organization_id` FK, `space_id` FK, `client_id`, `business_unit`, `service_id`) + refs pre-canonización (`prospect_ref`/`deal_ref`/`external_account_ref`/`requested_company_name`); intención de cobertura (`requested_role`, `requested_seats`, `requested_skills[]`, `target_start_date`, `priority`, bands); `status` (9-state lifecycle).
- **`hiring_opening`** (`opening_id` `opng-{uuid}`, `EO-OPN-####`) — deriva de `talent_demand` (FK RESTRICT). Truth interna (`internal_title`, `budget_band`, `rate_band`, `risk_notes`, `internal_notes`, `owner_user_id`) **separada** del payload público allowlist (`public_title`, `public_summary`, `public_description`, `public_requirements`, `public_nice_to_have`, `public_location_mode`, `public_employment_mode`, `public_seniority`, `public_process_notes`, `apply_url`). `visibility` (3) + `publication_status` (5) + `status` (6).
- **`candidate_facet`** (`candidate_facet_id` `cndf-{uuid}`, `EO-CND-####`) — **person-first**: FK `identity_profile_id → greenhouse_core.identity_profiles(profile_id)` **UNIQUE** (una Person = a lo más una faceta). `source` (7), `readiness` (5), `expected_rate`, consent/retención, `verification_signals_json`. NO existe root `candidates`.
- **`hiring_application`** (`application_id` `happ-{uuid}`, `EO-APP-####`) — unidad del pipeline. FKs a `hiring_opening` + `identity_profile_id` + `candidate_facet_id`; **UNIQUE(opening_id, identity_profile_id)** (dedupe estructural). `stage` (13-state), score/match_score, `blocking_issues[]`, `dedupe_fingerprint` (apply idempotente TASK-354); **snapshot de decisión embebido** (`decision`, `decision_at`, `decision_by`) + **snapshot de handoff** (`selected_destination`, `tentative_start_date`, `expected_legal_entity`, `expected_context`, `prerequisites_snapshot_json`) para TASK-356 — sin crear `member`/`assignment`/`placement`.

**Boundary respetado:** esta task NO escribe `member`/`assignment`/`placement`/payroll/compensation truth. Compensation/rate son propuesta/snapshot.

**Store canónico:** `src/lib/hiring/` (SQL crudo parametrizado + normalizadores + `HiringValidationError`; cada write publica outbox event v1 en la misma tx). Publication contract: `buildPublicOpeningPayload()` allowlist-only (test anti-leak) + `publishOpening`/`unpublishOpening` + `listPublicOpenings`/`getPublicOpeningByPublicId` (consumidos por TASK-354).

**API baseline interna:** `/api/hiring/{demands,openings,candidate-facets,applications}` (+ `openings/[id]/publish`), dual-gate `requireInternalTenantContext` + `can()`.

**Capabilities V1 (8, seedeadas en `capabilities_registry` + grants en `runtime.ts`):** `hiring.demand.{read,write}`, `hiring.opening.{read,write,publish}`, `hiring.application.{read,write,decide}`. Grant: internal ∪ EFEONCE_ADMIN ∪ HR_MANAGER ∪ EFEONCE_OPERATIONS (∪ EFEONCE_ACCOUNT en read/write; publish/decide least-privilege sin comercial). NUNCA `client_*`. `hiring.application.decide` queda seedeada/grantada ahora y su endpoint dedicado llega con el desk interno (TASK-355).

**Views (TASK-355, implementadas en dev):** `gestion.hiring`, `gestion.hiring_demand`, `gestion.hiring_pipeline`, `gestion.hiring_publication` y `gestion.hiring_application_detail` viven en `VIEW_REGISTRY`, `role_view_assignments` y el manifest de reachability junto con las rutas `/agency/hiring/**`. Los viewCodes mantienen namespace de navegación `gestion.*`; la ruta conserva ownership de producto bajo `agency`. El acceso visible no reemplaza las capabilities finas de cada reader/command.

**Desk interno (TASK-355, code complete / rollout pendiente):** Demand, Pipeline, Application 360 y Publication comparten `CompositionShell` y consumen el dominio `src/lib/hiring/**`; el Kanban representa `HiringApplication`, ofrece drag más menú operable por teclado y persiste con rollback. `decideHiringApplication` bloquea la fila, exige reason humana estructurada, actualiza el snapshot vigente, agrega `explainability_json.decisionHistory[]` append-only y publica `hiring.application.decided` v1 en la misma transacción. El review de assessment consume TASK-1360/1361; documentos mantiene PII masked y declara degradación hasta el resolver/reveal de TASK-1362. Documentación funcional: `docs/documentation/hr/hiring-desk.md`; manual: `docs/manual-de-uso/hr/operar-hiring-desk.md`.

### Invariantes operativos para agentes — Hiring / ATS foundation

- **NUNCA** crear un root paralelo `candidates`; el candidato vive como `candidate_facet` anclada a `identity_profile_id` (UNIQUE). La creación/reconciliación de Person desde contacto crudo es el apply público (TASK-354), no este dominio.
- **NUNCA** exponer un campo interno del opening al público fuera de `buildPublicOpeningPayload()` (allowlist-only). Agregar un campo público = extender esa función + su test anti-leak.
- **NUNCA** escribir `member`/`assignment`/`placement`/payroll/compensation desde `src/lib/hiring/**`. El handoff downstream es explícito (TASK-356), no side effect.
- **NUNCA** publicar un opening sin `public_title` (guard 422 en `publishOpening`).
- **SIEMPRE** publicar el outbox event en la misma tx que el write del aggregate (patrón del store); `captureWithDomain(err, 'hiring', …)` para observabilidad.

## Delta 2026-07-08 — Assessment (competency testing) + Candidate Document Capture

Extensión del dominio con dos capacidades pedidas por operación: **tests que rinde el candidato** y **carga de documentos**. Programa de tasks: `TASK-1360` (engine), `TASK-1361` (AI assist), `TASK-1362` (doc capture), `TASK-1363` (taking/review UI). Diseño detallado + ejemplo Account Manager en `EPIC-011 → Delta 2026-07-08`.

### Assessment = dos mecanismos sobre un modelo de competencias

El objeto canónico `HiringEvaluation` (ya nombrado arriba) se generaliza a **assessment** con dos métodos que producen el mismo output (resultados por competencia):

- `candidate_test` — cuestionario versionado con answer-key + scoring que el candidato rinde (remoto, tokenizado).
- `interviewer_scorecard` — un evaluador humano registra ratings por competencia.

Modelo canónico (schema `greenhouse_hiring`):

- **Competency catalog** — reutilizable, agnóstico de cargo. Dos ejes **ortogonales** (NUNCA en un solo enum): `category` (`attitudinal` | `aptitude` | `skill`) × `level` (`nociones` | `intermedio` | `avanzado`).
- **Question bank** — por competencia+nivel, `type` ∈ `single_choice`|`multi_choice`|`likert`|`situational`|`open_text`. `answer_key`/`rubric` **sensible**: se persiste separada de lo que ve el candidato (misma disciplina allowlist que el opening público). Objetivo (`single/multi/likert`) auto-corregido; `situational`/`open_text` corrección humana (o IA-propuesta, TASK-1361).
- **Assessment template** — composición de módulos `competencia + nivel objetivo + peso` (ej. "Account Manager L2"). Reutilizable por vacante.
- **Assessment instance** — plantilla ⨯ `hiring_application` → estados `assigned → sent → in_progress → submitted → scored | expired`; token single-use + tiempo límite para el modo remoto.
- **Response** + **competency result** — respuestas por pregunta; resultado por competencia + overall que **rueda hacia** `hiring_application.score` / `match_score` / `explainability_json` (SSOT del headline en la postulación; el assessment es el detalle que lo alimenta).

### Document capture — reutilización, no plataformas nuevas

- **CV / portafolio (archivo)**: plataforma de assets privados existente (`greenhouse_core.assets` + `GREENHOUSE_PRIVATE_ASSETS_BUCKET`), contextos hiring nuevos anclados por `application_id`/`candidate_facet_id`/`identity_profile_id` (el candidato NO tiene `member` → NO anclar por member). Portafolio-enlace = campo en `candidate_facet`.
- **Delta 2026-07-09 (TASK-354):** el apply público ya acepta CV PDF opcional (máx. 10 MB) como `hiring_application_cv_draft` → `hiring_application_cv`, adjunto a `hiring_application`. Sigue pendiente TASK-1362 para portfolio-file, identidad y scan/quarantine formal.
- **Documento de identidad**: reutiliza `greenhouse_core.person_identity_documents` (TASK-784) anclado al `identity_profile_id` del candidato, patrón enmascarado/revelar + capability `person.legal_profile.reveal_sensitive` + audit; imagen escaneada como `evidence_asset_id`. Capturado **post-decisión** (no en apply público).
- Net-new: **quarantine/scan** de uploads públicos (no existe en la plataforma de assets hoy).

### Invariantes operativos para agentes — Assessment + Doc Capture

- **NUNCA** exponer `answer_key`/`rubric` en el payload que ve el candidato (allowlist como el opening público).
- **NUNCA** mezclar `category` y `level` en un solo enum (ejes ortogonales).
- **NUNCA** dejar que un score de assessment alimente payroll/ICO/bonus, ni que auto-rechace una postulación — es input a decisión humana.
- **NUNCA** anclar un asset/identity-doc de candidato por `member_id` (usar `identity_profile_id`/`candidate_facet_id`/`application_id`).
- **NUNCA** IA que puntúa como verdad final: `propose → confirm` (humano confirma) + eval baseline (TASK-1361).
- **SIEMPRE** reutilizar `person_identity_documents` para identidad (no crear tabla de docs de identidad en `greenhouse_hiring`).

### As-built — TASK-1360 Assessment Engine (2026-07-08, engine completo)

El engine (no la UI, no la IA) quedó implementado tal como el diseño de arriba. Estado real: **code complete; rollout de migraciones a staging/prod pendiente vía release pipeline** (aplicadas en dev).

- **7 tablas** en `greenhouse_hiring` (reusan `touch_updated_at()`, marker `-- Up Migration` + DO block anti pre-up-marker): `hiring_competency` (`key` UNIQUE, `category` CHECK), `hiring_question` (`answer_key_json`/`rubric_json` sensibles, `status` `draft|sme_review|active|retired` — nace `draft`, gate SME), `hiring_assessment_template`, `hiring_assessment_template_module` (`weight`, `target_level` nullable, UNIQUE `(template,competency)`), `hiring_assessment` (`public_id` `EO-ASM-####`, `method` `candidate_test|interviewer_scorecard`, `access_token_hash` sha256 single-use, `accommodations_json`, estados `assigned→sent→in_progress→submitted→scored|expired`), `hiring_assessment_response` (`auto_score` + `needs_human_rating` + `human_score`), `hiring_competency_result` (UNIQUE `(assessment,competency)`).
- **Seeds**: 16 competencias (9 skill · 4 attitudinal · 3 aptitude) + plantilla `atpl-account-manager-l2` (9 módulos, weight=100).
- **Dominio** `src/lib/hiring/assessment/**`: `store.ts` (catálogo/banco/plantillas + `buildPublicQuestion` allowlist sin `answer_key`), `instances.ts` (asignar/rendir + token hash nunca en view model + anti-anclaje del scorecard), `scoring.ts` (`computeObjectiveScore` PURA 0-100 + `rollupCompetencyResultsToApplication` helper único ponderado, ADVISORY sobre `hiring_application`).
- **3 capabilities** `hiring.assessment.{read,author,score}` (catálogo + runtime grants + `capabilities_registry` seed, mismo PR; guard `capability-grant-coverage.test.ts` verde). read+author → tier operador; score → tier gobernanza (`execute`), NUNCA `client_*`.
- **7 rutas** internas `/api/hiring/assessments/**` (competencies · questions · templates · assign+list · `[id]` · `[id]/score`), dual-gate + `toHiringErrorResponse` es-CL.
- **Eventos** `hiring.assessment.{template_created,assigned,submitted,scored}` + `hiring.competency_result.updated` (aggregate types en `event-catalog`).
- Divergencia menor vs diseño: `hiring_assessment_response` agrega `human_score` explícito (además de `auto_score` + `needs_human_rating`) para separar puntaje objetivo del corregido por humano. Sin otra divergencia estructural.

### As-built — TASK-1361 Assessment AI Assist (2026-07-08, capa IA gobernada)

La capa IA (generar preguntas + sugerir puntaje, `propose → confirm`) quedó implementada como **capa de dominio hiring** que consume la infra LLM compartida (`src/lib/ai/*`), NO como tool del motor conversacional de Nexa (espeja el AEO grader `src/lib/growth/ai-visibility/**`). Estado real: **code complete + flag OFF; migraciones en dev, rollout staging/prod vía release pipeline; requiere eval baseline verde + sign-off HR/Legal antes del flip** (hiring-AI = alto riesgo EU AI Act).

- **1 tabla** additive `hiring_assessment_ai_proposal` (append-only ledger; `kind` `question_draft|response_score`, `status` `proposed|confirmed|rejected`, `provider`/`model`/`prompt_version` trazables, `input_digest` sha256 nunca-PII, índice parcial de cola pendiente).
- **Dominio** `src/lib/hiring/assessment/ai/**`: `state.ts` (máquina pura terminal-once), `proposal-store.ts` (ledger + outbox + `FOR UPDATE`), `confirm.ts` (`confirmAiProposal` = ÚNICO write; atómico vía `createQuestion`/`recordHumanScore` con `client` opcional), `config.ts` (flag + seam de modelo: grading `claude-sonnet-5`, generación `gemini-2.5-flash-lite`, override por env), `contracts.ts` (JSON Schema + sanitizers puros = frontera de enforcement), `prompt.ts` (contenido = DATA anti-injection), `providers.ts` (adapters honest-degrading, deps inyectables), `generate-questions.ts` + `score-response.ts` (propose commands, flag-gated), `eval/` (runner puro + dataset curado versionado).
- **Boundary duro:** el LLM PROPONE evidencia; el humano confirma. El LLM nunca escribe el banco (`createQuestion` nace `draft`, gate SME) ni el score (`recordHumanScore`, humano fija el valor). Nunca payroll/ICO, nunca auto-rechaza. La respuesta del candidato va al LLM por allowlist de texto (`extractAnswerText`), nunca identity docs.
- **1 capability** `hiring.assessment.ai_assist` (execute, tier operador, seed + grant + coverage) + **4 rutas** `/api/hiring/assessments/ai/**` (questions/propose, score/propose, proposals GET, proposals/[id]/confirm con capability least-privilege por kind).
- **Eventos** `hiring.assessment.ai_proposed` + `ai_confirmed` (aggregate `hiring_assessment_ai_proposal`).
- **Flag** `HIRING_ASSESSMENT_AI_ENABLED` default OFF (gatea solo los propose paths; el confirm/read de la cola no). Eval de cutover: `scripts/hiring/assessment-scoring-eval.ts`.
- **Parity:** satisfecha a nivel capability/contrato gobernado; el registro del actionKey de Nexa (para operar el confirm desde el chat) queda como **follow-up** (requiere `NexaActionDefinition` completo; espeja TASK-1212 `author_quote`).

### As-built — TASK-1367 Careers Apply Intake Service (2026-07-08, split backend de TASK-354)

La puerta de entrada pública de candidatos (el service backend; la careers UI es TASK-354). Estado real: **code complete + flag OFF; migración additive aplicada en dev, rollout staging/prod vía release pipeline; requiere `TURNSTILE_SECRET` + sign-off consent (Ley 21.719) antes del flip.**

- **Migración additive:** `candidate_facet.portfolio_url`/`linkedin_url` (V1 links-only; el upload de archivo es TASK-1362) + tabla append-only `hiring_application_intake_events` (ventanas de rate-limit por `email_hash`/`ip_hash` + audit SIN PII cruda). consent/source columns ya existían (TASK-353).
- **Dominio** `src/lib/hiring/public-careers/**`: `schema.ts` (`parsePublicHiringApplication` PURO, single SoT, NO Zod — consent obligatorio + email + URLs https browser-safe), `submit-application.ts` (`submitPublicHiringApplication`), `abuse-guard.ts` (rate-limit + intake events), `config.ts` (flag + salts + límites). Reader nuevo `resolvePublishedOpeningIdByPublicId` (published-gated) + `reconcileCandidateFacet` extendido para los links.
- **Flujo (MULTI-STEP IDEMPOTENTE, no single-transaction):** resolver `opening_id` interno (gated) → reconcile Person (`createIdentityProfile` email-first) → `candidate_facet` (source=`public_careers`, consent granted, links) → `hiring_application` (dedupe `UNIQUE(opening_id, identity_profile_id)`). Los 3 son commits separados; el retry es seguro (reconcile por email + upsert por identity_profile_id + dedupe UNIQUE). Efectos pesados (scoring/email/handoff) async, NO en el submit.
- **Endpoint** `POST /api/public/hiring/applications` (público, sin sesión, gate=anti-abuse no capability): flag → parse → Turnstile → rate-limit → validación → submit. **Respuestas SIEMPRE genéricas** (duplicado → mismo `accepted` 202; nunca revela dedupe/estado/existencia previa/PII). Reusa el shared security core `src/lib/growth/public-submission/*`.
- **Flag** `HIRING_PUBLIC_APPLICATIONS_ENABLED` default OFF (404 invisible). Consumer: careers UI (TASK-354).
