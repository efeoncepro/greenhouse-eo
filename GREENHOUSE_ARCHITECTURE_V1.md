# Greenhouse Architecture V1

## Purpose

This document is the working architecture and execution plan for Greenhouse as a multi-tenant client portal for Efeonce.

It is intentionally detailed so any agent can:
- understand the product target
- see what already exists
- know what must be built next
- identify what can be done in parallel
- avoid turning Greenhouse into a second Notion

This document should be treated as the master architecture reference for product, data, access model, route structure, API design, and phased execution.

When this document conflicts with the starter-template shape, the Greenhouse product direction in this document wins unless a newer documented decision supersedes it.

## Product Thesis

Greenhouse is not a project management tool.

Notion remains the system of work.

Greenhouse is the executive and operational visibility layer that lets:
- clients understand how their operation is performing
- client stakeholders understand what is being produced and how fast it is moving
- Efeonce understand account health, delivery health, capacity, and risk across tenants

Terminology contract:
- `tenant`, `client`, and `company` refer to the same business entity in the portal
- one tenant can have one or many users
- tenant metadata and user identity must remain separate tables and separate runtime concepts

The portal must answer:
- what is being delivered
- how fast it is moving
- what is slowing it down
- what capacity is available
- which campaigns or projects are consuming capacity
- how current operational behavior affects client KPIs

## Product Boundaries

### What Greenhouse must do

- show executive dashboards
- show tenant-scoped operational context
- show projects, deliverables, tasks, and sprints as drilldown context
- show team assignment and capacity
- relate campaigns, projects, deliverables, and indicators
- support different user roles and visibility levels
- support internal Efeonce admin and internal KPI views

### What Greenhouse must not become

- a second Notion
- a task editing workspace
- a full CRUD project management app
- a workflow board where daily work is performed
- a place where users re-enter operational data already living in Notion

## Core Product Principles

1. Read-model first
- Greenhouse consumes operational truth from source systems and exposes decision-ready views.

2. Tenant isolation first
- all data access is scoped by tenant and role
- browser-supplied ids never define authorization

3. Executive-first UX
- dashboard and summary views are primary
- detailed tables are drilldowns, not the center of the app

4. Role-aware views
- the same route family may render different depth depending on role
- internal Efeonce routes stay clearly separated from client routes

5. Semantic metric layer
- business KPIs should not be recomputed ad hoc in every endpoint
- derived metrics belong in semantic marts or reusable query functions

6. Small vertical slices
- each phase should end with usable product value
- do not block all progress on a grand rewrite

7. Reusable executive UI system
- dashboard and executive surfaces must share a stable visual language
- Vuexy analytics is a composition reference, not a screen to copy
- reusable executive cards belong in `src/components/greenhouse/**`

## Personas

### Client personas

#### Client Executive
- usually a head of marketing, marketing director, growth lead, brand lead, or business owner
- needs a high-level but trustworthy read of operation health
- cares about output, speed, visibility, and bottlenecks
- rarely needs raw task-level detail

#### Client Manager
- usually a marketing manager, marketing operations lead, campaign lead, or internal coordinator
- needs deeper operational context
- cares about projects, campaigns, pending approvals, blocked work, and team load
- may drill into tasks and sprint context

#### Client Specialist
- optional lower-level client user
- sees only a subset of projects or campaigns
- may be restricted to a team, market, brand, or initiative

### Efeonce personas

#### Efeonce Account
- owns one or more client relationships
- needs a client health view, major risks, throughput, review pressure, and current delivery story

#### Efeonce Operations
- needs cross-tenant operational visibility
- tracks capacity, blocked work, team utilization, review backlog, and speed-to-market

#### Efeonce Admin
- manages tenants, users, scopes, roles, feature flags, and access policy
- must see internal admin routes unavailable to client users

## Access Model

Access must be modeled with both tenant and role.

### Axis 1: tenant_type

- `client`
- `efeonce_internal`

### Axis 2: role_code

Initial recommended roles:
- `client_executive`
- `client_manager`
- `client_specialist`
- `efeonce_account`
- `efeonce_operations`
- `efeonce_admin`

### Axis 3: scope_level

- `tenant_all`
- `campaign_subset`
- `project_subset`
- `metric_subset`

### Required access outcomes

- client users only see their tenant
- client users may still have partial visibility within the tenant
- Efeonce internal users may see one client, many clients, or all clients depending on role
- admin-only actions must be separated from operational read-only views

## Information Architecture

### Client app

- `/dashboard`
- `/entrega`
- `/proyectos`
- `/proyectos/[id]`
- `/campanas`
- `/campanas/[id]`
- `/equipo`
- `/settings`

### Internal Efeonce app

- `/internal/dashboard`
- `/internal/clientes`
- `/internal/clientes/[id]`
- `/internal/capacidad`
- `/internal/riesgos`
- `/internal/kpis`

### Admin app

- `/admin/tenants`
- `/admin/tenants/[id]`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/roles`
- `/admin/scopes`
- `/admin/feature-flags`

### Route design rules

- client routes and internal routes stay visibly separated
- admin routes must not share casual navigation with client routes
- tasks do not get a first-level top-nav route by default
- project detail and campaign detail are drilldown contexts

## Service Module Capability Layer

Greenhouse needs one more axis beyond tenant, role, and scope:
- business line
- service modules

Purpose:
- adapt product surfaces to the services the client actually contracted
- avoid hardcoding dashboard variants by tenant name
- keep CRM, creative, and web experiences composable

Source of truth today:
- `efeonce-group.hubspot_crm.deals.linea_de_servicio`
- `efeonce-group.hubspot_crm.deals.servicios_especificos`

Observed current business families from closedwon deals:
- `crm_solutions`
- `globe`
- `wave`

Observed current service-module values from closedwon deals:
- `licenciamiento_hubspot`
- `implementacion_onboarding`
- `consultoria_crm`
- `agencia_creativa`
- `desarrollo_web`

Rules:
- service modules are not the primary security model
- security still comes from roles and scopes
- service modules decide which parts of the product are relevant for a tenant

Recommended runtime outcomes:
- navigation filtered by `routeGroups` plus `serviceModules`
- dashboard widgets selected by module applicability
- admin and billing views show business line and active modules

Reference:
- `GREENHOUSE_SERVICE_MODULES_V1.md`

## Product Modules

### 1. Executive Visibility

Primary consumer:
- client_executive
- client_manager
- efeonce_account
- efeonce_operations

Primary outputs:
- KPI strip
- throughput trends
- time-to-market trends
- review pressure
- capacity usage
- operational risk flags

### 2. Delivery Context

Primary consumer:
- client_manager
- efeonce_account
- efeonce_operations

Primary outputs:
- projects
- tasks as context only
- sprint context
- delivery timeline
- review bottlenecks

### 3. Team and Capacity

Primary consumer:
- client_executive
- client_manager
- efeonce_operations
- efeonce_admin

Primary outputs:
- assigned team
- role mix
- capacity contracted
- capacity used
- saturation and gap indicators

### 4. Campaign Intelligence

Primary consumer:
- client_executive
- client_manager
- efeonce_account

Primary outputs:
- campaign to project mapping
- deliverables by campaign
- effort by campaign
- time-to-market by campaign
- campaign KPI context

### 5. Internal Operations and Governance

Primary consumer:
- efeonce_account
- efeonce_operations
- efeonce_admin

Primary outputs:
- cross-tenant health
- cross-tenant capacity
- admin controls
- access management
- feature enablement

## Data Sources

### Current sources

- `efeonce-group.notion_ops.tareas`
- `efeonce-group.notion_ops.proyectos`
- `efeonce-group.notion_ops.sprints`
- `efeonce-group.hubspot_crm.*`
- `efeonce-group.greenhouse.clients`

### Recommended future sources

- staffing or assignment source if team assignment is not derivable from Notion alone
- campaign-to-project mapping source if not reliable in current Notion structure
- commercial scope metadata if needed from HubSpot

## Data Architecture

Greenhouse should move from direct-table ad hoc reads toward a layered analytics model.

### Layer A: source operational tables

This is where current reality already lives.

Examples:
- `notion_ops.tareas`
- `notion_ops.proyectos`
- `notion_ops.sprints`
- `hubspot_crm.deals`
- `hubspot_crm.companies`
- `hubspot_crm.contacts`

### Layer B: Greenhouse control tables

This is where access, tenant metadata, and app governance live.

Recommended tables:
- `greenhouse.clients`
- `greenhouse.client_users`
- `greenhouse.roles`
- `greenhouse.user_role_assignments`
- `greenhouse.user_project_scopes`
- `greenhouse.user_campaign_scopes`
- `greenhouse.client_feature_flags`
- `greenhouse.audit_events`

### Layer C: semantic marts

This is the key missing layer.

Recommended dataset:
- `greenhouse_marts`

Recommended dimensions:
- `dim_clients`
- `dim_projects`
- `dim_campaigns`
- `dim_sprints`
- `dim_users`
- `dim_roles`
- `dim_teams`

Recommended facts:
- `fact_tasks`
- `fact_deliverables`
- `fact_project_health_daily`
- `fact_sprint_health_daily`
- `fact_capacity_daily`
- `fact_market_speed_daily`
- `fact_review_friction_daily`
- `fact_campaign_performance_daily`

### Why semantic marts matter

Without semantic marts:
- metrics get duplicated across endpoints
- meaning drifts across screens
- campaign, project, and tenant metrics become inconsistent
- performance and maintainability degrade

With semantic marts:
- KPIs have one canonical definition
- charts and detail pages use the same semantics
- internal and client dashboards can share metric logic safely

## Recommended Control Schema

### `greenhouse.clients`

Keep for tenant metadata:
- `client_id`
- `client_name`
- `status`
- `active`
- `primary_contact_email`
- `hubspot_company_id`
- `feature_flags`
- `timezone`
- `portal_home_path`
- `notes`
- `created_at`
- `updated_at`

This table should stop being the long-term home for user credentials.

### `greenhouse.client_users`

Recommended fields:
- `user_id`
- `client_id`
- `email`
- `full_name`
- `status`
- `active`
- `tenant_type`
- `password_hash`
- `password_hash_algorithm`
- `auth_mode`
- `last_login_at`
- `created_at`
- `updated_at`

### `greenhouse.roles`

Recommended fields:
- `role_code`
- `role_name`
- `role_family`
- `description`
- `is_internal`
- `created_at`
- `updated_at`

### `greenhouse.user_role_assignments`

Recommended fields:
- `assignment_id`
- `user_id`
- `role_code`
- `client_id`
- `effective_from`
- `effective_to`
- `active`

### `greenhouse.user_project_scopes`

Recommended fields:
- `scope_id`
- `user_id`
- `client_id`
- `project_id`
- `active`

### `greenhouse.user_campaign_scopes`

Recommended fields:
- `scope_id`
- `user_id`
- `client_id`
- `campaign_id`
- `active`

## Metric Taxonomy

The portal should standardize metric domains.

### Delivery volume

- deliverables completed
- tasks completed
- active work items
- throughput weekly
- throughput monthly

### Speed

- lead time
- cycle time
- review time
- changes time
- time to market
- projected time to market

### Quality and friction

- review rounds
- open comments
- blocked items
- rework ratio
- aging work
- on-time delivery rate

### Capacity

- capacity contracted
- capacity assigned
- capacity used
- utilization by role
- overload by role
- idle capacity

### Campaign intelligence

- output by campaign
- effort by campaign
- speed by campaign
- campaign load on team
- campaign share of total output

## API Architecture

Endpoints should be organized by domain, not by source table.

### Client endpoints

Dashboard:
- `/api/dashboard/summary`
- `/api/dashboard/charts`
- `/api/dashboard/capacity`
- `/api/dashboard/market-speed`
- `/api/dashboard/risks`

Delivery:
- `/api/projects`
- `/api/projects/[id]`
- `/api/projects/[id]/tasks`
- `/api/projects/[id]/timeline`
- `/api/projects/[id]/review-pressure`
- `/api/sprints`
- `/api/sprints/[id]`

Campaigns:
- `/api/campaigns`
- `/api/campaigns/[id]`
- `/api/campaigns/[id]/deliverables`
- `/api/campaigns/[id]/kpis`

Team:
- `/api/team`
- `/api/capacity`
- `/api/capacity/roles`

Settings:
- `/api/settings/profile`
- `/api/settings/preferences`

### Internal endpoints

- `/api/internal/dashboard`
- `/api/internal/clients`
- `/api/internal/clients/[id]/health`
- `/api/internal/capacity`
- `/api/internal/risks`
- `/api/internal/kpis`

### Admin endpoints

- `/api/admin/tenants`
- `/api/admin/users`
- `/api/admin/roles`
- `/api/admin/scopes`
- `/api/admin/feature-flags`

## Authorization Architecture

### Short-term target

Use a central auth helper set:
- `requireSession()`
- `requireTenantContext()`
- `requireRole()`
- `requireProjectScope()`
- `requireCampaignScope()`

### Session payload target

Session should carry:
- `userId`
- `clientId`
- `tenantType`
- `roleCodes`
- `projectScopes`
- `campaignScopes`
- `featureFlags`
- `timezone`
- `portalHomePath`

### Rules

- never trust browser-provided client ids
- never trust browser-provided project ids for access
- every cache key must include tenant identity when data is tenant-specific
- internal routes should still check role and scope, not just presence of session

## UI Component Reuse Strategy

The `full-version` folder is reference material, not merge material.

### Good candidates to adapt

Dashboard patterns:
- cards and chart framing from `src/views/dashboards/analytics/*`
- status and chart layout from `src/views/dashboards/crm/*`
- executive hierarchy from `WebsiteAnalyticsSlider`, `EarningReports`, `SupportTracker`, and `ProjectsTable`

Table patterns:
- searchable and sortable table patterns from `src/views/react-table/*`
- filtered list patterns from `src/views/apps/user/list/*`

Admin patterns:
- role and permission list layouts from `src/views/apps/roles/*`
- permission management structure from `src/views/apps/permissions/*`
- user list and user detail layouts from `src/views/apps/user/list/*` and `src/views/apps/user/view/*`

Admin detail reuse rule:
- Vuexy `overview`, `security`, and `billing-plans` tabs are acceptable structural references for `/admin/users/[id]`
- but they must be semantically remapped to Greenhouse instead of copied as template business meaning
- recommended reinterpretation:
- `overview` -> tenant, roles, scopes, feature flags, project access, activity summary
- `security` -> auth mode, last login, reset flows, MFA readiness, audit events
- `billing-plans` -> invoices, contracted fee, commercial plan, usage and account billing context
- do not import template fake invoices, payment methods, or device history as product truth

### What must be adapted before reuse

- naming
- metric semantics
- navigation labels
- fake data assumptions
- action menus implying CRUD workflows not wanted in Greenhouse

### Executive UI system rule

Reference:
- `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`

The dashboard and future executive surfaces should converge on:
- one dominant hero card
- compact summary cards
- medium analysis cards with `CardHeader`
- bottom contextual lists or tables

This rule applies to:
- `/dashboard`
- future `/equipo`
- future `/campanas`
- internal executive views
- admin overview surfaces when they need executive readability

### What must not be imported as-is

- fake-db logic
- ecommerce semantics
- invoice semantics
- academy semantics
- template search data and unrelated menu trees

## Phase Plan

The phases below are ordered by value and dependencies.

Each phase is split into activities.

Each activity includes:
- goal
- outputs
- dependencies
- parallelization notes
- validation expectations

## Phase 0: Alignment and Foundations

### Objective

Lock product boundaries, role model, semantic model, and data architecture before scale creates inconsistencies.

### Activity 0.1: Product framing lock

Goal:
- document Greenhouse as executive visibility portal, not second Notion

Outputs:
- architecture document
- updated backlog
- updated project context
- updated handoff references

Dependencies:
- none

Parallelization:
- can run in parallel with technical discovery

Validation:
- docs reviewed and referenced by repo context files

### Activity 0.2: Service module taxonomy

Goal:
- define how Greenhouse composes product slices by contracted services

Outputs:
- service module taxonomy
- mapping rules from HubSpot commercial data
- runtime contract for `businessLines` and `serviceModules`

Dependencies:
- Activity 0.1

Parallelization:
- can run in parallel with KPI and semantic model work

Validation:
- module composition rules are documented and tied to real source fields in BigQuery

### Activity 0.3: Role model definition

Goal:
- define official roles, access depth, and route access

Outputs:
- role matrix
- route matrix
- permission policy draft

Dependencies:
- Activity 0.1

Parallelization:
- can run in parallel with data model design

Validation:
- every route family mapped to at least one role

### Activity 0.4: Semantic KPI model

Goal:
- define metric formulas and ownership

Outputs:
- KPI dictionary
- metric source mapping
- known gaps list

Dependencies:
- Activity 0.1

Parallelization:
- can run in parallel with role design

Validation:
- each KPI has definition, grain, source, and intended audience

### Activity 0.5: Data mart design

Goal:
- design dimensions and fact tables that support dashboards and drilldowns

Outputs:
- draft schema for `greenhouse_marts`
- refresh strategy
- dependency map from source tables

Dependencies:
- Activity 0.3

Parallelization:
- can run in parallel with access model implementation planning

Validation:
- each target dashboard metric can be sourced from marts without per-endpoint reinvention

## Phase 1: Identity, Access, and Multi-User Model

### Objective

Stop treating tenant and user as the same thing.

### Activity 1.1: Create `client_users`

Goal:
- separate users from tenants

Outputs:
- DDL
- seed strategy
- migration plan from `greenhouse.clients`

Dependencies:
- Phase 0 role model

Parallelization:
- can run in parallel with session helper refactor

Validation:
- one tenant can support multiple users

### Activity 1.2: Session payload redesign

Goal:
- move session from single-tenant-contact model to user-plus-scope model

Outputs:
- updated auth callbacks
- typed session extensions
- central auth helper layer

Dependencies:
- Activity 1.1

Parallelization:
- can run in parallel with admin route skeleton work

Validation:
- session contains user, tenant, roles, and scopes

### Activity 1.3: Scope enforcement helpers

Goal:
- ensure project and campaign access are consistent everywhere

Outputs:
- `requireTenantContext`
- `requireRole`
- `requireProjectScope`
- `requireCampaignScope`

Dependencies:
- Activity 1.2

Parallelization:
- can run in parallel with endpoint migrations

Validation:
- existing and new endpoints reject out-of-scope ids

### Activity 1.4: Remove `env_demo`

Goal:
- eliminate bootstrap auth mode from runtime path except local emergency fallback if explicitly kept

Outputs:
- real `password_hash` or SSO flow
- updated seed strategy
- updated docs

Dependencies:
- Activity 1.1

Parallelization:
- can run in parallel with role matrix implementation

Validation:
- login no longer depends on demo password env for seeded tenant

## Phase 2: Executive Client Dashboard

### Objective

Make `/dashboard` the real product center.

### Activity 2.1: Build semantic dashboard endpoints

Goal:
- provide dashboard-specific data contracts

Outputs:
- `/api/dashboard/summary`
- `/api/dashboard/charts`
- `/api/dashboard/capacity`
- `/api/dashboard/market-speed`
- `/api/dashboard/risks`
- module-aware widget contract

Dependencies:
- Phase 0 service module taxonomy
- Phase 0 KPI model
- Phase 1 auth helpers

Parallelization:
- endpoint work can be split by domain between agents

Validation:
- each endpoint documented with payload and role access
- dashboard payloads can be composed by `serviceModules`

### Activity 2.2: Redesign dashboard UI

Goal:
- deliver executive-facing home experience

Outputs:
- KPI strip
- trend charts
- capacity section
- risk section
- campaigns-in-focus block
- reusable executive UI layer aligned to `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`

Dependencies:
- Activity 2.1

Parallelization:
- UI blocks can be split across agents if payloads are stable

Validation:
- client_executive can understand operation health from one page
- the first screen has clear hierarchy and no visually flat wall of cards

### Activity 2.3: Drilldown contracts

Goal:
- ensure dashboard widgets point to meaningful secondary views

Outputs:
- links to projects, campaigns, team, and risks

Dependencies:
- Activity 2.2

Parallelization:
- can run in parallel with project and campaign detail refinement

Validation:
- every dashboard card links to a supporting context view where appropriate

## Phase 3: Delivery Context and Operational Drilldowns

### Objective

Provide enough project, task, and sprint context to explain indicators.

### Activity 3.1: Stabilize project detail

Goal:
- improve project detail from raw slice to productized drilldown

Outputs:
- timeline section
- aging section
- review-pressure section
- campaign relation block

Dependencies:
- existing `/proyectos/[id]`

Parallelization:
- timeline and review-pressure can be separate agent tasks

Validation:
- a client manager can explain project health without leaving Greenhouse

### Activity 3.2: Real sprint module

Goal:
- build sprint context only as a speed and predictability lens

Outputs:
- `/api/sprints`
- `/api/sprints/[id]`
- `/sprints`

Dependencies:
- Phase 1 auth helpers

Parallelization:
- endpoint and UI can be split

Validation:
- sprint view explains delivery speed, not task management workflow

### Activity 3.3: Delivery overview route

Goal:
- aggregate projects, deliverables, and operational load into one route

Outputs:
- `/entrega`

Dependencies:
- dashboard metrics
- project and sprint contracts

Parallelization:
- can be split by section

Validation:
- route provides a delivery operations narrative, not a backlog board

## Phase 4: Team and Capacity

### Objective

Expose the assigned team and operational capacity clearly.

### Activity 4.1: Team assignment model

Goal:
- model which people or roles are assigned to a client, campaign, or project

Outputs:
- schema decision
- source-of-truth mapping
- team assignment query layer

Dependencies:
- staffing source clarity

Parallelization:
- schema and source research can run in parallel

Validation:
- every visible team member or role has an authoritative source

### Activity 4.2: Capacity metrics

Goal:
- define and expose capacity metrics by role and tenant

Outputs:
- `/api/team`
- `/api/capacity`
- `/api/capacity/roles`

Dependencies:
- Activity 4.1

Parallelization:
- endpoint work can be split from UI work

Validation:
- users can see contracted capacity, assigned capacity, and actual usage

### Activity 4.3: Team route

Goal:
- create `/equipo`

Outputs:
- assigned team cards
- role mix
- load by role
- capacity risks

Dependencies:
- Activity 4.2

Parallelization:
- card sections can be parallelized

Validation:
- client_executive can understand who is supporting the account and how loaded the team is

## Phase 5: Campaign Intelligence

### Objective

Relate campaigns to operational output and KPIs.

### Activity 5.1: Campaign mapping model

Goal:
- define how campaigns map to projects, tasks, and deliverables

Outputs:
- campaign dimension design
- mapping rules
- gap list where manual mapping may be needed
- service-module interpretation per campaign

Dependencies:
- semantic mart design

Parallelization:
- can run in parallel with dashboard iteration

Validation:
- every campaign shown in Greenhouse has a reproducible mapping to operational work

### Activity 5.2: Campaign endpoints

Goal:
- create campaign-serving APIs

Outputs:
- `/api/campaigns`
- `/api/campaigns/[id]`
- `/api/campaigns/[id]/deliverables`
- `/api/campaigns/[id]/kpis`

Dependencies:
- Activity 5.1

Parallelization:
- each endpoint family can be separate

Validation:
- campaign views reconcile to project and deliverable facts

### Activity 5.3: Campaign UI

Goal:
- create `/campanas` and `/campanas/[id]`

Outputs:
- campaign summary
- output and effort by campaign
- speed to market by campaign
- KPI relation blocks

Dependencies:
- Activity 5.2

Parallelization:
- list and detail can be split

Validation:
- client_executive can connect campaigns to operational performance and output

## Phase 6: Internal Efeonce Visibility

### Objective

Enable internal operational and account oversight across tenants.

### Activity 6.1: Internal dashboard

Goal:
- create cross-tenant operational dashboard

Outputs:
- `/internal/dashboard`

Dependencies:
- semantic marts
- role model

Parallelization:
- KPI blocks can be split

Validation:
- internal users can rank clients by risk and health

### Activity 6.2: Client health detail

Goal:
- create `/internal/clientes` and `/internal/clientes/[id]`

Outputs:
- client health cards
- risk and opportunity views
- client-specific capacity and delivery context

Dependencies:
- Activity 6.1

Parallelization:
- list and detail can be split

Validation:
- account leads can prepare client conversations directly from Greenhouse

### Activity 6.3: Internal capacity and risk

Goal:
- expose cross-tenant staffing and risk views

Outputs:
- `/internal/capacidad`
- `/internal/riesgos`
- `/internal/kpis`

Dependencies:
- Phase 4 capacity model

Parallelization:
- each route family can be separate

Validation:
- operations can identify overloaded disciplines and systemic delivery risk

## Phase 7: Admin and Governance

### Objective

Provide safe and explicit admin capabilities.

### Activity 7.1: Tenant admin

Goal:
- manage tenants and metadata

Outputs:
- `/admin/tenants`
- `/admin/tenants/[id]`

Dependencies:
- multi-user model

Parallelization:
- list and detail can be split

Current runtime status:
- `/admin/tenants` and `/admin/tenants/[id]` already exist as read-only governance surfaces
- the current implementation treats tenant as the company-level unit of governance
- detail pages already consolidate users, service modules, feature flags, and visible projects for a tenant

Validation:
- admins can onboard and maintain tenants without direct table edits

### Activity 7.2: User and role admin

Goal:
- manage users and access

Outputs:
- `/admin/users`
- `/admin/users/[id]`
- `/admin/roles`

Recommended reuse:
- adapt Vuexy `src/views/apps/user/list/*` for `/admin/users`
- adapt Vuexy `src/views/apps/roles/*` for `/admin/roles`
- adapt Vuexy `src/views/apps/user/view/*` for `/admin/users/[id]`
- treat `billing-plans` as future invoice and commercial context surface, not payment-method demo UI

Dependencies:
- Phase 1 tables

Parallelization:
- user views and role views can be split

Validation:
- admins can inspect and change role assignments safely

### Activity 7.3: Scope and feature admin

Goal:
- manage project, campaign, and feature access

Outputs:
- `/admin/scopes`
- `/admin/feature-flags`
- service module governance visibility

Dependencies:
- scope tables

Parallelization:
- flags and scopes can be separate workstreams

Validation:
- admin can restrict or enable slices without code edits

## Parallelization Guide

The following streams can often proceed in parallel after Phase 0:

### Stream A: access and identity
- client_users
- auth callbacks
- session typing
- scope guards

### Stream B: semantic data
- KPI dictionary
- marts design
- materialized queries
- refresh jobs

### Stream C: client product UI
- dashboard
- team
- campaign list
- project and sprint drilldowns

### Stream D: internal product UI
- internal dashboard
- internal clients
- internal capacity
- internal risks

### Stream E: admin
- tenants
- users
- roles
- scopes
- feature flags

### Coordination rules for parallel work

- no agent should redefine KPI semantics in UI code
- no agent should add a new role without documenting it in the role matrix
- no agent should create an endpoint payload without documenting the contract if it will be consumed by another agent
- shared contracts must live in `src/types/**`
- shared query logic must live in `src/lib/**`
- all new route families must be documented in `project_context.md` and `Handoff.md`

## Recommended Repo Structure Evolution

Current structure is acceptable for the MVP but should evolve.

Recommended additions:
- `src/components/greenhouse/**`
- `src/lib/authz/**`
- `src/lib/campaigns/**`
- `src/lib/capacity/**`
- `src/lib/internal/**`
- `src/lib/marts/**`
- `src/types/api/**`
- `src/views/greenhouse/dashboard/**`
- `src/views/greenhouse/projects/**`
- `src/views/greenhouse/campaigns/**`
- `src/views/greenhouse/team/**`
- `src/views/greenhouse/internal/**`
- `src/views/greenhouse/admin/**`

Component boundary rule:
- shared Greenhouse UI primitives belong in `src/components/greenhouse/**`
- route or module composition belongs in `src/views/greenhouse/**`
- no view should recreate cards, headings, or chip groups ad hoc if they can be promoted to the shared Greenhouse layer

## Validation Strategy

### For docs and architecture changes

- update `project_context.md`
- update `BACKLOG.md`
- update `Handoff.md`
- update `changelog.md` when architecture or roadmap changes materially

### For API changes

- validate authorization
- validate out-of-scope rejection
- validate tenant filtering
- validate payload shape

### For UI changes

- validate desktop and mobile
- validate empty state
- validate error state
- validate role-based visibility

### For data changes

- validate source columns exist
- validate metric formulas against samples
- validate no cross-tenant leakage
- validate internal and client numbers reconcile when expected

## Known Risks

- auth remains partially bootstrap-based until `client_users` and real credentials land
- campaign mapping may be incomplete in current operational data
- capacity may need source enrichment beyond current Notion tables
- BigQuery query logic may drift unless semantic marts are introduced early
- internal and client views may fork semantically if KPI definitions are not centralized
- tenant-specific KPI requests can push the product into misleading metrics if source quality is not validated first
- current RpA source quality is not yet strong enough to justify tenant-facing `First-Time Right` claims by default

## Tenant-Specific Implementation Notes

The architecture must allow tenant-specific emphasis without hardcoding product semantics by tenant name.

Current active tenant-specific initiative:
- `SKY_TENANT_EXECUTIVE_SLICE_V1.md`

Rule:
- a tenant-specific request may change copy, emphasis, or sequencing
- it must not bypass KPI governance, semantic consistency, or source-of-truth rules

For Sky specifically, the current architecture stance is:
- monthly `on-time` is allowed if derived from defendable task-level delivery status
- tenure is allowed once the canonical start-date rule is approved
- monthly RpA and `First-Time Right` remain blocked until source quality improves
- assigned account team, capacity, technology tools, and AI tools require explicit models and must not be inferred from incidental task assignees or raw JSON keyword matches

## Decisions Locked By This Document

- Greenhouse is not a second Notion
- project, task, and sprint views are context views, not primary workflow views
- executive dashboard is the primary client landing experience
- user identity must be separated from tenant metadata
- client and internal Efeonce views must be separated at route level
- semantic marts are a required medium-term architecture step, not an optional cleanup

## Immediate Next Actions

1. Refactor `/dashboard` into the reusable executive UI system defined in `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`.
2. Build `/admin/scopes` and `/admin/feature-flags`.
3. Build `/api/sprints` and the real `/sprints`.
4. Extend `serviceModules` from dashboard composition into navigation and billing context.
5. Formalize team/capacity, tooling, and quality APIs so the new dashboard cards stop depending on controlled overrides.
6. Continue KPI dictionary and semantic mart design so dashboard, team, and campaigns do not drift.

## Agent Working Notes

If you are a new agent entering this repo:

1. Read `AGENTS.md`.
2. Read `project_context.md`.
3. Read `Handoff.md`.
4. Read this document fully before changing architecture, auth, routes, or data models.
5. If your task touches roles, KPIs, routes, marts, or tenant model, update this document or explicitly state why not.

This document is not optional context for architecture-changing work.

## Related Design Documents

- `GREENHOUSE_IDENTITY_ACCESS_V1.md`: Phase 1 identity, roles, scopes, session model, and migration design
- `bigquery/greenhouse_identity_access_v1.sql`: proposed BigQuery schema and bootstrap seed for users, roles, and scopes
- `SKY_TENANT_EXECUTIVE_SLICE_V1.md`: validated scope and feasibility notes for the Sky Airline dashboard slice
- `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`: reusable executive UI contract derived from Vuexy analytics hierarchy
