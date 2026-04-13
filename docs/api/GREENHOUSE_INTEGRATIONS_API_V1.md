# Greenhouse Integrations API V1

## Goal

Expose a system-agnostic integration API so external connectors can exchange tenant commercial context with Greenhouse without coupling the product to a single provider.

This surface now has two lanes:

- a generic integrations lane for existing connector-style consumers
- a hardened read-only sister-platform lane for ecosystem peers such as Kortex

This API is intended for integration workers such as:
- HubSpot -> BigQuery Cloud Functions
- Notion -> BigQuery loaders
- future ERP, CRM, billing, or planning connectors

The API is not the connector itself.
It is the Greenhouse-side contract that those connectors can call.

Machine-readable handoff:
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`

## Authentication

### Generic integrations lane

Most generic routes under `/api/integrations/v1/*` still require one shared token:

- env var: `GREENHOUSE_INTEGRATION_API_TOKEN`
- accepted headers:
  - `Authorization: Bearer <token>`
  - `x-greenhouse-integration-key: <token>`

### Sister-platform read-only lane

Routes under `/api/integrations/v1/sister-platforms/*` require:

- a per-consumer credential stored in `greenhouse_core.sister_platform_consumers`
- accepted headers:
  - `Authorization: Bearer <consumer-token>`
  - `x-greenhouse-sister-platform-key: <consumer-token>`
- explicit scope query params:
  - `externalScopeType`
  - `externalScopeId`

The request is only served if the consumer token is valid, the binding resolves as `active`, and the resolved Greenhouse scope is allowed for that consumer.

This token is separate from NextAuth and admin session auth.

## Design Rules

- The contract is provider-neutral.
- Every payload can identify the external record with:
  - `sourceSystem`
  - `sourceObjectType`
  - `sourceObjectId`
- Greenhouse remains the canonical runtime for tenant capability state.
- Connectors may push normalized commercial context into Greenhouse.
- Connectors may also read tenant state back from Greenhouse to support bidirectional sync.
- Sister-platform read-only routes must resolve tenancy through `sister_platform_bindings`; they do not infer scope from labels or provider-specific heuristics.
- No route derives capabilities from `deals` automatically.
- If a provider wants to sync capabilities, it must send explicit `businessLines` and `serviceModules`.

## Routes

### `GET /api/integrations/v1/catalog/capabilities`

Returns the active Greenhouse catalog from `greenhouse.service_modules`.

Use this to:
- map external commercial fields to valid Greenhouse module codes
- validate payloads before pushing tenant syncs
- avoid hardcoding labels or parent relationships in the connector

Response shape:

```json
{
  "exportedAt": "2026-03-11T20:30:00.000Z",
  "businessLines": [
    {
      "moduleCode": "globe",
      "publicModuleId": "EO-BL-GLOBE",
      "moduleLabel": "Globe",
      "moduleKind": "business_line",
      "parentModuleCode": null,
      "description": "Commercial family currently associated with creative agency work.",
      "sortOrder": 20
    }
  ],
  "serviceModules": []
}
```

### `GET /api/integrations/v1/tenants`

Exports Greenhouse tenant snapshots for external readers.

Supported filters:
- `clientId`
- `publicId`
- `sourceSystem`
- `sourceObjectType`
- `sourceObjectId`
- `updatedSince`
- `limit`

Current first-class source resolution:
- `sourceSystem=hubspot_crm`
- `sourceObjectType=company`
- `sourceObjectId=<hubspot_company_id>`

This route is intentionally generic so future source mappings can be added without changing the contract.

Response shape:

```json
{
  "exportedAt": "2026-03-11T20:30:00.000Z",
  "count": 1,
  "items": [
    {
      "clientId": "hubspot-company-30825221458",
      "publicId": "EO-30825221458",
      "clientName": "Sky Airline",
      "status": "active",
      "active": true,
      "primaryContactEmail": "contact@example.com",
      "portalHomePath": "/dashboard",
      "hubspotCompanyId": "30825221458",
      "businessLines": ["globe"],
      "serviceModules": ["agencia_creativa"],
      "updatedAt": "2026-03-11T19:20:00.000Z",
      "capabilitiesUpdatedAt": "2026-03-11T20:00:00.000Z"
    }
  ]
}
```

Use this for bidirectional sync:
- outbound from Greenhouse to HubSpot or another system
- reconciliation jobs
- polling changed tenants after `updatedSince`

### `POST /api/integrations/v1/tenants/capabilities/sync`

Pushes normalized capability state from an external source into Greenhouse.

Request shape:

```json
{
  "target": {
    "sourceSystem": "hubspot_crm",
    "sourceObjectType": "company",
    "sourceObjectId": "30825221458"
  },
  "sync": {
    "sourceSystem": "hubspot_crm",
    "sourceObjectType": "company",
    "sourceObjectId": "30825221458",
    "confidence": "high",
    "businessLines": ["globe"],
    "serviceModules": ["agencia_creativa"]
  }
}
```

Rules:
- `target` resolves which Greenhouse tenant should be updated.
- `sync` records where the incoming signal came from.
- `businessLines` and `serviceModules` are required explicitly.
- manual admin assignments in Greenhouse still keep precedence.

The selector supports:
- `clientId`
- `publicId`
- `sourceSystem` + `sourceObjectType` + `sourceObjectId`

### `GET /api/integrations/v1/sister-platforms/context`

Returns the resolved consumer + binding context for a sister-platform request.

Required query params:
- `externalScopeType`
- `externalScopeId`

This is the lowest-friction handshake route for a sister-platform consumer.

Use this to:
- validate that the token resolves to the expected sister platform
- validate that the external scope is actually bound in Greenhouse
- inspect the effective Greenhouse scope before asking for additional reads

### `GET /api/integrations/v1/sister-platforms/catalog/capabilities`

Returns the active capability catalog, but only after authenticating the consumer and resolving the binding context.

Required query params:
- `externalScopeType`
- `externalScopeId`

This route exists so a sister-platform consumer can bootstrap its own code mappings without bypassing the hardened auth + binding lane.

### `GET /api/integrations/v1/sister-platforms/readiness`

Returns readiness for one or more registered integrations while preserving the same consumer auth, binding resolution, request logging, and rate limiting rules as the rest of the sister-platform lane.

Required query params:
- `externalScopeType`
- `externalScopeId`
- `keys=notion,hubspot,...`

This is useful for:
- operator consoles that need preflight posture before surfacing downstream context
- future MCP adapters that should not bypass the same operational rules

## Bidirectional Pattern

Recommended connector flow:

1. Read `GET /catalog/capabilities`.
2. Map the external source fields into valid Greenhouse codes.
3. Resolve the tenant via `GET /tenants`.
4. Push normalized state with `POST /tenants/capabilities/sync`.
5. Poll `GET /tenants?updatedSince=<last cursor>` to detect admin-side changes that should flow back to the source system.

## Current Scope

Implemented now:
- generic token auth
- capability catalog export
- tenant snapshot export
- inbound capability sync by tenant selector
- hardened sister-platform read-only lane with:
  - per-consumer credentials
  - binding-aware scope resolution
  - request logging
  - rate limiting
  - read-only endpoints for `context`, `catalog/capabilities`, and `readiness`
- live CRM reads can now be consumed separately through the dedicated HubSpot facade service `hubspot-greenhouse-integration` for:
  - `GET /contract`
  - `GET /companies/{hubspotCompanyId}`
  - `GET /companies/{hubspotCompanyId}/owner`
  - `GET /companies/{hubspotCompanyId}/contacts`

Not implemented yet:
- tenant creation via integration API
- generic external-id registry table for non-HubSpot source mappings
- outbound webhooks
- signed request rotation or per-integration credentials
- MCP server mounted on top of the sister-platform read lane
- write flows for sister-platform consumers

Those can be layered later without replacing the contract above.

## Latency Model

- `company profile`, `owner`, and associated `contacts` can be read from the dedicated HubSpot facade with low latency because Greenhouse queries the current HubSpot state on demand.
- `capabilities` are still sync-based. They become visible in Greenhouse when an external connector pushes them or when Greenhouse polls a connector result.
- Full near-real-time bidirectionality still requires an event-driven layer such as HubSpot webhooks or a high-frequency reconciler.
