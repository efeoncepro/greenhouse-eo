# Greenhouse Backlog

## Purpose

This backlog is the execution summary of `GREENHOUSE_ARCHITECTURE_V1.md`.

Use it to decide what to build next.
Use the architecture document to understand why, how, and in what order.

## Working Rule

- keep tasks small, mergeable, and verifiable
- prefer vertical slices over wide refactors
- do not introduce product behavior that turns Greenhouse into a second Notion
- a task is not done until build, lint, or meaningful runtime validation has passed

## Master Reference

- `GREENHOUSE_ARCHITECTURE_V1.md` is the source of truth for:
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

Greenhouse is not:
- a second Notion
- a task editing system
- a project management workspace

## Phase Summary

### Phase 0. Alignment and Foundations

Goal:
- lock product boundaries, role model, KPI semantics, and architecture direction

Status:
- in progress

Open activities:
- finalize role matrix
- finalize KPI dictionary
- finalize semantic mart design
- finalize service module taxonomy from HubSpot commercial data
- define module mapping rules from `linea_de_servicio` and `servicios_especificos`
- align all repo docs to `GREENHOUSE_ARCHITECTURE_V1.md`

### Phase 1. Identity, Access, and Multi-User Model

Goal:
- separate tenant metadata from user identity and scope

Status:
- completed

Completed:
- removed legacy fallback to `greenhouse.clients` from runtime auth
- added route guards by route group and role family for client, internal, and admin surfaces
- removed `auth_mode = env_demo` from normal runtime and seeded bcrypt credentials for demo access
- created `/auth/landing` and portal-home redirects by tenant type
- created minimum `/internal/dashboard` and `/admin/users` surfaces
- bootstrapped HubSpot closedwon companies into `greenhouse.clients` and `greenhouse.client_users`
- mapped confident project scopes for imported tenants where a defendable Notion match existed

Residual operational follow-up:
- replace invited bootstrap users with real activation or SSO onboarding flow when customer onboarding starts
- expand campaign scope consumers once campaign routes exist

### Phase 2. Executive Client Dashboard

Goal:
- make `/dashboard` the true product center for client stakeholders

Status:
- partially started

Open activities:
- review and promote the new executive dashboard through `Preview`, `staging` and `Production`
- add `/api/dashboard/capacity` once team and staffing data are modeled
- add `/api/dashboard/market-speed` when time fields become numerically reliable
- add campaign-aware slices once `/campanas` exists

Completed in current iteration:
- created `/api/dashboard/summary`
- created `/api/dashboard/charts`
- created `/api/dashboard/risks`
- redesigned `/dashboard` around executive visibility
- composed dashboard widgets and narrative by `businessLines` and `serviceModules`
- adopted Vuexy chart stack with `apexcharts` + `react-apexcharts` and the `AppReactApexCharts` wrapper pattern from `full-version`
- validated the new dashboard queries against real tenant scope in BigQuery

### Phase 3. Delivery Context and Operational Drilldowns

Goal:
- provide enough context to explain indicators without duplicating Notion

Status:
- partially started

Done:
- `/api/projects`
- `/api/projects/[id]`
- `/api/projects/[id]/tasks`
- `/proyectos`
- `/proyectos/[id]`

Open activities:
- create `/api/sprints`
- create `/api/sprints/[id]`
- build real `/sprints`
- add project timeline and aging to project detail
- add delivery overview route `/entrega`

### Phase 4. Team and Capacity

Goal:
- expose assigned team, role mix, capacity, and load

Status:
- not started

Open activities:
- define source of truth for assignments
- create team and capacity semantic layer
- create `/api/team`
- create `/api/capacity`
- create `/api/capacity/roles`
- build `/equipo`

### Phase 5. Campaign Intelligence

Goal:
- relate campaigns, projects, deliverables, and KPIs

Status:
- not started

Open activities:
- design campaign mapping model
- connect campaign KPI context to `serviceModules`
- create campaign semantic layer
- create `/api/campaigns`
- create `/api/campaigns/[id]`
- create `/api/campaigns/[id]/deliverables`
- create `/api/campaigns/[id]/kpis`
- build `/campanas`
- build `/campanas/[id]`

### Phase 6. Internal Efeonce Visibility

Goal:
- give Efeonce internal users cross-tenant operational and account visibility

Status:
- partially started

Open activities:
- create `/internal/clientes`
- create `/internal/clientes/[id]`
- create `/internal/capacidad`
- create `/internal/riesgos`
- create `/internal/kpis`

### Phase 7. Admin and Governance

Goal:
- provide safe tenant, user, role, scope, and feature administration

Status:
- partially started

Open activities:
- create `/admin/scopes`
- create `/admin/feature-flags`
- expose business line and active service modules in admin governance

Completed in current iteration:
- created `/admin/tenants`
- created `/admin/tenants/[id]`
- created `/admin/tenants/[id]/view-as/dashboard`
- created `/admin/users`
- created `/admin/users/[id]`
- created `/admin/roles`
- adapted Vuexy `user/list/*`, `user/view/*`, and `roles/*` into read-only admin surfaces backed by BigQuery
- added tenant-centric admin views backed by `clients`, `client_users`, `client_service_modules`, and `client_feature_flags`
- reinterpreted `overview`, `security`, and `billing-plans` as user context, access/audit, and future invoice/commercial context

Current adaptation rule:
- use `full-version/src/views/apps/user/list/*` as base for `/admin/users`
- use `full-version/src/views/apps/roles/*` as base for `/admin/roles`
- use `full-version/src/views/apps/user/view/*` as base for `/admin/users/[id]`
- keep `/admin/tenants` as a Greenhouse-specific governance surface centered on company/tenant health, not a direct copy of Vuexy demo business modules
- reinterpret Vuexy tabs:
- `overview` -> user context and scope
- `security` -> access and audit
- `billing-plans` -> invoices and commercial context

## Now

### N0.1 Promotion and Documentation Alignment

- keep `GREENHOUSE_ARCHITECTURE_V1.md` aligned with repo reality
- align `BACKLOG.md`, `project_context.md`, `README.md`, `Handoff.md`, and `changelog.md`
- validate dashboard and admin surfaces in `Preview` or `staging` before the next promotion to `main`

### N2.1 Dashboard Hardening

- avoid recomputing the same overview payload when only one slice needs refresh
- decide if tenant-level cache is safe for summary, charts, and risks

### N2.2 Sky tenant dashboard slice

- use `SKY_TENANT_EXECUTIVE_SLICE_V1.md` as the source of truth before implementation
- completed in current iteration:
- monthly on-time grouped by task creation month
- tenure from first visible operational activity
- deliverables visible by month
- adjustment proxy by month
- reusable monthly quality section with `RpA` and `First-Time Right`
- reusable account team and initial capacity section
- reusable technology tooling and AI tooling sections
- the reusable layer mixes measured signals, Notion-derived signals, service-module defaults, and tenant overrides
- next:
- validate the Sky slice visually in the dashboard
- formalize source models and APIs for team/capacity, tooling, and quality

### N7.1 Governance Surfaces

- expose `businessLines` and `serviceModules`
- create `/admin/scopes`
- create `/admin/feature-flags`
- keep mutations out until tenant-safe write paths and audit strategy are defined

### N3.1 Sprints Slice

- create `/api/sprints`
- create `/api/sprints/[id]`
- build `/sprints`
- connect sprint velocity and health as drilldown, not as a task-management center

## Parallel Streams

### Stream A. Access and Identity

Can move in parallel:
- `client_users`
- auth refactor
- scope helpers
- role matrix implementation

### Stream B. Semantic Data

Can move in parallel:
- KPI dictionary
- marts design
- campaign mapping design
- capacity model design

### Stream C. Client Product UI

Can move in parallel after endpoint contracts are stable:
- dashboard
- project detail refinement
- sprint views
- team views
- campaign views

### Stream D. Internal UI

Can move in parallel after role model is stable:
- internal dashboard
- client health
- internal capacity
- internal risks

### Stream E. Admin

Can move in parallel after access schema exists:
- tenants
- users
- roles
- scopes
- feature flags

## Cross-Cutting Technical Tasks

- add tests for authz helpers
- add tests for tenant isolation on API routes
- add cache strategy per tenant and role where safe
- add error logging for BigQuery failures
- add audit logging for auth events and admin actions
- add observability for failed auth, failed queries, and empty-state anomalies
- move repeated metric logic into semantic query functions or marts

## Done Already

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
- architecture master plan documented in `GREENHOUSE_ARCHITECTURE_V1.md`
- identity and access design documented in `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- BigQuery identity/access DDL versioned in `bigquery/greenhouse_identity_access_v1.sql`
- runtime auth isolated to `greenhouse.client_users` plus role/scope tables
- `/auth/landing` redirect by `portalHomePath`
- `/internal/dashboard` and `/admin/users` as minimum guarded surfaces
- HubSpot closedwon companies bootstrapped as Greenhouse tenants
- confident project scopes bootstrapped for DDSoft, SSilva, and Sky Airline
