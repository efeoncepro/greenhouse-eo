# Greenhouse SCIM & Entra Integration Architecture V1

## Purpose

Define the automated user provisioning and profile synchronization architecture between Microsoft Entra ID and Greenhouse. This document covers:

1. **SCIM 2.0 server** for lifecycle provisioning (Users + Groups) driven by Entra
2. **Entra profile sync cron** for enrichment data not covered by the SCIM standard
3. **Microsoft Graph webhook** for real-time change notifications
4. **Admin UI** for tenant mapping governance
5. **Security model** for machine-to-machine auth between Entra and Greenhouse

Use together with:
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — role model and enforcement
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — person-org graph
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` — auth principal separation

## Status

Implemented and active in production. SCIM provisioning job is running in Entra, scoped to the "Efeonce Group" group. Profile sync cron runs daily at 08:00 UTC.

### Production Incident Closure — 2026-05-04

On 2026-05-04, Microsoft Entra provisioning was failing on SCIM `CREATE` for internal Efeonce users because the internal tenant mapping used the legacy pseudo-client `efeonce-admin`. That value does not exist in `greenhouse_core.clients`, so `client_users.client_id` failed `client_users_client_id_fkey`.

Canonical fix:

- Internal Efeonce provisioning uses `scim_tenant_mappings.client_id = NULL`.
- External/client tenant mappings must use a real `greenhouse_core.clients.client_id`.
- `scim_tenant_mappings_client_id_fkey` prevents future mappings from pointing to non-existent clients.
- Internal SCIM-created users persist as `tenant_type='efeonce_internal'`, `client_id=NULL`, `auth_mode='microsoft_sso'`, and receive a baseline role assignment with `client_id=NULL` and `scope_level=NULL`.

Operational evidence:

- Production SCIM discovery returns `200`.
- Production `/api/scim/v2/Users` without bearer returns `401`.
- Production `/api/scim/v2/Users?count=1` with bearer returns `200`.
- Microsoft Graph `provisionOnDemand` for `support@efeoncepro.com` returned `EntryExportAdd=Success` and created the user in Greenhouse.
- DB verification confirmed the real user was created as an internal Efeonce SCIM user with role `collaborator`.

Residual Entra note: the regular provisioning job can still show historical `countEscrowed` after previous failures. Do not fix that counter with SQL. Use Microsoft Graph provisioning logs, `restart` with `resetScope=Escrows`, and `provisionOnDemand` for controlled validation.

## Source-of-Truth Boundaries

| Domain | Authority | Notes |
|--------|-----------|-------|
| Identity existence, account status, basic profile | Entra ID | `active`, `userName`, `displayName` flow from Entra via SCIM |
| Authorization, roles, scopes, operational context | Greenhouse | Role assignments, space access, org scoping are Greenhouse-managed |
| Enrichment profile (jobTitle, country, city, phone) | Entra ID | Synced via Graph API cron, not SCIM |
| Reporting hierarchy formal | Greenhouse | `greenhouse_core.reporting_lines` remains canonical; Entra only proposes drift for review |

Entra is the source of truth for who exists and whether they are active. Greenhouse is the source of truth for what they can do.

## Architecture

### Components

#### 1. SCIM Server (`src/app/api/scim/v2/`)

Implements the SCIM 2.0 protocol endpoints consumed by the Entra provisioning engine.

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/scim/v2/ServiceProviderConfig` | GET | None | Discovery: declares supported SCIM features |
| `/api/scim/v2/Schemas` | GET | None | Schema definition for the User resource |
| `/api/scim/v2/Users` | GET | Bearer | List and filter users (supports `filter=userName eq "..."`) |
| `/api/scim/v2/Users` | POST | Bearer | Create a new user from Entra provisioning |
| `/api/scim/v2/Users/[id]` | GET | Bearer | Retrieve a single user by SCIM ID |
| `/api/scim/v2/Users/[id]` | PATCH | Bearer | Update user attributes (including `active` for deactivation) |
| `/api/scim/v2/Users/[id]` | DELETE | Bearer | Soft-delete a user |

These endpoints bypass NextAuth and use their own bearer token authentication.

#### 2. Entra Profile Sync Cron (`src/app/api/cron/entra-profile-sync/`)

Daily cron job that fetches enrichment data directly from the Microsoft Graph API.

- **Schedule:** `0 8 * * *` (08:00 UTC, 05:00 Chile)
- **Auth:** OAuth2 client credentials flow (`AZURE_AD_CLIENT_ID` + `AZURE_AD_CLIENT_SECRET`)
- **Syncs:** `jobTitle`, `country`, `city`, `phone`, `displayName`, `accountEnabled`
- **Targets:** `client_users`, `identity_profiles`, `members`
- **Governance add-on:** resolves Graph `manager` and opens review proposals when Entra disagrees with `greenhouse_core.reporting_lines`

Rationale: the SCIM standard only handles basic lifecycle attributes (`userName`, `displayName`, `active`). Rich profile data such as job title, country, and department requires direct Graph API calls.

#### 3. Auth Helper (`src/lib/scim/auth.ts`)

Provides `requireScimAuth()` — an async function that:
1. Resolves the expected bearer token from GCP Secret Manager (with env var fallback)
2. Compares the request token using `timingSafeEqual` to prevent timing attacks
3. Returns a 401 response if authentication fails

#### 4. Provisioning Engine (`src/lib/scim/provisioning.ts`)

Core business logic for SCIM-driven user lifecycle management:
- Resolves tenant mapping by email domain or Microsoft tenant ID
- Creates or updates `client_users` records with SCIM metadata
- Assigns baseline roles from the tenant mapping configuration
- Publishes outbox events: `scim.user.created`, `scim.user.updated`, `scim.user.deactivated`
- Writes audit entries to `greenhouse_core.scim_sync_log`

#### 5. Graph API Client (`src/lib/entra/graph-client.ts`)

OAuth2 client credentials token acquisition with in-memory caching. Provides:

- paginated user fetch from the Microsoft Graph `/v1.0/users` endpoint
- per-user `manager` resolution from `/v1.0/users/{id}/manager`

#### 6. Profile Sync Engine (`src/lib/entra/profile-sync.ts`)

Diff-based update logic:
- Compares Entra values against current Greenhouse records
- Only writes when values actually differ (uses `IS DISTINCT FROM` in SQL)
- Cleans Entra display names by removing organizational suffixes (e.g., " | Efeonce")

#### 6b. Hierarchy Governance Lane (`src/lib/reporting-hierarchy/governance.ts`)

Compares the resolved Graph manager against the canonical reporting hierarchy:

- creates or refreshes drift proposals in `greenhouse_sync.reporting_hierarchy_drift_proposals`
- writes a `source_sync_runs` entry with `source_system = 'azure-ad'` and `source_object_type = 'reporting_hierarchy'`
- never auto-overwrites manual hierarchy by default
- allows RRHH/Admin to approve, reject, or dismiss the proposal from `HR > Jerarquía`

#### 7. SCIM Groups (`src/lib/scim/groups.ts`)

Full SCIM 2.0 Groups support for syncing Entra groups with Greenhouse.

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/scim/v2/Groups` | GET | Bearer | List and filter groups |
| `/api/scim/v2/Groups` | POST | Bearer | Create a group from Entra |
| `/api/scim/v2/Groups/[id]` | GET | Bearer | Retrieve a single group |
| `/api/scim/v2/Groups/[id]` | PATCH | Bearer | Update group attributes or members (add/remove) |
| `/api/scim/v2/Groups/[id]` | DELETE | Bearer | Soft-delete a group |

Groups map Entra security/M365 groups to Greenhouse. Each group can optionally be mapped to a `role_code` or `client_id` for automatic role governance.

#### 8. Microsoft Graph Webhook (`src/app/api/webhooks/entra-user-change/`)

Real-time change notification endpoint. When a user profile changes in Entra, Microsoft Graph pushes a notification within seconds.

- **Validation:** Microsoft sends a GET with `?validationToken=xxx` during subscription creation; the endpoint echoes it as plain text
- **Notifications:** POST with `clientState` validation against the SCIM bearer token (first 16 chars)
- **Processing:** On notification, fetches all Entra profiles via Graph API, runs the same diff-sync as the daily cron, and re-evaluates hierarchy drift against Graph `manager`
- **Trade-off:** Fetches all users on each notification (simple, consistent) vs. fetching only the changed user (more efficient but fragile)

#### 9. Webhook Subscription Manager (`src/lib/entra/webhook-subscription.ts`)

Manages the Microsoft Graph subscription lifecycle:

- **Create:** Subscribes to `/users` resource with `changeType: 'updated'` and 3-day expiration
- **Renew:** Extends the subscription before it expires
- **Persist:** Stores the subscription ID in `greenhouse_sync.integration_registry` metadata for renewal continuity

#### 10. Webhook Subscription Renewal Cron (`src/app/api/cron/entra-webhook-renew/`)

- **Schedule:** `0 6 */2 * *` (06:00 UTC every 2 days — within the 3-day max lifetime)
- **Logic:** Calls `createOrRenewSubscription()` which renews if a subscription exists, or creates a new one

#### 11. Admin Center — Tenant Mappings UI (`src/app/(dashboard)/admin/scim-tenant-mappings/`)

Server-rendered page + client-side view for managing SCIM tenant mappings without SQL.

- **View component:** `src/views/greenhouse/admin/ScimTenantMappingsView.tsx`
- **Features:** Table with all mappings, toggle switches for auto-provision and active status, create dialog
- **API:** `/api/admin/scim-tenant-mappings` (GET/POST), `/api/admin/scim-tenant-mappings/[id]` (PATCH/DELETE)
- **Auth:** `requireAdminTenantContext()` — only `efeonce_admin` role

### Data Flow

```
Provisioning (SCIM — ~40 min cycle):
  [Entra ID] --SCIM POST/PATCH/DELETE--> [SCIM Server] --> [PostgreSQL: client_users, user_role_assignments]
  [Entra ID] <--SCIM GET/filter-------- [SCIM Server] <-- [PostgreSQL: client_users]

Real-time (Graph Webhook — seconds):
  [Entra ID] --user change--> [Graph] --POST notification--> [Webhook Endpoint] --> [Profile Sync + Hierarchy Governance] --> [PostgreSQL]

Enrichment (Graph API cron — daily safety net):
  [Graph API] --daily fetch-----------> [Profile Sync + Hierarchy Governance] --> [PostgreSQL: identity_profiles, members, client_users, reporting_hierarchy_drift_proposals]

Admin governance:
  [Admin Center] --/admin/scim-tenant-mappings--> [API] --> [PostgreSQL: scim_tenant_mappings]
```

## Schema

### New Tables

#### `greenhouse_core.scim_tenant_mappings`

Maps a Microsoft Entra tenant to a Greenhouse client context, controlling which users get auto-provisioned and with what baseline role.

| Column | Type | Purpose |
|--------|------|---------|
| `scim_tenant_mapping_id` | uuid | Primary key |
| `microsoft_tenant_id` | text | Entra tenant ID (unique) |
| `tenant_name` | text | Human-readable label |
| `client_id` | text nullable | FK to `greenhouse_core.clients`; `NULL` represents the internal Efeonce tenant |
| `space_id` | uuid | FK to `greenhouse_core.spaces` |
| `default_role_code` | text | Role assigned to newly provisioned users |
| `allowed_email_domains` | text[] | Domains that may be provisioned (e.g., `{efeoncepro.com, efeonce.org, efeonce.cl}`) |
| `auto_provision` | boolean | Whether to auto-create users on first SCIM push |
| `active` | boolean | Soft-disable mapping without deleting |

Seed record: Efeonce Group tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4` with domains `efeoncepro.com`, `efeonce.org`, `efeonce.cl`.

#### `greenhouse_core.scim_sync_log`

Immutable audit trail for all SCIM operations.

| Column | Type | Purpose |
|--------|------|---------|
| `log_id` | uuid | Primary key |
| `operation` | text | `create`, `update`, `deactivate`, `delete`, `get`, `list` |
| `scim_id` | text | Greenhouse SCIM ID referenced in the operation |
| `external_id` | text | Entra object ID |
| `email` | text | User email at time of operation |
| `microsoft_tenant_id` | text | Entra tenant ID |
| `request_summary` | jsonb | Sanitized summary of the SCIM request body |
| `response_status` | integer | HTTP status code returned |
| `error_message` | text | Error detail if operation failed |
| `created_at` | timestamptz | Timestamp of the operation |

#### `greenhouse_core.scim_groups`

Mirrors Entra groups in Greenhouse for SCIM group provisioning.

| Column | Type | Purpose |
|--------|------|---------|
| `scim_group_id` | text | Primary key |
| `microsoft_group_id` | text | Entra group ID (unique) |
| `display_name` | text | Group name |
| `description` | text | Group description |
| `group_type` | text | `security`, `unified` |
| `mapped_role_code` | text | Optional: auto-assign this role to members |
| `mapped_client_id` | text | Optional: associate group with a client |
| `active` | boolean | Soft-disable |
| `synced_at` | timestamptz | Last sync timestamp |

#### `greenhouse_core.scim_group_memberships`

Tracks which users belong to which SCIM groups.

| Column | Type | Purpose |
|--------|------|---------|
| `membership_id` | text | Primary key |
| `scim_group_id` | text | FK to `scim_groups` |
| `user_id` | text | FK to `client_users` |
| `microsoft_oid` | text | Entra OID for cross-reference |
| `active` | boolean | Soft membership status |
| Constraint | | Unique on `(scim_group_id, user_id)` |

### Modified Tables

#### `greenhouse_core.client_users`

New columns added to support SCIM lifecycle tracking:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `scim_id` | text | null | Stable external identifier for SCIM conversations (unique index) |
| `provisioned_by` | text | `'manual'` | Origin of the user: `manual`, `scim`, `backfill` |
| `provisioned_at` | timestamptz | null | When SCIM originally created this user |
| `deactivated_at` | timestamptz | null | When SCIM deactivated this user |

### Migrations

| File | Purpose |
|------|---------|
| `migrations/20260403002621463_scim-provisioning-tables.sql` | Users: `scim_tenant_mappings`, `scim_sync_log`, `client_users` columns |
| `migrations/20260403023326254_scim-groups.sql` | Groups: `scim_groups`, `scim_group_memberships` |
| `migrations/20260504102236037_scim-internal-tenant-null-client-mapping.sql` | Internal Efeonce tenant mapping uses `client_id=NULL`; external mappings get FK protection |

## Identity Graph Integration

SCIM-provisioned users connect to the full Greenhouse identity graph through the existing canonical model:

```
Entra (OID) --> client_users.microsoft_oid --> identity_profiles --> source_links (azure-ad) --> members
```

The identity graph path:
1. Entra pushes a user via SCIM with their OID as `externalId`
2. The provisioning engine creates or matches a `client_users` record using `microsoft_oid`
3. The record links to `identity_profiles` through `identity_profile_source_links` (source system `azure-ad`)
4. The profile sync cron enriches both `identity_profiles` and `members` with Graph API data

This ensures that SCIM-provisioned users are full participants in the 360 object model from day one.

## Azure Configuration

### Enterprise Apps

Two separate enterprise applications exist in Entra:

| App | App ID | Purpose | Type |
|-----|--------|---------|------|
| **Greenhouse** | `3626642f-...` | SSO only | Multi-tenant |
| **GH SCIM** | `4d89f061-...` | SCIM provisioning | Non-gallery app |

The separation exists because the original Greenhouse app accumulated a ghost provisioning job that could not be deleted via the Azure API (see Decision 1 below).

### Provisioning Job

- **Job ID:** `scim.a80bf6c17c454d70b04351389622a0e4.4d89f061-eeb0-4aa8-ac94-df57d37e8c2a`
- **Scope:** Group "Efeonce Group"
- **Mode:** Automatic

### Permissions

| App | Permission | Type | Purpose |
|-----|-----------|------|---------|
| Greenhouse | `User.Read.All` | Application | Graph API cron reads user profiles |
| GH SCIM | (automatic) | Provisioning | Entra manages SCIM sync automatically |

### Redirect URIs (Greenhouse SSO App)

- `https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (production)
- `https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (staging)

## Security

### Authentication

- SCIM endpoints use bearer token authentication, separate from NextAuth
- The canonical token lives in GCP Secret Manager (`scim-bearer-token`)
- `requireScimAuth()` resolves the token from Secret Manager with env var fallback
- Token comparison uses `timingSafeEqual` to prevent timing side-channel attacks

### Data Protection

- Soft delete only: SCIM DELETE sets `active = false` and `deactivated_at`, never removes data
- All SCIM operations are audit-logged to `greenhouse_core.scim_sync_log`
- Request bodies are sanitized before logging (no passwords or tokens)

### Network

- SCIM endpoints are public (required by Entra) but bearer-token protected
- Graph API calls use OAuth2 client credentials (no user interaction)

## Secrets & Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `SCIM_BEARER_TOKEN` | Vercel (production) | Fallback direct token |
| `SCIM_BEARER_TOKEN_SECRET_REF` | Vercel (all envs) | Points to GCP Secret Manager secret |
| `scim-bearer-token` | GCP Secret Manager | Canonical token storage |
| `AZURE_AD_CLIENT_ID` | Vercel | Graph API client credentials (app ID) |
| `AZURE_AD_CLIENT_SECRET` | Vercel / Secret Manager | Graph API client credentials (secret) |

## Operational Verification Runbook

Use this runbook when SCIM looks degraded in Entra or users are not appearing in Greenhouse.

### 1. Verify Greenhouse endpoint health

- `GET /api/scim/v2/ServiceProviderConfig` should return `200` without bearer auth.
- `GET /api/scim/v2/Users?count=1` should return `401` without bearer auth.
- `GET /api/scim/v2/Users?count=1` should return `200` with the production SCIM bearer token.

### 2. Verify Entra provisioning job state

Use Azure CLI / Microsoft Graph against service principal `GH SCIM`:

- Service principal ID: `fe7a54ef-844f-4cbc-acee-3349d914f1ce`
- Job ID: `scim.a80bf6c17c454d70b04351389622a0e4.4d89f061-eeb0-4aa8-ac94-df57d37e8c2a`

Healthy steady state:

- `schedule.state = Active`
- `status.code = Active`
- `status.lastExecution.state = Succeeded`
- `status.quarantine = null`
- `status.lastExecution.error = null`

### 3. Reprocess historical escrows safely

If the job shows historical escrow after Greenhouse has been fixed, use the official Microsoft Graph restart API:

```bash
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/${SP_ID}/synchronization/jobs/${JOB_ID}/restart" \
  --headers 'Content-Type=application/json' \
  --body '{"criteria":{"resetScope":"Escrows"}}'
```

Then start the job:

```bash
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/${SP_ID}/synchronization/jobs/${JOB_ID}/start"
```

Do not mutate Greenhouse users manually to clear Entra escrow counters.

### 4. Validate a real Entra user end-to-end

Use Microsoft Graph `provisionOnDemand` for one assigned user in scope. This is stronger than a direct `curl` because it exercises Entra scoping, mapping, matching, export, and Greenhouse SCIM persistence.

Healthy result:

- `EntryImport = Success`
- `EntrySynchronizationScoping = Success`
- `EntrySynchronizationAdd` or `EntrySynchronizationUpdate = Success`
- `EntryExportAdd` or `EntryExportUpdate = Success`

After success, verify Postgres:

- `client_users.scim_id IS NOT NULL`
- Internal Efeonce user: `client_id IS NULL`
- Internal Efeonce user: `tenant_type = 'efeonce_internal'`
- `auth_mode = 'microsoft_sso'`
- `provisioned_by = 'scim'`
- role assignment exists with expected `role_code`

## Vercel Cron Registration

| Cron | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/entra-profile-sync` | `0 8 * * *` (daily 08:00 UTC) | Full profile sync from Graph API — safety net |
| `/api/cron/entra-webhook-renew` | `0 6 */2 * *` (every 2 days 06:00 UTC) | Renew Microsoft Graph webhook subscription |

Both registered in `vercel.json`.

## Core Design Decisions

### Decision 1: Separate Enterprise Apps for SSO and SCIM

The original Greenhouse enterprise app in Entra accumulated a ghost provisioning job that could not be deleted via the Azure provisioning API. Rather than fight the Azure state machine, a second app ("GH SCIM") was created as a non-gallery application specifically for SCIM provisioning. This cleanly separates SSO concerns from provisioning concerns and avoids the ghost job issue entirely.

### Decision 2: Cron + Graph API for enrichment instead of extending SCIM

The SCIM 2.0 standard handles lifecycle attributes: `userName`, `displayName`, `active`, `externalId`. Rich profile data such as `jobTitle`, `country`, `department`, and `mobilePhone` is not part of the standard SCIM provisioning flow. Rather than building custom SCIM schema extensions (which Entra does not natively push), a daily Graph API cron fetches the full profile and performs diff-based updates. This keeps the SCIM server standard-compliant and the enrichment path simple.

### Decision 3: PostgreSQL-first write path

All SCIM writes go directly to PostgreSQL (`greenhouse_core` schema), not BigQuery. This aligns with the Identity & Access V2 architecture where `greenhouse_core` is the canonical store for identity, access, and organizational data. BigQuery receives this data downstream through the existing sync pipelines.

### Decision 4: Bearer token over OAuth for SCIM auth

Bearer token authentication is simpler for the machine-to-machine SCIM protocol and sufficient at current scale (single Entra tenant, scoped to one group). The token is stored in GCP Secret Manager with env var fallback. If automated rotation becomes necessary, the architecture can migrate to OAuth2 client credentials without changing the SCIM server contract.

### Decision 5: Daily sync cadence for profile enrichment

Profile attributes like job title, country, and phone number change infrequently. Running the enrichment cron once daily at 08:00 UTC (05:00 Chile, before business hours) provides fresh data for the workday without unnecessary API load. The diff-based update logic ensures no-op runs are cheap.

### Decision 6: Tenant mapping table for multi-tenant readiness

Although only the Efeonce Group tenant is configured today, the `scim_tenant_mappings` table supports future multi-tenant SCIM provisioning. Each tenant mapping declares its allowed email domains, default role, and auto-provision flag, enabling new client organizations to onboard without code changes.

Internal Efeonce provisioning uses `client_id=NULL` by contract. External/client tenant mappings must use a real `greenhouse_core.clients.client_id`; the database enforces this with `scim_tenant_mappings_client_id_fkey` so a legacy pseudo-client such as `efeonce-admin` cannot silently break Entra CREATE operations again.

## File Inventory

| File | Purpose |
|------|---------|
| **SCIM Server** | |
| `src/app/api/scim/v2/ServiceProviderConfig/route.ts` | SCIM discovery endpoint |
| `src/app/api/scim/v2/Schemas/route.ts` | SCIM schema definition |
| `src/app/api/scim/v2/Users/route.ts` | User list and create endpoints |
| `src/app/api/scim/v2/Users/[id]/route.ts` | User get, update, delete endpoints |
| `src/app/api/scim/v2/Groups/route.ts` | Group list and create endpoints |
| `src/app/api/scim/v2/Groups/[id]/route.ts` | Group get, update, delete, member management |
| `src/lib/scim/auth.ts` | Bearer token auth helper (Secret Manager) |
| `src/lib/scim/formatters.ts` | SCIM response formatters (Users + Groups) |
| `src/lib/scim/provisioning.ts` | User provisioning engine (CRUD, events, audit) |
| `src/lib/scim/groups.ts` | Group provisioning engine (CRUD, memberships) |
| `src/types/scim.ts` | SCIM 2.0 protocol TypeScript types |
| **Entra Sync** | |
| `src/lib/entra/graph-client.ts` | Graph API OAuth2 client with token caching |
| `src/lib/entra/profile-sync.ts` | Diff-based profile sync engine |
| `src/lib/entra/webhook-subscription.ts` | Graph webhook subscription manager |
| `src/app/api/cron/entra-profile-sync/route.ts` | Daily enrichment cron (safety net) |
| `src/app/api/cron/entra-webhook-renew/route.ts` | Webhook subscription renewal cron |
| `src/app/api/webhooks/entra-user-change/route.ts` | Real-time Graph webhook receiver |
| **Admin UI** | |
| `src/app/(dashboard)/admin/scim-tenant-mappings/page.tsx` | Admin Center page |
| `src/app/api/admin/scim-tenant-mappings/route.ts` | Tenant mappings API (GET/POST) |
| `src/app/api/admin/scim-tenant-mappings/[id]/route.ts` | Tenant mapping API (PATCH/DELETE) |
| `src/views/greenhouse/admin/ScimTenantMappingsView.tsx` | Client-side view component |
| **Migrations** | |
| `migrations/20260403002621463_scim-provisioning-tables.sql` | Users: tenant mappings, sync log, client_users columns |
| `migrations/20260403023326254_scim-groups.sql` | Groups: scim_groups, scim_group_memberships |
