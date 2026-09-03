# Greenhouse API Platform V1

> Estado 2026-04-26: documento derivado developer-facing.
> La arquitectura canonica vive en:
> `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Este documento acompaña el portal publico `/developers/api`. Resume las lanes
runtime reales de `api/platform/*` sin reemplazar la arquitectura ni los docs
funcionales internos.

## Full API Parity

Greenhouse adopta full API parity: toda capacidad que pueda ejecutarse dentro
del portal debe poder ejecutarse, o tener camino planificado para ejecutarse,
mediante un contrato programatico gobernado.

Esto no significa publicar cada boton como endpoint. La paridad se diseña sobre
aggregates, resources y commands; la UI, apps, agentes, MCP adapters y sister
platforms consumen primitives server-side y contracts versionables.

ADR canonico: `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

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
- `GET /api/platform/ecosystem/mcp/skills` y `GET /api/platform/ecosystem/mcp/skills/{name}` — manuales de uso
  de la superficie MCP (TASK-1804): catálogo sin cuerpos y manual completo; `audience: internal` sólo visible
  para bindings `internal` (si no, `404` anti-oráculo); `ETag` + `If-None-Match` → `304`. Contrato completo con
  ejemplos: `TASK-1793`.

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
- `GET /api/platform/app/organizations/:id/compact-signals`
- `GET /api/platform/app/notifications`
- `POST /api/platform/app/notifications/:id/read`
- `POST /api/platform/app/notifications/mark-all-read`
- `GET /api/platform/app/hiring/talent-pool`
- `GET /api/platform/app/hiring/talent-pool/:id`
- `POST /api/platform/app/hiring/talent-pool/:id/availability`
- `POST /api/platform/app/hiring/talent-pool/:id/consent/request|withdraw`
- `POST /api/platform/app/hiring/talent-pool/:id/invite/propose|confirm`
- `GET /api/platform/app/hiring/applications/review`
- `GET /api/platform/app/hiring/applications/:applicationId/review-packet`
- `GET /api/platform/app/hiring/applications/:applicationId/outcome`
- `POST /api/platform/app/hiring/applications/:applicationId/decision/propose|confirm`

#### Hiring Talent Pool

Reader person-first y minimizado para clientes internos autorizados. La lista acepta `query`, `capability`,
`seniority`, `language`, `country`, `availability`, `cursor` y `limit` (máximo 25 para el adapter MCP). El profile
devuelve la misma identidad opaca, lifecycle, allowed actions, availability y evidencia con coverage/freshness.

No entrega email, teléfono, CV/texto crudo, URLs, notas, economics, respuestas, answer keys ni atributos protegidos.
La App API exige `hiring.talent_pool.read`. Cuando el bearer proviene de Efeonce MCP, Greenhouse reautoriza además
client/scope delegados, propósito fijo `talent_pool_candidate_review` y `x-greenhouse-agent-host`; cada allow/deny
queda auditado sin contenido. Los endpoints y las dos tools MCP read-only están activos para personas internas
autorizadas desde 2026-08-16; acceso externo/B2B y cualquier write MCP continúan bloqueados.

Los commands App API de availability, consentimiento e invitación delegan a los mismos primitives transaccionales
que Product/Public API y conservan capability, flag, idempotencia y audit. No están federados como tools MCP.

TASK-1718 agrega un carril delegado separado para revisar una application exacta: lista acotada y packet con un
chunk de CV minimizado, hash y trust boundary. Exige `hiring.application.read` +
`hiring.candidate.review.read`, purpose cerrado y OAuth client independiente. Sus rutas existen pero permanecen OFF
hasta el rollout Privacy/Security; nunca amplían search/profile ni entregan contacto o respuestas del test.

#### Hiring — eje de desenlace (TASK-1773)

Tres rutas nuevas dan contrato programático al cierre de una postulación, que hasta entonces sólo se podía operar
desde el portal. La capability es la misma del portal, `hiring.application.decide`; no hay capability nueva,
migración ni evento nuevo, y ninguna de las tres está detrás de un feature flag.

- `GET …/outcome` — proyecta los tres ejes: `stage`, el desenlace declarado con su causa gobernada, y
  `archivedAt`, que es ortogonal (archivar nunca declara desenlace). Sin PII del candidato. Exige tenant
  `efeonce_internal` + `hiring.application.decide` acción `read`.
- `POST …/decision/propose` — lee y calcula; **nunca muta**. Devuelve el estado actual, el par desenlace/causa
  propuesto y un `effectDigest`. Exige la acción `execute`.
- `POST …/decision/confirm` — recalcula el digest contra el estado de AHORA y delega en `decideHiringApplication`,
  el mismo command del portal. Toda la validación de decisión vive ahí; el lane no agrega ninguna regla.

El guard es un **digest sin persistencia**, no una fila. El Banco de Talento persiste sus invitaciones porque una
invitación es una entidad con ciclo de vida propio; una propuesta de decisión no lo es. Si alguien decide, archiva
o mueve la postulación entre `propose` y `confirm`, las huellas no coinciden y la confirmación falla con **409
`hiring_decision_proposal_stale`** — código propio del enum `ApiPlatformErrorCode`, no aplanado a `bad_request`,
para que el consumer distinga «tu payload está mal» de «el mundo cambió, vuelve a proponer». El adapter mapea por
CÓDIGO de dominio, no por status: los otros dos conflictos conservan el suyo —`hiring_decision_idempotency_conflict`
(misma clave de idempotencia con otro payload) y `hiring_opening_not_open_for_decision` (seleccionar contra una
vacante cerrada)— porque cada uno tiene una acción distinta para quien llama. La validación del par desenlace/causa aparece en `confirm`
(422 con código `bad_request`), nunca en `propose`.

**Confirmar es fail-closed para agentes delegados.** Un bearer `sister_platform_oauth` puede leer y proponer, pero
no confirmar: `efeonce.mcp.hiring.write` no existe en código y queda bloqueado hasta el grant revocable de
TASK-1631. La confirmación exige sesión humana (`cookie_session` o `first_party_app`). La clave de idempotencia es
obligatoria (header `Idempotency-Key` o `idempotencyKey` en el body).

El adapter reenvía `decision`, `cause`, `reasonSummary`, `selectedDestination` y la clave de idempotencia.
`selectedDestination` es obligatorio para `selected` y `backup_selected` (el command lo exige); omitirlo devuelve
400 `hiring_destination_required`.

Estado: code complete en `develop` y **sin desplegar**. No hay evidencia de runtime contra staging ni producción.

#### Organization Compact Signals

`GET /api/platform/app/organizations/:id/compact-signals`

Returns the compact Organization Workspace signal projection used by first-party
clients: account health, readiness, recent signals, next actions, provenance,
source freshness and degraded sources. The resource is read-only and gates
facet visibility through the canonical Organization Workspace projection.

Query params:

- `asOf` — optional ISO date for Account 360 reads.
- `year`, `month` — optional period for finance summary reads.
- `accountLimit`, `recentSignalsLimit`, `nextActionsLimit` — optional positive
  integer limits.

Failure modes:

- Missing organization returns `404 not_found`.
- Slow or failed secondary sources return `200` with `data.status='partial'`
  and populated `data.degradedSources[]`.
- No authorized facets returns `200` with `data.status='unavailable'`.

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
