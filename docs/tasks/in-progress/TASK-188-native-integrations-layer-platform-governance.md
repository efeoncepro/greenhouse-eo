# TASK-188 - Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model

## Delta 2026-04-03

- Las lanes `TASK-205`, `TASK-207` y `TASK-208` quedan explícitamente re-encuadradas dentro de la integración nativa de `Notion`, no como un carril separado de Delivery.
- Implicación:
  - `TASK-205` pasa a representar la auditoría de paridad contra origen del contrato nativo `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
  - `TASK-207` pasa a representar el hardening runtime de ese mismo contrato
  - `TASK-208` pasa a representar su observabilidad y data quality recurrente
- Decisión de arquitectura:
  - cualquier fix de paridad, frescura, jerarquía o drift para `Notion` debe quedar enmarcado bajo la `Native Integrations Layer`
  - no abrir un control plane paralelo específico de Delivery cuando el problema real pertenece al integration layer de `Notion`

## Delta 2026-04-02

- `TASK-187` ya consumió y endureció esta foundation shared para `Notion`:
  - nuevas tablas tenant-scoped en `greenhouse_sync` para schema snapshots, drift y KPI readiness por `space`
  - nuevas APIs admin `GET/POST /api/admin/tenants/[id]/notion-governance*`
  - `integration_registry.metadata.notionGovernance` ahora puede recibir rollup agregado desde el helper específico de Notion
- Implicación:
  - `TASK-188` queda validada como foundation shared/control plane
  - el gap restante ya no es “demostrar aplicabilidad en un módulo”, sino seguir expandiendo el patrón a otros upstreams y cerrar convergencia runtime donde todavía haya carriles legacy
  - Notion dejó de ser solo caso conceptual y ya opera como la primera implementación tenant-scoped real de la Native Integrations Layer

## Delta 2026-04-01

- Migration `integration-registry` created: `greenhouse_sync.integration_registry` table with taxonomy, ownership, readiness, consumer domains
- Seeded 4 native integrations: Notion, HubSpot, Nubox, Frame.io
- Shared types: `src/types/integrations.ts` (IntegrationType, IntegrationReadiness, IntegrationHealth, IntegrationRegistryEntry, IntegrationHealthSnapshot, IntegrationWithHealth)
- Registry + health helpers: `src/lib/integrations/registry.ts`, `src/lib/integrations/health.ts`
- API routes: `GET /api/admin/integrations` (list + health), `GET /api/admin/integrations/[key]/health` (detail)
- Admin governance page: `/admin/integrations` with registry table, health/freshness, consumer domain map
- Admin Center card added for Integration Governance
- Architecture docs updated: GREENHOUSE_ARCHITECTURE_V1, SOURCE_SYNC_PIPELINES, DATA_MODEL_MASTER
- El `MVP` previo de confianza de métricas ya quedó cerrado en `TASK-189` + `TASK-186`, así que esta lane ya no compite con el scorecard mensual de Delivery; ahora puede enfocarse en la capability estructural de plataforma.
- El registry ya tiene una primera capa de control operativo:
  - campos `sync_endpoint`, `paused_at`, `paused_reason`, `last_health_check_at`
  - helpers `pauseIntegration()`, `resumeIntegration()`, `registerIntegration()`
  - readiness helpers para consumers downstream
  - trigger interno de sync on-demand por integración
- Nuevas rutas operativas:
  - `POST /api/admin/integrations/[integrationKey]/pause`
  - `POST /api/admin/integrations/[integrationKey]/resume`
  - `POST /api/admin/integrations/[integrationKey]/sync`
  - `GET /api/integrations/v1/readiness`
  - `POST /api/integrations/v1/register`
- `/admin/integrations` ahora expone una sección `Control plane` con acciones visibles por integración.

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Implementacion`
- Rank: `4`
- Domain: `platform`

## Summary

Institucionalizar una `Native Integrations Layer` dentro de Greenhouse como capability nativa del platform layer, en vez de seguir operando integraciones críticas como una suma de scripts, sync jobs, tablas auxiliares y conocimiento tácito.

La idea no es romper lo que ya existe, sino absorberlo dentro de una arquitectura formal y reusable para conectores como `Notion`, `HubSpot`, `Nubox`, `Frame.io` y futuros upstreams estratégicos.

Esta lane debe leerse como refuerzo estructural del estado actual: tomar los bindings, tablas, syncs, health checks y surfaces existentes, ordenarlos bajo un operating model común y hacer que futuras integraciones nazcan con el mismo contrato desde el día 1.

La fuente canónica de arquitectura para esta lane ahora vive en `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`. Esta task queda como carril operativo, backlog y secuencia de implementación.

En términos de priorización, esta lane queda después del `MVP` inmediato de confianza de métricas (`TASK-189` + `TASK-186`), para permitir un resultado visible y usable antes del hardening enterprise completo.

## Why This Task Exists

Greenhouse ya está en un punto de madurez donde varias capacidades visibles y críticas dependen de integraciones externas:

- `Notion` alimenta Delivery e `ICO`
- `HubSpot` alimenta CRM y comercial
- `Nubox` alimenta Finance
- `Frame.io` alimenta señales operativas y de revisión

Estas integraciones ya no son “conectores opcionales”. Tienen impacto real en:

- runtime operativo
- métricas y scorecards
- freshness y health visibles
- onboarding de clientes/spaces
- auditabilidad y confianza en el dato

Sin una capa nativa de integraciones:

- cada fuente evoluciona con patrones propios
- el onboarding se vuelve artesanal
- el health y la observabilidad quedan fragmentados
- schema drift y readiness downstream se manejan de forma inconsistente
- el platform layer no tiene un lenguaje común para gobernar upstreams críticos

## Goal

- Definir la `Native Integrations Layer` como capability formal de Greenhouse.
- Establecer un modelo común para todas las integraciones críticas del portal.
- Unificar contratos de:
  - binding
  - auth/access
  - schema/mapping governance
  - sync execution
  - health/freshness
  - downstream readiness
- absorber dentro de este marco los follow-ons de `Notion` que hoy aparecen como paridad de origen, hardening de pipeline y monitoreo continuo
- Dejar una arquitectura donde `TASK-187` sea el primer slice fuerte sobre Notion, pero dentro de un marco reusable para otras integraciones.

## Iteration Principle

- No reemplazar de golpe los pipelines o bindings que hoy mantienen el runtime operativo.
- Institucionalizar patrones que ya existen parcialmente antes de introducir nuevos frameworks o abstractions grandes.
- Preferir migración incremental con compatibilidad hacia atrás y observabilidad del estado actual.
- Usar Notion como primera implementación fuerte, pero sin acoplar la capa completa a un solo upstream.

## Recommended Execution Order

1. Definir en `TASK-188` la taxonomía, operating model y contratos compartidos de integraciones nativas.
2. Aplicar ese marco en `TASK-187` para formalizar Notion sin perder el trabajo ya hecho.
3. Capitalizar esa foundation en `TASK-186` para llevar métricas Delivery y `Performance Report` a un estado confiable y auditable.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- las integraciones externas no deben quedar como conocimiento implícito de scripts o agentes
- cada integración crítica debe tener contrato operativo, health y ownership explícitos
- los upstreams externos siguen siendo `source systems`, no identidad canónica de Greenhouse
- la capa de integraciones debe integrarse con runtime, observabilidad y governance sin duplicar la capa de datos canónicos
- esta lane no autoriza romper `ICO`; la `Native Integrations Layer` debe fortalecer sus upstreams y contratos sin desestabilizar el engine que hoy ya entrega valor

## Dependencies & Impact

### Depends on

- `greenhouse_core.space_notion_sources`
- `greenhouse_delivery.space_property_mappings`
- pipelines y sync jobs existentes de Notion, HubSpot, Nubox y Frame.io
- surfaces de admin/ops que ya muestran health parcial de integraciones

### Impacts to

- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `TASK-186 - Delivery Metrics Trust: Notion Property Audit & Conformed Contract Hardening`
- onboarding de spaces/clientes
- admin/integrations governance
- health/freshness de datos externos
- confiabilidad de `ICO`, CRM, Finance y Agency
- roadmap de nuevos conectores y futuras APIs externas

### Files owned

- `docs/tasks/in-progress/TASK-188-native-integrations-layer-platform-governance.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `src/lib/integrations/registry.ts`
- `src/lib/integrations/health.ts`
- `src/lib/integrations/readiness.ts`
- `src/lib/integrations/sync-trigger.ts`
- `src/app/api/admin/integrations/**`
- `src/app/api/integrations/v1/**`
- `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`

## Current Repo State

### Ya existe

- múltiples integraciones reales ya operando
- bindings y tablas específicas para algunas fuentes
- syncs con raw/conformed/projection layering
- health/freshness parcial en algunos dominios
- primeros endpoints/admin surfaces para registrar o auditar integraciones
- registry central con primeras capacidades de control plane:
  - register
  - readiness checks
  - pause / resume
  - trigger manual de sync

### Gap actual

- no existe una capa arquitectónica única llamada y gobernada como `Native Integrations Layer`
- cada integración resuelve con patrones parciales distintos
- no hay taxonomía institucional común para source binding, discovery, schema drift, readiness y health
- Notion ya exige gobernanza propia, pero el problema no es solo de Notion
- la readiness todavía mezcla estado manual (`readiness_status`) con health derivado; falta motor declarativo de reglas
- el registry ya controla sync/pause para integraciones conocidas, pero todavía no versiona contratos ni schema drift

## Scope

### Slice 1 - Integration taxonomy

- definir qué cuenta como integración nativa en Greenhouse
- separar:
  - upstream crítico
  - conector auxiliar
  - export/API de terceros
  - webhook/event provider

### Slice 2 - Shared operating model

- definir el modelo común mínimo para cada integración:
  - registro
  - autenticación/autorización
  - binding a `space`, `organization` o dominio
  - schema/discovery cuando aplique
  - sync cadence
  - health/freshness
  - readiness downstream

### Slice 3 - Shared governance surfaces

- definir qué debe vivir como capability admin/ops compartida
- proponer surfaces para:
  - inventory
  - status
  - drift
  - replay/resync
  - ownership
- baseline ya implementado:
  - inventory + status
  - pause/resume
  - trigger sync
  - readiness endpoint para consumers externos

### Slice 4 - Notion as first reference implementation

- dejar explícito que `TASK-187` es el primer caso fuerte
- usar Notion para validar el modelo sin acoplar toda la capa a un solo conector

### Slice 5 - Cross-integration roadmap

- aterrizar cómo encajan después:
  - `HubSpot`
  - `Nubox`
  - `Frame.io`
  - otros conectores futuros

### Slice 6 - Runtime control plane hardening

- separar explícitamente:
  - inventory del registry
  - controls operativos (`pause`, `resume`, `sync`)
  - readiness para consumers
- endurecer reglas de seguridad y autorización del control plane
- definir cuándo un sync on-demand debe usar ruta interna, outbox o workflow durable

## Out of Scope

- implementar todos los conectores bajo un solo framework en esta task
- reemplazar los pipelines actuales inmediatamente
- mezclar esta lane con refactors grandes de todos los dominios consumidores
- cerrar aquí todos los gaps específicos de Notion de `TASK-187`

## Target Operating Thesis

Greenhouse ya no debe pensarse como “módulos con algunas integraciones”.

Debe pensarse como:

- módulos de producto
- datos canónicos
- serving/runtime
- y una `Native Integrations Layer` que gobierna cómo entran, se validan, se sincronizan y se observan los upstreams críticos

## Canonical Architecture Source

La definición arquitectónica detallada, los principios enterprise y la arquitectura de referencia de esta lane viven en:

- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Esta task debe concentrarse en:

- slices
- backlog
- secuencia
- aceptación
- follow-ups de implementación

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

## Acceptance Criteria

- [x] Existe una definición clara de `Native Integrations Layer` para Greenhouse.
- [x] Queda definido un modelo común para integraciones críticas.
- [x] Queda claro por qué Notion es un consumer/follow-on fuerte, pero no el único caso.
- [x] La task deja follow-ups concretos para arquitectura, backend y admin surfaces.
- [x] Se establece relación explícita entre `TASK-188` y `TASK-187`.
- [x] La task queda alineada con `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md` como fuente canónica.

## Verification

- Revisión de arquitectura actual de source sync, repo ecosystem y webhook model
- Contraste con `TASK-187` para evitar duplicidad de alcance
- Verificación documental de que la layer propuesta no contradice el modelo canónico actual
- Contraste con patrones enterprise oficiales y documentación vigente al `2026-04-01`

## Open Questions

- ¿la `Native Integrations Layer` debe vivir como capability visible en `Admin Center` o como dominio técnico transversal con surfaces parciales?
- ¿qué integraciones entran en la primera ola formal además de Notion?
- ¿qué parte de observabilidad debe ser shared y cuál seguir siendo dominio-específica?

## Follow-ups

- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- arquitectura específica de `Native Integrations Layer`
- inventory y health shared de integraciones en Admin/Ops
