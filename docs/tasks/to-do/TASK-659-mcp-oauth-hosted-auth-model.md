# TASK-659 — MCP OAuth / Hosted Auth Model

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

- `docs/tasks/to-do/TASK-647-greenhouse-mcp-read-only-adapter-v1.md`
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
