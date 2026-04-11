# RESEARCH-005 - Client-Context AI Workers Service Model

## Status

- Lifecycle: `Research Brief`
- State: `Active`
- Domain: `agency` + `service modules` + `operations` + `client portal` + `integrations`
- Owner: `Greenhouse product / operations`
- Date: `2026-04-11`

## Summary

Definir un modelo de servicio productizado para `AI Workers` operados por Efeonce a traves de Greenhouse.

La idea no es agregar "IA generica" al portal ni copiar sin filtro el framing de plataformas como Deel. El objetivo es formalizar una nueva capa de servicio donde Efeonce pueda ofrecer workers digitales especializados, ajustados al contexto operativo real de cada cliente, del mismo modo en que hoy vende especialistas humanos como un operador de HubSpot, un Director de Arte o un perfil de staffing.

Este brief busca fijar:

- que es exactamente un `AI Worker` dentro de Greenhouse
- que parte del contexto del cliente debe poder consumir
- como se diferencia de un modulo normal, de un copilot y de un especialista humano
- que objetos, permisos, aprobaciones y surfaces harian falta
- que familias de workers tienen mas sentido para Efeonce
- que falta validar antes de bajar esto a tasks de implementacion o a una oferta comercial real

## Why This Brief Exists

Greenhouse ya esta dejando de ser solo un portal de visibilidad. El repo ya contiene señales de una evolucion hacia:

- inteligencia embebida por modulo
- visibilidad enterprise de equipos asignados
- perfiles de talento verificables
- composicion de producto por `service modules`
- consumers cliente-facing y internos sobre el mismo grafo operacional

En paralelo, el mercado esta empezando a empaquetar "AI workforce" como una nueva capa de producto. La oportunidad para Efeonce no parece ser vender un asistente generico, sino convertir know-how operativo en roles digitales especializados que viven sobre datos, reglas y workflows reales del cliente.

En una frase:

> Greenhouse no deberia limitarse a mostrar la operacion del cliente; deberia poder servir como system of context para desplegar workers digitales especializados sobre esa operacion.

## Product Thesis

El producto correcto no es "AI dentro de Greenhouse".

El producto correcto es:

> `AI Workers` configurados, gobernados y medidos por Efeonce sobre el contexto operativo de cada cliente, con Greenhouse como capa canonica de contexto, permisos, trazabilidad y surfaces.

Interpretacion:

- Efeonce no vende IA abstracta
- Efeonce vende roles operativos digitales
- Greenhouse no es solo la interfaz; es el sistema que resuelve contexto, aprobaciones, evidencia y medicion de impacto

## Working Definition

Un `AI Worker` es una capacidad digital especializada que:

1. opera sobre un problema o lane de negocio delimitado
2. consume contexto real del cliente, no prompts aislados
3. sigue playbooks, thresholds y guardrails definidos por Efeonce
4. deja trazabilidad de recomendaciones, acciones propuestas y resultados
5. permanece bajo supervision humana cuando el riesgo o la politica lo exige

No es:

- un chatbot general
- un reemplazo magico de un miembro del equipo
- un permiso transversal para actuar sobre todo el tenant
- una automation ciega sin contexto, aprobacion ni auditoria

## Strategic Positioning

La oportunidad comercial se parece mas a vender un especialista que a vender una feature.

Modelos comparables:

- hoy se vende un `HubSpot Specialist`
- hoy se vende un `Director de Arte`
- manana se podria vender un `AI HubSpot Ops Specialist` o un `AI Staffing Coordinator`

La propuesta de valor no es "habla con una IA", sino:

- "este worker ejecuta una parte concreta de tu operacion"
- "entiende tu cuenta, tu espacio, tu servicio y tus reglas"
- "lo supervisa un humano de Efeonce cuando corresponde"
- "su output es medible"

## Greenhouse Fit

Este modelo conversa de forma directa con capacidades ya existentes o en maduracion dentro del repo:

- `Embedded AI Strategy` ya define inteligencia embebida por modulo y no como chatbot externo
- `Assigned Team` ya fija una lens enterprise de composicion, capacidad, trust y health
- `Talent Discovery` ya resuelve search/ranking de talento con verificacion y disponibilidad
- `Client-safe profiles` ya separan lo visible para cliente de la data interna
- `service modules` ya proveen un eje de composicion de producto por tipo de servicio

Inference:

- el paso siguiente natural no es solo "mas dashboards inteligentes"
- el paso siguiente natural es `workers` que operan sobre esos modulos y dejan output visible en Greenhouse

## Core Design Principles

1. **Context-first**
   - un worker vale por el contexto operativo que consume, no por el modelo base que usa

2. **Role-shaped**
   - cada worker debe parecerse a un rol o lane vendible, no a una IA amorfa

3. **Managed-service by default**
   - Efeonce define playbooks, thresholds, templates y supervision antes de abrir configuracion libre al cliente

4. **Advisory before autonomy**
   - primero recomienda, explica y prepara acciones
   - despues propone ejecucion con aprobacion
   - solo mas adelante podria automatizar slices de bajo riesgo

5. **Tenant-safe and scope-safe**
   - el worker no puede leer ni actuar fuera de su cliente, space, modulo o lane asignado

6. **Human accountability**
   - todo worker debe tener un owner humano o desk responsable

7. **Measurable outcomes**
   - cada worker necesita output, KPI y ROI visibles

8. **Service-module aware**
   - no todo cliente deberia ver o comprar los mismos workers

9. **Client-facing only when mature**
   - conviene empezar por workers internos operados por Efeonce y luego exponer surfaces cliente-safe

## Suggested Canonical Model

### 1. AI Worker Template

Definicion reusable del worker como producto/servicio.

Campos sugeridos:

- `templateId`
- `workerCode`
- `workerLabel`
- `serviceModuleCodes[]`
- `roleArchetype`
- `problemSpace`
- `recommendedContextSources[]`
- `allowedActions[]`
- `approvalPolicy`
- `defaultKPIs[]`
- `active`

### 2. AI Worker Assignment

Instancia del worker para un cliente, organization o space.

Campos sugeridos:

- `assignmentId`
- `templateId`
- `organizationId`
- `spaceId?`
- `serviceModuleCode`
- `status`
- `ownerUserId`
- `supervisorMemberId?`
- `validFrom`
- `validTo`
- `configSnapshot`

### 3. AI Worker Context Contract

Contrato de que datos puede leer y usar el worker.

Campos sugeridos:

- `contextScope`
- `dataSources[]`
- `fieldMaskPolicy`
- `approvedIntegrations[]`
- `knowledgeArtifacts[]`
- `decisionThresholds`

### 4. AI Worker Signal

Hallazgos, recomendaciones o alertas generados por el worker.

Campos sugeridos:

- `signalId`
- `assignmentId`
- `signalType`
- `severity`
- `summary`
- `explanation`
- `recommendedNextStep`
- `sourceEvidence`
- `confidence`
- `generatedAt`

### 5. AI Worker Run

Ejecucion puntual o periodica del worker.

Campos sugeridos:

- `runId`
- `assignmentId`
- `triggerType`
- `triggeredBy`
- `inputSnapshot`
- `outputSummary`
- `status`
- `startedAt`
- `completedAt`

### 6. AI Worker Action Proposal

Accion propuesta por el worker antes de ejecutar algo que cambie estado o afecte una surface sensible.

Campos sugeridos:

- `proposalId`
- `runId`
- `actionType`
- `proposedPayload`
- `requiresApproval`
- `approverPolicy`
- `approvalStatus`
- `executedAt`
- `executionResult`

## Worker Families with Highest Strategic Fit

### W1 - AI Staffing Coordinator

Problema:
- encontrar, proponer y seguir cobertura de talento para necesidades activas

Contexto sugerido:
- talent discovery
- capacity
- assigned team
- hiring demand
- service module

Outputs:
- shortlists
- gaps de cobertura
- reemplazos sugeridos
- readiness de staffing

### W2 - AI HubSpot Ops Specialist

Problema:
- operar hygiene, follow-up, enrichment y rutinas de CRM de clientes que compran ese servicio

Contexto sugerido:
- HubSpot mirrors
- service module `consultoria_crm` / `implementacion_onboarding`
- account goals
- pending tasks / workflows

Outputs:
- backlog priorizado
- oportunidades de cleanup
- acciones sugeridas
- resumen operativo

### W3 - AI Delivery Reporter

Problema:
- traducir senales operativas a reporting ejecutivo y rutinario

Contexto sugerido:
- assigned team
- delivery signals
- cost intelligence resumido
- account health

Outputs:
- executive summaries
- QBR drafts
- weekly status packs
- risk narratives

### W4 - AI Account Ops Analyst

Problema:
- detectar riesgo, drift o expansion opportunity en la operacion de una cuenta

Contexto sugerido:
- space health
- margin signals
- service usage
- capacity pressure
- renewal / quotation context

Outputs:
- account risk alerts
- continuity warnings
- expansion candidates
- intervention briefs

### W5 - AI Talent Sourcer / Hiring Scout

Problema:
- preparar busquedas, recomendar geos o canales y acelerar fulfillment

Contexto sugerido:
- hiring demand
- staffing requests
- talent graph
- compensation references
- assignment / placement history

Outputs:
- sourcing strategy
- benchmark shortlist
- draft demand specs
- coverage likelihood

## Recommended Rollout Model

### Phase 1 - Internal workers only

Los workers son usados por Efeonce para operar mejor cuentas, talento y delivery.

Objetivo:
- calibrar contexto
- medir utilidad real
- entender excepciones
- fijar guardrails

### Phase 2 - Managed client-facing outputs

El cliente no opera directamente el worker, pero si consume sus resultados en surfaces cliente-safe.

Ejemplos:
- resumentes ejecutivos
- team health
- continuity alerts controladas
- reporting drafts

### Phase 3 - Client-invoked workers with approval model

Algunos clientes o stakeholders pueden invocar workers delimitados dentro del portal.

Ejemplos:
- pedir un update del equipo asignado
- solicitar una recomendacion de cobertura
- disparar un health review de una cuenta

### Phase 4 - Partial low-risk automation

Solo para slices repetibles, reversibles y de bajo riesgo.

Ejemplos:
- preparar borradores
- completar context packs
- marcar anomalies
- proponer changesets

## Surfaces Greenhouse Implicated

### Internal surfaces

- Agency
- Space 360
- Assigned Team
- Hiring / ATS
- Quotation / account governance
- Nexa

### Client-facing surfaces

- home cliente
- `Assigned Team`
- executive snapshots
- account health summaries
- future service-module dashboards

### Administrative / control-plane surfaces

- catalogo de workers
- assignment por cliente / space
- KPI y ROI por worker
- approvals y audit trail
- incident / exception review

## What Greenhouse Already Has

1. `service modules` para componer producto segun el servicio vendido
2. `Assigned Team` como lens enterprise de workforce visibility
3. search y ranking de talento con disponibilidad y verificacion
4. perfiles client-safe y trust signals
5. foundations de IA embebida por modulo
6. un ecosistema reactivo para senales, backlog, eventos y observabilidad
7. lanes de staffing, hiring, finance, payroll y delivery que pueden alimentar contexto

## Missing Considerations

Estas son las capas que todavia faltan pensar o formalizar antes de convertir la idea en roadmap serio:

### 1. Product identity

- el `AI Worker` sera un `service module`, una capability transversal o una nueva familia comercial encima de `service modules`?
- como se nombra sin sonar a gimmick ni a reemplazo humano total?
- cual es la unidad comercial: worker por cuenta, por space, por lane, por outcome o por bundle?

### 2. Context governance

- que datos puede leer cada worker por defecto?
- como se versiona el `context contract` por cliente?
- como se modelan knowledge artifacts, playbooks y thresholds especificos de una cuenta?

### 3. Human supervision model

- quien es el owner humano del worker?
- quien aprueba acciones propuestas?
- que escalas o colas se necesitan cuando el worker detecta riesgo o se queda sin contexto suficiente?

### 4. Action model

- que puede hacer realmente un worker?
- solo explicar?
- sugerir?
- escribir drafts?
- llamar integraciones?
- mutar estado en Greenhouse o en sistemas externos?

### 5. Multi-tenant and security model

- como se evita que un worker mezcle contexto entre clientes o spaces?
- que field masking aplica a surfaces cliente-facing?
- como se auditan accesos a datos sensibles, comerciales o personales?

### 6. Commercial packaging

- como se vende esto: add-on, managed service, retainer, tier enterprise, bundle con staffing o con CRM ops?
- como se cotiza su valor?
- se cobra por worker, por usage, por cuenta o por ahorro / throughput?

### 7. ROI instrumentation

- que metricas prueban que el worker genera valor?
- horas ahorradas?
- errores evitados?
- SLA cumplido?
- speed-to-staff?
- expansion revenue influenciado?

### 8. Reliability and incident handling

- que pasa cuando el worker recomienda mal?
- que pasa si falla una integracion externa?
- como se muestran confidence, evidence y fallback humano?

### 9. UX model

- el worker vive como un tab, un drawer, una card, un inbox, un command center o una mezcla?
- cuando conviene mostrar solo la senal y cuando conviene mostrar conversacion o reasoning?
- cual es la diferencia UX entre `AI signal`, `AI worker`, `Nexa` y `automation`?

### 10. Legal / compliance / client trust

- como se comunica que el worker usa IA?
- que promesas contractuales se pueden hacer o no?
- que aprobaciones cliente hacen falta para usar datos de terceros o ejecutar acciones fuera de Greenhouse?

## Recommended First Validation Questions

1. Que workers ya estamos operando manualmente, aunque hoy no les llamemos asi?
2. Cuales tienen mayor repeticion y mas claridad de playbook?
3. Cuales generan output medible en menos de 30 dias?
4. Cuales pueden empezar como `advisory-only` sin tocar workflows sensibles?
5. Cuales dependen de integraciones que hoy ya existen en Greenhouse y cuales dependen de conectores todavia no canonicos?

## Candidate First Wave

Si hubiera que priorizar una primera ola conservadora, la secuencia sugerida seria:

1. `AI Staffing Coordinator`
2. `AI Delivery Reporter`
3. `AI Account Ops Analyst`
4. `AI HubSpot Ops Specialist`

Rationale:

- todos tienen framing comercial entendible
- todos se benefician de contexto ya cercano al repo
- los primeros tres pueden arrancar como advisory / reporting / recommendation
- `HubSpot Ops` agrega una vertical vendible muy clara, pero depende mas de integraciones y action model externo

## Ready-for-Task Criteria

Este brief deberia pasar a tasks solo cuando:

1. exista decision sobre el modelo canonico (`worker template`, `assignment`, `run`, `signal`, `action proposal`)
2. exista una postura explicita sobre si esto nace como capability interna o ya como oferta cliente-facing
3. al menos una familia de worker tenga:
   - scope
   - contexto
   - output
   - KPI
   - owner humano
   - approval model
4. quede definido si `service modules` es el entrypoint de composicion comercial
5. exista una estrategia de UX para diferenciar:
   - signal
   - worker
   - agent action
   - human approval

## Suggested Follow-on Tasks

Cuando este brief madure, las primeras tasks probables serian:

- arquitectura canonica de `AI Workers`
- control plane de catalogo y assignments
- context contract y policy model
- first worker runtime para `Staffing Coordinator`
- ROI instrumentation y audit trail
- client-safe surfaces para worker outputs

## Open Questions

- Greenhouse deberia tratar un worker como parte del equipo asignado del cliente o como una capability aparte?
- Efeonce quiere vender workers como equivalente de un especialista o como multiplicador de un squad humano?
- Nexa es el front universal de estos workers o solo un consumidor / agregador de sus senales?
- que workers requieren integraciones externas profundas desde el dia uno y cuales pueden vivir sobre datos Greenhouse primero?
- el pricing deberia parecerse mas a software, a managed service o a staff augmentation?
