# Greenhouse Identity & Access Architecture V2

## Purpose

Define the unified permissions, roles, and access model for Greenhouse as a single Next.js application serving three distinct audiences through route-group separation:

1. **Client-facing** — external clients seeing their ICO dashboards, projects, capabilities
2. **Collaborator-facing** — internal Efeonce team members seeing their personal payroll, leave, expenses, tools
3. **Internal/Admin** — Efeonce operators, HR, finance, and administrators managing the platform

This document supersedes the informal role model scattered across earlier Codex tasks (`Agency_Operator_Layer`, `HR_Core_Module`, `Financial_Module`, `AI_Tooling_Credit_System`) and consolidates them into one canonical contract.

Use together with:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

## Status

This is the target access architecture. The PostgreSQL canonical backbone is already provisioned (`greenhouse_core` schema in `greenhouse-pg-dev`). The tables defined in this document extend that backbone with a mature RBAC model that replaces the early `role: 'client' | 'admin'` field on `greenhouse.clients`.

## Delta 2026-03-30 — Principal-first auth, person-first human resolution

Este documento sigue siendo `principal-first` para auth y access runtime.

Eso no contradice el contrato `person-first` del modelo 360:
- sesión, login, preferencias, inbox y overrides continúan anclados en `client_users.user_id`
- surfaces que representen humanos no deberían tratar `client_user` como raíz humana si existe resolución canónica por persona

Regla operativa:
- access runtime puede seguir resolviendo desde `user_id`
- consumers de preview, recipients y admin read surfaces deben enriquecer la sesión con `identity_profile_id` y `member_id` cuando corresponda
- migraciones futuras no deben romper compatibilidad con tablas o logs que hoy son `userId`-scoped por diseño

## Delta 2026-04-02 — Delivery identity coverage closes on the canonical graph

Para Delivery y `ICO`, el contrato operativo ya no debe asumirse como solo `notion_user_id -> member_id`.

Regla operativa:
- reconciliación de responsables Notion debe cerrar sobre el grafo canónico `identity_profile -> member/client_user`
- `greenhouse.team_members` puede seguir existiendo como carril BigQuery de sync, pero no debe convertirse en autoridad silenciosa por encima de `greenhouse_core.*`
- cuando un link de identidad se aprueba, la persistencia canónica debe vivir también en `greenhouse_core.identity_profile_source_links`
- los controles de coverage para Delivery deben poder auditarse por `space_id` y período antes de recalcular un reporte mensual

## Core Design Decisions

### Decision 1: Single app, three audiences

Greenhouse is one Next.js application deployed on Vercel. Audience separation happens through Next.js route groups, not separate deployments.

Route group families:
- `/dashboard`, `/proyectos`, `/sprints`, `/campanas`, `/equipo`, `/settings` → client-facing
- `/my/*` → collaborator-facing (personal self-service)
- `/internal/*` → agency operator views (cross-tenant visibility)
- `/admin/*` → platform administration
- `/hr/*` → HR management (leave admin, payroll, attendance)
- `/finance/*` → financial management
- `/people/*` → people management and collaborator read surfaces

### Decision 2: Same login, multiple roles

A single identity (one `client_users` record / one SSO principal) can hold multiple roles simultaneously. The session resolves all applicable roles at login time. Route guards check role membership, not a single `role` string.

This means:
- An Efeonce collaborator logs in via Microsoft SSO
- The session resolves their `user_id`, `client_id`, and all assigned `role_codes`
- They see sidebar sections for every route group their roles grant access to
- A person can be both a `collaborator` (sees "Mis Permisos") and an `hr_manager` (sees HR admin) and a `finance_analyst` (sees Finance)

### Decision 3: Roles are composable, not hierarchical

Roles are not a strict hierarchy where `admin > operator > client`. They are composable permissions that can be combined. An `efeonce_admin` does not automatically get `finance_analyst` unless explicitly assigned.

Exception: `efeonce_admin` has a universal override that grants access to all route groups. This is the only hierarchical rule.

### Decision 4: Tenant context is always present

Every authenticated session carries a `client_id` (the tenant context). For external clients, this is their company. For Efeonce internal users, this is the `efeonce` tenant. When an operator or admin navigates into a specific client Space, the active tenant context switches.

### Decision 5: PostgreSQL is the target store

The RBAC tables live in `greenhouse_core` in PostgreSQL. During migration, BigQuery `greenhouse.client_users` and `greenhouse.user_role_assignments` remain as compatibility reads. New writes should target PostgreSQL.

## Identity Model

### Auth Principal

The auth principal is the login entity. One person = one auth principal.

Canonical anchor: `greenhouse_core.client_users.user_id`

An auth principal carries:
- `user_id` — Greenhouse-assigned UUID
- `client_id` — the home tenant (FK to `greenhouse_core.clients`)
- `identity_profile_id` — optional link to the broader cross-system identity graph
- `email` — login email
- `full_name` — display name
- `tenant_type` — `'client'` or `'efeonce_internal'`
- `auth_mode` — `'microsoft_sso'`, `'google_sso'`, `'credentials'`
- `status` — `'active'`, `'suspended'`, `'deactivated'`
- `active` — boolean

### Collaborator Link

For Efeonce internal users, the auth principal links to a collaborator record:
- `greenhouse_core.members.member_id`

This link is established through `identity_profile_id` (shared between `client_users` and `members`) or through a direct `member_id` FK on `client_users` when the mapping is explicit.

This is what enables the collaborator-facing experience: the session knows the person is both an auth principal (can log in) and a collaborator (has payroll, leave balances, tool licenses).

### External Client Users

For external client users, there is no collaborator link. They authenticate, get a tenant context, and see only their client-scoped data. Their `tenant_type` is `'client'` and they hold client-facing roles only.

## Role Catalog

### Role Families

Roles are grouped into families that map to the three audiences plus cross-cutting concerns.

#### Family: Client

Roles for external client users accessing their portal experience.

| role_code | role_name | Description | Route Groups |
|-----------|-----------|-------------|--------------|
| `client_executive` | Client Executive | CMO/VP-level. Sees executive dashboard, high-level KPIs, team overview. | `client` |
| `client_manager` | Client Manager | Marketing manager. Deeper operational context, project drilldowns, sprint detail. | `client` |
| `client_specialist` | Client Specialist | Restricted to specific projects or campaigns. Uses scope filters. | `client` |

#### Family: Collaborator

Roles for Efeonce team members accessing their personal self-service.

| role_code | role_name | Description | Route Groups |
|-----------|-----------|-------------|--------------|
| `collaborator` | Collaborator | Base role for every Efeonce internal user. Personal leave, attendance, expenses, tools. | `my` |

#### Family: Agency Operations

Roles for Efeonce team members with cross-tenant operational visibility.

| role_code | role_name | Description | Route Groups |
|-----------|-----------|-------------|--------------|
| `efeonce_account` | Account Lead | Owns client relationships. Sees client health, delivery context, risks for assigned clients. | `internal` |
| `efeonce_operations` | Operations Lead | Cross-tenant operational visibility. Capacity, blocked work, utilization, review backlog. | `internal` |

#### Family: Domain Operators

Roles for Efeonce team members managing specific internal domains.

| role_code | role_name | Description | Route Groups |
|-----------|-----------|-------------|--------------|
| `hr_manager` | HR Manager | HR Business Partner. Manages leave requests, attendance, org structure, catalogs. | `hr` |
| `hr_payroll` | Payroll Operator | Processes payroll periods, entries, compensation. | `hr` |
| `finance_analyst` | Finance Analyst | Manages income, expenses, reconciliation, suppliers. Read-only on some admin areas. | `finance` |
| `finance_admin` | Finance Admin | Full finance write access including bank accounts, exchange rates, reconciliation. | `finance` |
| `people_viewer` | People Viewer | Read access to collaborator profiles, assignments, capacity. Used by account leads. | `people` |
| `ai_tooling_admin` | AI Tooling Admin | Manages tool catalog, licenses, wallets, credit allocations. | `ai_tooling` |

#### Family: Platform Admin

| role_code | role_name | Description | Route Groups |
|-----------|-----------|-------------|--------------|
| `efeonce_admin` | Platform Admin | Universal override. All route groups. Tenant management, user management, feature flags, role assignments. | `*` (all) |

### Role Composition Examples

Real-world role assignments for typical Efeonce personas:

| Persona | Assigned Roles | What They See |
|---------|---------------|---------------|
| Julio (founder) | `collaborator`, `efeonce_admin` | Everything: personal leave + full admin + all internal + all domains |
| Account Lead | `collaborator`, `efeonce_account`, `people_viewer` | Personal self-service + client health views + people read |
| Operations Lead | `collaborator`, `efeonce_operations`, `people_viewer` | Personal self-service + cross-tenant ops + people read |
| HR Business Partner | `collaborator`, `hr_manager`, `hr_payroll` | Personal self-service + full HR admin + payroll |
| Finance Lead | `collaborator`, `finance_admin` | Personal self-service + full finance |
| Junior Designer | `collaborator` | Only personal self-service: leave, attendance, expenses, tools |
| External CMO (Sky) | `client_executive` | Client dashboard, projects, team, capabilities for their tenant only |
| External Marketing Mgr | `client_manager` | Deeper client operational context, sprint drilldowns |
| External Coordinator | `client_specialist` | Scoped to specific projects/campaigns within their tenant |

### Default Role Assignment Rules

When a user is created or provisioned:
- External client users: assigned `client_executive` or `client_manager` based on admin decision at onboarding. No default auto-assignment.
- Efeonce internal users (detected by `@efeonce.org` or `@efeoncepro.com` email domain): automatically assigned `collaborator`. Additional roles assigned explicitly by admin.
- SCIM-provisioned users: assigned `collaborator` automatically. Role escalation requires admin action.

## Route Group Model

### Route Group Registry

Route groups are the enforcement boundary. Each route group maps to a set of URL prefixes and requires at least one matching role.

| route_group | URL Prefixes | Required Roles (any of) | Tenant Context |
|-------------|-------------|------------------------|----------------|
| `client` | `/dashboard`, `/proyectos`, `/sprints`, `/campanas`, `/equipo`, `/settings` | `client_executive`, `client_manager`, `client_specialist`, `efeonce_account`, `efeonce_operations`, `efeonce_admin` | Active tenant |
| `my` | `/my/leave`, `/my/attendance`, `/my/expenses`, `/my/tools`, `/my/payroll`, `/my/profile` | `collaborator`, `efeonce_admin` | Home tenant (efeonce) |
| `internal` | `/internal/dashboard`, `/internal/clientes`, `/internal/capacidad`, `/internal/riesgos`, `/internal/kpis` | `efeonce_account`, `efeonce_operations`, `efeonce_admin` | Cross-tenant |
| `hr` | `/hr/leave`, `/hr/attendance`, `/hr/org`, `/hr/payroll`, `/hr/approvals` | `hr_manager`, `hr_payroll`, `efeonce_admin` | Efeonce tenant |
| `finance` | `/finance/dashboard`, `/finance/income`, `/finance/expenses`, `/finance/suppliers`, `/finance/reconciliation`, `/finance/clients` | `finance_analyst`, `finance_admin`, `efeonce_admin` | Efeonce tenant |
| `people` | `/people`, `/people/[memberId]` | `people_viewer`, `hr_manager`, `efeonce_operations`, `efeonce_admin` | Efeonce tenant |
| `ai_tooling` | `/ai-tools/catalog`, `/ai-tools/licenses`, `/ai-tools/wallets`, `/ai-tools/ledger` | `ai_tooling_admin`, `efeonce_admin` | Efeonce tenant |
| `admin` | `/admin/tenants`, `/admin/users`, `/admin/roles`, `/admin/scopes`, `/admin/feature-flags` | `efeonce_admin` | Cross-tenant |

### Enforcement Architecture

#### Server-side guards

Every route group has a layout-level guard that runs server-side:

```
src/app/(dashboard)/my/layout.tsx        → requireRouteGroup('my')
src/app/(dashboard)/hr/layout.tsx        → requireRouteGroup('hr')
src/app/(dashboard)/finance/layout.tsx   → requireRouteGroup('finance')
src/app/(dashboard)/internal/layout.tsx  → requireRouteGroup('internal')
src/app/(dashboard)/admin/layout.tsx     → requireRouteGroup('admin')
```

#### Guard resolution

```typescript
function requireRouteGroup(group: RouteGroup): void {
  const session = getServerSession()
  if (!session) redirect('/login')
  
  const userRoles = session.roleCodes // string[]
  const allowedRoles = ROUTE_GROUP_ROLES[group] // from registry
  
  // efeonce_admin bypasses all checks
  if (userRoles.includes('efeonce_admin')) return
  
  // Check if any user role grants access to this route group
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  if (!hasAccess) redirect('/unauthorized')
}
```

#### API route protection

API routes use the same pattern but return `403` instead of redirecting:

```typescript
function requireApiAccess(group: RouteGroup): void {
  const session = getServerSession()
  if (!session) throw new ApiError(401)
  
  const userRoles = session.roleCodes
  if (userRoles.includes('efeonce_admin')) return
  
  const allowedRoles = ROUTE_GROUP_ROLES[group]
  if (!userRoles.some(role => allowedRoles.includes(role))) {
    throw new ApiError(403)
  }
}
```

## Scope Model

### Scope Levels

Beyond roles, some users have further restrictions on what data they can see within their granted route groups.

| scope_level | Purpose | Applies To |
|-------------|---------|------------|
| `tenant_all` | Can see all data within their tenant. Default for most roles. | All |
| `project_subset` | Can only see specific projects. | `client_specialist` |
| `campaign_subset` | Can only see specific campaigns. | `client_specialist` |
| `client_subset` | Can only see specific client tenants. | `efeonce_account` |

### Scope Assignment Tables

Scopes are assigned per user and stored in dedicated assignment tables:

- `greenhouse_core.user_project_scopes` — which projects a user can see
- `greenhouse_core.user_campaign_scopes` — which campaigns a user can see
- `greenhouse_core.user_client_scopes` — which client tenants an operator can see

### Scope Enforcement

Scope enforcement happens at the query layer, not the route guard layer:
- Route guards check role membership (can you access this route group?)
- Query filters check scope membership (which data within that route group can you see?)

Example: an `efeonce_account` user accessing `/internal/clientes` passes the route guard. But the query only returns clients where `client_id IN (user's assigned client scopes)`.

## Supervisor Derivation

For HR workflows (leave approvals), the supervisor is not a role — it is a relationship derived from `greenhouse_core.members.reports_to_member_id`.

Rules:
- When a collaborator submits a leave request, the system resolves their supervisor from `reports_to_member_id`
- If `reports_to_member_id` is NULL (top of hierarchy), the request goes directly to `hr_manager` role holders
- A person does not need a `supervisor` role to approve leave — they approve because they are the `reports_to` target of the requester
- HR managers can override or finalize any leave request regardless of the reporting chain

## Session Payload

The authenticated session must carry enough context to resolve access without additional database lookups on every request.

### Session shape

```typescript
interface GreenhouseSession {
  userId: string              // client_users.user_id
  clientId: string            // home tenant client_id
  tenantType: 'client' | 'efeonce_internal'
  email: string
  fullName: string
  roleCodes: string[]         // all assigned role_codes
  routeGroups: string[]       // derived from roleCodes at login
  memberId?: string           // if collaborator, link to members.member_id
  identityProfileId?: string  // cross-system identity root
  activeClientId?: string     // for operators: the Space they're currently viewing
  projectScopes?: string[]    // for client_specialist
  campaignScopes?: string[]   // for client_specialist
  clientScopes?: string[]     // for efeonce_account
  featureFlags?: string[]     // tenant-level feature flags
  timezone: string
  portalHomePath: string      // where to redirect after login
}
```

### Session resolution at login

1. Authenticate via NextAuth.js (Microsoft SSO, Google SSO, or credentials)
2. Resolve `client_users` record by email or SSO identifier
3. Load all `user_role_assignments` where `active = true` and within `effective_from`/`effective_to`
4. Derive `routeGroups` from `roleCodes` using the route group registry
5. If `tenant_type = 'efeonce_internal'`, attempt to resolve `member_id` from `members` via `identity_profile_id`
6. Load scope assignments if applicable roles are present
7. Load tenant feature flags
8. Determine `portalHomePath` based on highest-priority route group

#### Auth flow UX states (TASK-130)

Durante la resolución de sesión, la UI pasa por estados explícitos con feedback visual:

- **Steps 1**: `Login.tsx` muestra `LoadingButton` (credenciales) o `CircularProgress` (SSO) + `LinearProgress` global. Todo el formulario se deshabilita (`isAnyLoading`).
- **Step 1 error**: `mapAuthError()` categoriza el error NextAuth y muestra `Alert` con severity diferenciada — `error` para credenciales/acceso, `warning` para red/provider.
- **Steps 2-8**: Tras auth exitosa, `Login.tsx` entra en estado `isTransitioning` — logo + spinner + "Preparando tu espacio de trabajo...". El formulario se oculta.
- **Redirect**: `router.replace('/auth/landing')` redirige a server component que resuelve `portalHomePath`. `auth/landing/loading.tsx` muestra skeleton durante la resolución.

Errores categorizados por NextAuth error code:

| Error code | Mensaje UX | Severity |
|------------|-----------|----------|
| `CredentialsSignin` | Email o contraseña incorrectos | error |
| `AccessDenied` | Cuenta sin acceso al portal | error |
| `SessionRequired` | Sesión expirada | error |
| fetch/network | No se pudo conectar con el servidor | warning |
| provider timeout | Proveedor no respondió | warning |

### Portal home path resolution

| Highest Priority Role | Home Path |
|----------------------|-----------|
| `efeonce_admin` | `/admin/tenants` |
| `efeonce_operations` | `/internal/dashboard` |
| `efeonce_account` | `/internal/clientes` |
| `finance_admin` or `finance_analyst` | `/finance/dashboard` |
| `hr_manager` or `hr_payroll` | `/hr/leave` |
| `collaborator` (only) | `/my/profile` |
| `client_executive` | `/dashboard` |
| `client_manager` | `/dashboard` |
| `client_specialist` | `/dashboard` |

## Sidebar Composition

The sidebar is built dynamically from the session's `routeGroups`.

### Sidebar sections

Each route group maps to a sidebar section with its own navigation items. Sections only render if the user has the corresponding route group.

| Section | Route Group | Nav Items |
|---------|------------|-----------|
| **Mi Greenhouse** | `my` | Mi Perfil, Mis Permisos, Mi Asistencia, Mis Gastos, Mis Herramientas, Mi Nómina |
| **Pulse** | `client` | Dashboard, Proyectos, Ciclos, Equipo, Campañas |
| **Agencia** | `internal` | Pulse Global, Clientes, Capacidad, Riesgos, KPIs |
| **Personas** | `people` | Directorio, Detalle |
| **HR** | `hr` | Permisos, Asistencia, Organización, Nómina, Aprobaciones |
| **Finanzas** | `finance` | Dashboard, Ingresos, Egresos, Proveedores, Clientes, Conciliación |
| **AI & Tools** | `ai_tooling` | Catálogo, Licencias, Wallets, Consumos |
| **Admin** | `admin` | Spaces, Usuarios, Roles, Scopes, Feature Flags |

### Section ordering in sidebar

Fixed order:
1. Mi Greenhouse (personal, always first if present)
2. Pulse (client context)
3. Agencia (cross-tenant)
4. Personas
5. HR
6. Finanzas
7. AI & Tools
8. Admin (always last if present)

## Audit Model

### Audit events

Every permission-relevant action must be logged:

| Event Type | Logged When |
|-----------|-------------|
| `role_assigned` | A role is granted to a user |
| `role_revoked` | A role is removed from a user |
| `scope_assigned` | A project, campaign, or client scope is granted |
| `scope_revoked` | A scope is removed |
| `user_created` | A new auth principal is created |
| `user_deactivated` | A user is deactivated |
| `user_reactivated` | A user is reactivated |
| `login_success` | Successful authentication |
| `login_failed` | Failed authentication attempt |
| `session_impersonation` | An admin enters a client Space context |

### Audit table

`greenhouse_core.audit_events` stores immutable event records with:
- `event_id` — UUID
- `event_type` — from catalog above
- `actor_user_id` — who performed the action
- `target_user_id` — who was affected (nullable)
- `target_client_id` — which tenant was affected (nullable)
- `metadata` — JSONB with event-specific details
- `ip_address` — request origin
- `created_at` — timestamp

## Migration from Current Model

### Current state

Today the system uses:
- `role` field on `greenhouse.clients` (BigQuery): `'client' | 'operator' | 'admin'`
- `can_view_all_spaces` boolean on the same table
- Route group checks in `authorization.ts` based on these fields
- PostgreSQL `greenhouse_core.client_users`, `greenhouse_core.roles`, `greenhouse_core.user_role_assignments` already exist but contain only seed data

### Migration path

Phase 1: Backfill PostgreSQL role assignments from current BigQuery state
- Every user with `role = 'client'` gets `client_executive` (or `client_manager` based on admin review)
- Every user with `role = 'operator'` gets `collaborator` + `efeonce_account` + `efeonce_operations`
- Every user with `role = 'admin'` gets `collaborator` + `efeonce_admin`
- Efeonce internal users additionally get `collaborator`

Phase 2: Update session resolution
- Session resolution reads roles from PostgreSQL `user_role_assignments` instead of the `role` field
- Derive `routeGroups` from role catalog
- Keep BigQuery `clients.role` as compatibility fallback during transition

Phase 3: Update route guards
- Replace `session.user.role === 'admin'` checks with `session.routeGroups.includes('admin')`
- Replace `session.user.can_view_all_spaces` with `session.routeGroups.includes('internal')`

Phase 4: Remove legacy fields
- Deprecate `role` and `can_view_all_spaces` from `greenhouse.clients`
- All access resolution flows through `user_role_assignments`

## Non-Negotiable Rules

1. No route is ever accessible without an authenticated session.
2. No data is ever returned without tenant-context filtering.
3. `efeonce_admin` is the only universal override. Every other role must be explicitly checked.
4. Roles are stored in `user_role_assignments` with `effective_from`/`effective_to` for temporal validity.
5. Scope enforcement happens at the query layer, not the UI layer. Hiding a sidebar link is not security.
6. Supervisor relationships are derived from org structure, not from role assignments.
7. Audit events are immutable. No DELETE on `audit_events`.
8. Session must not require a database call per request for role checks. Roles are resolved at login and cached in the JWT/session token.
9. External client users can never hold internal roles (`collaborator`, `hr_manager`, `finance_analyst`, etc.).
10. Internal Efeonce users always have `collaborator` as a base role in addition to any domain roles.

## Operational Note

If a future agent changes:
- the role catalog
- route group assignments
- scope enforcement rules
- session payload shape
- audit event types

They must update:
- this document
- `project_context.md`
- `Handoff.md`
- `changelog.md`
