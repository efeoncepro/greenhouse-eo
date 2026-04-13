# GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1

## Delta 2026-04-13 — Integration Runtime Pattern for source-led connectors

El incidente real de `Nubox` dejó una regla nueva para la `Native Integrations Layer`: Greenhouse ya no debe endurecer conectores críticos solo a nivel de inventory/readiness. También debe imponer un patrón runtime reusable para cualquier integración que haga `source sync` hacia capas raw/conformed/productivas.

Este patrón aplica a conectores como:

- `Nubox`
- `Notion`
- `HubSpot` cuando opera como source sync inbound
- futuros upstreams de payroll, treasury, BI o plataformas hermanas

### Runtime pattern canonico

| Stage | Responsabilidad | Regla dura |
| --- | --- | --- |
| `Source Adapter` | Auth, paginación, retries, timeouts, clasificación de errores | No mezclar transporte con lógica de producto |
| `Sync Planner` | Hot window, historical sweep, cursores/watermarks, lease/lock | No depender solo de ventanas recientes ni de reruns manuales |
| `Raw Ledger` | Persistencia append-only del source tal como llegó | La frescura real nace aquí |
| `Conformed Snapshot` | Normalización + resolución de identidad + snapshots analíticos | No usar `DELETE` destructivo sobre tablas calientes |
| `Product Projection` | Upserts hacia PostgreSQL / serving | Debe leer latest snapshot por ID y preservar idempotencia |
| `Status / Readiness` | Health por etapa, stage lag, last success, partial success | `success` global no puede esconder drift entre raw/conformed/projection |
| `Replay / Runbooks` | Backfill por rango, replay por etapa, recuperación guiada | Todo conector crítico debe poder rehidratar historia sin cirugía manual |

### Non-negotiables nuevos

1. **Freshness real**
   - La fecha visible de sincronización en producto debe derivarse del `ingested_at` real del raw source, no del `NOW()` de una proyección downstream.

2. **`partial success` first-class**
   - Si una corrida refresca `raw` pero falla `conformed` o `projection`, el estado debe quedar explícito. No esconderlo como `success`.

3. **Snapshot-safe conformed**
   - Las capas `greenhouse_conformed.*` que dependan de BigQuery no deben asumir que pueden borrar filas recién insertadas. El patrón preferido es `append-only snapshots + latest-snapshot readers`.

4. **Replay explícito**
   - Todo conector crítico debe soportar:
     - hot window automática
     - historical sweep rotativo
     - replay/backfill manual por período o rango

5. **Locks y control plane**
   - Corridas largas o multi-fase deben usar `lease` o control equivalente para evitar solapes destructivos entre scheduler, rerun manual y recovery.

6. **Taxonomía de errores**
   - El adapter debe clasificar al menos:
     - `auth`
     - `rate_limit`
     - `transient`
     - `schema_drift`
     - `fatal`

### Implicación arquitectónica

La `Native Integrations Layer` ya no se considera completa cuando existe:

- inventory
- health
- readiness
- surface admin

Ahora también debe cubrir el contrato runtime que separa:

- `adapter hardening`
- `orchestration hardening`
- `storage safety`
- `projection integrity`
- `operational replay`

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
- implementa taxonomía explícita de errores, retries, timeout budget y paginación defensiva

### Layer 3.1 - Sync Planning and Replay Control

Todo conector source-led debe declarar un plan de sincronización runtime:

- hot window automática
- historical sweep rotativo
- cursores / watermarks persistidos
- lease / lock cuando la corrida pueda solaparse
- replay manual por rango

Regla:

- la planificación es infraestructura de integración, no lógica de dominio
- no debe quedar embebida informalmente en un cron suelto o en parámetros mágicos del adapter

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

### Layer 5.1 - Raw and Conformed Snapshot Discipline

Para source syncs inbound:

- `raw` debe ser append-only e inmutable
- `conformed` debe preferir snapshots append-only cuando la tecnología subyacente no garantice deletes/merges seguros en caliente
- los consumers downstream deben resolver latest snapshot por `source object id`

Regla:

- la capa de integración no debe degradar la posibilidad de replay o auditoría para “mantener una tabla limpia”

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

## Implementation Status (2026-04-01)

`TASK-188` implementó Layer 1 (Integration Registry) y las governance surfaces compartidas. Esta sección documenta lo que existe en el repo y cómo opera.

### Integration Registry — Schema

```sql
greenhouse_sync.integration_registry
├── integration_key    TEXT  PK        -- e.g. 'notion', 'hubspot', 'nubox', 'frame_io'
├── display_name       TEXT  NOT NULL  -- nombre visible en UI
├── integration_type   TEXT  NOT NULL  -- taxonomía: system_upstream | event_provider | batch_file | api_connector | hybrid
├── source_system      TEXT  NOT NULL  -- clave para cruzar con source_sync_runs
├── description        TEXT           -- descripción operativa
├── owner              TEXT           -- equipo o persona responsable
├── consumer_domains   TEXT[]         -- dominios downstream: ['delivery', 'ico', 'crm', 'finance', 'agency']
├── auth_mode          TEXT           -- oauth2 | api_key | token | iam | none
├── sync_cadence       TEXT           -- 15min | hourly | daily | passive | manual
├── sync_endpoint      TEXT           -- internal route for on-demand sync trigger
├── environment        TEXT           -- production (default)
├── contract_version   TEXT           -- semver del contrato vigente (futuro: OpenAPI/AsyncAPI)
├── readiness_status   TEXT           -- ready | warning | blocked | unknown
├── active             BOOLEAN        -- filtro principal de UI y API
├── paused_at          TIMESTAMPTZ    -- control plane: integración pausada
├── paused_reason      TEXT           -- razón visible/auditable de pausa
├── last_health_check_at TIMESTAMPTZ  -- último chequeo explícito del platform layer
├── metadata           JSONB          -- extensiones controladas por integración
├── created_at         TIMESTAMPTZ
└── updated_at         TIMESTAMPTZ
```

Constraint: `integration_type` y `readiness_status` tienen `CHECK` constraints sobre sus valores válidos.

### Seed Data

| `integration_key` | `integration_type` | `sync_cadence` | `consumer_domains` | `readiness_status` |
|---|---|---|---|---|
| `notion` | `hybrid` | `15min` | delivery, ico, agency | `ready` |
| `hubspot` | `system_upstream` | `hourly` | crm, finance, agency | `ready` |
| `nubox` | `api_connector` | `daily` | finance | `ready` |
| `frame_io` | `event_provider` | `passive` | delivery | `warning` |

### Health Aggregation

`src/lib/integrations/health.ts` cruza el registry con señales reales del runtime:

```
integration_registry.source_system
    ↓ JOIN
source_sync_runs                → runs y failures últimas 24h, último sync exitoso
    ↓ ENRICH (por integration_key)
space_notion_sources            → MAX(last_synced_at) para Notion
services.hubspot_last_synced_at → MAX para HubSpot
```

El resultado es un `IntegrationHealthSnapshot` por integración:

- **health**: `healthy` | `degraded` | `down` | `idle`
  - `idle`: sin señales históricas
  - `healthy`: sync reciente, sin fallos
  - `degraded`: fallos recientes o sync > 36h atrás
  - `down`: fallos + última señal > 72h
- **freshness**: porcentaje 0-100% que decae linealmente hasta 0% a las 48h sin señal
- **syncRunsLast24h** / **syncFailuresLast24h**: volumetría cruda

### Shared Types

`src/types/integrations.ts` exporta:

| Type | Uso |
|---|---|
| `IntegrationType` | Taxonomía (`system_upstream`, `event_provider`, `batch_file`, `api_connector`, `hybrid`) |
| `IntegrationReadiness` | Readiness downstream (`ready`, `warning`, `blocked`, `unknown`) |
| `IntegrationHealth` | Health derivado (`healthy`, `degraded`, `down`, `idle`, `not_configured`) |
| `IntegrationRegistryEntry` | Fila completa del registry |
| `IntegrationHealthSnapshot` | Health + freshness por integración |
| `IntegrationWithHealth` | Registry entry + health snapshot (para API y UI) |
| `SyncTriggerResult` | Resultado de trigger manual de sync |
| `ReadinessCheckResult` | Resultado de readiness por integración |

### API Routes

| Method | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/admin/integrations` | `requireAdminTenantContext` | Lista todas las integraciones activas con health snapshot |
| `GET` | `/api/admin/integrations/[integrationKey]/health` | `requireAdminTenantContext` | Detalle de health para una integración |
| `POST` | `/api/admin/integrations/[integrationKey]/pause` | `requireAdminTenantContext` | Pausa la integración y la marca como `blocked` para consumers |
| `POST` | `/api/admin/integrations/[integrationKey]/resume` | `requireAdminTenantContext` | Reanuda una integración pausada |
| `POST` | `/api/admin/integrations/[integrationKey]/sync` | `requireAdminTenantContext` | Dispara un sync on-demand vía `sync_endpoint` |
| `GET` | `/api/integrations/v1/readiness?keys=...` | `requireIntegrationRequest` | Expone readiness shared para consumers externos/internos |
| `POST` | `/api/integrations/v1/register` | `requireIntegrationRequest` | Registra una nueva integración en el registry |

Las rutas `admin` requieren `routeGroup: admin` + `roleCode: efeonce_admin`.

### Helpers

| Archivo | Exports | Patrón |
|---|---|---|
| `src/lib/integrations/registry.ts` | `getIntegrationRegistry()`, `getIntegrationByKey(key)`, `pauseIntegration()`, `resumeIntegration()`, `registerIntegration()` | Kysely (`getDb()`) |
| `src/lib/integrations/health.ts` | `getIntegrationHealthSnapshots(keys)` | `runGreenhousePostgresQuery` (raw SQL para aggregations complejas) |
| `src/lib/integrations/readiness.ts` | `checkIntegrationReadiness()`, `checkMultipleReadiness()` | registry + health combinados |
| `src/lib/integrations/sync-trigger.ts` | `triggerSync()` | fetch interno autenticado con `CRON_SECRET` |

### Governance Surface

**Page**: `/admin/integrations` (view code: `administracion.cloud_integrations`)

La vista tiene 5 secciones:

1. **KPI cards**: integraciones activas, ready count, attention count, dominios downstream cubiertos
2. **Registry table**: taxonomía, owner, cadencia, auth, dominios, readiness por integración
3. **Health & freshness**: health chip, freshness bar (0-100%), última señal, syncs/fallos 24h
4. **Control plane**: acciones visibles para `pause`, `resume` y `sync` por integración
5. **Consumer domain map**: card por integración con descripción y dominios dependientes

**Links cruzados**:
- Admin Center tiene card de "Integration Governance" que lleva a `/admin/integrations`
- Cloud & Integrations (`/admin/cloud-integrations`) tiene botón que lleva a governance

### Data Flow — End to End

```
Fuente externa (Notion API, HubSpot API, Nubox API)
    │
    ▼
Sibling repos (notion-bigquery, hubspot-bigquery)
    │  ingestion → BigQuery raw → BigQuery conformed
    ▼
greenhouse-eo sync pipelines
    │  projection → PostgreSQL (greenhouse_delivery, greenhouse_crm, greenhouse_finance)
    │  emit → greenhouse_sync.outbox_events
    │  track → greenhouse_sync.source_sync_runs ←─── señal de health
    ▼
integration_registry ←─── Layer 1: registro formal de integraciones nativas
    │
    ▼
health.ts ←─── cruce registry × sync_runs × source-specific freshness
    │
    ▼
/api/admin/integrations ←─── API JSON
    │
    ▼
/admin/integrations ←─── governance surface visible
```

La capa **no reemplaza** pipelines, outbox ni webhooks existentes. Pone un registro formal encima que gobierna qué integraciones existen, quién es responsable, qué dominios dependen, y cuál es el estado operativo real.

### Extension Points

Cuando se registre una nueva integración:

1. **INSERT** en `integration_registry` (migration o seed)
2. Si el `source_system` ya emite a `source_sync_runs`, el health se calcula automáticamente
3. Si no, agregar enriquecimiento específico en `health.ts` (como el de Notion/HubSpot)
4. Si tiene sync on-demand, declarar `sync_endpoint`
5. La UI muestra la nueva integración sin cambios de frontend

Cuando TASK-187 formalice Notion:

1. Actualizar `contract_version` en el registry (semver del contrato OpenAPI/AsyncAPI)
2. Agregar `readiness_rules` en `metadata` JSONB para reglas de readiness más finas
3. Drift detection escribe a `metadata.last_drift_at` o tabla dedicada
4. Todo visible en la misma governance surface

## Follow-on Work

- `TASK-187`: formalizar Notion como primer consumer fuerte — contract version, schema registry, drift detection, readiness rules
- contract registry operativo: versionado machine-readable de contratos por integración (OpenAPI/AsyncAPI)
- readiness automática: derivar `readiness_status` de reglas declarativas en vez de manual
- integration inventory en API v1: exponer el registry para consumo externo con token auth
- extender enriquecimiento de health a Nubox (via `source_sync_runs` de cron) y Frame.io (cuando tenga señal propia)

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
