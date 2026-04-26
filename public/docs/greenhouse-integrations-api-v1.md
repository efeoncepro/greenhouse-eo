# Greenhouse Integrations API V1

This is the public handoff for the legacy/transitional integrations lane.

The canonical developer entrypoint is now:

- `/developers/api`

The canonical platform guide is:

- `/docs/greenhouse-api-platform-v1.md`

## Base URLs

- Production: `https://greenhouse.efeoncepro.com`
- Staging: `https://dev-greenhouse.efeoncepro.com`

## Authentication

Generic integrations lane:

- `Authorization: Bearer <GREENHOUSE_INTEGRATION_API_TOKEN>`
- or `x-greenhouse-integration-key: <GREENHOUSE_INTEGRATION_API_TOKEN>`

Sister-platform lane:

- `Authorization: Bearer <consumer-token>`
- or `x-greenhouse-sister-platform-key: <consumer-token>`
- required query params: `externalScopeType`, `externalScopeId`

## Routes

- `GET /api/integrations/v1/catalog/capabilities`
- `GET /api/integrations/v1/tenants`
- `POST /api/integrations/v1/tenants/capabilities/sync`
- `GET /api/integrations/v1/sister-platforms/context`
- `GET /api/integrations/v1/sister-platforms/catalog/capabilities`
- `GET /api/integrations/v1/sister-platforms/readiness`

## Rules

- Generic lane remains provider-neutral.
- Sister-platform routes are binding-aware and read-only by default.
- Do not derive capabilities from `deals` or `closedwon`.
- Capability sync requires explicit `businessLines` and `serviceModules`.
- New platform-facing contracts should prefer `api/platform/*`.

## OpenAPI

- `/docs/greenhouse-integrations-api-v1.openapi.yaml`
