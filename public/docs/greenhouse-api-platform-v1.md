# Greenhouse API Platform V1

> Estado 2026-04-26: documento derivado developer-facing.
> La arquitectura canonica vive en:
> `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Este documento acompaña el portal publico `/developers/api`. Resume las lanes
runtime reales de `api/platform/*` sin reemplazar la arquitectura ni los docs
funcionales internos.

## Base URLs

- Production: `https://greenhouse.efeoncepro.com`
- Staging: `https://dev-greenhouse.efeoncepro.com`

## Version

- Default: `2026-04-25`
- Header: `x-greenhouse-api-version`

## Response Envelope

Successful responses use:

```json
{
  "requestId": "uuid",
  "servedAt": "2026-04-26T00:00:00.000Z",
  "version": "2026-04-25",
  "data": {},
  "meta": {}
}
```

Errors use the same envelope with `data: null` and an `errors` array.

## Lanes

### Ecosystem API

Base path: `/api/platform/ecosystem`

Purpose:
- server-to-server consumers
- sister platforms and ecosystem peers
- binding-aware, scoped reads

Auth:
- `Authorization: Bearer <consumer-token>`
- or `x-greenhouse-sister-platform-key: <consumer-token>`
- required query params: `externalScopeType`, `externalScopeId`

Endpoints:
- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/integration-readiness`
- `GET /api/platform/ecosystem/health`

### Platform Health (preflight contract)

Versioned read-only contract for agent / MCP / Teams-bot preflight. Composes
Reliability Control Plane, Operations Overview, internal runtime checks,
integration readiness, synthetic monitoring and webhook delivery into a
single `PlatformHealthV1` payload with safe-mode booleans.

- `GET /api/platform/ecosystem/health` — ecosystem audience (redacted summary, safe modes, no evidence detail until TASK-658 lands the `platform.health.detail` capability).
- `GET /api/admin/platform-health` — admin audience (full payload with evidence refs and degraded-source error details). Requires `requireAdminTenantContext`.

The contract is `platform-health.v1`. Shape is documented in the OpenAPI
artifact under `components.schemas.PlatformHealthV1` and in the functional
guide at `docs/documentation/plataforma/platform-health-api.md`.

Failure modes:

- A single source timeout/error degrades the response (lower confidence, populated `degradedSources[]`) instead of returning 5xx.
- Stack traces, secrets, tokens and PII are stripped before serialization (see `src/lib/observability/redact.ts`).

### First-party App API

Base path: `/api/platform/app`

Purpose:
- future React Native app
- other Greenhouse first-party clients
- user-authenticated resources

Auth:
- `POST /api/platform/app/sessions` creates a short-lived access token and a durable refresh token.
- App resource requests use `Authorization: Bearer <access-token>`.
- Refresh tokens are stored only as hashes and rotate on refresh.

Endpoints:
- `POST /api/platform/app/sessions`
- `PATCH /api/platform/app/sessions`
- `DELETE /api/platform/app/sessions/current`
- `GET /api/platform/app/context`
- `GET /api/platform/app/home`
- `GET /api/platform/app/notifications`
- `POST /api/platform/app/notifications/:id/read`
- `POST /api/platform/app/notifications/mark-all-read`

### Event Control Plane

Base path: `/api/platform/ecosystem`

Purpose:
- manage webhook subscriptions
- inspect webhook deliveries and attempts
- requeue retries through the existing dispatcher

Endpoints:
- `GET /api/platform/ecosystem/event-types`
- `GET /api/platform/ecosystem/webhook-subscriptions`
- `POST /api/platform/ecosystem/webhook-subscriptions`
- `GET /api/platform/ecosystem/webhook-subscriptions/:id`
- `PATCH /api/platform/ecosystem/webhook-subscriptions/:id`
- `GET /api/platform/ecosystem/webhook-deliveries`
- `GET /api/platform/ecosystem/webhook-deliveries/:id`
- `POST /api/platform/ecosystem/webhook-deliveries/:id/retry`

The retry command schedules the delivery for the dispatcher. It does not send
the webhook inline.

## Legacy Lane

`/api/integrations/v1/*` remains supported for existing connectors and has its
own stable OpenAPI artifact:

- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`

Do not treat `integrations/v1` as the source of truth for new platform surfaces.

## Current Boundaries

- `api/platform/*` is authenticated and controlled; it is not an anonymous open API.
- No general ecosystem-facing write surface exists yet.
- Cross-lane idempotency for commands is still a follow-up.
- OpenAPI for platform lanes is a preview artifact in this cut; schema generation is a follow-up.
- MCP remains downstream of stable API contracts.
