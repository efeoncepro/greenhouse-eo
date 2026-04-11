# Greenhouse Sister Platform Bindings Runtime V1

## Purpose

Define the runtime foundation that binds Greenhouse scopes with sister-platform external scopes.

This document exists to make the runtime contract explicit after `TASK-375`. It covers:

1. canonical persistence for sister-platform bindings
2. runtime resolution from external scope to Greenhouse scope
3. lifecycle and governance states
4. outbox events emitted by the binding lifecycle
5. admin surfaces available today

Use together with:
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`

## Status

Implemented in code on 2026-04-11 via `TASK-375`.

Current runtime status:
- code implemented
- admin read/governance surface implemented
- migration file created
- database apply still requires Cloud SQL Proxy + valid ADC in an interactive environment

## Why This Runtime Exists

Greenhouse already had mature internal tenancy concepts:
- `organizationId`
- `clientId`
- `spaceId`
- `tenantType`

What did not exist was a canonical, reusable bridge that could answer:

- which sister platform this external scope belongs to
- what Greenhouse scope it resolves to
- whether the binding is active or suspended
- who created or changed it

Without this runtime object, each future integration would have to infer scope from labels, manual conventions, or one-off tables. That is explicitly forbidden by the sister-platform contract.

## Source-of-Truth Boundaries

| Domain | Authority | Notes |
|--------|-----------|-------|
| Greenhouse internal scope semantics | Greenhouse | `organization`, `client`, `space`, `internal` |
| External scope identity | Sister platform | The external app owns the meaning of its tenant/workspace/portal/install ID |
| Cross-platform binding | Greenhouse | Greenhouse owns the canonical runtime binding used by its APIs and consumers |
| Activation / suspension / deprecation of the binding | Greenhouse admin governance | Downstream apps may mirror the effect, but not redefine the canonical Greenhouse binding state |

## Runtime Object

### Canonical table

`greenhouse_core.sister_platform_bindings`

### Supporting sequence

`greenhouse_core.seq_sister_platform_binding_public_id`

Public IDs are generated as:

- `EO-SPB-0001`
- `EO-SPB-0002`
- ...

### Primary runtime fields

| Field | Purpose |
|-------|---------|
| `sister_platform_binding_id` | Internal PK |
| `public_id` | Human-friendly EO identifier |
| `sister_platform_key` | Platform namespace such as `kortex` or `verk` |
| `external_scope_type` | What kind of external object is being bound |
| `external_scope_id` | Stable external ID used for resolution |
| `external_scope_parent_id` | Optional parent external ID |
| `external_display_name` | Friendly label for admin visibility |
| `greenhouse_scope_type` | `organization`, `client`, `space`, or `internal` |
| `organization_id` | Canonical organization binding when applicable |
| `client_id` | Canonical client binding when applicable |
| `space_id` | Canonical space binding when applicable |
| `binding_role` | `primary`, `secondary`, or `observer` |
| `binding_status` | `draft`, `active`, `suspended`, or `deprecated` |
| `metadata_json` | Structured extension area |
| `last_verified_at` | Last explicit verification timestamp |
| actor fields | `created_by_user_id`, `activated_by_user_id`, `suspended_by_user_id`, `deprecated_by_user_id` |
| status timestamps | `activated_at`, `suspended_at`, `deprecated_at` |

## Scope Model

### Supported Greenhouse scope types

The runtime supports four scope shapes:

1. `organization`
2. `client`
3. `space`
4. `internal`

### Scope rules

| `greenhouse_scope_type` | Required fields | Forbidden fields |
|-------------------------|----------------|------------------|
| `organization` | `organization_id` | `client_id`, `space_id` |
| `client` | `organization_id`, `client_id` | `space_id` |
| `space` | `organization_id`, `client_id`, `space_id` | none |
| `internal` | none | `organization_id`, `client_id`, `space_id` |

This is enforced by a database check constraint and by the runtime helper.

### Why `internal` exists

Not every sister-platform integration is client- or space-bound. Some ecosystem integrations operate as internal Efeonce control-plane relationships. The binding runtime must support that explicitly instead of forcing fake client or space records.

## External Scope Model

### Supported external scope types

The first runtime version accepts:

- `tenant`
- `workspace`
- `portal`
- `installation`
- `client`
- `space`
- `organization`
- `other`

This keeps the model sister-platform-neutral while still being concrete enough for Kortex and future apps.

## Lifecycle Model

### States

| State | Meaning | Runtime behavior |
|-------|---------|------------------|
| `draft` | Binding exists but is not yet trusted for downstream use | visible in admin, not returned by active resolver |
| `active` | Binding is valid and can be consumed by runtime readers | returned by resolver |
| `suspended` | Binding was valid but is currently blocked | not returned by active resolver |
| `deprecated` | Binding is historical and no longer canonical | excluded from non-historical uniqueness |

### Lifecycle notes

- only `active` bindings are returned by the canonical resolver
- `deprecated` bindings free the external scope keyspace for a replacement binding
- actor and timestamp columns preserve governance traceability

## Uniqueness and Safety Rules

### External uniqueness

The runtime enforces partial uniqueness on:

- `sister_platform_key`
- `external_scope_type`
- `external_scope_id`
- `binding_role`

for every binding whose status is not `deprecated`.

This prevents two simultaneously live bindings from claiming the same external scope and role.

### Tenant isolation

The runtime helper filters access according to the current tenant context when provided:

- if tenant has `spaceId`, bindings are limited to that `space_id`
- else if tenant has `clientId`, bindings are limited to that `client_id`
- else if tenant has `organizationId`, bindings are limited to that `organization_id`

Admin routes use `requireAdminTenantContext()`, so only admin-scoped users can operate these bindings today.

## Runtime Helper

### File

`src/lib/sister-platforms/bindings.ts`

### Current responsibilities

- list bindings
- read binding by ID
- create binding
- update binding
- resolve active binding from external scope
- validate scope consistency
- enforce tenant-aware access when tenant context is provided
- emit outbox events for binding lifecycle

### Canonical resolver

`resolveSisterPlatformBinding(...)`

Input:
- `sisterPlatformKey`
- `externalScopeType`
- `externalScopeId`
- optional tenant context

Output:
- `bindingId`
- `publicId`
- `bindingStatus`
- `greenhouseScopeType`
- `organizationId`
- `clientId`
- `spaceId`
- display names when available

Resolver policy:
- reads only `active` bindings
- prefers primary role ordering over secondary/observer
- never infers scope from labels

## Events

### Aggregate type

`sister_platform_binding`

### Event types

- `sister_platform_binding.created`
- `sister_platform_binding.updated`
- `sister_platform_binding.activated`
- `sister_platform_binding.suspended`
- `sister_platform_binding.deprecated`

### Why events matter now

Even though no dedicated downstream consumer was added in `TASK-375`, the events are part of the foundation so future work can subscribe without refactoring the binding runtime.

This is important for:
- `TASK-376`
- `TASK-377`
- future sister-platform adapters

## Admin Surfaces

### API

Implemented admin routes:

- `GET /api/admin/integrations/sister-platform-bindings`
- `POST /api/admin/integrations/sister-platform-bindings`
- `GET /api/admin/integrations/sister-platform-bindings/[bindingId]`
- `PATCH /api/admin/integrations/sister-platform-bindings/[bindingId]`

### UI

Bindings are visible in:

- `/admin/integrations`

Current UI scope:
- read/governance visibility
- status overview
- linked platform count
- linked Greenhouse scope visibility

No dedicated standalone page was added in this first version because the natural governance surface already existed.

## Relationship with Kortex

This runtime is intentionally not Kortex-specific.

What it does allow:
- a `kortex` binding namespace
- portal/workspace/install IDs from Kortex to resolve to Greenhouse scopes

What it does not do yet:
- expose a hardened read-only external API for Kortex
- expose MCP read operations
- implement any Kortex-specific bridge logic

Those belong to `TASK-376` and `TASK-377`.

## Known Gaps

1. migration still needs to be applied in a live database session with Cloud SQL Proxy
2. generated DB types still need regeneration after the migration is applied
3. no dedicated consumer exists yet for the new outbox events
4. admin UI is visibility-first; it is not yet a full operator workflow

## File Map

| Area | Path |
|------|------|
| migration | `migrations/20260411192943501_sister-platform-bindings-foundation.sql` |
| runtime types | `src/lib/sister-platforms/types.ts` |
| runtime helper | `src/lib/sister-platforms/bindings.ts` |
| admin API list/create | `src/app/api/admin/integrations/sister-platform-bindings/route.ts` |
| admin API detail/update | `src/app/api/admin/integrations/sister-platform-bindings/[bindingId]/route.ts` |
| admin UI wiring | `src/app/(dashboard)/admin/integrations/page.tsx` |
| admin UI section | `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx` |
| event catalog | `src/lib/sync/event-catalog.ts` |

## Next Steps

1. apply the migration and regenerate DB types
2. harden the external read-only surface in `TASK-376`
3. implement the first Kortex bridge in `TASK-377`
