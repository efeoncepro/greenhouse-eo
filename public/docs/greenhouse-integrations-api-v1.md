# Greenhouse Integrations API V1

Public handoff for external connectors.

Base URLs:
- Production: `https://greenhouse.efeoncepro.com`
- Staging: `https://dev-greenhouse.efeoncepro.com`

Authentication:
- `Authorization: Bearer <GREENHOUSE_INTEGRATION_API_TOKEN>`
- or `x-greenhouse-integration-key: <GREENHOUSE_INTEGRATION_API_TOKEN>`

Routes:
- `GET /api/integrations/v1/catalog/capabilities`
- `GET /api/integrations/v1/tenants`
- `POST /api/integrations/v1/tenants/capabilities/sync`

Rules:
- generic provider-neutral contract
- no derivation from `deals` or `closedwon`
- sync requires explicit `businessLines` and `serviceModules`
- tenant resolution supports:
  - `clientId`
  - `publicId`
  - `sourceSystem`
  - `sourceObjectType`
  - `sourceObjectId`

Recommended connector flow:
1. Read the capabilities catalog.
2. Map external fields into valid Greenhouse codes.
3. Resolve the tenant.
4. Push normalized capabilities.
5. Poll changed tenants with `updatedSince` for bidirectional sync.

Machine-readable contract:
- `/docs/greenhouse-integrations-api-v1.openapi.yaml`
