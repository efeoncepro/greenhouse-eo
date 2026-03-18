# Greenhouse Multi-Tenant Architecture

## Status

Last updated: March 2026.

This document is the tenant-focused reference for Greenhouse EO. It covers the tenancy model, auth boundaries, route group authorization, and data isolation.

For the full product architecture, phased roadmap, and object model, see:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

## Objective

Greenhouse serves multiple clients from one Next.js application without exposing cross-tenant data. The tenant boundary is `client_id`.

## Terminology

- `tenant` = `client` = `company` — the company-level container used for isolation, governance, and product composition
- `organization` (EO-ORG) — parent commercial entity; one organization may own multiple spaces
- `space` (EO-SPC) — operational workspace; child of an organization, scopes operational data and team membership
- users are identities associated to a tenant through `client_id`; a user is not the tenant
- the runtime model is one tenant to many users

## Three-Level Hierarchy

Greenhouse uses a three-level hierarchy for commercial and operational scoping:

```
Organization (EO-ORG)
  └── Space (EO-SPC)
        └── Client
```

- **Organization**: the parent commercial entity (e.g., a holding company, agency group, or single company that contracts Efeonce services). Represented by the `organizations` table.
- **Space**: an operational workspace within an organization. A space scopes team membership, service delivery, and operational data. Represented by the `spaces` table.
- **Client**: the tenant-level identity that anchors isolation, access, and product composition. Represented by the `clients` table.

A client always belongs to a space, and a space always belongs to an organization.

## Source of Truth

### Auth Store: PostgreSQL (`greenhouse_core`)

All identity, access, and tenant metadata lives in PostgreSQL — not BigQuery. BigQuery is used exclusively for analytical and operational data (Notion ops, HubSpot CRM, semantic marts, materialized views).

### Core Tables

| Table | Purpose |
|---|---|
| `clients` | Tenant metadata — name, status, feature flags, timezone, portal home path, Notion/HubSpot links |
| `organizations` | Parent commercial entities (EO-ORG) |
| `spaces` | Operational workspaces (EO-SPC), child of organization |
| `client_users` | Auth principals — login identity, password hash, status, client association |
| `identity_profiles` | Canonical person root — one row per real person across all tenants and sources |
| `identity_profile_source_links` | SSO and external source links (Microsoft, Google, HubSpot, Notion) tied to an identity profile |
| `roles` | Role catalog — code, label, description, route groups granted |
| `user_role_assignments` | Multi-role support — one user may hold multiple roles |
| `person_memberships` | Organization-to-person relationships with membership type and status |

### Operational Data (BigQuery)

Source systems for delivery and commercial data remain in BigQuery:
- `efeonce-group.notion_ops.tareas`
- `efeonce-group.notion_ops.proyectos`
- `efeonce-group.notion_ops.sprints`
- `efeonce-group.hubspot_crm.*`
- `efeonce-group.greenhouse.*` (semantic marts, materialized views)

Rule: external systems may enrich the Client object; external systems are not the canonical Client identity inside Greenhouse.

## Authentication

### Providers

Greenhouse uses NextAuth.js 4.24 with three auth providers:

1. **Azure AD** — Microsoft SSO for enterprise tenants
2. **Google OAuth** — Google SSO for tenants on Google Workspace
3. **Credentials** — email + bcrypt password for demo, internal, and tenants not yet on SSO

All three providers resolve to the same PostgreSQL-backed identity model. SSO source links are tracked in `identity_profile_source_links`.

### Auth Flow

1. User authenticates via one of the three providers.
2. NextAuth callbacks query PostgreSQL `client_users` (joined with `clients` for tenant metadata, `roles` and `user_role_assignments` for authorization).
3. Login is rejected if `active = false` or `status != 'active'`.
4. For credentials provider, password is verified against `password_hash` (bcrypt).
5. Session token (JWT) is built with the full TenantContext.

### No middleware.ts

Greenhouse does **not** use Next.js middleware for auth. Authorization is enforced at the layout level via `getTenantContext()` + `getServerSession()`. Each route group layout checks its own access requirements.

## TenantContext

The `getTenantContext()` helper is the single entry point for authorization on every server route. It returns:

```ts
{
  userId: string
  clientId: string
  clientName: string
  tenantType: string
  roleCodes: string[]
  primaryRoleCode: string
  routeGroups: string[]
  projectScopes: string[]
  campaignScopes: string[]       // currently empty, reserved
  businessLines: string[]
  serviceModules: string[]
  featureFlags: Record<string, boolean>
  timezone: string
  portalHomePath: string
  spaceId: string
  organizationId: string
  organizationName: string
}
```

Every API route and server component must derive scope from this context — never from browser-supplied IDs.

## Role Model

### Composable Roles

Roles are **composable, not hierarchical**. A user may hold multiple roles simultaneously via `user_role_assignments`. Each role grants one or more route groups.

Core roles:
- `client_executive` — client route group
- `client_manager` — client route group
- `client_specialist` — client route group
- `efeonce_account` — internal route group
- `efeonce_operations` — internal route group
- `efeonce_finance` — finance route group
- `efeonce_hr` — hr route group
- `efeonce_admin` — admin route group; **universal override** for all access checks

Rules:
- a user's effective permissions are the union of all assigned roles' route groups
- `efeonce_admin` is the universal override — it grants access to any route group and any module
- `client` roles never bypass `projectScopes`
- admin access is always explicit and role-based, never implied by knowing a URL

## Route Group Authorization

Authorization is enforced at the **layout level** in each route group. There is no centralized middleware.

### Route Groups

| Route Group | Layout | Access Rule |
|---|---|---|
| `(dashboard)` | `(dashboard)/layout.tsx` | Requires valid session (any authenticated user) |
| `admin` | `admin/layout.tsx` | Requires `'admin'` in `routeGroups` |
| `internal` | `internal/layout.tsx` | Requires `'internal'` in `routeGroups` |
| `agency` | `agency/layout.tsx` | Requires `'internal'` OR `'admin'` in `routeGroups` |
| `finance` | `finance/layout.tsx` | Requires `'finance'` in `routeGroups` OR `efeonce_admin` role |
| `hr` | `hr/layout.tsx` | Requires `'hr'` in `routeGroups` OR `efeonce_admin` role |
| `people` | `people/layout.tsx` | Requires `canAccessPeopleModule()` |
| `capabilities` | `capabilities/[moduleId]/layout.tsx` | Requires client + `verifyCapabilityModuleAccess()` |

### Special Access Logic

**`canAccessPeopleModule()`**: Cross-group access function. The People module is accessible to users from multiple route groups (internal, hr, admin) rather than being gated to a single group. This function encapsulates the composite check.

**`requireAdminTenantContext()`**: Requires **both** the `'admin'` route group in the user's `routeGroups` **and** the `efeonce_admin` role code. Having only one is insufficient. This is the strictest access check in the system.

## Data Isolation Rules

- All dashboard, project, sprint, finance, HR, and module routes must use tenant scope from server session via `getTenantContext()`.
- No route should trust `client_id` from query params or request body for authorization.
- No route should expose raw database access to the browser.
- Any cache key must include tenant identity when data is tenant-specific.
- Queries must filter by `projectScopes`, `spaceId`, or `organizationId` as appropriate for the domain.

## Query Layer

### PostgreSQL (Auth + Governance)

All identity, role, and tenant queries go to PostgreSQL `greenhouse_core`.

### BigQuery (Operational + Analytical)

Operational queries use tenant context for scoping:

```ts
const tenant = await getTenantContext()

const [rows] = await bigQuery.query({
  query: `
    SELECT ...
    FROM \`efeonce-group.notion_ops.tareas\`
    WHERE proyecto IN UNNEST(@projectIds)
  `,
  params: { projectIds: tenant.projectScopes }
})
```

Rules:
- browser never sends arbitrary project IDs for authorization
- API routes always derive scope from `getTenantContext()`
- reusable server-side query functions live under `src/lib/**`

## JWT and ACL Clarification

- Greenhouse uses JWT sessions through NextAuth.js 4.24.
- The JWT is the session transport for identity and claims.
- Authorization is a separate concern resolved from PostgreSQL-backed role and scope tables.
- Vuexy's permissions/ACL examples are useful for admin UI patterns and navigation concepts but are not sufficient for tenant isolation, project-level scoping, campaign-level scoping, or internal vs client route separation.
- The Greenhouse model is: JWT session → server-side tenant context → composable role-based route access → project and campaign scopes → API-level enforcement on every business query.

## Configuration Rules

- PostgreSQL `greenhouse_core` is the source of truth for all runtime auth.
- `clients` table is tenant metadata and scope configuration.
- `client_users` + role/scope tables are auth principals and authorization.
- `.env.example` holds app-level runtime configuration only.
- `staging` and `production` read the same schema — no environment-specific auth logic.
