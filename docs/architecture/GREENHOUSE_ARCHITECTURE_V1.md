# Greenhouse Architecture V1

## Delta 2026-04-11 — Hiring / ATS becomes a canonical talent fulfillment domain

- Greenhouse ya no debe tratar `ATS` solo como una herramienta externa hipotética o como un mini pipeline accesorio de `Staff Aug`.
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- Regla arquitectónica nueva:
  - `Hiring / ATS` es la capa canónica de fulfillment de talento previa a `member`, `assignment` y `placement`
  - el objeto raíz del dominio es `TalentDemand`
  - `HiringApplication` es la unidad transaccional del pipeline
  - `HiringHandoff` es el contrato explícito de salida hacia HR, staffing o lanes contractuales
  - el dominio debe soportar demanda interna y de cliente, tanto `on_demand` como `on_going`

## Delta 2026-04-05 — Organization-first admin surface (TASK-195)

- `Organization` es ahora el entrypoint administrativo principal de la cuenta
- `Space` es el child object operativo de la cuenta
- `Space 360` es una vista del objeto Space, no una entidad paralela
- Nuevas surfaces admin:
  - `/admin/accounts` — lista de organizaciones con space counts y readiness
  - `/admin/accounts/[id]` — detalle admin de cuenta con lista de spaces, CTAs de onboarding, links a Space 360
- `/admin/tenants/[id]` queda tratado como surface legacy/transicional con banner informativo
- Navigation: "Cuentas" agregado al menú admin como entrypoint principal
- Breadcrumbs Space 360: ahora muestra Organización cuando está disponible
- Regla de naming: "Organización" para la cuenta, "Space" para el objeto operativo, "Space 360" para la vista operativa
- El onboarding de Space y Notion se accede desde la ficha de cuenta, no desde `/admin/tenants/[id]`

## Delta 2026-04-03 — Internal roles and hierarchies now have a canonical spec

La semántica interna de:

- `role_code` vs nombre visible
- supervisoría
- estructura departamental
- ownership operativo por cuenta/space/proyecto

ya no debe inferirse desde documentos separados ni desde `departments` como catch-all.

Fuente canónica nueva:

- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`

Regla arquitectónica nueva:

- `Access Role`, `Reporting Hierarchy`, `Structural Hierarchy` y `Operational Responsibility` deben tratarse como planos distintos
- `departments` no debe usarse como jerarquía universal de approvals u ownership comercial
- `supervisor` debe seguir leyéndose como relación entre miembros, no como role code global

## Delta 2026-04-01 — Native Integrations Layer ya tiene arquitectura canónica propia

La `Native Integrations Layer` ya no debe leerse solo como task o intuición de plataforma.

Fuente canónica nueva:

- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Regla arquitectónica nueva:

- las integraciones críticas (`Notion`, `HubSpot`, `Nubox`, `Frame.io` y futuras equivalentes) deben diseñarse y evolucionar bajo un marco común de:
  - registry
  - contract governance
  - adapters por source
  - canonical mapping layer
  - event/workflow backbone
  - runtime governance
  - readiness downstream

La primera implementación fuerte de este marco sigue siendo `Notion`, pero la arquitectura ya queda definida como capability reusable de plataforma.

## Delta 2026-03-31 — TASK-173 ya tiene infraestructura dedicada además de foundation runtime

`TASK-173` ya no debe leerse como “shared assets en código, pero infra pendiente”.

Estado arquitectónico vigente:

- la foundation shared existe en runtime y en infraestructura
- Greenhouse ya tiene buckets dedicados por entorno para:
  - `public media`
  - `private assets`
- Vercel ya quedó cortado a esos buckets por entorno
- `staging` y `production` ya están desplegados sobre ese baseline

Regla de consumo actual:

- nuevos módulos deben usar la capability shared de assets/attachments
- media pública debe resolver contra `GREENHOUSE_PUBLIC_MEDIA_BUCKET`
- adjuntos privados deben resolver contra `GREENHOUSE_PRIVATE_ASSETS_BUCKET`
- `GREENHOUSE_MEDIA_BUCKET` queda solo como fallback transicional para superficies públicas legacy

## Delta 2026-03-31 — Shared attachments platform ya tiene foundation runtime en repo

`TASK-173` ya no debe leerse solo como decisión documental.

Estado vigente en el repo:

- existe una capability shared de assets/attachments para el portal
- su capa base vive en:
  - `src/lib/storage/greenhouse-assets.ts`
  - `src/app/api/assets/private/route.ts`
  - `src/app/api/assets/private/[assetId]/route.ts`
  - `src/components/greenhouse/GreenhouseFileUploader.tsx`
- el contrato converge múltiples dominios reales:
  - `leave`
  - `purchase orders`
  - `payroll receipts`
  - `payroll export packages`

Regla arquitectónica nueva:

- nuevos módulos compatibles no deben crear storage helpers, buckets lógicos o uploaders paralelos si pueden consumir esta capability shared
- las associations documentales se resuelven por aggregate del dominio, no creando identidades documentales duplicadas
- la metadata y autorización del asset son cross-module; la semántica del documento sigue siendo ownership del dominio consumidor

## Delta 2026-03-30 — TASK-162 ya dejó capa canónica materializada + estrategia de cutover

La decisión de `commercial cost attribution` ya no debe leerse solo como framing.

Estado arquitectónico vigente:

- la truth layer ya existe como capa explícita y materializada:
  - `greenhouse_serving.commercial_cost_attribution`
- la capa ya tiene:
  - reader shared
  - materializer propio
  - projection reactiva dedicada
  - health semántico
  - explain surface mínima
- `operational_pl` ya consume esta capa en vez de recomponer labor + overhead desde bridges divergentes

Política de consumo vigente:

- `commercial_cost_attribution`
  - truth layer canónica de costo comercial
- `operational_pl_snapshots`
  - serving derivado para rentabilidad por scope
- `member_capacity_economics`
  - serving derivado para costo/capacidad por miembro
- `client_labor_cost_allocation`
  - bridge histórico e input interno
  - ya no debe tratarse como contrato directo para consumers nuevos

Consecuencia arquitectónica:

- el cutover no significa que todo el portal lea la tabla nueva directamente
- Agency, Home, Nexa y surfaces resumidas deben seguir privilegiando serving derivado
- Finance base, Cost Intelligence y explain surfaces sí deben apoyarse en la capa canónica/shared

## Delta 2026-03-30 — TASK-141 ya tiene primer slice runtime conservador

Greenhouse ya no tiene solo un contrato documental para la migración `person-first`.

Slice operativo nuevo:

- resolver shared:
  - `src/lib/identity/canonical-person.ts`
- adopción inicial:
  - notifications recipient resolution
  - webhook notification recipient resolution

Regla de este slice:

- el consumer se enriquece con `identityProfileId`, `memberId`, `userId`, `portalAccessState` y `resolutionSource`
- el carril sigue siendo `userId`-scoped para inbox, preferencias, overrides y auditoría
- no se tocan recipient keys, payloads de outbox ni serving member-scoped

## Delta 2026-03-30 — Cost Intelligence ya es módulo operativo distribuido

Greenhouse ya no debe leer Cost Intelligence como una lane experimental de Finance.

Estado canónico vigente:

- `TASK-067` dejó la fundación técnica del dominio `cost_intelligence`.
- `TASK-068` cerró `period_closure_status` como serving canónico de readiness y cierre.
- `TASK-069` cerró `operational_pl_snapshots` como serving canónico de P&L operativo.
- `TASK-070` ya convirtió `/finance/intelligence` en la surface principal del módulo.
- `TASK-071` ya inició el cutover de consumers distribuidos:
  - Agency
  - Organization 360
  - People 360
  - Home
  - Nexa

Regla arquitectónica:

- Finance sigue siendo owner del motor financiero central.
- Cost Intelligence es el layer operativo de management accounting y closure awareness.
- Los consumers que necesiten margen, costo total, closure status o snapshot de período deberían preferir serving materializado antes de recomputar on-read.

## Delta 2026-03-30 — Commercial cost attribution queda definido como capa canónica separada

Greenhouse ya no debe resolver la atribución comercial de costos solo como una suma implícita de Payroll + Team Capacity + Finance bridges dentro de cada consumer.

Decisión arquitectónica:

- existe una capa canónica nueva de `commercial cost attribution`
- esta capa se ubica entre:
  - Payroll
  - Team Capacity
  - Finance base
    y:
  - Cost Intelligence
  - Finance consumers
  - Agency / Organization 360 / People / Home / Nexa

Responsabilidad de la nueva capa:

- resolver la verdad única de costo comercial atribuible por período
- separar explícitamente:
  - labor cost comercial
  - carga interna / internal assignments
  - overhead interno
  - costo no billable o no atribuible
- publicar una semántica reusable para serving, projections y consumers

Regla de consumo:

- Finance y Cost Intelligence deben consumir esta capa, no reinventar localmente la atribución
- los demás módulos deben consumirla directa o indirectamente a través de serving materializado

Módulos que deberían alimentarse desde esta capa:

- Finance
- Cost Intelligence
- Agency
- Organization 360
- People
- Home
- Nexa
- futuros `Service P&L`, `Campaign ↔ Service`, forecasting y scorecards financieros

## Delta 2026-03-29 — Release channels model reference

Greenhouse maneja release channels principalmente por modulo o feature visible, con una capa opcional de canal global de plataforma.

La politica canonica de:

- `alpha`, `beta`, `stable`, `deprecated`
- disponibilidad por cohort o tenant
- changelog client-facing

vive en:

- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`
- `docs/changelog/CLIENT_CHANGELOG.md`

## Delta 2026-03-30 — View access governance model

Greenhouse ya no debe leerse solo como `role -> route_groups`.

Estado canónico vigente:

- `routeGroups` siguen existiendo como capa broad/fallback
- la gobernanza fina de superficies visibles ya vive en `view_code`
- la sesión ya carga `authorizedViews` resueltos desde PostgreSQL cuando la capa persistida existe
- `Admin Center > Vistas y acceso` es la superficie operativa para:
  - matrix por rol
  - overrides por usuario
  - expiración
  - auditoría
  - preview efectivo

Modelo persistido en `greenhouse_core`:

- `view_registry`
- `role_view_assignments`
- `user_view_overrides`
- `view_access_log`

Regla arquitectónica:

- nuevas superficies visibles del portal deberían nacer con `view_code` explícito cuando sea razonable gobernarlas
- `routeGroups` no deben seguir creciendo como mecanismo principal de autorización fina
- cuando falte modelado explícito, el fallback puede existir, pero debe tratarse como estado transicional

## Delta 2026-03-30 — Person-first identity with reactive compatibility

Greenhouse debe institucionalizar el consumo `person-first` sin romper los carriles reactivos ya operativos.

Regla canónica:

- cuando una surface, recipient resolver o preview represente a un humano, la raíz conceptual es la persona canónica (`identity_profile`)
- `member` sigue siendo la faceta operativa fuerte para HR, payroll, capacity, ICO y People
- `client_user` sigue siendo el principal de acceso para sesión, inbox, preferencias, auditoría de login y overrides user-scoped

Guardrails obligatorios para la migración:

- no cambiar de forma silenciosa la semántica de `event_id`, `aggregate_id`, `member_id`, `identity_profile_id` o `user_id` en outbox, projections o webhook envelopes
- no reemplazar recipients `userId`-scoped en notificaciones cuando la operación sigue dependiendo de inbox o preferencias por usuario
- consumers reactivos de `finance`, `people`, `ICO` y `notifications` deben seguir pudiendo resolver:
  - persona canónica
  - faceta operativa (`member`)
  - principal portal (`client_user`)
- toda adopción `person-first` debe ser gradual, observable y con fallback explícito, no por cutover implícito

Piezas especialmente sensibles para esta regla:

- `src/lib/notifications/person-recipient-resolver.ts`
- `src/lib/notifications/notification-service.ts`
- `src/lib/webhooks/consumers/notification-recipients.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/sync/projections/client-economics.ts`
- `src/lib/sync/projections/ico-member-metrics.ts`
- `src/lib/sync/projections/person-intelligence.ts`
- `src/lib/webhooks/dispatcher.ts`

Consecuencia arquitectónica:

- `TASK-141` no debe ejecutarse como “swap `client_user` por persona en todas partes”
- debe implementarse como un contrato shared que expone la identidad humana canónica sin degradar los consumers que todavía necesitan `userId` o `memberId` como claves operativas

## Purpose

This document is the master architecture reference for Greenhouse EO.

It describes the product, data model, module inventory, route structure, access model, deployment topology, and architectural principles as they exist in production as of March 2026.

Any agent, engineer, or contributor entering this repo should:

- read this document before changing architecture, auth, routes, or data models
- treat this document as the authoritative source when it conflicts with older design docs or template defaults
- update this document when architecture-changing work lands

Use together with:

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`

## Product Thesis

Greenhouse EO is a multi-tenant executive operations portal for Efeonce Group.

It serves three roles:

1. **Executive visibility layer** — lets clients and internal stakeholders understand operational performance without entering Notion or any system of work.
2. **Operational context system** — provides delivery, finance, HR, and capacity context for decision-making.
3. **Internal governance platform** — supports tenant management, access control, AI tooling administration, and cross-client operational oversight.

Notion remains the system of work. Greenhouse consumes operational truth from source systems and exposes decision-ready views.

### Terminology contract

- `tenant`, `client`, and `company` refer to the same business entity in the portal
- one tenant can have one or many users
- tenant metadata and user identity remain separate tables and separate runtime concepts
- `organization` is the parent entity above `space` and `client` in the hierarchy

### Product boundaries

Greenhouse must:

- show executive dashboards and tenant-scoped operational context
- show projects, deliverables, sprints, and team capacity as drilldown context
- support finance, HR/payroll, and people 360 for internal operations
- relate campaigns, projects, deliverables, and indicators
- support different user roles and visibility levels
- support internal Efeonce admin and governance views
- provide AI tooling administration and credit metering

Greenhouse must not become:

- a second Notion or task editing workspace
- a full CRUD project management app
- a workflow board where daily work is performed
- a place where users re-enter operational data already living in source systems

## Technology Stack

| Layer             | Technology                                | Version              |
| ----------------- | ----------------------------------------- | -------------------- |
| Framework         | Next.js                                   | 16.1.1               |
| UI Library        | React                                     | 19.2.3               |
| Language          | TypeScript                                | 5.9.3                |
| Component Library | MUI                                       | 7.3.6                |
| CSS               | Tailwind CSS                              | 4.1                  |
| Design System     | Vuexy patterns                            | —                    |
| OLTP Database     | PostgreSQL 16                             | Cloud SQL (us-east4) |
| OLAP Warehouse    | BigQuery                                  | US multi-region      |
| Auth              | NextAuth.js                               | 4.24                 |
| AI                | Google Vertex AI (Gemini)                 | —                    |
| Hosting           | Vercel                                    | —                    |
| Sync Runtime      | Cloud Functions (Python 3.12) + Cloud Run | —                    |
| Orchestration     | Cloud Scheduler                           | —                    |
| DB Migrations     | node-pg-migrate                           | 8.x                  |
| DB Query Builder  | Kysely + kysely-codegen                   | 0.28.x               |

## Architecture Principles

1. **Read-model first** — Greenhouse consumes operational truth from source systems and exposes decision-ready views. It is not a system of record for operational work.

2. **Canonical object graph** — Greenhouse evolves around canonical enriched objects, not module-local identity silos. Modules may own transactions and extensions, but shared business objects keep one canonical identity. Cross-module 360 views come from read-model composition, not duplicated master tables.

3. **PostgreSQL = OLTP, BigQuery = OLAP** — transactional writes (finance, payroll, identity, organizations) live in PostgreSQL. Analytics, reporting, and legacy delivery data live in BigQuery. No request-time DDL or source API calculation.

4. **Config-driven property mappings** — multi-client normalization uses config-driven mappings (`src/config/property-maps/`) so new tenants onboard without code changes. The conformed data layer resolves source-system naming heterogeneity at sync time, not query time.

5. **Auth via layout-level guards** — authentication and authorization are enforced at the layout level using route group wrappers. There is no `middleware.ts` auth layer. Route groups define access boundaries.

6. **Executive-first UX** — dashboard and summary views are primary. Detailed tables are drilldowns, not the center of the app. The first screen has clear hierarchy and no visually flat wall of cards.

7. **Semantic metric layer** — business KPIs are not recomputed ad hoc in every endpoint. Derived metrics belong in materialized tables, semantic marts, or reusable query functions.

8. **Tenant isolation first** — all data access is scoped by tenant and role. Browser-supplied IDs never define authorization.

## Module Inventory

### Identity & Access

NextAuth.js with three providers: Azure AD, Google OAuth, and Credentials.

Auth guards are enforced at the layout level using route group wrappers plus `view_code` checks — there is no `middleware.ts`.

Current access model:

- broad boundary:
  - `client`, `admin`, `internal`, `finance`, `hr`, `people`, `agency`, `my`, `ai_tooling`
- fine-grained boundary:
  - `authorizedViews` on session
  - `hasAuthorizedViewCode()` / `hasAnyAuthorizedViewCode()` in route pages/layouts

Route groups still define the high-level access boundary, but they are no longer the intended long-term source of truth for every visible surface.

Roles are composable (not hierarchical). `efeonce_admin` serves as the universal override role.

The `TenantContext` carries:

- `userId`
- `clientId`
- `roleCodes`
- `routeGroups`
- `authorizedViews`
- `spaceId`
- `organizationId`

Tables live in `greenhouse_core`:

- `client_users`
- `roles`
- `user_role_assignments`
- `identity_profiles`
- `view_registry`
- `role_view_assignments`
- `user_view_overrides`
- `view_access_log`

Operational rule:

- role baseline still seeds default visibility
- persisted role assignments can override that baseline by `view_code`
- user overrides apply after role baseline
- expired overrides should degrade automatically and register audit history

Explicit exception:

- `/home` remains a base internal landing surface driven by `portalHomePath`
- it is not currently modeled as a governed `view_code`
- rationale:
  - it is the default safe landing for many internal sessions
  - revoking it would create avoidable dead-end navigation for authenticated users
  - its content is already shaped by downstream modules, notifications, and capability resolution
- future rule:
  - if `/home` ever becomes a privilege-sensitive module instead of a transversal landing surface, that decision should be made explicitly and documented before introducing a `view_code`

Primary admin surface:

- `/admin/views`

### Executive Dashboard

Route: `/dashboard`

Client-facing executive home with hero card, KPI strip, charts, team section, and capacity overview. Composition is data-driven — widgets appear based on capability availability, not hardcoded per tenant.

Built on the reusable Executive UI System:

- `ExecutiveCardShell`, `ExecutiveHeroCard`, `ExecutiveMiniStatCard`, `MetricStatCard`
- 32 shared Greenhouse primitives in `src/components/greenhouse/`

### Delivery Context

Routes: `/proyectos`, `/proyectos/[id]`, `/sprints`, `/sprints/[id]`, `/updates`

Project list and detail, sprint list and detail, and activity feed. Source data comes from BigQuery (`notion_ops` legacy tables and `greenhouse_conformed` normalized layer).

### ICO Engine (In-flight Creative Optimization)

Context-agnostic metrics service. 10 deterministic metrics (RPA, OTD, FTR, cycle time, throughput, stuck assets, and related indicators) computed from a single canonical SQL definition (`buildMetricSelectSQL()`) and queryable by **any dimension**: Space, Project, Member (person), Client, Sprint — and extensible to future objects (Service, Campaign) without formula duplication.

Infrastructure:

- BigQuery dataset `ico_engine` (7 tables + 2 views)
  - `metric_snapshots_monthly` — space-level monthly aggregates
  - `metrics_by_project` — project-level monthly aggregates
  - `metrics_by_member` — person-level monthly aggregates (via UNNEST of multi-assignee array)
  - `rpa_trend` — 12-month rolling RPA by space
  - `stuck_assets_detail` — currently stuck assets with severity
  - `ai_metric_scores` — reserved for future AI-driven metrics
  - `status_phase_config` — configurable CSC phase mapping
  - `v_tasks_enriched` — enriched view on `greenhouse_conformed.delivery_tasks`
  - `v_metric_latest` — convenience view for latest snapshot per space
- Daily materialization via Vercel cron (6:15 AM UTC)
- Dimension allowlist (`ICO_DIMENSIONS` in `shared.ts`) prevents SQL injection while enabling parameterized queries
- 9 API endpoints (`/api/ico-engine/*`):
  - `GET /api/ico-engine/context` — **generic context endpoint**: `?dimension=space|project|member|client|sprint&value=X&year=Y&month=Z`
  - `GET /api/ico-engine/metrics` — space metrics (materialized + live fallback)
  - `GET /api/ico-engine/metrics/agency` — agency-wide metrics
  - `GET /api/ico-engine/metrics/project` — project-level metrics
  - `GET /api/ico-engine/stuck-assets` — stuck asset detail
  - `GET /api/ico-engine/trends/rpa` — RPA trend data
  - `GET /api/ico-engine/registry` — metric definitions
  - `GET /api/ico-engine/health` — materialization freshness
  - `GET /api/people/[memberId]/ico` — person-level ICO metrics (convenience)
- Multi-assignee support: `delivery_tasks.assignee_member_ids ARRAY<STRING>` stores all Notion responsables resolved to Greenhouse member IDs; member-dimension queries use BigQuery `UNNEST` to credit all assignees

Surfaces: Agency tab, Organization ICO tab, Person ICO tab (KPIs, CSC donut, health radar, velocity gauge).

Adding a new dimension requires only: (1) column in `v_tasks_enriched`, (2) entry in `ICO_DIMENSIONS`.

### Finance Module

Routes: `/finance` (dashboard, P&L, cash flow, aging), `/finance/clients`, `/finance/clients/[id]`, `/finance/income`, `/finance/income/[id]`, `/finance/expenses`, `/finance/expenses/[id]`, `/finance/suppliers`, `/finance/suppliers/[id]`, `/finance/reconciliation`, `/finance/reconciliation/[id]`, `/finance/intelligence`

Finance intelligence includes client economics, cost allocation, and trend analysis.

Dual-store architecture:

- Income/expenses: Postgres-first with BigQuery fallback
- Accounts/suppliers/reconciliation: still BigQuery-primary
- Reconciliation engine with auto-match
- Exchange rate sync via Vercel cron (daily 11:05 PM UTC)
- 40+ API routes

### HR Core + Payroll

Routes: `/hr` (dashboard, departments, leave, attendance), `/hr/payroll`, `/hr/payroll/member/[memberId]`

Payroll with full period lifecycle: draft → calculated → approved → exported. `approved` remains editable until export; `exported` is the final lock. Chilean payroll calculations including AFP, health, unemployment, and tax. KPI-driven bonuses (OTD%, RPA) sourced from ICO. Teams attendance and HR leave context are applied to the monthly snapshot.

Data stores:

- Payroll and leave: Postgres-first
- HR core tables: BigQuery
- 25+ API routes

See `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` for period semantics, compensation versioning, KPI source, exports, and cross-module consumers.

### People & Person 360

Routes: `/people`, `/people/[memberId]`

Unified team directory and tabbed 360 view per person: activity, payroll, compensation, HR, finance, AI tools, memberships.

Cross-domain composition from `identity_profiles`, `members`, and `client_users`. Access governed by `canAccessPeopleModule()` for cross-group visibility.

### Team Capacity & Capacity Economics

Primary surfaces:

- `/agency/team`
- consumers under `People 360`
- consumers under `/my/*`

Greenhouse now treats team capacity as its own reusable domain:

- pure helpers in `src/lib/team-capacity/*`
- reactive snapshot in `greenhouse_serving.member_capacity_economics`

This split exists to prevent semantic drift between:

- contractual capacity
- commercial commitment
- operational usage
- cost per hour / loaded cost

Rules:

- helpers remain pure and reusable
- consumers should read the persisted snapshot instead of recomputing mixed semantics on-read
- new consumers should extend the existing snapshot before inventing a parallel serving model

See `GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`.

### Account 360 / Organizations

Routes: `/agency/organizations`, `/agency/organizations/[id]`

Organization list with KPIs and detail view with overview, people, and finance tabs.

Entity hierarchy:

- Organization (EO-ORG) → Space (EO-SPC) → Client
- Person memberships (EO-MBR) with type coding

PostgreSQL-only (`greenhouse_core.organizations`, `spaces`, `person_memberships`). HubSpot sync integration for organization data.

### Agency Workspace

Routes: `/agency` (operational dashboard with pulse, spaces, ICO), `/agency/spaces`, `/agency/capacity`, `/agency/services`, `/agency/services/[serviceId]`

Available to `internal` and `admin` route groups.

### AI Tooling & Credits

Route: `/admin/ai-tools`

Catalog, licenses, wallets, and consumption tracking. Credit-based metering system. Postgres-primary with BigQuery fallback. 12+ API routes.

### Capabilities System

Route: `/capabilities/[moduleId]`

Config-driven registry (`src/config/capability-registry.ts`) that maps module IDs to dynamic capability pages.

Module-specific query pages include: CRM Command Center, Creative Hub, Web Delivery Lab, Onboarding Center.

Access governed by `verifyCapabilityModuleAccess()` for tenant-level gating.

### Integrations & Event Delivery

Greenhouse currently combines:

- a token-based integrations API
- one inbound Teams attendance webhook
- an outbox-driven publication path from PostgreSQL to BigQuery

Reusable inbound and outbound webhook infrastructure is now standardized separately in `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`.

Rule:

- do not keep adding one-off webhook routes as permanent integration strategy
- new webhook or callback work should align with the shared webhook architecture and the existing outbox model

The **Native Integrations Layer** (`TASK-188`) institutionalizes integration governance as a platform capability. The central registry lives in `greenhouse_sync.integration_registry` and tracks taxonomy, ownership, readiness, health and consumer domains for each upstream (Notion, HubSpot, Nubox, Frame.io). Architecture details in `GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`. Admin surface at `/admin/integrations`.

### Admin & Governance

Routes: `/admin/tenants`, `/admin/tenants/[id]`, `/admin/tenants/[id]/capability-preview/[moduleId]`, `/admin/tenants/[id]/view-as/dashboard`, `/admin/users`, `/admin/users/[id]`, `/admin/roles`, `/admin/ai-tools`, `/admin/team`

Tenant list and detail with capability management. User list with access control. Role management. Admin impersonation via view-as. AI tools administration.

### Internal Operations

Route: `/internal/dashboard`

Control tower for cross-tenant operational oversight. Greenhouse AI agent powered by Vertex AI with modes: plan, pair, review, implement.

## Data Architecture

### PostgreSQL

Instance: `greenhouse-pg-dev` (Cloud SQL, us-east4)
Database: `greenhouse_app`

Schemas:

- `greenhouse_core` — identity, roles, organizations, spaces, memberships
- `greenhouse_serving` — materialized read models
- `greenhouse_sync` — sync state and outbox
- `greenhouse_hr` — HR domain tables
- `greenhouse_payroll` — payroll periods, calculations, bonuses
- `greenhouse_finance` — income, expenses, reconciliation
- `greenhouse_delivery` — delivery tracking
- `greenhouse_crm` — CRM extensions
- `greenhouse_ai` — AI tool catalog, wallets, consumption

### BigQuery

Project: `efeonce-group` (US multi-region)

| Dataset                | Tables/Views   | Purpose                                                   |
| ---------------------- | -------------- | --------------------------------------------------------- |
| `greenhouse`           | 41 tables      | Core platform data                                        |
| `greenhouse_raw`       | 11 tables      | Immutable source snapshots                                |
| `greenhouse_conformed` | 6 tables       | Normalized delivery + CRM via config-driven property maps |
| `greenhouse_marts`     | 5 views        | Outbox-derived analytical marts                           |
| `ico_engine`           | 7 tables/views | ICO metrics materialization                               |
| `hubspot_crm`          | 35 tables      | HubSpot CRM mirror (legacy)                               |
| `notion_ops`           | 10 tables      | Notion operational mirror (legacy)                        |
| `analytics_486264460`  | —              | GA4 export                                                |
| `searchconsole`        | —              | Search Console data                                       |

### Data Flow Layers

**Layer A: Source operational tables** — immutable mirrors of source systems in `greenhouse_raw`, `notion_ops`, `hubspot_crm`.

**Layer B: Greenhouse canonical and control tables** — canonical object anchors, access, tenant metadata, and app governance in PostgreSQL (`greenhouse_core`) and BigQuery (`greenhouse`).

**Layer C: Conformed data layer** — config-driven property mappings normalize heterogeneous source data into `greenhouse_conformed`. Resolves naming differences at sync time, not query time.

**Layer D: Semantic marts** — `greenhouse_marts` provides outbox-derived views for cross-domain analytics. ICO Engine maintains its own materialized dataset.

### Sync Pipelines

Cloud Functions (Python 3.12) + Cloud Run services, orchestrated by Cloud Scheduler:

| Pipeline                         | Direction                  | Schedule                |
| -------------------------------- | -------------------------- | ----------------------- |
| `notion-bq-sync`                 | Notion → BigQuery          | Daily 3:00 AM CL        |
| `hubspot-bq-sync`                | HubSpot → BigQuery         | Daily 3:30 AM CL        |
| `hubspot-notion-deal-sync`       | HubSpot deals → Notion     | Every 15 min            |
| `notion-hubspot-reverse-sync`    | Notion → HubSpot           | Every 15 min            |
| `notion-frameio-sync`            | Frame.io ↔ Notion reviews | Event-driven            |
| `notion-teams-notify`            | Notion → MS Teams          | Event-driven            |
| `hubspot-greenhouse-integration` | HubSpot ↔ Greenhouse      | Bidirectional           |
| Outbox consumer                  | Postgres → BigQuery        | Vercel cron every 5 min |

## Canonical Object Graph

Greenhouse is modeled around canonical enriched objects. Each object has one canonical identity; modules may contribute attributes, transactions, and extensions but must not create parallel identities.

| Object            | Canonical Anchor                     | ID Pattern | Primary Store |
| ----------------- | ------------------------------------ | ---------- | ------------- |
| Client            | `greenhouse_core.clients`            | UUID       | PostgreSQL    |
| Person 360        | `greenhouse_core.identity_profiles`  | UUID       | PostgreSQL    |
| Organization      | `greenhouse_core.organizations`      | EO-ORG-### | PostgreSQL    |
| Space             | `greenhouse_core.spaces`             | EO-SPC-### | PostgreSQL    |
| Person Membership | `greenhouse_core.person_memberships` | EO-MBR-### | PostgreSQL    |
| Service Module    | `greenhouse.service_modules`         | slug       | BigQuery      |
| Project           | `greenhouse_conformed.projects`      | source ID  | BigQuery      |
| Sprint            | `greenhouse_conformed.sprints`       | source ID  | BigQuery      |
| Provider          | `greenhouse_core.providers`          | UUID       | PostgreSQL    |

Cross-module 360 views (Person 360, Account 360) are assembled by composing data from multiple domain schemas through read-model joins, not by duplicating master records.

Reference: `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

## Access Model

### Authentication

NextAuth.js 4.24 with three providers:

- Azure AD (SSO for enterprise clients)
- Google OAuth (Efeonce internal)
- Credentials (fallback with bcrypt-hashed passwords)

### Authorization axes

**Axis 1: Route groups** — layout-level guards partition the app into access zones: `client`, `admin`, `internal`, `finance`, `hr`, `people`, `agency`.

**Axis 2: Role codes** — composable roles assigned per user. A user may hold multiple roles. `efeonce_admin` is the universal override.

**Axis 3: Tenant scope** — all data access is filtered by the authenticated user's `clientId` and `organizationId`. Internal users may access one, many, or all tenants depending on role.

**Axis 4: Capability modules** — `verifyCapabilityModuleAccess()` gates access to service-module-specific pages based on tenant configuration.

### Session payload (TenantContext)

- `userId`
- `clientId`
- `roleCodes`
- `routeGroups`
- `spaceId`
- `organizationId`

### Operating Entity Identity

The **operating entity** is the legal organization that owns and operates Greenhouse — the employer that signs payroll documents, emits DTEs, and appears on formal HR/Finance surfaces.

**Resolution:**

- Server-side: `getOperatingEntityIdentity()` in `src/lib/account-360/organization-identity.ts` queries `greenhouse_core.organizations WHERE is_operating_entity = TRUE`. Result is cached in memory (the operating entity does not change between requests).
- Client-side: `OperatingEntityProvider` in `src/context/OperatingEntityContext.tsx` hydrates the data from the server layout into React context. Components consume via `useOperatingEntity()` hook — zero additional fetch.
- API fallback: `GET /api/admin/operating-entity` returns the entity as JSON for non-React consumers (webhooks, external integrations, cron jobs). Requires authenticated session (`requireTenantContext`).

**Shape:**

| Field            | Type             | Example                                                  |
| ---------------- | ---------------- | -------------------------------------------------------- |
| `organizationId` | `string`         | UUID                                                     |
| `legalName`      | `string`         | `Efeonce Group SpA`                                      |
| `taxId`          | `string`         | `77.357.182-1`                                           |
| `taxIdType`      | `string \| null` | `RUT`                                                    |
| `legalAddress`   | `string \| null` | `Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile` |
| `country`        | `string`         | `CL`                                                     |

**Hydration flow:**

```
Layout (server) → getOperatingEntityIdentity() → Providers.tsx (server)
  → OperatingEntityProvider (client) → useOperatingEntity() in any component
```

**Consumers:**

- Payroll receipt card + PDF (employer header)
- Payroll period report PDF (employer header + footer)
- Future: Finance DTEs, HR contracts, Agency proposals, email templates

**Multi-tenant readiness:** if Greenhouse becomes multi-tenant, the layout resolves per-tenant operating entity from the session scope. The provider + hook contract remains the same.

### Rules

- Never trust browser-provided client or project IDs for access decisions
- Every cache key must include tenant identity when data is tenant-specific
- Internal routes still check role and scope, not just session presence

## Route Map

### Client routes

| Route             | Purpose             |
| ----------------- | ------------------- |
| `/dashboard`      | Executive dashboard |
| `/proyectos`      | Project list        |
| `/proyectos/[id]` | Project detail      |
| `/sprints`        | Sprint list         |
| `/sprints/[id]`   | Sprint detail       |
| `/updates`        | Activity feed       |
| `/settings`       | User preferences    |

### Finance routes

| Route                          | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| `/finance`                     | Finance dashboard (P&L, cash flow, aging) |
| `/finance/clients`             | Client accounts                           |
| `/finance/clients/[id]`        | Client account detail                     |
| `/finance/income`              | Income records                            |
| `/finance/income/[id]`         | Income detail                             |
| `/finance/expenses`            | Expense records                           |
| `/finance/expenses/[id]`       | Expense detail                            |
| `/finance/suppliers`           | Supplier directory                        |
| `/finance/suppliers/[id]`      | Supplier detail                           |
| `/finance/reconciliation`      | Reconciliation queue                      |
| `/finance/reconciliation/[id]` | Reconciliation detail                     |
| `/finance/intelligence`        | Client economics and trends               |

### HR routes

| Route                           | Purpose               |
| ------------------------------- | --------------------- |
| `/hr`                           | HR dashboard          |
| `/hr/departments`               | Department list       |
| `/hr/leave`                     | Leave management      |
| `/hr/attendance`                | Attendance tracking   |
| `/hr/payroll`                   | Payroll periods       |
| `/hr/payroll/member/[memberId]` | Member payroll detail |

### People routes

| Route                | Purpose                |
| -------------------- | ---------------------- |
| `/people`            | Unified team directory |
| `/people/[memberId]` | Person 360 (tabbed)    |

### Agency routes

| Route                          | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `/agency`                      | Agency operational dashboard                    |
| `/agency/organizations`        | Organization list with KPIs                     |
| `/agency/organizations/[id]`   | Organization detail (overview, people, finance) |
| `/agency/spaces`               | Space management                                |
| `/agency/capacity`             | Capacity overview                               |
| `/agency/services`             | Service catalog                                 |
| `/agency/services/[serviceId]` | Service detail                                  |

### Admin routes

| Route                                               | Purpose                                              |
| --------------------------------------------------- | ---------------------------------------------------- |
| `/admin`                                            | Admin landing                                        |
| `/admin/tenants`                                    | Tenant list                                          |
| `/admin/tenants/[id]`                               | Tenant detail with capabilities                      |
| `/admin/tenants/[id]/capability-preview/[moduleId]` | Capability preview                                   |
| `/admin/tenants/[id]/view-as/dashboard`             | Admin impersonation                                  |
| `/admin/users`                                      | User list                                            |
| `/admin/users/[id]`                                 | User detail                                          |
| `/admin/roles`                                      | Role management                                      |
| `/admin/ai-tools`                                   | AI tools administration                              |
| `/admin/team`                                       | Team roster                                          |
| `GET /api/admin/operating-entity`                   | Operating entity identity (legal name, RUT, address) |

### Internal routes

| Route                 | Purpose       |
| --------------------- | ------------- |
| `/internal/dashboard` | Control tower |

### Capability routes

| Route                      | Purpose                         |
| -------------------------- | ------------------------------- |
| `/capabilities/[moduleId]` | Dynamic capability module pages |

### Other routes

| Route                 | Purpose            |
| --------------------- | ------------------ |
| `/home`               | Landing redirect   |
| `/about`              | About page         |
| `/auth/landing`       | Auth landing       |
| `/login`              | Login page         |
| `/auth/access-denied` | Access denied      |
| `/developers/api`     | Developer API docs |

## Service Module Capability Layer

Greenhouse adapts product surfaces to the services a client has contracted. This avoids hardcoding dashboard variants by tenant name and keeps CRM, creative, and web experiences composable.

Architecture:

- Capability catalog lives in `src/config/capability-registry.ts`
- Module assignments are tenant-level configuration
- Navigation is filtered by `routeGroups` plus capability availability
- Dashboard widgets are selected by module applicability

Current capability modules: CRM Command Center, Creative Hub, Web Delivery Lab, Onboarding Center.

## UI Component Architecture

### Executive UI System

Dashboard and executive surfaces converge on a stable visual hierarchy:

- One dominant hero card (`ExecutiveHeroCard`)
- Compact summary cards (`ExecutiveMiniStatCard`, `MetricStatCard`)
- Medium analysis cards with `CardHeader` framing (`ExecutiveCardShell`)
- Bottom contextual lists or tables

Reference: `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`

### Shared primitives

32 shared Greenhouse primitives in `src/components/greenhouse/`, including: `ExecutiveCardShell`, `ExecutiveHeroCard`, `ExecutiveMiniStatCard`, `MetricStatCard`, `ChipGroup`, `EmptyState`, `SectionHeading`, `TeamMemberCard`, `TeamAvatar`, `BrandLogo`, `BrandWordmark`, `UpsellBanner`, and others.

### Component boundary rules

- Shared Greenhouse UI primitives belong in `src/components/greenhouse/`
- Route or module composition belongs in `src/views/greenhouse/`
- No view should recreate cards, headings, or chip groups ad hoc if they can be promoted to the shared layer

## Deployment Topology

### Vercel

- Next.js hosting (production)
- 4 cron jobs:
  - Outbox consumer (every 5 min)
  - Conformed data layer sync (daily 3:45 AM UTC)
  - ICO Engine materialization (daily 6:15 AM UTC)
  - Exchange rate sync (daily 11:05 PM UTC)

### Google Cloud

| Service                         | Region      | Purpose                         |
| ------------------------------- | ----------- | ------------------------------- |
| Cloud SQL (`greenhouse-pg-dev`) | us-east4    | PostgreSQL 16 OLTP              |
| BigQuery (`efeonce-group`)      | US          | OLAP warehouse                  |
| Cloud Run (10 services)         | us-central1 | Sync pipelines and integrations |
| Cloud Scheduler (6 jobs)        | —           | 4 active, 2 paused (staging)    |

## Testing

Vitest con `@testing-library/react` para unit tests de funciones puras.

### Config

- `vitest.config.ts` — environment `node`, path aliases (`@/`, `@core/`, etc.)
- `src/test/setup.ts` — mock `server-only`, jest-dom matchers
- `src/test/render.tsx` — `renderWithTheme()` helper (MUI ThemeProvider)

### Convenciones

- Tests co-located: `foo.ts` → `foo.test.ts` en el mismo directorio
- Solo se testean **funciones puras** que no dependen de DB o servicios externos
- No mockear BigQuery ni Postgres — si la función necesita la DB, no es candidata a unit test

### Cobertura actual

| Suite                                 | Módulo             | Qué valida                                 |
| ------------------------------------- | ------------------ | ------------------------------------------ |
| `bonus-proration.test.ts`             | `src/lib/payroll/` | Prorrateo OTD% y RPA para cálculo de bonos |
| `fetch-attendance-for-period.test.ts` | `src/lib/payroll/` | Conteo de días hábiles                     |

### Ejecución

```bash
npx vitest run        # una vez (~1s)
npx vitest --watch    # modo watch durante desarrollo
```

## Decisions Locked By This Document

- Greenhouse is not a second Notion — project, task, and sprint views are context views, not primary workflow views
- Executive dashboard is the primary client landing experience
- User identity is separated from tenant metadata
- Client and internal Efeonce views are separated at route level
- PostgreSQL is the OLTP store; BigQuery is the OLAP store
- Auth is layout-level, not middleware-level
- Roles are composable, not hierarchical
- Config-driven property mappings normalize multi-client data at sync time
- Canonical object graph prevents module-local identity silos
- Service module capabilities gate product surfaces, not security

## Related Design Documents

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — canonical object model and enrichment rules
- `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md` — ID generation patterns and prefix conventions
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` — internal identity and person model
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md` — service module taxonomy and capability composition
- `docs/architecture/FINANCE_CANONICAL_360_V1.md` — finance canonicalization architecture
- `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md` — executive UI contract and component hierarchy

## Agent Working Notes

If you are a new agent entering this repo:

1. Read `AGENTS.md`.
2. Read `project_context.md`.
3. Read `Handoff.md`.
4. Read this document fully before changing architecture, auth, routes, or data models.
5. If your task touches roles, KPIs, routes, data stores, or tenant model, update this document or explicitly state why not.

This document is not optional context for architecture-changing work.
