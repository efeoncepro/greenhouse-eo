# GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1

## Objetivo

Definir la `Native Integrations Layer` como capability formal del platform layer de Greenhouse para operar integraciones críticas de forma enterprise, robusta y escalable.

Este documento es la fuente canónica para:

- taxonomía de integraciones nativas
- principios arquitectónicos compartidos
- separación entre `design-time governance` y `runtime governance`
- arquitectura de referencia para adapters, contratos, eventos, health y readiness
- relación entre la capa de integraciones y los consumidores downstream como `ICO`, Finance, CRM, Agency y Admin

## Why Now

Greenhouse ya depende operativamente de múltiples upstreams:

- `Notion`
- `HubSpot`
- `Nubox`
- `Frame.io`
- futuros conectores de clientes, payroll, agency o analytics

Estas integraciones ya no son un accesorio. Afectan:

- runtime operativo
- scorecards y métricas
- onboarding de `spaces` y organizaciones
- freshness y health visibles
- auditabilidad y confianza en el dato

Por madurez del producto, Greenhouse ya no debe operar estas fuentes como una colección de scripts, jobs y conocimiento tácito. Debe tratarlas como una capability nativa de plataforma.

## Architectural Thesis

La `Native Integrations Layer` de Greenhouse no debe ser:

- un `ESB` monolítico central
- una malla de mappings punto a punto
- un onboarding artesanal dependiente de un agente o de `MCP`

La `Native Integrations Layer` sí debe ser:

- una capability de plataforma
- apoyada en contratos versionados
- basada en `API-led connectivity` para carriles síncronos
- complementada por `event-driven architecture` para carriles asíncronos
- desacoplada mediante adapters por source
- anclada en un `canonical core` con extensiones controladas
- operada con health, drift, replay, observabilidad y readiness explícitos

## Research Baseline (2026-04-01)

El baseline externo revisado al `2026-04-01` converge en estos patrones:

- `design-time governance` separado de `runtime governance`
- uso de `OpenAPI` para contratos API y `AsyncAPI` para contratos de eventos
- gateways/policy layers para carriles síncronos
- brokers/colas/workflows para carriles asíncronos
- `canonical data model` para reducir complejidad punto a punto
- resiliencia y observabilidad como parte del diseño, no como follow-up

Greenhouse adopta esa convergencia como referencia, sin copiar literalmente un framework de vendor.

## Scope

Esta architecture layer cubre:

- integraciones nativas críticas
- registro, binding y ownership
- contratos y versionado
- adapters y traducción al modelo canónico
- eventing, replay y resync
- observabilidad y readiness
- surfaces shared de Admin/Ops cuando apliquen

No cubre por sí sola:

- toda la lógica de negocio de cada dominio consumidor
- reemplazo inmediato de pipelines vigentes
- reescritura total de conectores ya operativos en un solo corte

## Native Integration Taxonomy

Una integración nativa en Greenhouse puede ser:

- `system upstream`
  sistema externo crítico que alimenta runtime o truth layers
- `event provider`
  sistema que emite cambios relevantes por webhook/evento
- `batch/file integration`
  source basado en archivos, snapshots o procesos programados
- `api connector`
  integración centrada en pull/push vía API
- `hybrid integration`
  combinación de API, webhooks y batch

No toda integración externa es automáticamente “nativa”. Una integración pasa a esta capa cuando:

- alimenta runtime o serving real
- afecta métricas o decisiones visibles
- requiere health/freshness
- necesita onboarding y gobernanza por `space`, organización o dominio

## Core Principles

### 1. API-led + event-driven

- APIs para consulta, commands, admin surfaces y operaciones síncronas
- eventos para cambios de estado, fan-out, replay y workflows durables
- no elegir uno u otro como dogma único

### 2. Contract-first

- cada integración crítica debe tener contrato explícito, versionado y validable
- `OpenAPI` para APIs
- `AsyncAPI` para topics, eventos y payloads
- markdown narrativo no reemplaza contratos machine-readable

### 3. Canonical core + controlled extensions

- ningún upstream define por sí solo el canon de Greenhouse
- cada adapter traduce al modelo canónico
- diferencias por cliente, vertical o `space_id` viven como extensiones controladas

### 4. Design-time governance separado de runtime

- design-time:
  - inventory
  - ownership
  - contracts
  - mappings
  - schema versions
  - readiness rules
  - drift
- runtime:
  - auth
  - quotas
  - retries
  - DLQ
  - circuit breakers
  - tracing
  - freshness
  - replay

### 5. Reliability by design

- idempotencia
- deduplicación
- retry con backoff
- `dead-letter queue`
- `circuit breaker`
- replay/resync
- correlation ids y execution ids

### 6. Observable by default

Cada integración nativa debe exponer:

- owner
- estado
- health
- freshness
- última ejecución exitosa
- versión contractual
- drift status
- readiness downstream

## Reference Architecture

### Layer 1 - Integration Registry

Source of truth de:

- integración
- source system
- tipo de integración
- owner
- consumer domains
- environments
- auth/bindings/scopes
- cadence
- SLA/SLO

Greenhouse ya tiene foundations parciales aquí y debe convergerlas, no descartarlas.

### Layer 2 - Contract Registry

Responsable de:

- `OpenAPI`
- `AsyncAPI`
- payload schemas
- semantic versioning
- linting
- policy conformance

El objetivo no es tener “documentos bonitos”, sino contratos auditables y validables en CI.

### Layer 3 - Source Adapters

Adapters específicos por upstream:

- `Notion`
- `HubSpot`
- `Nubox`
- `Frame.io`
- futuros conectores

Cada adapter:

- conoce la API/source real
- autentica
- extrae o publica datos
- traduce al `canonical core`
- no se convierte en truth layer del producto por sí mismo

### Layer 4 - Canonical Mapping Layer

Responsable de:

- mapear source fields al core
- soportar extensiones por `space_id`, vertical o dominio
- versionar mappings
- declarar gaps
- habilitar readiness downstream

En el caso de Notion, aquí viven el `core KPI contract` y los `space-specific extensions`.

### Layer 5 - Event and Workflow Backbone

Backbone para:

- webhooks y eventos entrantes
- fan-out a múltiples consumers
- replay/resync
- procesamiento durable
- orquestación de syncs complejos o de larga duración

Greenhouse ya tiene foundations de outbox/reactive projections; esta layer debe integrarse con ellas, no duplicarlas.

### Layer 6 - Runtime Governance Layer

Incluye:

- policy enforcement
- auth / scopes / secret handling
- rate limiting / quotas
- retries / DLQ / circuit breakers
- audit trail
- operational controls

### Layer 7 - Readiness and Consumer Contracts

Todo consumer downstream debe poder saber si una integración está:

- `ready`
- `warning`
- `blocked`

Y esa clasificación debe existir por capacidad de consumo, no solo por “sync exitoso”.

Ejemplos:

- `ready_for_runtime`
- `ready_for_serving`
- `ready_for_kpi`
- `ready_for_admin_surface`

## Greenhouse-Specific Model

La adaptación de esta arquitectura al repo actual debe respetar cuatro reglas:

### 1. Build on existing foundations

No hacer `rip-and-replace`.

Debemos construir sobre foundations existentes como:

- `greenhouse_core.space_notion_sources`
- `greenhouse_delivery.space_property_mappings`
- `/api/integrations/v1/*`
- source sync pipelines ya vigentes
- webhook model y outbox/reactive projections
- surfaces de Admin/Ops ya operativas

### 2. Keep source systems as sources

`Notion`, `HubSpot`, `Nubox`, `Frame.io` siguen siendo `source systems`, no identidades canónicas de Greenhouse.

### 3. Prefer canonical serving downstream

Los consumidores nuevos deben preferir truth/serving layers canónicas antes que recomputar desde el source.

### 4. Formalize readiness before trust

No declarar una integración como confiable para scorecards o serving crítico si no cumple:

- cobertura mínima de contrato
- drift controlado
- health suficiente
- trazabilidad y replay razonables

### 5. Do not destabilize existing consumers

Consumidores críticos ya operativos, especialmente `ICO`, deben tratarse como `protected consumers`.

Regla:

- la `Native Integrations Layer` fortalece upstreams, bindings, contracts y readiness
- no autoriza reescribir o desestabilizar consumidores críticos mientras el nuevo carril no esté probado
- cualquier migración que afecte a `ICO` debe ser incremental, compatible y reversible

## Initial Reference Implementation

La primera implementación fuerte de esta architecture layer será `Notion`.

Razones:

- ya alimenta `Delivery` e `ICO`
- ya tiene bindings y mappings parciales
- ya muestra el problema real de onboarding, schema drift y KPI trust

Secuencia recomendada:

1. `TASK-188`
   define la architecture layer shared
2. `TASK-187`
   formaliza Notion como primera integración gobernada
3. `TASK-186`
   usa esa foundation para cerrar paridad y confianza de métricas Delivery

## Design-Time Governance Model

Toda integración nativa debe dejar versionado:

- source binding
- schema snapshots
- property mappings
- contract coverage
- readiness rules
- ownership
- environment matrix

Esto debe poder revisarse sin depender de un agente específico.

## Runtime Governance Model

Toda integración nativa debe operar con:

- execution logs
- health/freshness
- correlation ids
- retry policy
- DLQ o estado equivalente de fallo durable
- replay/resync path
- alerting when drift or failures affect downstream readiness

## Anti-Patterns To Avoid

- `ESB` central con lógica de negocio transversal de todos los dominios
- point-to-point mappings sin canon ni registry
- onboarding manual como dependencia estructural
- contratos solo en narrativa markdown sin validación
- fórmulas críticas escondidas en upstreams
- observabilidad, replay o drift como follow-ups indefinidos

## Relationship To Existing Documents

- [`GREENHOUSE_ARCHITECTURE_V1.md`](./GREENHOUSE_ARCHITECTURE_V1.md)
  documento maestro de arquitectura general
- [`GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`](./GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md)
  blueprint de ingestión, raw/conformed/serving y source sync
- [`GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`](./GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md)
  contrato de inbound/outbound event delivery
- [`Greenhouse_ICO_Engine_v1.md`](./Greenhouse_ICO_Engine_v1.md)
  consumer relevante para readiness y trust downstream

## Follow-on Work

- formalizar `Notion` como primer consumer fuerte de esta architecture layer
- definir inventory y health shared en Admin/Ops
- definir contract registry operativo
- definir readiness shared por integración y por consumer
- extender el modelo a `HubSpot`, `Nubox` y `Frame.io`

## External References

- Microsoft Azure API Center overview: `https://learn.microsoft.com/en-us/azure/api-center/overview`
- Microsoft API gateway pattern: `https://learn.microsoft.com/en-us/azure/architecture/microservices/design/gateway`
- Microsoft architecture styles: `https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/`
- Microsoft event-driven style: `https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven`
- Microsoft messaging choices: `https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/messaging`
- Google Apigee API hub: `https://cloud.google.com/apigee/docs/apihub/what-is-api-hub`
- Google Eventarc event-driven architectures: `https://docs.cloud.google.com/eventarc/advanced/docs/event-driven-architectures`
- AWS event sourcing pattern: `https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/event-sourcing.html`
- AWS publish-subscribe pattern: `https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/publish-subscribe.html`
- AWS circuit breaker pattern: `https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html`
- AWS API contracts: `https://docs.aws.amazon.com/prescriptive-guidance/latest/micro-frontends-aws/api-contracts.html`
- MuleSoft API Visualizer: `https://docs.mulesoft.com/visualizer/`
- MuleSoft API Governance: `https://docs.mulesoft.com/api-governance/`
- OpenAPI specification: `https://spec.openapis.org/oas/latest`
- AsyncAPI documentation: `https://www.asyncapi.com/docs`
- AsyncAPI validation guide: `https://www.asyncapi.com/docs/guides/validate`
- Enterprise Integration Patterns - Canonical Data Model: `https://www.enterpriseintegrationpatterns.com/patterns/messaging/CanonicalDataModel.html`
- Enterprise Integration Patterns - Message Broker: `https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageBroker.html`
