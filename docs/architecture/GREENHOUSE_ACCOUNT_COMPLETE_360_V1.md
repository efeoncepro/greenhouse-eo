# Greenhouse Account Complete 360 — Serving Layer V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-07 por Claude (TASK-274)
> **Ultima actualizacion:** 2026-04-07
> **Task:** TASK-274 — Account Complete 360: capa de serving federada por facetas para organizaciones

---

## Purpose

Define el contrato, la arquitectura y las reglas del **Account Complete 360 Federated Resolver** — capa de serving que consolida TODOS los datos de una organizacion bajo un solo resolver con facetas on-demand, autorizacion per-facet, cache in-memory, y observabilidad.

Mirrors the Person Complete 360 (TASK-273) pattern. Where Person 360 resolves `profileId -> memberId` once and fans out to person-scoped facets, Account 360 resolves `organizationId -> AccountScope` once (org, spaces, clients) and fans out to org-scoped facets.

## Core Thesis

**Una cuenta, un resolver, N facetas.** El consumidor pide exactamente las facetas que necesita. El resolver resuelve scope una sola vez, ejecuta facetas en paralelo, aplica autorizacion, cache, y retorna `_meta` con timing, errores, y estado de cache por faceta.

## Architecture

```
Consumer (Admin Tenant Detail, Space Detail, API client)
    |
    v
GET /api/organization/{id}/360?facets=identity,spaces,team
    |
    v
[requireTenantContext] ── auth check
    |
    v
[resolveOrganizationIdentifier] ── identity resolution
    |  accepts: organization_id, public_id
    |  resolves: { organizationId }
    v
[resolveAccountScope] ── scope resolution (executed once)
    |  org → active spaces → client_id bridges
    |  returns: AccountScope { organizationId, publicId, hubspotCompanyId, spaceIds, clientIds }
    v
[authorizeAccountFacets] ── per-facet authorization
    |  determines: allowedFacets, deniedFacets, fieldRedactions
    |  based on: relation (same_org/different_org) x role x tenant_type
    v
[FACET_REGISTRY] ── parallel execution of allowed facets
    |  identity ──> greenhouse_core.organizations
    |  spaces ──> greenhouse_core.spaces + space_360
    |  team ──> greenhouse_core.person_memberships + team_members
    |  economics ──> greenhouse_serving.space_360 (financial summaries)
    |  delivery ──> greenhouse_serving.space_360 (ICO/delivery metrics)
    |  finance ──> greenhouse_finance.fin_income + fin_expenses
    |  crm ──> greenhouse_crm via hubspot_company_id bridge
    |  services ──> greenhouse_core.client_service_modules
    |  staffAug ──> greenhouse_core.client_team_assignments (type=staff_augmentation)
    v
[facet-cache] ── per-facet in-memory cache (TTL, stale-while-revalidate)
    |
    v
[applyAccountFieldRedactions] ── post-process redacted fields
    |
    v
AccountComplete360 { _meta, identity, spaces?, team?, economics?, delivery?, finance?, crm?, services?, staffAug? }
```

## Files

| File | Purpose |
|------|---------|
| `src/types/account-complete-360.ts` | All type definitions (facets, meta, auth, scope) |
| `src/lib/account-360/account-complete-360.ts` | Federated resolver + bulk resolver |
| `src/lib/account-360/facet-authorization.ts` | Authorization engine (per-facet + field-level) |
| `src/lib/account-360/facet-cache.ts` | In-memory cache with per-facet TTL |
| `src/lib/account-360/facet-cache-invalidation.ts` | Outbox event → cache invalidation mapping |
| `src/lib/account-360/resolve-organization-id.ts` | Organization identifier resolution |
| `src/lib/account-360/resolve-scope.ts` | Scope resolution: org → spaces → clients |
| `src/lib/account-360/facets/identity.ts` | Identity facet (organization core) |
| `src/lib/account-360/facets/spaces.ts` | Spaces facet (active spaces + config) |
| `src/lib/account-360/facets/team.ts` | Team facet (person memberships) |
| `src/lib/account-360/facets/economics.ts` | Economics facet (P&L, margins, cost attribution) |
| `src/lib/account-360/facets/delivery.ts` | Delivery facet (ICO, projects, sprints) |
| `src/lib/account-360/facets/finance.ts` | Finance facet (income, expenses, indicators) |
| `src/lib/account-360/facets/crm.ts` | CRM facet (HubSpot company + deals) |
| `src/lib/account-360/facets/services.ts` | Services facet (client_service_modules) |
| `src/lib/account-360/facets/staff-aug.ts` | Staff augmentation facet (placements) |
| `src/app/api/organization/[id]/360/route.ts` | REST endpoint (GET single) |
| `src/app/api/organizations/360/route.ts` | Bulk REST endpoint (POST) |

## Facet Registry

| Facet | Cache TTL | Sensitivity | Data Source |
|-------|-----------|-------------|-------------|
| `identity` | 10 min | public | `greenhouse_core.organizations` |
| `spaces` | 10 min | internal | `greenhouse_core.spaces` |
| `team` | 5 min | internal | `greenhouse_core.person_memberships` + `team_members` |
| `economics` | 5 min | confidential | `greenhouse_serving.space_360` (financial summaries) |
| `delivery` | 5 min | internal | `greenhouse_serving.space_360` (ICO/delivery) |
| `finance` | 10 min | confidential | `greenhouse_finance.fin_income` + `fin_expenses` |
| `crm` | 10 min | internal | `greenhouse_crm` via `hubspot_company_id` bridge |
| `services` | 10 min | internal | `greenhouse_core.client_service_modules` |
| `staffAug` | 10 min | confidential | `client_team_assignments` (type=staff_augmentation) |

## Scope Resolution

Unlike Person 360 which resolves `profileId -> memberId`, Account 360 resolves a full **AccountScope** once:

1. `resolveOrganizationIdentifier(identifier)` — accepts `organization_id` or `public_id`, returns `{ organizationId }`
2. `resolveAccountScope(organizationId)` — queries active spaces for the org, extracts `client_id` bridges, returns:

```typescript
interface AccountScope {
  organizationId: string
  publicId: string | null
  hubspotCompanyId: string | null
  spaceIds: string[]     // active spaces owned by this org
  clientIds: string[]    // client_id bridges from spaces
}
```

The scope is passed to every facet — no facet re-queries the org-space-client graph.

## Authorization Matrix

| Relation | Role | Allowed Facets | Field Redactions |
|----------|------|----------------|------------------|
| internal | `efeonce_admin` | ALL | none |
| internal | `efeonce_operations` | ALL except `finance` | none |
| internal | `finance_manager` | identity, spaces, economics, finance | none |
| internal | `client_executive` | identity, spaces, team, delivery, crm, services | none |
| internal | collaborator | identity, spaces | none |
| same_org (client) | `client_executive` | identity, spaces, team, delivery, services | finance/economics denied |
| same_org (client) | other | identity, spaces | most facets denied |
| different_org | any | identity only | taxId redacted |

## Caching

- **Backend:** In-memory `Map<string, CacheEntry>` (per-process, prepared for Redis via TASK-276)
- **Key format:** `account360:{organizationId}:{facetName}`
- **Soft expiry:** TTL per facet (from registry)
- **Hard expiry:** 2x soft TTL (stale-while-revalidate window)
- **Bypass:** `?cache=bypass` query param
- **Status reporting:** `_meta.cacheStatus` per facet: `hit` | `miss` | `stale` | `bypass`

## Cache Invalidation

Outbox events mapped to facets via `facet-cache-invalidation.ts`:

| Event | Invalidated Facets |
|-------|--------------------|
| `organization.updated` | identity, spaces |
| `membership.created` | team, identity |
| `membership.updated` | team |
| `membership.deactivated` | team, identity |
| `assignment.created` | team, economics |
| `assignment.updated` | team, economics |
| `assignment.removed` | team, economics |
| `service.created` | services |
| `service.updated` | services |
| `service.deactivated` | services |
| `staff_aug.placement.created` | staffAug |
| `staff_aug.placement.updated` | staffAug |
| `staff_aug.placement.status_changed` | staffAug |
| `finance.income.created` | finance |
| `finance.income.updated` | finance |
| `finance.expense.created` | finance, economics |
| `finance.expense.updated` | finance, economics |
| `accounting.pl_snapshot.materialized` | economics |
| `accounting.period_closed` | economics, finance |
| `accounting.period_reopened` | economics, finance |
| `accounting.commercial_cost_attribution.materialized` | economics |

## API Endpoints

### `GET /api/organization/{id}/360`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `facets` | string (comma-separated) | `identity` | Facets to resolve |
| `asOf` | ISO date | null | Point-in-time query |
| `cache` | `bypass` | normal | Force fresh data |
| `limit` | number (1-100) | per-facet default | Sub-collection limit |
| `offset` | number | 0 | Sub-collection offset |

### `POST /api/organizations/360`

Body: `{ organizationIds: string[], facets: string[] }`

- Max 50 organizationIds per request
- Same authorization applied per organization

## Observability

Each resolver invocation logs a `ResolverTrace` JSON to Vercel runtime logs:

```json
{
  "traceId": "uuid",
  "organizationId": "org-...",
  "requestedFacets": ["identity", "spaces", "team"],
  "resolvedFacets": ["identity", "spaces", "team"],
  "deniedFacets": [],
  "timingMs": { "identity": 8, "spaces": 22, "team": 35 },
  "totalMs": 41,
  "cacheHits": 1,
  "cacheMisses": 2,
  "errors": [],
  "requesterInfo": "org-...",
  "timestamp": "2026-04-07T..."
}
```

Response headers: `X-Resolver-Version`, `X-Timing-Ms`, `X-Cache-Status` (`hits=N,misses=N`).

Slow facet warning threshold: 2000ms per facet.

## Related Docs

- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md` — Person 360 (mirror pattern, TASK-273)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — canonical 360 object model
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — person-org model
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — backbone 360 en Cloud SQL

## Future

- **TASK-276:** Redis cache (Upstash) — replaces in-memory Map with distributed cache
- **TASK-277:** GraphQL layer — wraps the same facets for field-level client queries
- Consumer migration: Admin Tenant Detail, Space Detail views → single 360 fetch
