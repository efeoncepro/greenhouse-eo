# Greenhouse Apps Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-28
> **Ultima actualizacion:** 2026-04-28
> **Scope:** Evolucion de integraciones hacia Greenhouse Apps instalables, versionables y gobernables
> **Docs relacionados:** `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md`, `GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`, `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`, `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`, `GREENHOUSE_SERVICE_MODULES_V1.md`, `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_DATA_MODEL_MASTER_V1.md`, `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

---

## 1. Objetivo

Formalizar **Greenhouse Apps** como la evolucion canonica de las integraciones actuales del portal.

Una App en Greenhouse representa una dependencia externa gobernada, observable, instalable y versionable. Puede ser un sistema fuente, canal de delivery, proveedor de eventos, command target, enrich source o conector hibrido. No es solo un script, una ruta API o una credencial.

La meta es que Greenhouse pueda:

- desarrollar Apps nativas en paralelo sin mezclarlas con dominios de producto
- instalar Apps globalmente o por `organization`, `client`, `space` o futuro scope canonico
- versionar manifests, contratos y runtime por App
- pausar, degradar, desinstalar o archivar Apps sin borrar historia canonica
- exponer estado y readiness mediante API Platform REST
- permitir que Admin, Ops, API Platform, agentes y futuros tools entiendan que hace cada App

---

## 2. Tesis Arquitectonica

Greenhouse debe evolucionar desde:

```txt
integrations = registry + scripts + jobs + conocimiento implicito
```

hacia:

```txt
apps = manifest + installation + binding + runtime state + readiness + events + contracts
```

El modelo V1 no reemplaza de golpe `greenhouse_sync.integration_registry`. Lo adopta como estado runtime legado mientras introduce el lenguaje y contrato objetivo de Apps.

Regla central:

> `integration_registry` puede describir estado operacional actual, pero el **App Manifest** define el contrato esperado y versionado de la App.

---

## 3. Estado Actual Del Repo

### 3.1 Piezas existentes que se conservan

Greenhouse ya tiene foundations reales:

- `greenhouse_sync.integration_registry`
  - catalogo runtime de integraciones activas
  - columnas de ownership, type, source system, consumer domains, readiness, pause/resume
- `src/lib/integrations/registry.ts`
  - lectura, registro, pausa y resume de integraciones
- `src/lib/integrations/readiness.ts`
  - readiness por integration key
- `src/app/api/platform/ecosystem/integration-readiness`
  - API Platform read-only de readiness
- `src/app/api/admin/integrations`
  - surface Admin existente para integraciones
- `src/lib/integrations/teams/**`
  - runtime concreto para Teams Bot Framework
- `src/lib/integrations/mercado-publico/tenders.ts`
  - helper server-side Mercado Publico con API + web extraction
- `src/lib/integrations/zapsign/client.ts`
  - cliente de integracion ZapSign
- `src/lib/api-platform/**`
  - base REST contract-first para lanes `ecosystem` y `app`
- `greenhouse_sync.outbox_events`
  - event spine para delivery/projections/workflows
- `greenhouse_core.teams_notification_channels`
  - registry especifico de canales Teams

### 3.2 Piezas que no existen todavia

No existe aun:

- `App Manifest` canonico
- `app_catalog` persistido
- `app_installations`
- `app_bindings` genericos
- `app_credential_refs` genericos
- lifecycle install/uninstall cross-App
- upgrade/downgrade de Apps por tenant/cohort
- REST resources `/api/platform/ecosystem/apps`
- una UI `/admin/apps` independiente de `/admin/integrations`

### 3.3 Interpretacion V1

V1 debe adoptar lo existente sin romper runtime:

```txt
integration_registry.integration_key == appKey transicional
```

Las integraciones existentes pasan a considerarse **Legacy Installed Apps** hasta que tengan manifest y estado managed.

---

## 4. Vocabulario Canonico

### 4.1 App

Una dependencia externa gobernada por Greenhouse.

Ejemplos:

- `hubspot`
- `notion`
- `nubox`
- `teams`
- `mercado_publico`
- `zapsign`
- `frame_io`
- futuro `previred`

### 4.2 App Manifest

Contrato versionado, code-versioned y legible por runtime que declara que hace una App, que necesita, que toca, que contratos expone/consume y como se opera.

El Manifest no contiene secretos ni estado operacional mutable.

### 4.3 App Catalog

Indice de Apps disponibles o conocidas por Greenhouse. En V1 puede derivarse de manifests code-versioned + `integration_registry`.

### 4.4 App Installation

Activacion de una App en un scope Greenhouse.

Ejemplos:

- Teams instalado globalmente para notifications
- HubSpot instalado para la organization operadora
- Notion instalado por `space`
- Mercado Publico instalado globalmente para commercial discovery

### 4.5 App Binding

Vinculo entre objetos Greenhouse y IDs externos.

Ejemplos:

- `organization_id` -> `hubspot_company_id`
- `space_id` -> Notion database IDs
- `channel_code` -> Teams `chatId`
- tender code externo -> futuro objeto comercial Greenhouse

### 4.6 App Credential Reference

Referencia a secretos o credenciales. Nunca secreto inline.

Ejemplos:

- Secret Manager ref
- Vercel env var ref
- OAuth client id reference
- Bot Framework credential ref

### 4.7 App Runtime State

Estado operacional mutable:

- health actual
- readiness actual
- paused state
- last success
- last failure
- sync lag
- quota status
- drift

### 4.8 App Event

Evento emitido o consumido por una App, usualmente via outbox, webhook transport, cron o API Platform command.

---

## 5. Separacion De Planos

Una App instalada no debe confundirse con producto, acceso ni UI.

```txt
App Installation = dependencia externa disponible
Core Domain / Domain Module = capacidad nativa que puede consumir la App
Service Module = producto/capacidad comercial activa para cliente
View = surface visible en UI
Entitlement = accion funcional autorizada
Route Group = zona amplia de navegacion
Startup Policy = entrada inicial del usuario
```

Reglas:

1. App instalada no concede permisos de usuario.
2. App instalada no activa automaticamente una `view`.
3. App instalada no equivale a `service_module` contratado.
4. App instalada puede habilitar readiness o dependencia para un dominio.
5. App puede enriquecer un Core Domain, Domain Module, Plugin, Workflow o Tool.
6. UI visible debe declararse en `views` / `authorizedViews` / `view_code`.
7. Acciones deben declararse en `entitlements`.
8. Product fit sigue viviendo en `service_modules` / `client_service_modules`.

Ejemplo:

```txt
Teams App instalada globalmente
  habilita delivery channel para notifications
  NO concede admin.communications
  NO muestra /admin/communications por si sola
  NO significa que un cliente "tenga Teams"
```

---

## 6. App Manifest

### 6.1 Fuente de verdad

El App Manifest es code-versioned en repo.

Formato recomendado V1:

```txt
TypeScript manifest + schema validation
```

Razon:

- tipos fuertes
- imports desde config canonica
- validacion build-time
- export posible a JSON para API/docs
- menor drift que JSON manual

Ubicacion objetivo sugerida:

```txt
src/config/apps/<appKey>.manifest.ts
src/config/apps/index.ts
```

V1 documental no obliga a mover codigo existente.

### 6.2 Shape conceptual

```ts
type GreenhouseAppManifest = {
  appKey: string
  displayName: string
  manifestVersion: string
  appVersion: string
  contractVersion?: string
  releaseChannel: 'alpha' | 'beta' | 'stable' | 'deprecated'
  category: AppCategory
  integrationType: AppIntegrationType
  ownerDomain: string
  consumerDomains: string[]
  consumerModules: string[]
  provider: {
    name: string
    websiteUrl?: string
  }
  description: string
  dataRole: AppDataRole[]
  supportedScopes: AppScope[]
  supportedEnvironments: AppEnvironment[]
  requiredSecrets: AppSecretRequirement[]
  contracts: AppContract[]
  restResources: AppRestResource[]
  webhookEvents: AppWebhookEvent[]
  syncObjects: AppSyncObject[]
  runtime: AppRuntimeContract
  compatibility: AppCompatibilityContract
  dependencies: AppDependencyContract
  readinessChecks: AppReadinessCheck[]
  healthSignals: AppHealthSignal[]
  dataTouched: AppDataTouch[]
  entitlements: AppEntitlementMapping
  views?: AppViewMapping[]
  serviceModuleSupport?: AppServiceModuleSupport[]
  safeModes: AppSafeMode[]
  runbooks: AppRunbookRef[]
}
```

### 6.3 Campos minimos V1

Toda App manifestada debe declarar al menos:

```txt
identity:
  appKey
  displayName
  provider
  category
  ownerDomain
  consumerDomains
  consumerModules

version:
  manifestVersion
  appVersion
  contractVersion
  releaseChannel

runtime:
  integrationType
  dataRole
  syncDirection
  supportedScopes
  supportedEnvironments

security:
  requiredSecrets
  dataClassification

contracts:
  restResources
  webhookEvents
  syncObjects

compatibility:
  minCorePlatformVersion
  requiredDomainVersions
  requiredModuleVersions
  requiredMigrationIds

operations:
  readinessChecks
  healthSignals
  safeModes
  runbooks

impact:
  dataTouched
  entitlements
  views if applicable
```

### 6.4 Manifest no debe contener

El manifest nunca debe contener:

- secretos
- tokens
- passwords
- access tokens
- raw payloads con PII
- estado mutable de ultima corrida
- last error raw sin sanitizar
- datos de tenant especifico salvo defaults documentales

---

## 7. Taxonomias

### 7.1 App Category

Categorias iniciales:

```txt
crm
delivery
finance
hr
payroll
notifications
documents
public_data
identity
analytics
ai
platform
```

### 7.2 Integration Type

Reusar y extender la taxonomia de `integration_registry`:

```txt
system_upstream
event_provider
batch_file
api_connector
hybrid
delivery_channel
command_target
public_data_source
```

### 7.3 Data Role

Cada App debe declarar su rol sobre datos:

```txt
source_of_truth
signal_source
mirror
enrichment_source
delivery_channel
command_target
event_provider
identity_provider
```

Ejemplos:

- Nubox: `signal_source`, `mirror`, parcialmente source de documentos tributarios, no owner de caja final
- Teams: `delivery_channel`, `command_target` para acciones inbound del bot
- HubSpot: `source_of_truth` transicional para CRM externo, `signal_source` para commercial, no owner absoluto de Organization 360
- Mercado Publico: `public_data_source`, `enrichment_source`
- Notion: `source_of_truth` transicional para delivery operational data hasta que los aggregates Greenhouse maduren

### 7.4 Sync Direction

```txt
inbound
outbound
bidirectional
event_only
manual_only
read_only
```

### 7.5 App Scope

Scopes soportados por el modelo:

```txt
global
organization
client
space
member
environment
```

Regla:

- Evitar `tenant` como scope canonico si el objeto real es `organization`, `client` o `space`.
- `tenant` puede aparecer en UI/copy, pero la persistencia debe preferir scopes concretos.

---

## 8. Lifecycle

Separar lifecycle, health y readiness.

### 8.1 Lifecycle Status

```txt
discovered
available
legacy_active
managed_active
paused
deprecated
uninstalled
archived
```

Definiciones:

- `discovered`: hay codigo o helper, pero no instalacion formal.
- `available`: manifest existe y la App puede instalarse.
- `legacy_active`: runtime activo heredado de integraciones actuales.
- `managed_active`: manifest + installation + binding/readiness gestionados por Apps model.
- `paused`: instalada pero jobs/actions suspendidos.
- `deprecated`: sigue disponible por compatibilidad, no debe usarse para nuevas instalaciones.
- `uninstalled`: no acepta nuevas acciones; conserva historia.
- `archived`: retention historica, fuera de operacion normal.

### 8.2 Health Status

```txt
healthy
degraded
failing
unknown
```

### 8.3 Readiness Status

```txt
ready
warning
blocked
unknown
not_applicable
```

### 8.4 Install Semantics

Instalar una App significa:

1. crear `AppInstallation`
2. validar manifest version
3. validar scope soportado
4. validar secret refs requeridos
5. crear bindings minimos si aplican
6. habilitar health/readiness checks
7. habilitar jobs/webhooks/actions solo si el manifest lo permite
8. registrar audit

Instalar no significa:

- conceder permisos a usuarios
- activar views
- crear service modules
- ejecutar backfills automaticamente
- importar historia completa sin runbook

### 8.5 Uninstall Semantics

Desinstalar una App significa:

1. marcar installation como `uninstalled`
2. detener jobs, crons o webhook subscriptions managed
3. bloquear commands nuevos
4. revocar o desactivar bindings activos si aplica
5. conservar audit, events y datos historicos
6. marcar freshness/read models como stale o read-only cuando corresponda
7. registrar cleanup requerido para secretos externos

Desinstalar nunca debe:

- hacer `DELETE` destructivo de datos canonicos
- borrar outbox history
- eliminar evidencia historica
- romper dashboards historicos
- borrar objetos Greenhouse que ya fueron canonicalizados

---

## 9. Versioning Y Upgrades

Cada App debe distinguir:

```txt
manifestVersion
appVersion
contractVersion
installedVersion
targetVersion
migrationStatus
minCorePlatformVersion
requiredDomainVersions
requiredModuleVersions
requiredMigrationIds
```

### 9.1 Manifest Version

Versiona el shape del manifest.

### 9.2 App Version

Versiona la implementacion Greenhouse de esa App.

### 9.3 Contract Version

Versiona contratos externos o API Platform asociados.

### 9.4 Installed Version

Version instalada en un scope concreto.

### 9.5 Target Version

Version a la que se quiere migrar.

### 9.6 Migration Status

```txt
not_required
pending
running
succeeded
failed
rolled_back
blocked
```

### 9.7 Compatibility Rules

Reglas:

1. Una App que enriquece un Domain Module debe declarar `consumerModules`.
2. Una App que escribe o materializa datos debe declarar migrations requeridas.
3. Una App no puede reportar `ready` si el Domain Module consumidor no existe o esta `deprecated/retired` sin policy explicita.
4. Una App puede ser provider externo para varios modulos, pero cada relacion debe declararse en el dependency graph.

### 9.8 Release Channels

Apps deben alinearse con el operating model de release channels:

```txt
alpha  -> development / preview / internal cohort
beta   -> staging / limited tenant cohort
stable -> production / general availability
deprecated -> no new installs
```

Una App puede ser `stable` globalmente y tener una feature interna `alpha`; ese detalle debe declararse como sub-capability o manifest note, no como ambiguedad de la App completa.

---

## 10. API Platform Alignment

Apps debe alinearse con la API Platform REST existente.

### 10.1 Lanes

No todo vive en `ecosystem`.

```txt
/api/admin/apps
  Admin/Ops governance, install, pause, resume, test, upgrade

/api/platform/ecosystem/apps
  Read-only binding-aware para consumers server-to-server cuando aplique

/api/platform/app/apps
  Contexto compacto para futuras first-party apps si aplica
```

### 10.2 Admin API Objetivo

```txt
GET    /api/admin/apps
GET    /api/admin/apps/:appKey
GET    /api/admin/apps/:appKey/manifest
GET    /api/admin/apps/:appKey/readiness
POST   /api/admin/apps/:appKey/install
GET    /api/admin/app-installations
GET    /api/admin/app-installations/:installationId
PATCH  /api/admin/app-installations/:installationId
POST   /api/admin/app-installations/:installationId/pause
POST   /api/admin/app-installations/:installationId/resume
POST   /api/admin/app-installations/:installationId/test
POST   /api/admin/app-installations/:installationId/uninstall
GET    /api/admin/app-bindings
POST   /api/admin/app-bindings
PATCH  /api/admin/app-bindings/:bindingId
```

### 10.3 Ecosystem API Objetivo

```txt
GET /api/platform/ecosystem/apps
GET /api/platform/ecosystem/apps/:appKey
GET /api/platform/ecosystem/app-installations
GET /api/platform/ecosystem/app-readiness
```

Reglas:

- ecosystem solo ve Apps/installations/bindings del consumer y scope autorizado
- no expone secret refs crudos si revelan infraestructura sensible
- no expone last errors sin redaction
- no permite install/uninstall en V1

### 10.4 Response Shape

Usar shape API Platform:

```json
{
  "data": {
    "items": []
  },
  "meta": {
    "pagination": {},
    "freshness": {},
    "warnings": []
  }
}
```

### 10.5 Error Semantics

Errores deben seguir taxonomia API Platform:

```txt
validation_error
unauthorized
forbidden
not_found
conflict
dependency_unavailable
rate_limited
internal_error
```

---

## 11. Readiness Standard

Vocabulary comun para readiness:

```txt
credentials
secret_ref
bindings
permissions
network
contract
schema
freshness
quota
rate_limit
webhook_delivery
sync_lag
last_success
last_failure
paused_state
data_drift
runtime_worker
```

Cada check debe devolver:

```txt
key
status
severity
summary
evidenceRef optional
lastCheckedAt
freshness
remediationHint
redactedError
```

Regla:

> Un `ready` global no puede esconder drift entre adapter, raw ledger, conformed snapshot y product projection.

Para Apps source-led criticas se hereda el runtime pattern de `GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`.

---

## 12. Security Y Secret Hygiene

### 12.1 Secrets

El manifest declara requerimientos, no valores.

```txt
secretKey
secretRefEnvVar
defaultSecretManagerRef
requiredEnvironments
rotationNotes
payloadKind
```

Reglas:

- secretos deben vivir en Secret Manager o env management canonico
- nunca imprimir valores ni tokens
- secret payload runtime debe ser scalar crudo cuando el consumer espera scalar
- JSON secret solo cuando el consumer espera JSON
- no duplicar secretos sistema como `VERCEL_AUTOMATION_BYPASS_SECRET`

### 12.2 Data Classification

Cada App debe declarar:

```txt
public
internal
confidential
restricted
pii
financial
payroll
legal
```

### 12.3 Risk Controls

Apps con writes o comunicaciones deben declarar:

```txt
requiresHumanApprovalFor
idempotencyPolicy
rateLimitPolicy
auditLevel
safeModeBehavior
```

Ejemplos:

- Teams broadcast con `@todos`: approval/rate limit/cooldown
- HubSpot quote publish: idempotencia + audit + retry
- Nubox sync: no writes directos a cash final sin canonical lane
- Payroll/Previred: no runtime mutation sin runbook y verification

---

## 13. Idempotencia, Retry Y Delivery

Toda App con efectos externos o sync debe declarar:

```txt
idempotencyKeyFields
dedupWindow
retryPolicy
maxAttempts
backoffStrategy
deadLetterBehavior
correlationIdPolicy
```

Writes externos deben preferir command semantics:

```txt
intent -> outbox/job -> adapter -> delivery/result -> audit
```

No enviar side effects criticos inline desde una UI si:

- requiere retry
- puede duplicarse
- afecta terceros/clientes
- necesita audit
- puede quedar partially delivered

---

## 14. Events, Jobs Y Webhooks

El manifest debe declarar:

### 14.1 Consumes

Eventos Greenhouse que la App consume:

```txt
commercial.quote.approved
notifications.intent.queued
finance.external_cash_signal.recorded
```

### 14.2 Emits

Eventos que la App emite:

```txt
integrations.hubspot.company.synced
integrations.teams.message.sent
integrations.nubox.document.ingested
```

### 14.3 Jobs

Crons o workers:

```txt
vercel_cron
cloud_scheduler
cloud_run_worker
manual_script
```

### 14.4 Webhooks

Webhook endpoints:

```txt
inboundEndpoint
authMode
signatureValidation
eventTypes
ownerConsumer
replaySupport
```

Nuevos webhooks deben alinearse con `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`.

---

## 15. Data Touch Y Ownership

Cada App debe declarar datos tocados:

```txt
schema
tableOrView
operation: read | write | upsert | append | project | deliver
ownershipRole
notes
```

Regla:

> Ninguna App escribe directo al modelo productivo sin adapter, contrato canonico, idempotencia y observabilidad.

Ejemplos:

- Nubox puede alimentar raw/conformed y señales externas, pero no debe crear cash payments finales sin canonical adoption lane.
- HubSpot puede hidratar organizations/deals/contacts, pero Organization 360 conserva identity canonical en Greenhouse.
- Teams puede entregar mensajes, pero no es source of truth de communication intent.
- Mercado Publico puede hidratar licitaciones/documentos, pero la oportunidad comercial canonica debe vivir en Greenhouse cuando exista.

---

## 16. Relacion Con Tools Y Agentes

Apps no son Tools.

```txt
App = sistema externo conectado y gobernado
Tool = accion ejecutable por Nexa/agente/humano/job
Workflow = secuencia gobernada de acciones y estados
```

El modelo Apps debe reservar lenguaje para futuras tools sin implementarlas ahora:

```txt
providedTools
requiredByTools
```

Ejemplos futuros:

- Teams App provee `teams.send_message`
- Mercado Publico App provee `mercado_publico.fetch_tender`
- HubSpot App provee `hubspot.hydrate_company`
- Platform Health provee `platform.health.read`

Regla V1:

> No crear Tool Registry dentro de Apps V1. Solo declarar relacion futura para evitar nombres incompatibles.

---

## 17. Relacion Con Service Modules

Una App puede soportar un service module, pero no lo reemplaza.

```txt
HubSpot App soporta crm_solutions
Notion App soporta delivery/creative operations
Teams App soporta notifications y communications
Mercado Publico App puede soportar public tenders
```

Campo informativo:

```txt
supportsServiceModules
```

No usar Apps como capa de seguridad ni product entitlement.

---

## 18. Instalaciones Actuales

### 18.1 Adoption Strategy

Las integraciones actuales se adoptan como `legacy_active`.

No se migra runtime en bloque.

### 18.2 Mapeo inicial

| App | Estado V1 | Scope inferido | Runtime actual | Nota |
| --- | --- | --- | --- | --- |
| `notion` | `legacy_active` | `space` / global delivery | `integration_registry`, sync BigQuery/Conformed | Source-led critical integration |
| `hubspot` | `legacy_active` | `organization` / global commercial | `integration_registry`, service externo, helpers TS | CRM/commercial backbone |
| `nubox` | `legacy_active` | global finance / operating entity | `integration_registry`, sync finance | Source/signal, no cash owner final |
| `frame_io` | `legacy_active` | delivery, indirect | `integration_registry`, via Notion fields | Puede ser indirect App o child dependency |
| `teams` | `discovered` -> managed candidate | global + channel bindings | `teams_notification_channels`, Bot Framework helpers | No vive aun en integration_registry |
| `mercado_publico` | `discovered` -> available candidate | global/commercial | helper server-side | Public data source |
| `zapsign` | `discovered` | documents/legal | client helper | Requiere manifest antes de governance |
| `previred` | future candidate | payroll/finance | no App formal | Puede modelarse cuando runtime madure |

### 18.3 Alias Compat

Durante transicion:

```txt
appKey = integration_key cuando exista integration_registry
```

No renombrar integration keys activas sin migration plan.

---

## 19. Persistencia Objetivo

V1 no exige migraciones inmediatas, pero el modelo objetivo puede incluir:

### 19.1 `greenhouse_core.app_installations`

```txt
installation_id
app_key
scope_type
scope_id
environment
lifecycle_status
health_status
readiness_status
installed_version
target_version
installed_by_user_id
installed_at
paused_at
paused_reason
uninstalled_at
uninstalled_by_user_id
metadata_json
created_at
updated_at
```

### 19.2 `greenhouse_core.app_bindings`

```txt
binding_id
installation_id
app_key
greenhouse_scope_type
organization_id
client_id
space_id
member_id
external_account_id
external_workspace_id
external_object_type
external_object_id
binding_status
direction
metadata_json
created_at
updated_at
```

### 19.3 `greenhouse_core.app_credential_refs`

```txt
credential_ref_id
installation_id
app_key
credential_key
secret_ref
environment
status
last_validated_at
rotation_due_at
metadata_json
created_at
updated_at
```

### 19.4 `greenhouse_core.app_lifecycle_events`

```txt
event_id
app_key
installation_id
event_type
actor_user_id
payload_json
created_at
```

### 19.5 Runtime Reuse

No duplicar tablas existentes si ya son domain-specific y sanas:

- `greenhouse_sync.integration_registry` puede seguir como runtime state legacy/V1.
- `greenhouse_core.teams_notification_channels` sigue siendo registry de canales Teams, no se reemplaza por generic binding hasta que haya valor real.
- `sister_platform_bindings` mantiene su contrato ecosystem-specific.

---

## 20. Admin UX Objetivo

Surface futura:

```txt
/admin/apps
/admin/apps/:appKey
```

Debe mostrar:

- que hace la App
- manifest version
- installed scopes
- status lifecycle/health/readiness
- secrets requeridos y estado redacted
- bindings
- ultima sync
- eventos recientes
- jobs/webhooks asociados
- datos tocados
- runbooks
- acciones permitidas
- dependencias de domains/service modules

V1 UI debe preferir read-only governance antes de install/uninstall interactivo.

---

## 21. Safe Modes

Cada App debe declarar comportamiento degradado:

```txt
read_cached
hide_actions
block_publish
queue_until_recovered
allow_manual_fallback
require_operator_review
disable_cron
```

Ejemplos:

- Teams degradado:
  - bloquear broadcast directo
  - permitir queue
  - mostrar delivery pending
- Nubox degradado:
  - mostrar freshness stale
  - no inventar documentos ni cash
  - permitir replay runbook
- HubSpot degradado:
  - usar cache/read model
  - bloquear outbound publish si credential falla
- Mercado Publico degradado:
  - permitir retry y evidence partial
  - no crear oportunidad canonica sin detalle minimo

---

## 22. Governance Y Ownership

Cada App debe declarar:

```txt
ownerDomain
technicalOwner
businessOwner optional
supportContact optional
runbookRefs
incidentRefs optional
```

Owner domain no significa ownership total de datos.

Ejemplo:

```txt
hubspot.ownerDomain = commercial
hubspot.dataTouched includes greenhouse_core.organizations
Organization identity sigue siendo canonical core
```

---

## 23. Arquitectura Fisica Recomendada

Sin mover codigo existente en V1:

```txt
src/config/apps/
  index.ts
  types.ts
  hubspot.manifest.ts
  notion.manifest.ts
  nubox.manifest.ts
  teams.manifest.ts
  mercado-publico.manifest.ts

src/lib/apps/
  manifest-registry.ts
  readiness.ts
  lifecycle.ts
  installations.ts
```

Codigo de adapters puede seguir en:

```txt
src/lib/integrations/<appKey>/**
```

Cuando una App crezca mucho, puede evaluarse boundary:

```txt
src/apps/<appKey>/**
```

Pero no es requisito de V1.

---

## 24. Non-Goals V1

Apps V1 no busca:

- marketplace publico
- dynamic plugin loading
- instalar codigo arbitrario
- reemplazar `service_modules`
- reemplazar entitlements
- reemplazar API Platform
- migrar todas las integraciones existentes en una sola task
- crear Tool Registry general
- borrar `integration_registry`
- mover todos los adapters a una carpeta nueva

---

## 25. Implementation Strategy

### Phase 0 — Inventory

- listar integrations actuales
- mapear secrets
- mapear routes/jobs/webhooks
- mapear tablas tocadas
- mapear owners
- marcar `legacy_active` vs `discovered`

### Phase 1 — Manifests Read-Only

- crear `src/config/apps` con manifests TS
- agregar schema validation
- manifests iniciales:
  - `hubspot`
  - `notion`
  - `nubox`
  - `teams`
  - `mercado_publico`
- no tocar runtime de sync

### Phase 2 — App Catalog Read API

- exponer `/api/admin/apps` read-only
- opcional: `/api/platform/ecosystem/apps` read-only binding-aware
- mapear `integration_registry` como runtime state

### Phase 3 — Installations And Bindings

- introducir `app_installations` y `app_bindings` si el valor supera el costo
- backfill Apps actuales como `legacy_active`
- promover por App a `managed_active`

### Phase 4 — Lifecycle Operations

- pause/resume/test desde Admin
- install/uninstall controlado
- upgrade/downgrade por scope
- readiness estandar

### Phase 5 — Tool/Workflow Integration

- solo despues de Apps foundation
- conectar Apps con Nexa tools, agent tools o workflows cuando existan contratos claros

---

## 26. Acceptance Criteria Para Nuevas Apps

Una nueva App no debe entrar como runtime productivo sin:

- manifest code-versioned
- owner domain
- supported scopes
- required secret refs
- data role
- data touched
- readiness checks
- safe mode behavior
- idempotency policy si escribe o entrega
- API/event contracts si expone/consume contratos
- runbook minimo
- access model claro:
  - views si hay UI
  - entitlements si hay acciones
- release channel
- adoption plan por environment

---

## 27. Open Questions

1. Si `integration_registry` debe evolucionar fisicamente a `app_runtime_registry` o mantenerse con nombre legacy.
2. Si `app_installations` debe vivir en `greenhouse_core` o `greenhouse_sync`.
3. Si Teams debe entrar a `integration_registry` como App runtime o conservar registry propio con manifest.
4. Como representar child Apps o dependencies indirectas, por ejemplo `frame_io` via Notion.
5. Cual es el primer endpoint REST Apps: Admin read-only o ecosystem read-only.
6. Si manifests deben exportarse automaticamente a docs publicos.
7. Como versionar external OAuth scopes cuando una App tenga auth interactivo.

---

## 28. Decision Inicial Recomendada

Adoptar para V1:

```txt
Nombre canonico: Greenhouse Apps
Manifest: TypeScript code-versioned
Runtime V1: integration_registry + adapters existentes
Estado inicial: legacy_active/discovered
API first slice: Admin read-only
No dynamic plugins
No install/uninstall interactivo hasta tener manifests + readiness
```

Esta decision permite ordenar Apps sin romper las integraciones actuales ni mezclar producto, permisos y dependencias externas.
