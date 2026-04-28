# Greenhouse Plugins Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-28
> **Ultima actualizacion:** 2026-04-28
> **Scope:** Paquetes funcionales Greenhouse instalables, versionables y gobernables
> **Docs relacionados:** `GREENHOUSE_APPS_ARCHITECTURE_V1.md`, `GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md`, `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`, `GREENHOUSE_SERVICE_MODULES_V1.md`, `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`, `GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`, `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`, `RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

---

## 1. Objetivo

Formalizar **Greenhouse Plugins** como el plano canonico para empaquetar capacidades funcionales de Greenhouse.

Un Plugin es un paquete funcional versionado que declara:

- que surfaces entrega
- que rutas y API resources usa
- que permisos y views necesita
- que datos toca
- que eventos emite o consume
- que jobs, projections o workers activa
- de que Apps depende
- que readiness necesita para operar
- como se instala, pausa, desinstala o depreca sin romper historia

Plugins V1 no implica carga dinamica de codigo ni marketplace. Es un modelo de manifest + governance sobre codigo versionado en el repo.

---

## 2. Tesis Arquitectonica

Greenhouse ya tiene dominios, rutas, APIs, workers, outbox events, views, entitlements y service modules. Lo que falta es un lenguaje que empaquete una capacidad funcional completa sin confundirla con:

- un Core Domain
- un Domain Module
- una App externa
- una Tool puntual
- un Service Module comercial
- una View visible
- un Entitlement
- un Route Group

La tesis:

```txt
Apps conectan dependencias externas.
Domains y Domain Modules organizan capacidades nativas.
Plugins empaquetan capacidades funcionales Greenhouse.
Tools ejecutan acciones puntuales.
Workflows orquestan pasos con estado.
Service Modules describen producto/capacidad comercial.
Views y Entitlements gobiernan UI y permisos.
```

Regla central:

> Un Plugin instalado no concede permisos, no activa automaticamente vistas y no reemplaza service modules. Solo declara y gobierna el paquete funcional.

---

## 3. Definicion Canonica

Un **Greenhouse Plugin** es un paquete funcional instalable y versionable que agrupa piezas Greenhouse ya existentes o futuras:

```txt
Owner domain / extended modules
UI routes
API resources
Views
Entitlements
Domain helpers
DB tables/views
Outbox events
Webhook handlers
Workers/jobs/projections
Readiness checks
Dependencies on Apps or other Plugins
Documentation/runbooks
Release channel
```

Ejemplo:

```txt
Plugin: communications.manual-announcements
Depends on App: teams
Views: administracion.communications
Entitlements: admin.communications read/create/approve/manage
APIs: /api/admin/communications/**
Events: communications.manual_announcement.requested
Data: manual_announcement_requests, outbox_events
Readiness: teams ready, channel configured, outbox consumer ready
```

---

## 4. Separacion De Planos

| Plano | Responde | Ejemplo |
| --- | --- | --- |
| Core Domain | Que area nativa modela Greenhouse | `finance`, `payroll`, `agency` |
| Domain Module | Que subcapacidad estable vive en un dominio | `finance.bank`, `payroll.compliance` |
| App | Con que sistema externo habla Greenhouse | `teams`, `hubspot`, `nubox` |
| Plugin | Que paquete funcional Greenhouse opera | `communications.manual-announcements` |
| Tool | Que accion puntual puede ejecutar un agente/humano/job | `teams.send_message` futuro |
| Workflow | Que proceso multi-step con estado se orquesta | draft -> approve -> publish |
| Service Module | Que producto/capacidad comercial aplica a un cliente | `agencia_creativa` |
| View | Que surface visible aparece en UI | `administracion.communications` |
| Entitlement | Que accion esta autorizada | `admin.communications:create` |
| Route Group | Que zona amplia puede abrir | `admin`, `finance`, `hr` |

Reglas:

1. Plugin instalado no concede acceso.
2. Plugin instalado no agrega automaticamente sidebar/menu.
3. Plugin instalado no equivale a `service_module`.
4. Plugin puede depender de Apps, pero una App puede existir sin Plugin visible.
5. Plugin puede declarar Tools futuras, pero no es Tool Registry.
6. Plugin puede expandir un Domain Module, pero no reemplaza el Domain Module.
7. Plugin puede representar governance/readiness de una pieza core solo si el contrato de Core Platform lo permite (`core: true`, `uninstallable: false`).

---

## 5. Relacion Con Core Platform

La definicion de **Core Platform** vive en `GREENHOUSE_CORE_PLATFORM_ARCHITECTURE_V1.md`.
La definicion de **Core Domains** y **Domain Modules** vive en `GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md`.

Este documento de Plugins no decide que es core. Solo define como los Plugins se apoyan en Core y como pueden manifestar, excepcionalmente, governance/readiness de una pieza core.

Reglas:

1. Core Platform no es instalable ni desinstalable por tenant.
2. Plugins son capacidades funcionales sobre Core.
3. Domains y Domain Modules son el mapa funcional nativo donde viven o se conectan los Plugins.
4. Si un Plugin representa una surface/governance de algo core, debe declararse como no desinstalable.
5. Si hay duda entre Core, Domain Module, Plugin o App, resolver primero contra `GREENHOUSE_CORE_PLATFORM_ARCHITECTURE_V1.md`, `GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md` y `GREENHOUSE_APPS_ARCHITECTURE_V1.md`.

---

## 6. Estado Actual Del Repo

### 6.1 Foundations existentes

Greenhouse ya tiene piezas que se pueden manifestar como Plugins:

- `src/config/capability-registry.ts`
  - capability module pages client-facing
- `src/config/entitlements-catalog.ts`
  - capability/action/scope code-versioned
- `src/lib/admin/view-access-catalog.ts`
  - view registry visible
- `src/lib/entitlements/runtime.ts`
  - runtime de permisos
- `src/app/api/admin/platform-health`
  - platform health admin
- `src/app/api/platform/ecosystem/health`
  - platform health ecosystem
- `src/lib/integrations/teams/**`
  - delivery dependency para notifications/communications
- `src/lib/finance/external-cash-signals/**`
  - workflow de external cash signals
- `src/lib/nexa/**`
  - Nexa Home assistant + function calling local
- `src/lib/sync/projections/**`
  - projections reactivas por dominio
- `services/ops-worker/**`
  - jobs largos fuera de Vercel serverless

### 6.2 Lo que no existe aun

No existe:

- `Plugin Manifest` canonico
- `plugin_installations`
- `plugin_readiness`
- `plugin_lifecycle_events`
- UI `/admin/plugins`
- API `/api/admin/plugins`
- dynamic plugin runtime

V1 debe ordenar el modelo sin forzar implementacion inmediata.

---

## 7. Plugin Manifest

### 7.1 Fuente de verdad

El manifest debe ser code-versioned.

Formato recomendado V1:

```txt
TypeScript manifest + schema validation
```

Ubicacion objetivo sugerida:

```txt
src/config/plugins/<pluginKey>.manifest.ts
src/config/plugins/index.ts
```

### 7.2 Shape conceptual

```ts
type GreenhousePluginManifest = {
  pluginKey: string
  displayName: string
  description: string
  manifestVersion: string
  pluginVersion: string
  contractVersion?: string
  releaseChannel: 'alpha' | 'beta' | 'stable' | 'deprecated'
  pluginType: PluginType
  ownerDomain: string
  extendedDomains: string[]
  extendedModules: string[]
  lifecycle: PluginLifecycleContract
  scopes: PluginScope[]
  compatibility: PluginCompatibilityContract
  dependencies: PluginDependencies
  access: PluginAccessContract
  surfaces: PluginSurfaceContract
  api: PluginApiContract
  events: PluginEventContract
  data: PluginDataContract
  jobs: PluginJobContract[]
  readiness: PluginReadinessContract
  safeModes: PluginSafeMode[]
  serviceModuleSupport?: PluginServiceModuleSupport[]
  providedTools?: string[]
  documentation: PluginDocumentationRefs
}
```

### 7.3 Campos minimos V1

Cada Plugin debe declarar:

```txt
identity:
  pluginKey
  displayName
  ownerDomain
  extendedDomains
  extendedModules
  pluginType

version:
  manifestVersion
  pluginVersion
  contractVersion
  releaseChannel

compatibility:
  minCorePlatformVersion
  requiredDomainVersions
  requiredModuleVersions
  requiredMigrationIds

dependencies:
  requiredApps
  optionalApps
  requiredPlugins
  requiredMigrations

access:
  routeGroups
  views
  entitlements

surfaces:
  routes
  navigation surfaces

api:
  admin resources
  platform resources if any

events:
  emits
  consumes

data:
  tables/views touched
  ownership role

readiness:
  checks
  safe modes

operations:
  install behavior
  uninstall behavior
  docs/runbooks
```

### 7.4 Manifest no debe contener

El manifest no debe contener:

- secretos
- tokens
- data runtime mutable
- raw last errors
- tenant-specific mutable state
- permiso efectivo de usuario
- informacion sensible no redacted

---

## 8. Plugin Types

Taxonomia inicial:

```txt
surface_plugin
workflow_plugin
integration_plugin
domain_plugin
platform_plugin
agent_plugin
reporting_plugin
core_plugin
```

Definiciones:

- `surface_plugin`: entrega UI principalmente.
- `workflow_plugin`: maneja proceso con estados, approval o outbox.
- `integration_plugin`: empaqueta un flujo funcional alrededor de una o mas Apps.
- `domain_plugin`: capacidad de dominio como Finance, HR, Commercial.
- `platform_plugin`: capacidad compartida de plataforma.
- `agent_plugin`: capacidades alrededor de Nexa/agentes.
- `reporting_plugin`: reportes/read models especializados.
- `core_plugin`: base no opcional del portal.

Ejemplos:

| Plugin | Tipo | Nota |
| --- | --- | --- |
| `platform.health` | `platform_plugin` | compone health/readiness |
| `communications.manual-announcements` | `workflow_plugin` | usa Teams App |
| `finance.external-cash-signals` | `workflow_plugin` | adopcion/descarte de señales |
| `finance.bank-read-model` | `domain_plugin` | snapshots banco |
| `payroll.previred` | `domain_plugin` | Previred runtime/backfill |
| `capabilities.creative-hub` | `surface_plugin` | client-facing capability page |
| `commercial.public-tenders` | `integration_plugin` | Mercado Publico |
| `home.nexa` | `agent_plugin` | Home assistant |

---

## 9. Scopes

Un Plugin puede instalarse en:

```txt
global
organization
client
space
member
environment
```

Reglas:

- `global`: plugin de plataforma o dominio interno completo.
- `organization`: plugin asociado a organization canonical.
- `client`: plugin visible o relevante para cliente.
- `space`: plugin de delivery/operacion por workspace.
- `member`: plugin de experiencia personal.
- `environment`: plugin habilitado solo en development/preview/staging/production.

Evitar `tenant` como persistencia si el scope real puede ser mas preciso.

---

## 10. Lifecycle

Separar lifecycle, readiness y release.

### 10.1 Lifecycle Status

```txt
available
installed
active
paused
deprecated
uninstalled
archived
```

### 10.2 Readiness Status

```txt
ready
warning
blocked
unknown
not_applicable
```

### 10.3 Core Flag

Plugins pueden declarar:

```txt
core: true
uninstallable: false
```

Ejemplos candidatos:

- identity/access
- API Platform
- Home foundation

### 10.4 Install Semantics

Instalar Plugin significa:

1. crear installation en scope
2. validar version
3. validar dependencies
4. validar migrations requeridas
5. validar Apps requeridas si aplica
6. validar views/entitlements declarados
7. habilitar surfaces/jobs solo si el lifecycle lo permite
8. registrar audit/lifecycle event

Instalar Plugin no significa:

- conceder acceso usuario
- crear service module
- ejecutar backfill automaticamente
- activar App externa automaticamente salvo policy explicita

### 10.5 Uninstall Semantics

Desinstalar Plugin significa:

1. bloquear nuevas acciones
2. ocultar o desactivar surfaces nuevas segun access governance
3. detener jobs/projections managed si aplica
4. conservar historia, audit y datos canonicos
5. dejar read-only history cuando aplique
6. emitir lifecycle event

Desinstalar nunca debe:

- borrar datos canonicos destructivamente
- borrar outbox history
- eliminar evidencia de auditoria
- romper reportes historicos

---

## 11. Dependencies

Un Plugin puede depender de:

```txt
Apps
Plugins
Views
Entitlements
Route groups
Migrations
Env vars
Workers
Event handlers
Feature flags
Release channel
Data snapshots
```

Regla:

> Un Plugin debe declarar al menos un `extendedModule` salvo que sea puramente platform-level o core governance no desinstalable.

### 11.1 Apps

```txt
requiredApps
optionalApps
```

Ejemplos:

- `communications.manual-announcements` requiere `teams`.
- `commercial.public-tenders` requiere `mercado_publico`.
- `capabilities.crm-command-center` puede requerir `hubspot`.

### 11.2 Plugins

```txt
requiredPlugins
optionalPlugins
conflictsWith
```

Ejemplos:

- `communications.manual-announcements` puede requerir futuro `notifications.hub`.
- `finance.external-cash-signals` puede depender de `finance.bank-read-model`.

### 11.3 Dependency Readiness

Readiness debe componer:

```txt
code_ready
migrations_ready
apps_ready
plugins_ready
permissions_ready
views_ready
jobs_ready
data_ready
queue_backlog_healthy
```

Si falta una dependency requerida, el plugin no puede reportar `ready`.

### 11.4 Dependency Graph Validation

Validaciones minimas:

- `extendedDomains` existen en el Domain Registry.
- `extendedModules` existen en el Domain Registry.
- `requiredApps` existen en App Catalog o se declaran como external pending.
- `requiredPlugins` no forman ciclos.
- `conflictsWith` bloquea install/active en el mismo scope.
- migrations requeridas estan aplicadas antes de `active`.
- release channel del Plugin es compatible con environment/scope.

---

## 12. Access Model

Todo Plugin que exponga UI o acciones debe declarar ambos planos cuando apliquen:

```txt
views / authorizedViews / view_code
entitlements / capability + action + scope
```

### 12.1 Views

Views gobiernan surfaces visibles:

```txt
viewCode
routePath
routeGroup
section
```

### 12.2 Entitlements

Entitlements gobiernan acciones:

```txt
capability
actions
scope
```

### 12.3 Route Groups

Route groups siguen siendo broad access/navigation lanes. No reemplazan entitlements para acciones finas.

### 12.4 Regla Dura

> Si una propuesta de Plugin solo declara routeGroups y no declara views/entitlements cuando corresponde, el diseño esta incompleto.

---

## 13. API Platform Alignment

Plugins pueden exponer recursos en tres lanes:

```txt
/api/admin/plugins
  governance interna y ops

/api/platform/ecosystem/plugins
  read-only/binding-aware para consumers externos si aplica

/api/platform/app/plugins
  contexto compacto first-party app/mobile si aplica
```

### 13.1 Admin API Objetivo

```txt
GET    /api/admin/plugins
GET    /api/admin/plugins/:pluginKey
GET    /api/admin/plugins/:pluginKey/manifest
GET    /api/admin/plugins/:pluginKey/readiness
POST   /api/admin/plugins/:pluginKey/install
GET    /api/admin/plugin-installations
GET    /api/admin/plugin-installations/:installationId
POST   /api/admin/plugin-installations/:installationId/pause
POST   /api/admin/plugin-installations/:installationId/resume
POST   /api/admin/plugin-installations/:installationId/uninstall
```

V1 recomendada: read-only governance primero.

### 13.2 Response Shape

Usar shape API Platform:

```json
{
  "data": {},
  "meta": {
    "freshness": {},
    "warnings": []
  }
}
```

---

## 14. Data Contract

Cada Plugin debe declarar datos tocados:

```txt
schema
tableOrView
operation
ownershipRole
retentionNotes
historyBehavior
```

Operations:

```txt
read
write
upsert
append
project
deliver
materialize
```

Ownership roles:

```txt
owns_domain_state
writes_domain_state
reads_domain_state
materializes_read_model
emits_events
delivers_external_effect
```

Regla:

> Un Plugin no debe crear identidades paralelas para objetos canonicos existentes. Debe extender o componer el grafo canonico segun `GREENHOUSE_360_OBJECT_MODEL_V1.md`.

---

## 15. Events, Jobs Y Projections

El manifest debe declarar:

### 15.1 Emits

```txt
event_type
aggregate_type
payload_contract
idempotency_key
```

### 15.2 Consumes

```txt
event_type
handler
side_effect
retry_policy
dead_letter_behavior
```

### 15.3 Jobs

```txt
job_key
runtime: vercel_cron | cloud_run | manual_script | local_only
schedule
environment
safe_mode
```

### 15.4 Projections

```txt
projection_name
source_events
target_tables
required_privileges
freshness_policy
```

---

## 16. Readiness Standard

Common checks:

```txt
manifest_valid
code_present
migrations_ready
required_apps_ready
required_plugins_ready
views_registered
entitlements_registered
api_routes_present
jobs_registered
event_handlers_registered
secrets_ready
data_freshness
queue_depth
last_success
last_failure
safe_mode
```

Cada check debe exponer:

```txt
key
status
severity
summary
evidenceRef optional
lastCheckedAt
remediationHint
redactedError
```

---

## 17. Safe Modes

Safe mode behavior inicial:

```txt
hide_surface
read_only
disable_commands
queue_until_recovered
allow_manual_fallback
require_approval
block_publish
pause_jobs
```

Ejemplos:

- `communications.manual-announcements` sin Teams ready:
  - `disable_commands` o `queue_until_recovered`
- `finance.external-cash-signals` sin bank read model:
  - `read_only`
- `commercial.public-tenders` sin Mercado Publico ticket:
  - `disable_commands`
- `platform.health` con source degradada:
  - `read_only` con degraded source

---

## 18. Relation With Apps

Plugins pueden depender de Apps, pero Apps no dependen de Plugins para existir.

```txt
Teams App installed globally
  Plugin notifications.teams-delivery active
  Plugin communications.manual-announcements not necessarily active
```

Si una App requerida falta o esta blocked:

```txt
plugin readiness = blocked
surfaces may show setup required
commands must be disabled or queued according to safe mode
```

---

## 19. Relation With Service Modules

Service Modules pueden sugerir o habilitar Plugins, pero no son Plugins.

Ejemplos:

```txt
agencia_creativa -> suggests capabilities.creative-hub
licenciamiento_hubspot -> suggests capabilities.crm-command-center
desarrollo_web -> suggests capabilities.web-delivery-lab
```

Policy posible:

```txt
none
suggest
install_on_service_module_activation
require_manual_approval
```

Decision V1 recomendada:

```txt
service_modules suggest plugins; no auto-install por defecto
```

---

## 20. Relation With Tools And Workflows

Plugins pueden declarar tools futuras:

```txt
providedTools
requiredTools
```

Pero Plugins V1 no crea Tool Registry.

Ejemplos:

- `commercial.public-tenders` puede proveer futuro `mercado_publico.fetch_tender`.
- `communications.manual-announcements` puede proveer futuro `teams.send_announcement`.
- `home.nexa` consume function calls locales actuales.

Workflow:

```txt
Plugin may own workflow state
Tool may execute one step
App may provide external dependency
```

---

## 21. Persistence Objetivo

V1 no requiere migraciones inmediatas, pero el modelo objetivo puede incluir:

### 21.1 `greenhouse_core.plugin_installations`

```txt
installation_id
plugin_key
scope_type
scope_id
environment
lifecycle_status
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

### 21.2 `greenhouse_core.plugin_lifecycle_events`

```txt
event_id
plugin_key
installation_id
event_type
actor_user_id
payload_json
created_at
```

### 21.3 `greenhouse_core.plugin_readiness_snapshots`

```txt
snapshot_id
plugin_key
installation_id
readiness_status
checks_json
computed_at
source
```

No duplicar tablas de dominio ya existentes si el plugin tiene estado propio sano.

---

## 22. Admin UX Objetivo

Surface futura:

```txt
/admin/plugins
/admin/plugins/:pluginKey
```

Debe mostrar:

- que hace el Plugin
- version instalada
- lifecycle
- readiness
- dependencies
- Apps requeridas
- views declaradas
- entitlements declarados
- routes/API resources
- events/jobs/projections
- datos tocados
- runbooks
- release channel
- install/uninstall limitations

V1 UI debe ser read-only hasta que install/uninstall este probado.

---

## 23. Primeros Plugins Candidatos

Validar el modelo con ejemplos reales:

| Plugin | Tipo | Required Apps | Scope sugerido | Estado actual |
| --- | --- | --- | --- | --- |
| `platform.health` | platform | varias como dependencies indirectas | global | runtime existe |
| `notifications.teams-delivery` | integration/workflow | `teams` | global | runtime parcial existe |
| `communications.manual-announcements` | workflow | `teams` | global/admin | task creada |
| `finance.external-cash-signals` | workflow | `nubox` optional/future sources | global/finance/space | runtime existe |
| `finance.bank-read-model` | domain | none | global/finance | runtime existe |
| `payroll.previred` | domain | future `previred` App | global/payroll | tasks 707x |
| `commercial.public-tenders` | integration | `mercado_publico` | global/commercial | helper existe |
| `capabilities.creative-hub` | surface | `notion`, optional `frame_io` | client/space | registry existe |
| `capabilities.crm-command-center` | surface | `hubspot`, `notion` | client/space | registry existe |
| `home.nexa` | agent | none required | global/member | runtime existe |

---

## 24. Non-Goals V1

Plugins V1 no busca:

- dynamic code loading
- marketplace publico
- instalar paquetes externos arbitrarios
- reemplazar Apps
- reemplazar service modules
- reemplazar entitlements
- reemplazar views
- crear Tool Registry
- migrar todos los modulos actuales de golpe
- mover carpetas masivamente

---

## 25. Implementation Strategy

### Phase 0 — Inventory

- identificar candidatos reales
- mapear views, entitlements, routes, APIs, events, data, jobs
- clasificar core/native/tenant/experimental

### Phase 1 — Manifests Read-Only

- crear `src/config/plugins`
- manifests iniciales:
  - `platform.health`
  - `communications.manual-announcements`
  - `finance.external-cash-signals`
  - `capabilities.creative-hub`
  - `commercial.public-tenders`
- no tocar runtime

### Phase 2 — Admin Read API

- `/api/admin/plugins` read-only
- readiness derivada de manifests + existing runtime

### Phase 3 — Installations

- introducir `plugin_installations` solo cuando haya necesidad real de scope/lifecycle
- backfill core/native plugins

### Phase 4 — Lifecycle

- pause/resume/install/uninstall controlados
- dependency checks
- safe modes

### Phase 5 — Tools/Workflows

- conectar Plugin manifests con futuras tools y workflows cuando existan contratos estables

---

## 26. Acceptance Criteria Para Nuevos Plugins

Un Plugin nuevo no debe declararse productivo sin:

- manifest code-versioned
- owner domain
- plugin type
- supported scopes
- dependencies declaradas
- views declaradas si hay UI
- entitlements declarados si hay acciones
- API resources declarados
- events/jobs/projections declarados si aplican
- data touched
- readiness checks
- safe modes
- lifecycle/uninstall behavior
- release channel
- docs/runbook minimo
- relacion con Apps si aplica
- relacion con service modules si aplica

---

## 27. Open Questions

1. Si `plugin_installations` debe vivir en `greenhouse_core` o `greenhouse_app`.
2. Si `capability-registry.ts` debe converger a Plugin manifests para capability pages.
3. Que plugins son `core` y por tanto `uninstallable=false`.
4. Si `/admin/plugins` debe reemplazar o complementar vistas actuales de Admin Center.
5. Cuando conviene conectar Plugins con release channels client-facing.
6. Como mapear Plugin readiness hacia Platform Health sin duplicar checks.
7. Si Tools futuras deben vivir bajo Plugin manifests o en un registry separado.

---

## 28. Decision Inicial Recomendada

Adoptar para V1:

```txt
Nombre canonico: Greenhouse Plugins
Manifest: TypeScript code-versioned
Runtime V1: codigo/rutas actuales + manifests read-only
No dynamic loading
No install/uninstall interactivo al inicio
Plugin instalado no concede permisos
Service modules sugieren plugins, no los reemplazan
Readiness compone apps + migrations + access + jobs + data
```

Esta decision crea un plano de empaquetado funcional sin romper la arquitectura existente ni mezclar dependencias externas, producto, UI y permisos.
