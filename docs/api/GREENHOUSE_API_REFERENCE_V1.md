# Greenhouse API Reference V1

> Estado 2026-04-25: documento derivado/transicional.
> La arquitectura canónica de la API platform ahora vive en:
> `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
>
> Este archivo se conserva como quick reference operativa de surfaces ya vivas,
> pero ya no debe tratarse como source of truth arquitectónica principal.

Use this file as the first read for any agent or connector that needs to integrate with Greenhouse APIs.

## Environments

- Production base URL: `https://greenhouse.efeoncepro.com`
- Staging base URL: `https://dev-greenhouse.efeoncepro.com`

## API Families

La taxonomía general de lanes, versionado, auth, resiliencia, idempotencia y rollout
ya no se define aquí. Este archivo solo resume surfaces existentes.

### 1. API Platform

Purpose:
- canonical platform contracts for ecosystem consumers, first-party app clients, and event control plane resources
- stable response envelope, explicit version header, scoped auth, rate-limit headers, and selective freshness

Current version:
- `2026-04-25`
- header: `x-greenhouse-api-version`

Lanes:
- `ecosystem`: server-to-server, binding-aware, consumer-token authenticated
- `app`: first-party user-authenticated lane for the future React Native app
- `event control plane`: webhook subscriptions, deliveries and retry commands under `api/platform/ecosystem/*`

Routes:
- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/integration-readiness`
- `GET /api/platform/ecosystem/event-types`
- `GET/POST /api/platform/ecosystem/webhook-subscriptions`
- `GET/PATCH /api/platform/ecosystem/webhook-subscriptions/:id`
- `GET /api/platform/ecosystem/webhook-deliveries`
- `GET /api/platform/ecosystem/webhook-deliveries/:id`
- `POST /api/platform/ecosystem/webhook-deliveries/:id/retry`
- `POST/PATCH /api/platform/app/sessions`
- `DELETE /api/platform/app/sessions/current`
- `GET /api/platform/app/context`
- `GET /api/platform/app/home`
- `GET /api/platform/app/notifications`
- `POST /api/platform/app/notifications/:id/read`
- `POST /api/platform/app/notifications/mark-all-read`

Read next:
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `docs/documentation/plataforma/api-platform-ecosystem.md`

Key rules:
- `api/platform/*` is authenticated and controlled; it is not an anonymous public API
- ecosystem consumers must resolve tenancy through consumer credentials and bindings
- app clients must use `api/platform/app/*`, not web routes or `AGENT_AUTH`
- event retry schedules work for the dispatcher; it does not deliver inline
- general ecosystem writes and cross-lane idempotency remain follow-ups

### 2. Integrations API

Purpose:
- generic machine-to-machine integration surface
- intended for HubSpot, Notion, BigQuery-backed connectors, sister platforms, and future external systems

Auth:
- `Authorization: Bearer <GREENHOUSE_INTEGRATION_API_TOKEN>`
- or `x-greenhouse-integration-key: <GREENHOUSE_INTEGRATION_API_TOKEN>`
- sister-platform hardened lane:
  - `Authorization: Bearer <consumer-token>`
  - or `x-greenhouse-sister-platform-key: <consumer-token>`
  - plus `externalScopeType` + `externalScopeId`

Routes:
- `GET /api/integrations/v1/catalog/capabilities`
- `GET /api/integrations/v1/tenants`
- `POST /api/integrations/v1/tenants/capabilities/sync`
- `GET /api/integrations/v1/sister-platforms/context`
- `GET /api/integrations/v1/sister-platforms/catalog/capabilities`
- `GET /api/integrations/v1/sister-platforms/readiness`

Read next:
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`

Key rules:
- provider-neutral contract
- sister-platform read routes are binding-aware and read-only by default
- no automatic derivation from `deals` or `closedwon`
- external sync must send explicit `businessLines` and `serviceModules`
- tenant resolution supports:
  - `clientId`
  - `publicId`
  - `sourceSystem + sourceObjectType + sourceObjectId`

### 2. Admin Capability Governance API

Purpose:
- internal admin control of tenant capabilities from the Greenhouse admin UI

Auth:
- authenticated admin session via NextAuth and Greenhouse admin authorization

Routes:
- `GET /api/admin/tenants/[id]/capabilities`
- `PUT /api/admin/tenants/[id]/capabilities`
- `POST /api/admin/tenants/[id]/capabilities/sync`

Read next:
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`

Key rules:
- manual admin assignments keep precedence
- sync route now requires explicit payload
- this is not the recommended external connector surface

## Recommended Read Order For Another Codex

1. `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
2. `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
3. `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
4. `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
5. `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
6. `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
7. `project_context.md`
8. `Handoff.md`

## Production-Ready Endpoints

### API Platform

- `https://greenhouse.efeoncepro.com/api/platform/ecosystem/context`
- `https://greenhouse.efeoncepro.com/api/platform/ecosystem/organizations`
- `https://greenhouse.efeoncepro.com/api/platform/ecosystem/capabilities`
- `https://greenhouse.efeoncepro.com/api/platform/ecosystem/integration-readiness`
- `https://greenhouse.efeoncepro.com/api/platform/ecosystem/event-types`
- `https://greenhouse.efeoncepro.com/api/platform/ecosystem/webhook-subscriptions`
- `https://greenhouse.efeoncepro.com/api/platform/ecosystem/webhook-deliveries`
- `https://greenhouse.efeoncepro.com/api/platform/app/sessions`
- `https://greenhouse.efeoncepro.com/api/platform/app/context`
- `https://greenhouse.efeoncepro.com/api/platform/app/home`
- `https://greenhouse.efeoncepro.com/api/platform/app/notifications`

### Integrations API

- `https://greenhouse.efeoncepro.com/api/integrations/v1/catalog/capabilities`
- `https://greenhouse.efeoncepro.com/api/integrations/v1/tenants`
- `https://greenhouse.efeoncepro.com/api/integrations/v1/tenants/capabilities/sync`
- `https://greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/context`
- `https://greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/catalog/capabilities`
- `https://greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/readiness`

### Staging API

- `https://dev-greenhouse.efeoncepro.com/api/integrations/v1/catalog/capabilities`
- `https://dev-greenhouse.efeoncepro.com/api/integrations/v1/tenants`
- `https://dev-greenhouse.efeoncepro.com/api/integrations/v1/tenants/capabilities/sync`
- `https://dev-greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/context`
- `https://dev-greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/catalog/capabilities`
- `https://dev-greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/readiness`

### ICO Engine API

Internal endpoints for ICO metrics. Auth: `requireAgencyTenantContext()` or `requirePeopleTenantContext()`.

| Method | Endpoint | Description | Key Params |
|--------|----------|-------------|------------|
| GET | `/api/ico-engine/context` | **Generic context endpoint** — metrics for any dimension | `dimension` (space\|project\|member\|client\|sprint), `value`, `year`, `month` |
| GET | `/api/ico-engine/metrics` | Space metrics (materialized + live fallback) | `spaceId`, `year`, `month`, `live` |
| GET | `/api/ico-engine/metrics/agency` | Agency-wide metrics across all spaces | `year`, `month`, `live` |
| GET | `/api/ico-engine/metrics/project` | Project-level metrics | `spaceId`, `year`, `month` |
| GET | `/api/ico-engine/stuck-assets` | Stuck asset detail list | `spaceId` |
| GET | `/api/ico-engine/trends/rpa` | RPA trend data (last N months) | `spaceId`, `months` |
| GET | `/api/ico-engine/registry` | Metric definitions (MetricDefinition[]) | — |
| GET | `/api/ico-engine/health` | Materialization freshness | — |
| GET | `/api/people/[memberId]/ico` | Person-level ICO metrics (convenience) | `year`, `month` |
| GET | `/api/organizations/[id]/ico` | Organization ICO metrics (all active spaces) | `year`, `month` |

**Context endpoint** (`/api/ico-engine/context`) is the preferred generic entry point for new consumers. It validates dimension against `ICO_DIMENSIONS` allowlist, tries materialized cache first, and falls back to live compute.

Response type: `IcoMetricSnapshot` — includes `dimension`, `dimensionValue`, `metrics[]`, `cscDistribution[]`, `context`, `computedAt`, `engineVersion`, `source`.

## Notes

- BigQuery remains the historical backup and analytical layer.
- Greenhouse integration sync is operational and should not wait for the daily backup cycle.
- If another connector needs a non-HubSpot identity mapping, extend the tenant resolution layer instead of creating a provider-specific API.
