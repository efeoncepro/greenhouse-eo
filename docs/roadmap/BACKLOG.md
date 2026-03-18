# Greenhouse Backlog

## Purpose

This backlog is the execution summary of `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`.

Use it to decide what to build next.
Use the architecture document to understand why, how, and in what order.

Last updated: March 2026.

## Working Rule

- keep tasks small, mergeable, and verifiable
- prefer vertical slices over wide refactors
- do not introduce product behavior that turns Greenhouse into a second Notion
- a task is not done until build, lint, or meaningful runtime validation has passed

## Master Reference

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` is the source of truth for:
  - product direction
  - role model
  - route structure
  - multi-tenant architecture
  - semantic marts direction
  - phased roadmap
  - parallelization rules for agents

## Current Product Position

Greenhouse is:
- a multi-tenant client portal
- an executive visibility layer
- an operational context layer
- a place to explain delivery, speed, capacity, and risk
- an internal operations platform for finance, HR, and agency management

Greenhouse is not:
- a second Notion
- a task editing system
- a project management workspace

## Phase Summary

### Phase 0. Alignment and Foundations

Goal:
- lock product boundaries, role model, KPI semantics, and architecture direction

Status:
- **COMPLETE**

Completed:
- role matrix finalized
- KPI dictionary finalized
- semantic mart design finalized
- service module taxonomy derived from HubSpot commercial data
- module mapping rules from `linea_de_servicio` and `servicios_especificos` defined
- repo docs aligned to `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`

### Phase 1. Identity, Access, and Multi-User Model

Goal:
- separate tenant metadata from user identity and scope

Status:
- **COMPLETE**

Completed:
- removed legacy fallback to `greenhouse.clients` from runtime auth
- added route guards by route group and role family for client, internal, admin, finance, hr, people, and agency surfaces
- removed `auth_mode = env_demo` from normal runtime and seeded bcrypt credentials for demo access
- created `/auth/landing` and portal-home redirects by tenant type
- created minimum `/internal/dashboard` and `/admin/users` surfaces
- bootstrapped HubSpot closedwon companies into `greenhouse.clients` and `greenhouse.client_users`
- mapped confident project scopes for imported tenants where a defendable Notion match existed
- SSO via Microsoft (Azure AD) and Google OAuth operational alongside credentials provider
- multi-user model with composable roles via `user_role_assignments`
- identity profiles and source links for canonical person identity

### Phase 2. Executive Client Dashboard

Goal:
- make `/dashboard` the true product center for client stakeholders

Status:
- **COMPLETE**

Completed:
- created `/api/dashboard/summary`, `/api/dashboard/charts`, `/api/dashboard/risks`
- redesigned `/dashboard` around executive visibility
- hero section, KPI cards, charts, team section, capacity overview
- reusable card system (`src/components/greenhouse/*`) with executive card families
- composed dashboard widgets and narrative by `businessLines` and `serviceModules`
- adopted Vuexy chart stack with `apexcharts` + `react-apexcharts` and `AppReactApexCharts` wrapper
- validated dashboard queries against real tenant scope
- dashboard promoted through Preview, staging, and Production

### Phase 3. Delivery Context and Operational Drilldowns

Goal:
- provide enough context to explain indicators without duplicating Notion

Status:
- **COMPLETE**

Completed:
- `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/tasks` with tenant authorization
- `/proyectos` and `/proyectos/[id]` with KPI header, tasks table, review pressure, sprint context
- `/api/sprints` and `/api/sprints/[id]`
- sprint views operational
- project timeline and aging in project detail
- updates working

### Phase 4. Team and Capacity

Goal:
- expose assigned team, role mix, capacity, and load

Status:
- **SUBSTANTIALLY COMPLETE**

Completed:
- People module operational with route group and `canAccessPeopleModule()` access
- team directory with search and filters
- Person 360 with tabbed views (overview, projects, capacity, activity)
- capacity views per person and per team
- `/api/team` and `/api/capacity` endpoints

Remaining:
- formal allocation model (planned hours vs actual by person/project/period)

### Phase 5. Campaign Intelligence

Goal:
- relate campaigns, projects, deliverables, and KPIs

Status:
- **PARTIALLY COMPLETE** — no formal campaign model, but ICO Engine operates as operational intelligence proxy

Completed:
- ICO Engine with 10 operational metrics (velocity, throughput, stuck assets, revision pressure, first-time right, on-time delivery, sprint health, resource utilization, backlog aging, scope changes)
- daily materialization pipeline (automated: notion-bq-sync → sync-conformed → ico-materialize)
- ETL pipeline hardening: safe DELETE pattern, NULL guards, cycle_time_days fix, batched CSC, configurable fase_csc, space resolution via space_notion_sources
- ICO Engine health endpoint (`/api/ico-engine/health`)
- stuck asset detection and alerting
- agency scorecard powered by ICO metrics

Not started:
- formal campaign entity model
- campaign-level KPI attribution
- `/campanas` and `/campanas/[id]` routes
- campaign scope consumers

### Phase 6. Internal Efeonce Visibility

Goal:
- give Efeonce internal users cross-tenant operational and account visibility

Status:
- **COMPLETE**

Completed:
- agency workspace with internal dashboard
- operational pulse view
- organizations management (hierarchy, memberships)
- services catalog and module management
- ICO Engine tab in agency workspace
- cross-tenant operational views

### Phase 7. Admin and Governance

Goal:
- provide safe tenant, user, role, scope, and feature administration

Status:
- **SUBSTANTIALLY COMPLETE**

Completed:
- `/admin/tenants`, `/admin/tenants/[id]`, `/admin/tenants/[id]/view-as/dashboard`
- `/admin/users`, `/admin/users/[id]`
- `/admin/roles`
- tenant-centric admin views backed by `clients`, `client_users`, `client_service_modules`, and `client_feature_flags`
- capability module administration with `verifyCapabilityModuleAccess()`
- AI tools catalog and license management
- `requireAdminTenantContext()` enforcing both admin route group and efeonce_admin role

Remaining:
- SCIM provisioning for automated user lifecycle from IdP
- fine-grained scopes (`/admin/scopes`, `/admin/feature-flags` as dedicated governance surfaces)

## Modules Beyond Original Phases

The following modules were not in the original phased roadmap but are now operational:

### Finance Module
- 40+ API routes under `/api/finance/*`
- finance dashboard with P&L views
- reconciliation workflows
- financial intelligence (cost allocation, client economics, trend analysis)
- route group: `finance` (requires `'finance'` route group or `efeonce_admin`)

### HR Core + Payroll
- 25+ API routes under `/api/hr/*`
- Chilean payroll processing and compliance
- leave management and attendance tracking
- department and position management
- route group: `hr` (requires `'hr'` route group or `efeonce_admin`)

### Account 360 / Organizations
- organization hierarchy management (EO-ORG)
- person memberships and relationships
- HubSpot company sync for commercial data enrichment
- organization-level analytics

### AI Tooling & Credits
- AI tool catalog with license management
- credit wallet system and metering
- per-tenant AI tool allocation
- capability module access control

### ICO Engine
- 10 operational metrics with daily materialization
- stuck asset detection and detail views
- agency scorecard with cross-tenant rollup
- NULL safety and client name resolution in materialization

### Financial Intelligence
- cost allocation models
- client economics and profitability analysis
- trend analysis and forecasting
- integrated with finance module data

## Current Focus (March 2026)

### Conformed Data Layer
- config-driven property mappings across source systems — **just completed**
- discovery script for schema introspection

### Source Sync Runtime Projections
- runtime projection layer for source sync pipelines — **in progress**
- goal: predictable sync windows and data freshness guarantees

### Person 360 Profile Unification
- canonical identity consolidation across Notion, HubSpot, Google, Microsoft sources — **in progress**
- identity profile source links for deduplication

### PostgreSQL Migration for Finance and Payroll
- migrating finance and payroll tables from BigQuery to PostgreSQL `greenhouse_core` — **in progress**
- goal: transactional consistency for write-heavy financial operations

### Identity Access V2 (Postgres-First RBAC)
- completing the migration of all auth tables to PostgreSQL — **in progress**
- fine-grained permission model beyond route groups
- SCIM provisioning groundwork

## Parallel Streams

### Stream A. Access and Identity
- identity access v2 (Postgres-first RBAC)
- SCIM provisioning
- fine-grained scopes
- Person 360 profile unification

### Stream B. Semantic Data
- conformed data layer
- source sync runtime projections
- ICO Engine metric expansion
- campaign model design (when prioritized)

### Stream C. Client Product UI
- Person 360 tabs and allocation model
- capability module expansion
- campaign views (when campaign model exists)

### Stream D. Internal UI
- agency workspace refinement
- cross-tenant capacity and risk views
- financial intelligence dashboards

### Stream E. Admin and Governance
- SCIM provisioning
- fine-grained scopes and feature flag governance
- audit logging expansion

### Stream F. Finance and HR
- PostgreSQL migration for transactional data
- payroll automation expansion
- reconciliation workflow refinement
- financial intelligence models

## Cross-Cutting Technical Tasks

- add tests for authz helpers
- add tests for tenant isolation on API routes
- add cache strategy per tenant and role where safe
- add error logging for database failures (PostgreSQL + BigQuery)
- add audit logging for auth events and admin actions
- add observability for failed auth, failed queries, and empty-state anomalies
- move repeated metric logic into semantic query functions or marts
- expand ICO Engine materialization coverage

## Done Already (Historical)

- Greenhouse shell routes and navigation
- demo auth with `next-auth`
- Vercel `staging` environment on `develop`
- BigQuery credentials in Vercel
- first real endpoint: `/api/dashboard/kpis`
- dashboard KPIs fed from BigQuery
- `/api/projects` and `/proyectos` fed from BigQuery
- `/api/projects/[id]` and `/api/projects/[id]/tasks` with tenant authorization
- `/proyectos/[id]` with KPI header, tasks table, review pressure and sprint context
- internal navigation from `/proyectos` to project detail
- BigQuery dataset `greenhouse`
- table `greenhouse.clients`
- architecture master plan documented in `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- identity and access design documented in `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- BigQuery identity/access DDL versioned in `bigquery/greenhouse_identity_access_v1.sql`
- runtime auth isolated to `greenhouse.client_users` plus role/scope tables
- `/auth/landing` redirect by `portalHomePath`
- `/internal/dashboard` and `/admin/users` as minimum guarded surfaces
- HubSpot closedwon companies bootstrapped as Greenhouse tenants
- confident project scopes bootstrapped for DDSoft, SSilva, and Sky Airline
- SSO (Microsoft + Google) operational
- PostgreSQL `greenhouse_core` as auth store
- finance module (40+ routes), HR/payroll module (25+ routes)
- ICO Engine with 10 metrics and daily materialization
- agency workspace and internal operations platform
- AI tooling catalog and credit metering
- conformed data layer with config-driven property mappings
