# Greenhouse Identity and Access V1

## Purpose

This document is the implementation design for Phase 1 of Greenhouse Architecture V1.

It defines:
- the user model
- the role model
- the scope model
- the target session payload
- how auth should evolve from the current MVP
- which tables must be created
- how different agents can work on the identity and access layer in parallel

Use this document together with:
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `MULTITENANT_ARCHITECTURE.md`
- `bigquery/greenhouse_identity_access_v1.sql`

## Problem Statement

Current Greenhouse MVP still treats the tenant and the login principal as almost the same record.

Current state:
- tenant metadata lives in `greenhouse.clients`
- auth looks up tenant rows directly
- one primary email roughly equals one tenant
- project scope is stored at tenant row level
- role is a single string on the tenant

This is not sufficient for the target product because Greenhouse must support:
- multiple users per client tenant
- different visualization levels inside the same client
- internal Efeonce users with cross-tenant visibility
- admin-only routes and governance flows
- future campaign-level and metric-level scopes

## Design Goals

1. Separate tenant metadata from user identity.
2. Keep client tenant scope server-side and explicit.
3. Allow multiple users per client tenant.
4. Allow internal Efeonce users with different route access.
5. Make sessions rich enough for authorization but still simple to reason about.
6. Support route guards based on:
   - tenant
   - role
   - project scope
   - campaign scope
7. Preserve a controlled migration path from the current MVP.

## Current MVP Model

Current source table:
- `greenhouse.clients`

Current auth characteristics:
- lookup by `primary_contact_email`
- role lives on tenant row
- project scope lives on tenant row
- auth can still use `env_demo`
- session carries `clientId`, `projectIds`, `role`, `featureFlags`, `timezone`, `portalHomePath`, `authMode`

Current strengths:
- simple
- enough for single-demo-tenant MVP
- tenant scope already enforced in core endpoints

Current blockers:
- cannot support multiple client users cleanly
- cannot model Efeonce internal users cleanly
- cannot support multiple role assignments safely
- cannot support partial scopes by user without hacks

## Target Identity Model

### Key principle

Tenant is not user.

The tenant is the account boundary.
The user is the authenticated principal.

### Core entities

#### Tenant

Stored in:
- `greenhouse.clients`

Responsibility:
- client metadata
- tenant status
- tenant-wide defaults
- feature ownership boundary

#### User principal

Stored in:
- `greenhouse.client_users`

Responsibility:
- login identity
- auth state
- user profile
- default navigation and locale

#### Role assignment

Stored in:
- `greenhouse.user_role_assignments`

Responsibility:
- which role a user currently has
- whether the role is tenant-specific or internal-global

#### Scope assignment

Stored in:
- `greenhouse.user_project_scopes`
- `greenhouse.user_campaign_scopes`

Responsibility:
- restrict what a user can see below tenant level

## Table Design

## `greenhouse.client_users`

Purpose:
- store user principals separately from tenants

Expected use cases:
- one client tenant with many people
- one internal Efeonce user with cross-tenant visibility
- one bootstrap internal admin user

Important fields:
- `user_id`
- `client_id`
- `tenant_type`
- `email`
- `microsoft_oid`
- `microsoft_tenant_id`
- `microsoft_email`
- `full_name`
- `status`
- `active`
- `auth_mode`
- `password_hash`
- `password_hash_algorithm`
- `default_portal_home_path`
- `timezone`
- `locale`
- `last_login_at`
- `last_login_provider`

Notes:
- `client_id` can be null for internal-only users if needed
- `tenant_type` is required to avoid ambiguous routing logic
- `auth_mode` should allow `credentials`, `sso`, and `both` while Greenhouse keeps password fallback during the SSO rollout
- `auth_mode = env_demo` should exist only as a temporary bootstrap compatibility path

## `greenhouse.roles`

Purpose:
- canonical role catalog

Recommended roles:
- `client_executive`
- `client_manager`
- `client_specialist`
- `efeonce_account`
- `efeonce_operations`
- `efeonce_admin`

Important fields:
- `role_code`
- `role_name`
- `role_family`
- `tenant_type`
- `is_admin`
- `is_internal`
- `route_group_scope`

Notes:
- keep roles coarse and interpretable
- do not encode project ids or campaign ids into roles
- use scope tables for that

## `greenhouse.user_role_assignments`

Purpose:
- attach one or more roles to a user

Notes:
- this design allows future multi-role users
- even if runtime chooses a “primary role” first, the table should not assume only one role forever
- for client users, assignments should usually include `client_id`

## `greenhouse.user_project_scopes`

Purpose:
- restrict visibility by project when a user should not see all tenant projects

Notes:
- do not use project scope to bypass tenant checks
- tenant validation always happens before scope validation

## `greenhouse.user_campaign_scopes`

Purpose:
- restrict visibility by campaign

Notes:
- campaign scope becomes critical once campaign routes exist
- if a user has tenant-wide executive access, campaign scopes may be optional

## `greenhouse.client_feature_flags`

Purpose:
- separate feature flags from tenant metadata if rollout logic becomes richer

Notes:
- not strictly required for auth, but useful for controlled launches of dashboards, team views, internal routes, or campaign modules

## `greenhouse.audit_events`

Purpose:
- log auth and admin activity

Recommended event types:
- `auth.login_success`
- `auth.login_failure`
- `auth.logout`
- `admin.user_created`
- `admin.role_assigned`
- `admin.scope_changed`
- `admin.feature_flag_changed`

## Role Matrix

### `client_executive`

Primary concerns:
- executive dashboard
- campaigns
- capacity
- risks
- project summary

Should see:
- tenant-wide summary
- project and campaign rollups
- assigned team and capacity summary
- delivery risks

Should not need:
- raw operational editing
- admin routes

### `client_manager`

Primary concerns:
- operational visibility
- projects
- review pressure
- sprint context
- campaign execution detail

Should see:
- everything in executive views
- deeper drilldowns
- scoped task context

### `client_specialist`

Primary concerns:
- subset visibility only

Should see:
- assigned campaigns or projects
- related KPIs and deliverables

Should not see:
- tenant-wide unrelated work

### `efeonce_account`

Primary concerns:
- account health
- client story
- risks and opportunities

Should see:
- assigned client tenants
- dashboard and operational summary per client
- no admin governance by default

### `efeonce_operations`

Primary concerns:
- cross-tenant delivery health
- capacity
- bottlenecks

Should see:
- internal dashboard
- internal capacity views
- cross-tenant operational KPIs

### `efeonce_admin`

Primary concerns:
- governance
- access
- onboarding
- feature enablement

Should see:
- admin routes
- internal routes
- tenant and user management

## Route Group Access

### Client route groups

- `/dashboard`
- `/entrega`
- `/proyectos`
- `/proyectos/[id]`
- `/campanas`
- `/campanas/[id]`
- `/equipo`
- `/settings`

Allowed roles:
- `client_executive`
- `client_manager`
- `client_specialist`

### Internal route groups

- `/internal/dashboard`
- `/internal/clientes`
- `/internal/clientes/[id]`
- `/internal/capacidad`
- `/internal/riesgos`
- `/internal/kpis`

Allowed roles:
- `efeonce_account`
- `efeonce_operations`
- `efeonce_admin`

### Admin route groups

- `/admin/tenants`
- `/admin/users`
- `/admin/roles`
- `/admin/scopes`
- `/admin/feature-flags`

Allowed roles:
- `efeonce_admin`

## Session Model V1 Target

Current session shape is not enough for the next phase.

Recommended session payload:
- `userId`
- `clientId`
- `tenantType`
- `roleCodes`
- `primaryRoleCode`
- `projectScopes`
- `campaignScopes`
- `featureFlags`
- `timezone`
- `portalHomePath`
- `authMode`

### Why this payload

- route groups can be checked using `primaryRoleCode` or `roleCodes`
- project and campaign guards can run without ad hoc table joins on every check if hydrated once at login
- tenant identity remains explicit
- home path can vary by user class

### Recommended TypeScript direction

Current session typing in `src/types/next-auth.d.ts` should evolve from:
- `role: string`
- `projectIds: string[]`

Toward:
- `userId: string`
- `tenantType: 'client' | 'efeonce_internal'`
- `roleCodes: string[]`
- `primaryRoleCode: string`
- `projectScopes: string[]`
- `campaignScopes: string[]`

During migration, it is acceptable to keep compatibility aliases for:
- `role`
- `projectIds`

As long as new code reads from the richer fields first.

## Auth Flow V1 Target

1. User submits email/password or starts Microsoft SSO.
2. Auth layer looks up `client_users` by email or `microsoft_oid`.
3. If user is inactive or status is not valid, reject.
4. Verify password or SSO path according to `auth_mode`, linking Microsoft identity on first successful SSO when the principal already exists.
5. Load active role assignments.
6. Load project scopes and campaign scopes.
7. Load tenant-level feature flags if user is tenant-bound.
8. Build session token with all authorization context.
9. Update `last_login_at` and `last_login_provider` on the user principal.
10. Emit audit event if audit trail is enabled.

## Guard Layer Design

Recommended helpers:
- `requireSession()`
- `requireTenantContext()`
- `requireRole(requiredRoles)`
- `requireRouteGroup(group)`
- `requireProjectScope(projectId)`
- `requireCampaignScope(campaignId)`

### Guard rules

- route group check happens before domain-specific scope check
- tenant check happens before project or campaign check
- internal users must still have explicit allowed route groups
- admin is not implied by being internal

## Migration Strategy

The migration must be incremental.

### Step 1. Add new tables

Create:
- `client_users`
- `roles`
- `user_role_assignments`
- `user_project_scopes`
- `user_campaign_scopes`
- optional `client_feature_flags`
- optional `audit_events`

### Step 2. Seed bootstrap records

Seed:
- demo client executive user
- bootstrap internal admin user
- role catalog
- role assignments
- project scopes for existing demo projects

### Step 3. Adapt auth read path

Refactor auth to:
- read from `client_users`
- load roles and scopes
- stop using tenant row as the login principal

### Step 4. Keep compatibility bridge

During migration:
- `clientId` can still be used
- `role` can be derived from `primaryRoleCode`
- `projectIds` can be derived from `projectScopes`

This minimizes breakage in existing route handlers.

### Step 5. Move `last_login_at`

Current behavior updates `greenhouse.clients.last_login_at`.

Target behavior should update:
- `greenhouse.client_users.last_login_at`

Optionally keep tenant-level login recency later through an aggregate or sync field if the product needs it.

### Step 6. Retire `env_demo`

Once real credentials or SSO exist:
- remove normal runtime dependence on `env_demo`
- keep demo-only fallback only if explicitly needed for local bootstrap

## Current Code Impact

These areas will need change once implementation starts:

### `src/lib/auth.ts`

Needs to evolve from:
- single tenant lookup by email

Toward:
- user principal lookup
- role loading
- scope loading
- richer session token

### `src/lib/tenant/clients.ts`

Needs to be split logically into:
- tenant metadata access
- user principal access
- role assignment access
- project scope access
- campaign scope access

### `src/types/next-auth.d.ts`

Needs richer session typing.

### `src/lib/tenant/get-tenant-context.ts`

Should evolve to return richer auth context:
- userId
- clientId
- tenantType
- roleCodes
- primaryRoleCode
- projectScopes
- campaignScopes
- featureFlags
- timezone
- portalHomePath

## Parallelization Guide

These workstreams can proceed in parallel if coordinated through shared contracts.

### Stream A: BigQuery schema and migration planning

Deliverables:
- DDL
- seed strategy
- migration notes

### Stream B: Type system and auth contracts

Deliverables:
- updated NextAuth type shape
- session payload contract doc
- auth helper interface definitions

### Stream C: Runtime auth refactor

Deliverables:
- new auth queries
- new auth callbacks
- compatibility layer for old session readers

### Stream D: Route guard adoption

Deliverables:
- new guard helpers
- endpoint migration plan
- route-group enforcement

### Coordination rules

- Stream B must define the canonical session shape before Stream C finishes implementation.
- Stream A must stabilize table names before Stream C writes query code.
- Stream D must use shared helpers, not duplicate authorization checks per route family.

## Recommended Implementation Sequence

1. apply `bigquery/greenhouse_identity_access_v1.sql`
2. define TypeScript auth contract target
3. refactor auth lookup to `client_users`
4. load roles and project scopes
5. update session typing
6. migrate `getTenantContext()` to richer context
7. update existing endpoints to read richer fields
8. add internal/admin route guards
9. retire `env_demo`

## Validation Checklist

For schema:
- tables created successfully
- seed roles present
- seed demo user present
- seed role assignments present
- project scopes present

For auth:
- login succeeds for valid principal
- inactive user denied
- user without active role denied
- out-of-scope project id denied
- client user cannot access internal routes
- internal non-admin cannot access admin routes

For migration safety:
- existing `/dashboard` still works
- existing `/proyectos` still works
- existing `/proyectos/[id]` still works
- session payload remains backward-compatible until readers are upgraded

## Immediate Next Implementation Task

Once this design is accepted, the next coding task should be:
- implement the auth read-path migration from `greenhouse.clients` to `greenhouse.client_users`
- update `next-auth` typing and session payload
- add central authz helpers
