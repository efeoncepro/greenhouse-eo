# TASK-659 — MCP OAuth / Hosted Auth Model

## Delta 2026-09-04

- **Superseded en diseño por `EPIC-044` / `TASK-1829`.** Lo que esta task pedía diseñar (modelo OAuth para MCP
  hosted/multiusuario: registry de clientes, audience, scopes, refresh, revocación, auditoría, relación con
  bindings) ya tiene decisión y código: el authorization server propio `https://auth.efeonce.org`
  (ADR `EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`) emite access tokens JWT ES256 con
  `aud = https://mcp.efeonce.org/mcp`, `azp`, `scope` y `gv` (binding de `TASK-1631`), con CIMD/DCR/clientes
  confidenciales, refresh rotativo con detección de reuso, `revoke`/`introspect` y consentimiento persistido;
  contrato en `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`. `TASK-1829` quedó
  `code complete, rollout pendiente` en `develop` el 2026-09-04 — cerrado por trabajo en `TASK-1829`.
- **Respuestas a las preguntas de esta task:** registry separado (`greenhouse_auth.oauth_clients`), no
  `sister_platform_consumers` (el broker sister-platform del portal sigue vivo e intacto para Globe/Kortex; sólo
  se extrajeron helpers puros); el MCP local read-only (`TASK-647`) sigue con consumer token por env, sin cambio;
  el carril interno Entra para Codex/Claude es `TASK-1813`; el gateway multi-issuer es `TASK-1831`.
- **Decisión final de lifecycle** (cierre por supersesión vs re-alcance a lo que quede fuera de EPIC-044) la
  registra la sesión principal al cerrar `TASK-1829`; hasta entonces esta task no debe arrancar trabajo propio.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-647`
- Branch: `task/TASK-659-mcp-oauth-hosted-auth-model`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Diseñar e implementar el modelo OAuth/AuthN para MCP hosted/remoto/multiusuario. MCP local read-only sigue usando consumer token por env; OAuth bloquea solo distribución hosted o user-delegated.

## Why This Task Exists

Claude/Codex pueden conectarse a un MCP local sin OAuth. Pero un MCP remoto necesita identificar usuario/agente, scopes, revocación, rotación, auditoría y relación con consumers/bindings.

## Goal

- Definir hosted MCP auth model.
- Decidir si usar `sister_platform_consumers`, OAuth client registry separado o ambos.
- Definir token audience/scopes/refresh/revocation.
- Documentar Claude/Codex local vs hosted.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

Reglas obligatorias:

- Do not block `TASK-647` local read-only.
- Hosted/multi-user MCP cannot use one shared static token.
- User delegation must define subject, tenant, scope and revocation.

## Normative Docs

- `docs/tasks/complete/TASK-647-greenhouse-mcp-read-only-adapter-v1.md`
- `docs/tasks/in-progress/TASK-649-api-platform-completion-program.md`

## Dependencies & Impact

### Depends on

- `TASK-647`
- `src/lib/api-platform/core/**`
- auth/session runtime

### Blocks / Impacts

- Hosted MCP.
- Multi-user Claude/Codex MCP connections.
- MCP writes.

### Files owned

- MCP auth docs/spec
- possible migrations under `migrations/**`
- possible routes under `src/app/api/platform/oauth/**` or equivalent
- MCP config docs

## Current Repo State

### Already exists

- Local MCP V1 design uses env consumer token.
- First-party app sessions exist.
- Sister platform consumer token registry exists.

### Gap

- No OAuth client/authorization/token/revocation model for hosted MCP.

## Scope

### Slice 1 — Auth model decision

- Choose static consumer, user-delegated OAuth, or hybrid per deployment mode.

### Slice 2 — Runtime implementation

- Implement only after model is approved.

### Slice 3 — Client docs

- Document Claude/Codex local and hosted connection patterns.

## Out of Scope

- MCP tools themselves.
- Replacing NextAuth web login.

## Acceptance Criteria

- [ ] MCP local vs hosted auth split is documented.
- [ ] Hosted auth supports revocation/rotation/audit.
- [ ] No shared token model is used for multi-user hosted MCP.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- auth route tests if runtime is added
- `git diff --check`

## Closing Protocol

- [ ] README/Handoff updated.

## Aclaración de ownership — 2026-09-04

Se retira la propuesta no commiteada de incorporar TASK-659 como U11 de EPIC-044. Esta task conserva
su alcance histórico, sin reasignación al epic ni cambio de lifecycle. El nuevo acceso corporativo interno
por Efeonce ID pertenece exclusivamente a [TASK-1836](../in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md),
creada por petición explícita del operador. La posible supersesión del diseño OAuth original por TASK-1829
sigue pendiente de su cierre formal; no autoriza una implementación duplicada.
