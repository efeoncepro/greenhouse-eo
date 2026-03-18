# Greenhouse API Reference V1

Use this file as the first read for any agent or connector that needs to integrate with Greenhouse APIs.

## Environments

- Production base URL: `https://greenhouse.efeoncepro.com`
- Staging base URL: `https://dev-greenhouse.efeoncepro.com`

## API Families

### 1. Integrations API

Purpose:
- generic machine-to-machine integration surface
- intended for HubSpot, Notion, BigQuery-backed connectors, and future external systems

Auth:
- `Authorization: Bearer <GREENHOUSE_INTEGRATION_API_TOKEN>`
- or `x-greenhouse-integration-key: <GREENHOUSE_INTEGRATION_API_TOKEN>`

Routes:
- `GET /api/integrations/v1/catalog/capabilities`
- `GET /api/integrations/v1/tenants`
- `POST /api/integrations/v1/tenants/capabilities/sync`

Read next:
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`

Key rules:
- provider-neutral contract
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
2. `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
3. `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
4. `project_context.md`
5. `Handoff.md`

## Production-Ready Endpoints

### Integrations API

- `https://greenhouse.efeoncepro.com/api/integrations/v1/catalog/capabilities`
- `https://greenhouse.efeoncepro.com/api/integrations/v1/tenants`
- `https://greenhouse.efeoncepro.com/api/integrations/v1/tenants/capabilities/sync`

### Staging API

- `https://dev-greenhouse.efeoncepro.com/api/integrations/v1/catalog/capabilities`
- `https://dev-greenhouse.efeoncepro.com/api/integrations/v1/tenants`
- `https://dev-greenhouse.efeoncepro.com/api/integrations/v1/tenants/capabilities/sync`

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
