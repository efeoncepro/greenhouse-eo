# Greenhouse Multi-Tenant Architecture

## Status

This document remains useful as the tenant-focused reference.

For the full product architecture, phased roadmap, role hierarchy, internal/admin route model, KPI semantics, and multi-agent execution plan, use:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

If both documents overlap, `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` is the broader source of truth and this document should stay focused on tenant isolation and auth boundaries.

## Objective

Greenhouse must serve multiple clients from one Next.js application without exposing cross-tenant data. The tenant boundary is `client_id`.

Terminology used in this repo:
- `tenant` = `client` = `company`
- a tenant is the company-level container used for isolation, governance, and product composition
- users are not the tenant; they are identities associated to a tenant through `client_id`
- the intended runtime model is one tenant to many users, even if bootstrap data started with one contact per company

Object-model clarification:
- in the 360 architecture, `greenhouse.clients.client_id` is the canonical Client object anchor
- modules may enrich the client, but they must not create a parallel tenant identity if `client_id` already exists

## Tenant Boundary

- Every authenticated session carries a single `client_id`.
- Every business query must derive scope from tenant context, never from browser-supplied ids.
- The first filter boundary for MVP is `notion_project_ids`.
- Admin access is explicit and role-based. It is not implied by knowing a URL.

## Source of Truth

Current system of record:
- BigQuery dataset: `efeonce-group.greenhouse`
- Tenant metadata and canonical Client anchor: `greenhouse.clients`
- User identity and access: `greenhouse.client_users`, `greenhouse.roles`, `greenhouse.user_role_assignments`, `greenhouse.user_project_scopes`, `greenhouse.user_campaign_scopes`
- Current admin governance surfaces: `/admin/tenants`, `/admin/tenants/[id]`, `/admin/users`, `/admin/users/[id]`, `/admin/roles`

Current source systems for operational data:
- `efeonce-group.notion_ops.tareas`
- `efeonce-group.notion_ops.proyectos`
- `efeonce-group.notion_ops.sprints`
- `efeonce-group.hubspot_crm.*`

Rule:
- external systems may enrich the Client object
- external systems are not the canonical Client identity inside Greenhouse

## MVP Tenant Table

`greenhouse.clients` currently stores:
- `client_id`
- `client_name`
- `status`
- `active`
- `primary_contact_email`
- `password_hash`
- `password_hash_algorithm`
- `role`
- `notion_project_ids`
- `hubspot_company_id`
- `allowed_email_domains`
- `feature_flags`
- `timezone`
- `portal_home_path`
- `auth_mode`
- `notes`
- `created_at`
- `updated_at`
- `last_login_at`

This is enough to replace the current env-based demo scope and move the portal into a real multi-tenant model.

## Runtime Flow

### 1. Authentication

Current flow:
1. User submits email and password.
2. NextAuth queries `greenhouse.client_users` and joins `greenhouse.clients` only for tenant metadata.
3. Reject login if `active = false` or `status != 'active'`.
4. Verify password against `password_hash` when `auth_mode = 'credentials'`.
5. Build session token with:
   - `userId`
   - `clientId`
   - `tenantType`
   - `roleCodes`
   - `primaryRoleCode`
   - `routeGroups`
   - `projectScopes`
   - `campaignScopes`
   - `featureFlags`
   - `timezone`
   - `portalHomePath`
   - legacy compatibility aliases for existing routes

Current production-ready baseline:
- Runtime auth no longer falls back to `greenhouse.clients`.
- Demo and internal admin users authenticate with bcrypt credentials.
- Imported HubSpot contacts remain in `invited` state until onboarding activates them.
- `src/lib/bigquery.ts` already handles both the minified JSON form and the legacy escaped JSON form of `GOOGLE_APPLICATION_CREDENTIALS_JSON` used by Vercel Preview envs.
- A failed login in `Preview` is not enough to conclude wrong credentials; first isolate whether BigQuery credentials were parsed correctly in the running deployment.
- Vuexy's generic JWT session pattern is compatible with this, but its ACL/permissions demo is not the source of truth for Greenhouse authorization.
- Greenhouse authorization is server-side and tenant-aware; it must not rely on template-only client ACL checks.

### 2. Session and Tenant Context

Create a single tenant helper that returns:
- `userId`
- `clientId`
- `tenantType`
- `roleCodes`
- `primaryRoleCode`
- `projectScopes`
- `campaignScopes`
- `role`
- `projectIds`
- `featureFlags`
- `timezone`

Every server route should use that helper instead of reading raw session fields in multiple places.

## JWT and ACL Clarification

- Greenhouse already uses JWT sessions through NextAuth.
- The JWT is only the session transport for identity and claims.
- Authorization is a separate concern and is resolved from BigQuery-backed role and scope tables.
- Vuexy's permissions/ACL examples are useful for admin UI patterns and navigation concepts.
- They are not sufficient for:
  - tenant isolation
  - project-level scoping
  - campaign-level scoping
  - internal vs client route separation
- The correct Greenhouse model is:
  - JWT session
  - server-side tenant context
  - role-based route access
  - project and campaign scopes
  - API-level enforcement on every business query

### 3. Query Layer

Rules:
- Browser never sends arbitrary project ids for authorization.
- API routes always use tenant context from session.
- Queries must filter by `projectIds` or by joining tenant scope from `greenhouse.clients`.
- Reusable server-side query functions live under `src/lib/**`.

Recommended pattern:

```ts
const tenant = await getTenantContext()

const [rows] = await bigQuery.query({
  query: `
    SELECT ...
    FROM \`efeonce-group.notion_ops.tareas\`
    WHERE proyecto IN UNNEST(@projectIds)
  `,
  params: { projectIds: tenant.projectIds }
})
```

## Role Model

Initial roles:
- `client_executive`
- `client_manager`
- `client_specialist`
- `efeonce_account`
- `efeonce_operations`
- `efeonce_admin`

Rules:
- `client` never bypasses `projectIds`
- `admin` access must be explicit in code, not accidental by missing filters
- admin-only routes should live under separate route groups when they exist

## Recommended NextAuth Evolution

### Phase 1

- Keep `CredentialsProvider`
- Use BigQuery lookup to `greenhouse.client_users` plus scopes
- Continue JWT sessions
- Seed demo/internal credentials with bcrypt hashes
- Add route-group guards for `client`, `internal`, and `admin`
- Add `portalHomePath` redirects after login

### Phase 2

- Expand onboarding flows for invited users
- Keep `greenhouse.clients` as tenant metadata only

Recommended future split:
- `greenhouse.clients`: tenant metadata and project scope
- `greenhouse.client_users`: login principals and per-user roles

Current runtime interpretation:
- `greenhouse.clients` is the company/tenant table
- `greenhouse.client_users` is the user table
- the current admin tenant views are intentionally centered on company-level governance, then drill down into users linked to that tenant

## Data Isolation Rules

- All dashboard, project and sprint routes must use tenant scope from server session.
- No route should trust `client_id` from query params.
- No route should expose raw BigQuery table access to the browser.
- Any cache key must include tenant identity when data is tenant-specific.

## Configuration Rules

- `greenhouse.client_users` plus role/scope tables are the source of truth for runtime auth.
- `greenhouse.clients` remains tenant metadata and legacy scope compatibility.
- `.env.example` should only hold app-level runtime configuration.
- `staging` and `production` should read the same table shape, not different auth logic.

## Migration Path

1. Replace env-based login with `greenhouse.client_users`.
2. Add password hashing and verification.
3. Introduce `getTenantContext()` helper.
4. Guard `/dashboard`, `/proyectos`, `/sprints`, `/settings`, `/internal/**`, and `/admin/**` by route group.
5. Move business APIs to the same tenant helper and project scope checks.

## Current Remote Assets

Already created in BigQuery:
- dataset: `efeonce-group.greenhouse`
- table: `efeonce-group.greenhouse.clients`
- tables: `client_users`, `roles`, `user_role_assignments`, `user_project_scopes`, `user_campaign_scopes`, `client_feature_flags`, `audit_events`
- seed tenant: `greenhouse-demo-client`
- seed users: `user-greenhouse-demo-client-executive`, `user-efeonce-admin-bootstrap`
- active internal admin: `julio.reyes@efeonce.org`
- closedwon HubSpot tenants imported as `hubspot-company-*`

Versioned schema file:
- `bigquery/greenhouse_clients.sql`
