# Greenhouse Multi-Tenant Architecture

## Status

This document remains useful as the tenant-focused reference.

For the full product architecture, phased roadmap, role hierarchy, internal/admin route model, KPI semantics, and multi-agent execution plan, use:
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `GREENHOUSE_IDENTITY_ACCESS_V1.md`

If both documents overlap, `GREENHOUSE_ARCHITECTURE_V1.md` is the broader source of truth and this document should stay focused on tenant isolation and auth boundaries.

## Objective

Greenhouse must serve multiple clients from one Next.js application without exposing cross-tenant data. The tenant boundary is `client_id`.

## Tenant Boundary

- Every authenticated session carries a single `client_id`.
- Every business query must derive scope from tenant context, never from browser-supplied ids.
- The first filter boundary for MVP is `notion_project_ids`.
- Admin access is explicit and role-based. It is not implied by knowing a URL.

## Source of Truth

Current system of record:
- BigQuery dataset: `efeonce-group.greenhouse`
- Tenant metadata: `greenhouse.clients`
- User identity and access: `greenhouse.client_users`, `greenhouse.roles`, `greenhouse.user_role_assignments`, `greenhouse.user_project_scopes`, `greenhouse.user_campaign_scopes`

Current source systems for operational data:
- `efeonce-group.notion_ops.tareas`
- `efeonce-group.notion_ops.proyectos`
- `efeonce-group.notion_ops.sprints`
- `efeonce-group.hubspot_crm.*`

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

Target flow:
1. User submits email and password.
2. NextAuth queries `greenhouse.clients` by `primary_contact_email`.
3. Reject login if `active = false` or `status != 'active'`.
4. Verify password against `password_hash` when `auth_mode = 'credentials'`.
5. Build session token with:
   - `clientId`
   - `role`
   - `projectIds`
   - `featureFlags`
   - `timezone`
   - `authMode`

Current interim flow:
- Login now prefers `greenhouse.client_users` plus role/scopes tables and falls back to `greenhouse.clients` if the identity tables are unavailable.
- Session scope now carries `userId`, `tenantType`, `roleCodes`, `primaryRoleCode`, `projectScopes`, `campaignScopes` and legacy compatibility aliases.
- The seeded demo user still uses `auth_mode = env_demo`, so production hardening still requires `password_hash` or SSO.

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
- `client`: scoped to its own projects only
- `admin`: internal Efeonce role with broader visibility and operational tools

Rules:
- `client` never bypasses `projectIds`
- `admin` access must be explicit in code, not accidental by missing filters
- admin-only routes should live under separate route groups when they exist

## Recommended NextAuth Evolution

### Phase 1

- Keep `CredentialsProvider`
- Use BigQuery lookup to `greenhouse.client_users` plus scopes, with fallback to `greenhouse.clients`
- Continue JWT sessions
- Remove `env_demo` from seeded tenants once `password_hash` or SSO is available

### Phase 2

- Add `client_users` table if one tenant needs multiple named users
- Move auth records out of `greenhouse.clients`
- Keep `greenhouse.clients` as tenant metadata only

Recommended future split:
- `greenhouse.clients`: tenant metadata and project scope
- `greenhouse.client_users`: login principals and per-user roles

## Data Isolation Rules

- All dashboard, project and sprint routes must use tenant scope from server session.
- No route should trust `client_id` from query params.
- No route should expose raw BigQuery table access to the browser.
- Any cache key must include tenant identity when data is tenant-specific.

## Configuration Rules

- `greenhouse.clients` is the source of truth for client scope in non-local environments.
- `.env.example` should only hold local bootstrap values and fallbacks.
- `staging` and `production` should read the same table shape, not different auth logic.

## Migration Path

1. Replace `DEMO_CLIENT_PROJECT_IDS` reads with a BigQuery lookup to `greenhouse.clients`.
2. Add password hashing and verification.
3. Introduce `getTenantContext()` helper.
4. Move `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/tasks` and `/api/sprints` to the same tenant helper.
5. Add `client_users` only when multiple users per tenant becomes real.

## Current Remote Assets

Already created in BigQuery:
- dataset: `efeonce-group.greenhouse`
- table: `efeonce-group.greenhouse.clients`
- tables: `client_users`, `roles`, `user_role_assignments`, `user_project_scopes`, `user_campaign_scopes`, `client_feature_flags`, `audit_events`
- seed tenant: `greenhouse-demo-client`
- seed users: `user-greenhouse-demo-client-executive`, `user-efeonce-admin-bootstrap`

Versioned schema file:
- `bigquery/greenhouse_clients.sql`
