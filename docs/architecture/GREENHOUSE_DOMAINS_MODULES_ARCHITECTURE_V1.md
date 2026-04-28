# Greenhouse Domains And Modules Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-28
> **Ultima actualizacion:** 2026-04-28
> **Scope:** Definicion de Core Domains y Domain Modules, y su relacion con Core Platform, Apps, Plugins y Service Modules
> **Docs relacionados:** `GREENHOUSE_CORE_PLATFORM_ARCHITECTURE_V1.md`, `GREENHOUSE_APPS_ARCHITECTURE_V1.md`, `GREENHOUSE_PLUGINS_ARCHITECTURE_V1.md`, `GREENHOUSE_SERVICE_MODULES_V1.md`, `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

---

## 1. Objetivo

Definir una capa canonica para **Greenhouse Domains** y **Domain Modules**.

Esta capa existe para resolver una ambiguedad:

```txt
Payroll, Finance, Cost y Agency no son solo Plugins.
Son dominios nativos de Greenhouse.

Pero esos dominios pueden tener modulos internos,
pueden ser expandidos por Plugins,
y pueden ser enriquecidos por Apps externas.
```

Este documento separa esos conceptos para que Apps, Plugins, Service Modules, Views y Entitlements no compitan por el mismo significado.

---

## 2. Tesis Arquitectonica

Greenhouse debe entender su arquitectura en capas:

```txt
Core Platform
  runtime base: auth, tenant, access, API, events, secrets, audit

Core Domains
  areas nativas de negocio y operacion Greenhouse

Domain Modules
  subcapacidades funcionales estables dentro de un dominio

Native Plugins
  expansiones instalables, versionables y gobernables sobre dominios/modulos

Connected Apps
  sistemas externos, canales, providers, APIs o fuentes que enriquecen dominios/modulos/plugins

Service Modules
  producto/capacidad comercial asignable a clientes
```

Regla central:

> Un Domain Module describe como Greenhouse organiza una capacidad funcional nativa. Un Plugin describe una expansion gobernable de esa capacidad. Una App describe una dependencia externa que la alimenta, sincroniza, enriquece o ejecuta.

---

## 3. Definiciones Canonicas

### 3.1 Core Domain

Un **Core Domain** es un area nativa de negocio, operacion o conocimiento que Greenhouse modela como parte estable de su producto.

Ejemplos:

- `payroll`
- `finance`
- `cost`
- `agency`
- `workforce`
- `hr`
- `commercial`
- `identity`
- `communications`
- `platform`

Un dominio puede no estar visible para todos los tenants o usuarios, pero sigue siendo parte nativa del modelo Greenhouse.

### 3.2 Domain Module

Un **Domain Module** es una subcapacidad funcional estable dentro de un Core Domain.

Ejemplos:

```txt
Domain: payroll
Modules:
  payroll.calendar
  payroll.runs
  payroll.employees
  payroll.compliance
  payroll.reporting

Domain: finance
Modules:
  finance.invoices
  finance.accounts-receivable
  finance.accounts-payable
  finance.bank
  finance.reimbursements
  finance.cash-signals

Domain: cost
Modules:
  cost.attribution
  cost.economics
  cost.profitability
  cost.materialization

Domain: agency
Modules:
  agency.operations
  agency.clients
  agency.delivery
  agency.capacity
  agency.public-discovery
```

Un Domain Module no es automaticamente:

- un Plugin
- una App
- un Service Module
- una View
- un Entitlement
- una ruta

Puede proyectarse en cualquiera de esas capas, pero no se reduce a ellas.

### 3.3 Native Plugin

Un **Native Plugin** es una expansion funcional instalable, versionable o gobernable sobre un Domain, Domain Module o conjunto de modulos.

Ejemplos:

- `payroll.previred-backfill`
- `payroll.previred-rematerialization`
- `finance.external-cash-signals`
- `finance.invoice-reconciliation`
- `cost.commercial-attribution-materializer`
- `agency.agent-scraper`
- `communications.manual-announcements`

### 3.4 Connected App

Una **Connected App** es una dependencia externa gobernada que puede enriquecer, sincronizar, notificar o ejecutar acciones para un dominio, modulo o plugin.

Ejemplos:

- `previred` enriquece `payroll.compliance`
- `nubox` enriquece `finance.invoices`, `finance.bank` y `finance.cash-signals`
- `teams` enriquece `communications.notifications`
- `hubspot` enriquece `commercial.crm` y `agency.clients`
- `mercado_publico` enriquece `agency.public-discovery` o `commercial.public-tenders`
- `zapsign` enriquece approvals/documentos segun el dominio consumidor

### 3.5 Service Module

Un **Service Module** describe producto/capacidad comercial asignable a un cliente.

La fuente canonica sigue siendo `GREENHOUSE_SERVICE_MODULES_V1.md`.

Un Service Module puede habilitar o explicar por que un cliente deberia ver ciertas capacidades, pero no es lo mismo que un Domain Module.

Ejemplo:

```txt
Service Module: agencia_creativa
  puede habilitar surfaces de Agency/Delivery/Creative

Domain Module: agency.delivery
  organiza la capacidad funcional nativa

Plugin: capabilities.creative-hub
  expande la experiencia funcional

Apps: notion, frame_io
  enriquecen ejecucion y assets externos
```

---

## 4. Modelo Mental

```txt
Core Platform
  -> Core Domain
      -> Domain Module
          -> Feature / Workflow / Surface
          -> Plugin expansion
          -> App enrichment
```

Ejemplo Payroll:

```txt
Core Domain: payroll

Domain Module: payroll.compliance
  Plugin: payroll.previred-backfill
  Plugin: payroll.previred-rematerialization
  App: previred
  Workflow: detect -> review -> materialize
  Views: payroll compliance/admin surfaces
  Entitlements: payroll.compliance:read/review/materialize
```

Ejemplo Finance:

```txt
Core Domain: finance

Domain Module: finance.cash-signals
  Plugin: finance.external-cash-signals
  App: nubox
  Workflow: detect -> classify -> adopt/dismiss -> reconcile
  Views: finance.external-signals
  Entitlements: finance.cash.adopt-external-signal / dismiss-external-signal
```

Ejemplo Agency:

```txt
Core Domain: agency

Domain Module: agency.public-discovery
  Plugin: agency.agent-scraper
  App: mercado_publico
  Tool: public_tender.scrape_detail
  Workflow: discover -> enrich -> review -> convert
```

---

## 5. Regla De Clasificacion

Antes de crear una pieza nueva, clasificarla asi:

```txt
1. Si sostiene auth, tenant, access, API base, event spine, secrets,
   audit u object graph transversal:
   -> Core Platform

2. Si representa un area nativa de negocio/operacion Greenhouse:
   -> Core Domain

3. Si representa una subcapacidad funcional estable dentro de un dominio:
   -> Domain Module

4. Si representa una expansion opcional/versionable/gobernable de un dominio
   o modulo:
   -> Native Plugin

5. Si representa un sistema externo, canal, provider, API, source o destino:
   -> Connected App

6. Si representa producto/capacidad comercial asignada a clientes:
   -> Service Module

7. Si representa superficie visible:
   -> View

8. Si representa accion autorizable:
   -> Entitlement

9. Si representa accion puntual invocable:
   -> Tool

10. Si representa proceso multi-step con estado:
    -> Workflow
```

---

## 6. Tabla De Separacion

| Concepto | Pregunta que responde | Ejemplo |
| --- | --- | --- |
| Core Platform | Que sostiene la plataforma | auth, tenant, API Platform, outbox |
| Core Domain | Que area nativa modela Greenhouse | payroll, finance, cost, agency |
| Domain Module | Que subcapacidad estable existe en un dominio | finance.bank, payroll.calendar |
| Native Plugin | Que expansion funcional se instala/gobierna | payroll.previred-backfill |
| Connected App | Con que sistema externo se conecta | previred, nubox, teams |
| Service Module | Que producto/capacidad comercial tiene un cliente | agencia_creativa |
| View | Que surface visible aparece | finance.external-signals |
| Entitlement | Que accion esta permitida | finance.cash:adopt-external-signal |
| Tool | Que accion puntual ejecuta un agente/humano/job | teams.send_message |
| Workflow | Que proceso con estado se orquesta | draft -> approve -> publish |

---

## 7. Relacion Con Apps

Una App puede enriquecer:

- un Core Domain completo
- un Domain Module especifico
- un Plugin
- un Workflow
- un Tool

Pero una App instalada no crea automaticamente:

- Domain Module
- Plugin
- View
- Entitlement
- Service Module

Ejemplos:

```txt
App: nubox
  Enriches:
    finance.invoices
    finance.bank
    finance.cash-signals

App: previred
  Enriches:
    payroll.compliance
    payroll.runs

App: teams
  Enriches:
    communications.notifications
    communications.manual-announcements plugin
```

El App Manifest deberia poder declarar `consumerDomains` y, opcionalmente, `consumerModules`.

---

## 8. Relacion Con Plugins

Un Plugin puede expandir:

- un Domain Module
- varios modulos del mismo dominio
- varios dominios si su naturaleza es cross-domain

Ejemplos:

```txt
Plugin: finance.external-cash-signals
Extends:
  finance.cash-signals
  finance.bank

Plugin: payroll.previred-backfill
Extends:
  payroll.compliance
  payroll.runs

Plugin: communications.manual-announcements
Extends:
  communications.notifications
  platform.notification-foundation
```

Un Plugin no debe ser usado para nombrar cada modulo nativo. Si el modulo existe como parte estable del dominio, debe documentarse como Domain Module y no como Plugin.

El Plugin Manifest deberia declarar:

```txt
ownerDomain
extendedDomains
extendedModules
providedSurfaces
requiredApps
requiredEntitlements
requiredViews
```

---

## 9. Relacion Con Service Modules

Service Modules son producto/capacidad comercial.

Domain Modules son arquitectura funcional interna.

La relacion recomendada es:

```txt
Service Module asignado a cliente
  puede habilitar/justificar
    Views
    Plugins
    Domain Modules visibles
```

Pero:

```txt
Service Module != Domain Module
Service Module != Plugin
Service Module != App
```

Ejemplo:

```txt
Client Service Module: agencia_creativa
  habilita producto creativo para el cliente

Domain: agency
Module: agency.delivery
Plugin: capabilities.creative-hub
Apps: notion, frame_io
Views: delivery/creative surfaces
Entitlements: agency.delivery:read/manage
```

---

## 10. Relacion Con Views Y Entitlements

Domains y Domain Modules no conceden acceso por si solos.

Si un modulo tiene UI:

- debe tener `view_code`
- debe vivir en `authorizedViews` cuando aplique
- debe respetar `routeGroups`

Si un modulo tiene acciones:

- debe declarar capabilities/entitlements
- debe modelar `module + capability + action + scope`

Regla:

> Domain Module describe la capacidad. View muestra la surface. Entitlement autoriza la accion.

---

## 11. Relacion Con Workflows Y Tools

Un Domain Module puede contener workflows y tools.

Un Plugin tambien puede proveer workflows y tools.

La diferencia:

```txt
Tool
  accion puntual invocable

Workflow
  proceso con pasos, estado, retry, approval o audit

Domain Module
  capacidad funcional estable donde viven tools/workflows

Plugin
  paquete que puede agregar tools/workflows a un modulo
```

Ejemplo:

```txt
Domain Module: agency.public-discovery
Plugin: agency.agent-scraper
Tool: public_tender.scrape_detail
Workflow: discover -> enrich -> review -> convert
App: mercado_publico
```

---

## 12. Decisiones De Diseño Cerradas

Estas decisiones resuelven los puntos abiertos del modelo antes de cualquier implementacion runtime.

### 12.1 Registry Primero, Runtime Despues

Greenhouse debe introducir primero un **Domain Registry** code-versioned y read-only.

Decision V1:

```txt
src/config/domains/<domainKey>.manifest.ts
src/config/domains/index.ts
```

No debe crearse UI editable ni instalacion runtime de Domain Modules hasta que el registry documental este estable.

### 12.2 Dependency Graph Obligatorio

Toda App o Plugin manifestado debe declarar explicitamente que dominios/modulos consume, extiende o enriquece.

El dependency graph debe validar:

- keys inexistentes
- ciclos entre Plugins
- dependencia de App requerida no instalada
- dependencia de Plugin requerido no activo
- Domain Module inexistente
- migrations requeridas no aplicadas
- release channel incompatible con ambiente

Decision V1:

```txt
El graph se valida build-time o admin-readiness.
No se resuelve dinamicamente en request path critico.
```

### 12.3 Lifecycle Comun

Greenhouse usara un vocabulario comun para domains/modules/apps/plugins.

Estados base:

```txt
planned
available
active
paused
deprecated
archived
retired
```

Semantica:

- `planned`: existe decision/documento, no runtime completo.
- `available`: existe manifest y puede activarse/consumirse.
- `active`: esta operativo para su scope.
- `paused`: no ejecuta nuevas acciones o jobs, conserva lectura/history.
- `deprecated`: no se usa para nuevos scopes, mantiene compatibilidad.
- `archived`: fuera de operacion normal, conserva historia.
- `retired`: reemplazado formalmente por otro contrato, no debe crecer.

Apps y Plugins pueden agregar subestados operativos (`legacy_active`, `managed_active`, `uninstalled`) siempre que mapeen a este vocabulario base.

### 12.4 Version Compatibility

Todo manifest debe distinguir:

```txt
manifestVersion
implementationVersion
contractVersion
requiredCoreVersion
requiredDomainVersions
requiredModuleVersions
requiredMigrationIds
releaseChannel
```

Decision V1:

```txt
No basta con versionar el paquete.
Tambien debe declararse contra que Core, Domains, Modules, APIs, eventos y migraciones es compatible.
```

### 12.5 Data Ownership

La propiedad canonica de datos se decide en este orden:

```txt
Core Platform
  owns cross-cutting identity, access, event spine, audit, tenancy

Core Domain
  owns canonical business state for that domain

Domain Module
  owns subdomain state only when the specialized architecture says so

Plugin
  may enrich, materialize, orchestrate or write through domain-approved APIs

App
  brings external signal/source/delivery/command capability
```

Regla:

> Una App no se vuelve owner canonico solo porque trae datos. Un Plugin no se vuelve owner canonico solo porque materializa una proyeccion.

### 12.6 Install No Concede Access

Esta regla aplica transversalmente:

```txt
App installed != access granted
Plugin installed != access granted
Service Module assigned != action authorized
Domain Module exists != view visible
```

Acceso visible y acciones deben pasar por:

```txt
views / authorizedViews / view_code
entitlements / capabilities / action / scope
routeGroups cuando aplique
startup policy cuando aplique
```

### 12.7 Admin Control Plane

La superficie admin objetivo debe ser observabilidad y governance primero, no edicion libre.

Orden recomendado:

```txt
1. /admin/platform/domains
   catalogo read-only de domains/modules, dependencias y docs

2. /admin/apps
   readiness, installations, bindings, pause/resume/test

3. /admin/plugins
   readiness, installations, dependencies, safe modes
```

Decision V1:

```txt
Primero read-only + readiness.
Install/uninstall interactivo viene despues de lifecycle events, audit y safe modes.
```

### 12.8 Naming Discipline

Convenciones canonicas:

```txt
Domain:          finance
Domain Module:  finance.cash-signals
Plugin:         finance.external-cash-signals
App:            nubox
View:           finance.external-signals
Entitlement:    finance.cash.adopt-external-signal
Tool:           finance.cash.classify-signal
Workflow:       finance.cash-signals.adoption
Service Module: agencia_creativa
```

Reglas:

- Domain keys: lowercase, singular cuando represente area, sin provider externo.
- Module keys: `<domain>.<module>` usando kebab-case despues del punto si aplica.
- Plugin keys: `<domain-or-capability>.<package>`; debe sonar a expansion, no a provider puro.
- App keys: provider/sistema externo (`nubox`, `teams`, `previred`, `hubspot`).
- Entitlements: `domain.capability.action` o convencion vigente equivalente.
- Views: deben ser estables y no depender de provider externo salvo que la surface sea de governance de esa App.

---

## 13. Readiness Contract Comun

Domains, Modules, Apps y Plugins deben reportar readiness usando un envelope comun cuando tengan runtime observable.

```txt
key
kind: core_domain | domain_module | app | plugin | workflow | tool
status: ready | warning | blocked | unknown | not_applicable
severity: info | warning | error | critical
summary
dependencies
lastCheckedAt
freshness
evidenceRef
remediationHint
redactedError
```

Reglas:

1. `ready` no puede esconder una dependency requerida en `blocked`.
2. Errores deben ser redacted.
3. Freshness debe distinguir fuente externa, raw snapshot, conformed data y proyeccion producto cuando aplique.
4. Readiness no concede permisos ni activa surfaces.

---

## 14. Dependency Graph Contract

El dependency graph canonico debe poder responder:

```txt
Que Apps enriquecen este modulo?
Que Plugins extienden este modulo?
Que Service Modules sugieren esta surface?
Que Views muestran este modulo?
Que Entitlements autorizan acciones?
Que workflows/tools viven aqui?
Que migrations/eventos/jobs necesita?
```

Shape conceptual:

```ts
type GreenhouseArchitectureNodeKind =
  | 'domain'
  | 'module'
  | 'plugin'
  | 'app'
  | 'service_module'
  | 'view'
  | 'entitlement'
  | 'workflow'
  | 'tool'

type GreenhouseArchitectureDependency = {
  fromKey: string
  fromKind: GreenhouseArchitectureNodeKind
  relation:
    | 'owns'
    | 'contains'
    | 'extends'
    | 'enriches'
    | 'requires'
    | 'suggests'
    | 'exposes'
    | 'authorizes'
    | 'emits'
    | 'consumes'
  toKey: string
  toKind: GreenhouseArchitectureNodeKind
  required: boolean
  scope?: string
  notes?: string
}
```

Validaciones minimas:

- toda key referenciada existe
- no hay ciclos entre `requires` de Plugins
- `extends` apunta a Domain o Domain Module existente
- `enriches` desde App apunta a Domain, Module, Plugin, Workflow o Tool existente
- `suggests` desde Service Module nunca instala automaticamente sin policy explicita

---

## 15. Version Compatibility Contract

Cada manifest debe declarar compatibilidad hacia abajo y hacia arriba donde aplique.

Campos recomendados:

```txt
manifestVersion
implementationVersion
contractVersion
minCorePlatformVersion
supportedCorePlatformVersionRange
requiredDomainVersions
requiredModuleVersions
requiredAppVersions
requiredPluginVersions
requiredMigrationIds
requiredEventContracts
requiredApiContracts
releaseChannel
deprecationPolicy
```

Decision:

> La version visible de un Plugin/App no reemplaza la compatibilidad con Core, Domains, Modules, API contracts, events y migrations.

---

## 16. Data Ownership Contract

Todo Domain Module, Plugin y App debe declarar su rol sobre datos:

```txt
owns_canonical_state
writes_domain_state
reads_domain_state
materializes_read_model
enriches_state
provides_external_signal
delivers_external_effect
emits_events
consumes_events
```

Reglas:

1. Solo el dominio o modulo owner puede definir canonical state.
2. Plugins escriben canonical state solo mediante APIs/helpers aprobados por el dominio.
3. Apps no escriben canonical state directo salvo contrato explicito del dominio.
4. External data debe conservar `source_system`, `source_object_id`, freshness y lineage cuando sea material.
5. Read models pueden ser descartables; audit/history canonicos no.

---

## 17. Admin Control Plane Objetivo

La arquitectura objetivo debe permitir tres vistas operativas:

```txt
/admin/platform/domains
  domains/modules, ownership, docs, dependencies, readiness

/admin/apps
  catalog, installations, bindings, credentials readiness, health, pause/resume/test

/admin/plugins
  catalog, installations, dependencies, safe modes, jobs, events, readiness
```

Principio:

> El control plane muestra estado y dependencias antes de permitir mutaciones peligrosas.

Mutaciones futuras requieren:

- audit event
- permission check
- dependency validation
- safe mode
- rollback/cleanup note
- no destructive delete de historia canonica

---

## 18. Orden De Implementacion Recomendado

1. Consolidar docs y taxonomia.
2. Crear manifests read-only de Domains/Modules.
3. Crear manifests read-only de Apps y Plugins.
4. Crear validador de dependency graph.
5. Exponer API admin read-only.
6. Crear UI admin read-only.
7. Agregar readiness real por App/Plugin critico.
8. Solo despues implementar install/pause/resume/uninstall interactivo.

Este orden mantiene la arquitectura moderna sin introducir un runtime dinamico prematuro.

---

## 19. Manifest Futuro De Domain Modules

V1 no exige implementar un runtime nuevo.

Pero si se introduce un catalogo declarativo, el shape minimo deberia ser:

```ts
type GreenhouseDomainModuleManifest = {
  domainKey: string
  moduleKey: string
  displayName: string
  description: string
  ownerDomain: string
  lifecycle: 'planned' | 'active' | 'deprecated'
  moduleVersion: string
  minCorePlatformVersion: string
  canonicalObjects: string[]
  views: string[]
  entitlements: string[]
  apiResources: string[]
  eventsPublished: string[]
  eventsConsumed: string[]
  workflows: string[]
  tools: string[]
  supportedPlugins: string[]
  enrichingApps: string[]
  relatedServiceModules: string[]
  dataOwnership: string[]
  readinessChecks: string[]
  dependencies: GreenhouseArchitectureDependency[]
  documentation: string[]
}
```

Ubicacion sugerida si se implementa:

```txt
src/config/domains/<domainKey>.manifest.ts
src/config/domains/index.ts
```

Esto debe venir despues de consolidar la taxonomia documental; no es requisito para el paso actual.

---

## 20. Ejemplos Iniciales De Taxonomia

| Domain | Domain Modules | Plugins posibles | Apps posibles |
| --- | --- | --- | --- |
| `payroll` | `calendar`, `runs`, `employees`, `compliance`, `reporting` | `payroll.previred-backfill`, `payroll.anomaly-detection` | `previred`, `nubox`, futuro HRIS |
| `finance` | `invoices`, `bank`, `cash-signals`, `reimbursements`, `payables`, `receivables` | `finance.external-cash-signals`, `finance.invoice-reconciliation` | `nubox`, banco futuro, `zapsign` |
| `cost` | `attribution`, `economics`, `profitability`, `materialization` | `cost.commercial-attribution-materializer` | `hubspot`, BigQuery sources |
| `agency` | `operations`, `delivery`, `capacity`, `clients`, `public-discovery` | `agency.agent-scraper`, `capabilities.creative-hub` | `mercado_publico`, `hubspot`, `notion`, `frame_io` |
| `communications` | `notifications`, `announcements`, `channels`, `templates` | `communications.manual-announcements` | `teams`, email provider futuro |
| `commercial` | `crm`, `quotes`, `opportunities`, `public-tenders` | `commercial.quote-builder`, `commercial.public-tenders` | `hubspot`, `mercado_publico` |

Esta tabla es inicial y debe ajustarse con cada arquitectura especializada.

---

## 21. Non-Goals

Este documento no:

- reemplaza las arquitecturas especializadas de Finance, Payroll, Workforce, Cost o Agency
- reemplaza `GREENHOUSE_SERVICE_MODULES_V1.md`
- obliga a crear manifests runtime de dominios en este momento
- convierte todos los modulos existentes en Plugins
- concede acceso por instalar Apps o Plugins
- decide pricing, packaging o contract terms de clientes

---

## 22. Decision Inicial Recomendada

Adoptar esta taxonomia:

```txt
Core Platform = runtime base no instalable
Core Domains = areas nativas Greenhouse
Domain Modules = subcapacidades funcionales estables
Native Plugins = expansiones gobernables de dominios/modulos
Connected Apps = dependencias externas que enriquecen dominios/modulos/plugins
Service Modules = producto/capacidad comercial asignable a clientes
```

Esta separacion permite que Payroll, Finance, Cost y Agency sean dominios nativos, sin impedir que Apps externas los enriquezcan ni que Plugins los expandan.
