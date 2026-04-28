# Greenhouse Core Platform Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-28
> **Ultima actualizacion:** 2026-04-28
> **Scope:** Definicion del Core Platform de Greenhouse y su relacion con Apps y Plugins
> **Docs relacionados:** `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md`, `GREENHOUSE_IDENTITY_ACCESS_V2.md`, `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`, `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`, `GREENHOUSE_APPS_ARCHITECTURE_V1.md`, `GREENHOUSE_PLUGINS_ARCHITECTURE_V1.md`

---

## 1. Objetivo

Definir **Greenhouse Core Platform** como el plano base que sostiene el portal, sus dominios, Apps, Plugins, APIs, eventos, acceso y grafo canonico.

Core Platform no es una App ni un Plugin instalable. Es la base no opcional del runtime.

---

## 2. Tesis Arquitectonica

Greenhouse debe separar tres planos:

```txt
Core Platform
  sostiene runtime, acceso, API, eventos, tenancy y grafo canonico

Core Domains / Domain Modules
  organizan las capacidades funcionales nativas de Greenhouse

Connected Apps
  conectan sistemas externos o providers

Native Plugins
  entregan capacidades funcionales sobre Core y pueden depender de Apps
```

Regla central:

> Si apagar una pieza rompe autenticacion, autorizacion, tenant context, API base, events base, secret resolution, audit base o el grafo canonico, esa pieza pertenece al Core Platform.

---

## 3. Definicion

Core Platform es el conjunto de capacidades base sin las cuales Greenhouse no puede operar como plataforma:

- identidad y sesion
- tenant context
- access governance
- route groups
- views registry
- entitlements runtime
- startup policy
- API Platform runtime
- canonical object graph
- event spine / outbox
- webhook transport base
- secret resolution
- audit/logging foundation
- platform health foundation
- notification foundation base
- home shell base

Core no se instala por tenant y no se desinstala.

Si una pieza core necesita manifest para governance o readiness, debe declararse con:

```txt
core: true
uninstallable: false
```

---

## 4. Regla De Clasificacion

Usar estas preguntas antes de modelar una pieza nueva:

```txt
1. Si se apaga, Greenhouse deja de autenticar, autorizar, resolver tenant,
   emitir eventos base, servir API base, resolver secretos, auditar o sostener
   el grafo canonico?
   -> Core Platform

2. Si es un area nativa de negocio/operacion o una subcapacidad funcional
   estable de Greenhouse?
   -> Core Domain / Domain Module

3. Si es una expansion funcional Greenhouse con UI/API/data/events/jobs propios?
   -> Native Plugin

4. Si es un sistema externo, proveedor, canal, source, API, SaaS o dependencia
   infra gobernable?
   -> Connected App
```

La definicion detallada de Core Domains y Domain Modules vive en `GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md`.

---

## 5. Componentes Core

### 5.1 Identity And Session

Incluye:

- NextAuth providers
- session payload
- agent auth foundation
- first-party app sessions foundation cuando actua como auth base

Referencias:

- `GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `src/lib/auth.ts`
- `src/app/api/auth/**`

### 5.2 Tenant Context And Scope

Incluye:

- `getTenantContext`
- route group resolution
- organization/client/space/member scope
- operating entity identity

Referencias:

- `src/lib/tenant/**`
- `GREENHOUSE_IDENTITY_ACCESS_V2.md`

### 5.3 Access Governance

Incluye:

- route groups
- role codes
- views registry
- authorized views
- entitlements catalog/runtime
- permission sets
- startup policy

Referencias:

- `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/admin/view-access-catalog.ts`

### 5.4 API Platform Runtime

Incluye:

- `api/platform/*` base
- auth wrappers
- request logging
- pagination/freshness helpers
- response envelopes
- versioning

Referencias:

- `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `src/lib/api-platform/**`
- `src/app/api/platform/**`

### 5.5 Canonical Object Graph

Incluye:

- Organization
- Space
- Person / Identity Profile
- Member
- Client
- Provider
- Service Module
- canonical extension rules

Referencias:

- `GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `GREENHOUSE_DATA_MODEL_MASTER_V1.md`

### 5.6 Event Spine And Outbox

Incluye:

- `greenhouse_sync.outbox_events`
- publish event helpers
- outbox consumers
- reactive projection base
- event catalog

Referencias:

- `src/lib/sync/publish-event.ts`
- `src/lib/sync/outbox-consumer.ts`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/event-catalog.ts`

### 5.7 Webhook Transport Base

Incluye:

- shared webhook transport
- webhook delivery
- retry / attempts
- event control plane base

Referencias:

- `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `src/lib/webhooks/**`

### 5.8 Secret Resolution And Runtime Configuration

Incluye:

- Secret Manager resolution helpers
- env resolution policies
- secret hygiene contracts

Referencias:

- `src/lib/secrets/**`
- `AGENTS.md` Secret Manager and payload hygiene

### 5.9 Audit And Observability Foundation

Incluye:

- audit events
- request logs
- sanitized error handling
- platform health source composition
- recommended checks/runbook references

Referencias:

- `src/lib/platform-health/**`
- `src/lib/observability/**`

### 5.10 Notification Foundation Base

Incluye:

- notification schemas/base service
- outbox notification projection foundation
- user notification preferences base

No incluye canales especificos como Teams delivery, que deben modelarse como Apps/Plugins segun corresponda.

Referencias:

- `src/lib/notifications/**`
- `src/app/api/notifications/**`

### 5.11 Home Shell Base

Incluye:

- Home shell
- startup home policy
- access-aware Home composition base

Experiencias especificas como `home.nexa` pueden modelarse como Plugin sobre este core.

---

## 6. No Son Core Por Defecto

Estas piezas pueden ser importantes, pero no son Core por defecto:

```txt
HubSpot
Notion
Nubox
Teams
Mercado Publico
ZapSign
Creative Hub
Manual Announcements
External Cash Signals
Quote Builder
Previred runtime
Nexa assistant experience
```

Clasificacion esperada:

- sistemas externos -> Connected Apps
- capacidades funcionales -> Native Plugins
- experiencia AI/Nexa -> Plugin si puede aislarse sobre Home/Core

---

## 7. Relacion Con Apps

Apps dependen del Core para:

- auth/config runtime
- secret resolution
- API Platform exposure
- event publishing
- health/readiness reporting
- canonical object mapping

Core no depende de una App especifica para existir.

Ejemplos:

- Teams App usa secret resolution, outbox y notification foundation.
- HubSpot App usa API Platform, canonical Organization graph y outbox.
- Nubox App usa finance domain/core helpers y outbox.

---

## 8. Relacion Con Plugins

Plugins dependen del Core para:

- access
- views
- entitlements
- API routes
- events
- canonical data
- audit/readiness

Core no debe depender de un Plugin opcional.

Un Plugin puede ser no desinstalable solo cuando realmente representa governance/readiness de una pieza core. En ese caso debe declararse:

```txt
core: true
uninstallable: false
```

Ejemplos ambiguos:

- `api-platform-runtime` es Core.
- `api-platform.governance` podria ser un manifest core no desinstalable.
- `platform-health-base` es Core.
- `platform.health` puede ser Plugin no desinstalable si empaqueta surface/API/readiness.
- `home-shell` es Core.
- `home.nexa` es Plugin.

---

## 9. Ejemplos De Clasificacion

| Pieza | Core Platform | Native Plugin | Connected App |
| --- | --- | --- | --- |
| Nubox | outbox/API/auth base | `finance.external-cash-signals` o futuro tax documents | `nubox` |
| Teams | notification/outbox/access base | `notifications.teams-delivery`, `communications.manual-announcements` | `teams` |
| Mercado Publico | API/auth/outbox base | `commercial.public-tenders` | `mercado_publico` |
| Previred | payroll/finance anchors base | `payroll.previred` | `previred` si existe source externo formal |
| Creative Hub | tenant/access/capability routing base | `capabilities.creative-hub` | `notion`, `frame_io` |
| HubSpot | Organization 360 canonical base | `commercial.quote-builder`, `capabilities.crm-command-center` | `hubspot` |
| Home Nexa | Home shell/session base | `home.nexa` | `google_vertex_ai` |
| API Platform | API runtime base | optional non-uninstallable governance manifest | external consumers are not Apps by default |
| Platform Health | health helpers/base composer | `platform.health` | Apps appear as dependencies checked by health |

---

## 10. Core Change Rules

Changes to Core Platform have higher blast radius.

If a change touches Core, the task must:

- read this document
- read the specialized architecture doc for the affected subsystem
- document whether Apps or Plugins are affected
- update `Handoff.md` if assumptions, access, global layout, auth, API base, events or deployment behavior changed
- validate with at least lint/build/test or a precise manual verification note

Core changes include, but are not limited to:

- auth/session changes
- tenant context changes
- route group or authorized view behavior
- entitlements runtime/catalog changes
- API Platform wrappers
- outbox/event spine changes
- webhook base changes
- canonical object identity changes
- secret resolution changes
- platform health base changes

---

## 11. Non-Goals

Core Platform Architecture V1 does not:

- replace specialized architecture docs
- define every domain module; that taxonomy lives in `GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md`
- turn every shared helper into a Plugin
- make Core installable
- introduce dynamic plugin loading
- replace Apps or Plugins manifests

---

## 12. Decision Inicial Recomendada

Adoptar:

```txt
Core Platform = runtime base no instalable
Core Domains / Domain Modules = capacidades nativas de negocio y operacion
Connected Apps = dependencias externas gobernables
Native Plugins = paquetes funcionales sobre Core
```

Core debe ser pequeño, estable y protegido. Si una pieza puede ser opcional, scoped, paused, installed/uninstalled or versioned per tenant/cohort, probablemente no es Core: es Plugin o App.
