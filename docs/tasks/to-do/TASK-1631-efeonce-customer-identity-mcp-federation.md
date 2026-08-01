# TASK-1631 — Efeonce Customer Identity and MCP Federation Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `arquitectura propuesta; pendiente aceptación del proveedor de identidad y su plan comercial antes de provisionar`
- Rank: `TBD`
- Domain: `platform|identity|integration|agentic`
- Blocked by: `aceptación explícita de EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md y aprobación del proveedor/plan de identidad externo`
- Branch: `task/TASK-1631-efeonce-customer-identity-mcp-federation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar una identidad B2B de Efeonce para que organizaciones cliente se autentiquen en clientes MCP sin requerir
una cuenta Entra de Efeonce. Account 360 conserva la organización comercial canónica; la identidad externa sólo se
enlaza explícitamente y Globe conserva workspace, capacidades, créditos y policy.

## Why This Task Exists

El gateway MCP y el reader interno de Globe ya funcionan con un canary Entra, pero ese cliente recibe ambos scopes
y no representa un cliente externo ni prueba revocación por organización/capacidad. Sin una identidad B2B y un
binding canónico, abrir la misma URL a clientes permitiría derivar tenancy desde claims insuficientes o duplicar
Account 360 en el gateway.

## Goal

- Permitir OAuth 2.1 + PKCE para clientes MCP externos mediante `auth.efeonce.org`, sin cambiar el endpoint canónico
  `https://mcp.efeonce.org/mcp`.
- Vincular cada organización externa a la organización ya creada en `greenhouse_core.organizations`, con audit y
  revocación, sin crear una segunda entidad comercial.
- Hacer que gateway y Globe denieguen por defecto y revaliden organización, membership y capability antes de exponer
  la primera herramienta Globe read-only a un cliente.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/creative-studio/README.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Account 360 y `greenhouse_core.organizations` son el único ancla comercial/customer; un ID WorkOS u otro IDP es
  un binding externo, no un tenant paralelo.
- El gateway valida autenticación/transport y delega. Globe conserva workspace, creative policy, credits y
  entitlement de la capacidad; ningún claim libre de organización/workspace autoriza una tool.
- Entra sigue siendo exclusivamente el canary interno durante la transición. No se deshabilita
  `globe.producer.fleet.list` ni se usa ese cliente como evidencia de acceso cliente.
- No provisionar un proveedor, comprar un plan, cambiar DNS, crear secretos ni desplegar una ruta pública mientras
  el ADR propuesto no tenga aceptación explícita.

## Normative Docs

- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`
- `docs/tasks/in-progress/TASK-1473-globe-contract-packaging-parity-certification.md`

## Dependencies & Impact

### Depends on

- La decisión propuesta y aprobación del proveedor/plan para identidad cliente.
- `TASK-1626` para el gateway, protected-resource metadata, runtime y canary interno existente.
- `TASK-1473` para el contrato Globe/provider y su revalidación de policy.
- La organización comercial existente de Account 360 antes de cualquier binding externo.

### Blocks / Impacts

- Acceso MCP de organizaciones cliente a Globe y futuras capacidades de Efeonce.
- Onboarding B2B, revocación y auditoría por organización/capacidad.
- Compatibilidad verificada de clientes Claude, Codex y ChatGPT.

### Files owned

- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1631-efeonce-customer-identity-mcp-federation.md`
- `../efeonce-mcp/**`
- migraciones y primitives canónicos de identidad/Account 360 identificados durante el plan aprobado
- contratos/provider policy de `../efeonce-globe/**` sólo para revalidación, sin mover ownership de Globe

## Current Repo State

### Already exists

- `greenhouse_core.organizations` y Account Complete 360 modelan la organización y su graph comercial.
- `https://mcp.efeonce.org/mcp` publica metadata de protected resource y mantiene un canary Entra PKCE interno.
- El único reader habilitado es `globe.producer.fleet.list`, read-only e internal-only; Globe ya hace policy
  downstream sobre su workspace y capability.

### Gap

- No existe un issuer B2B de clientes, binding canónico de organización externa a Account 360, ni una prueba real
  base-only/allow/revoke por capacidad.
- El cliente Entra interno actual emite ambos scopes y por ello no demuestra denial por persona ni por cliente.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse para Account 360/identity binding; ../efeonce-mcp para OAuth validation y dispatch; ../efeonce-globe para provider policy`
- Future candidate home: `remain-shared`
- Boundary: `binding server-side Account 360 ↔ identity organization, entitlement resolver y provider policy revalidation`
- Server/browser split: `server-only; tokens, binding stores, identity-provider admin APIs, provider clients and secrets never reach browser code`
- Build impact: `identity-provider SDK/configuration isolated behind server adapter; gateway/container deployment remains independent`
- Extraction blocker: `authentication/session and Account 360 binding are cross-runtime contracts; no new app/package is created before an approved topology decision`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_core.organizations`, canonical identity/membership primitives, gateway auth configuration and Globe policy`
- Consumidores afectados: `MCP gateway, Globe provider, customer MCP clients and audited operator onboarding`
- Runtime target: `staging|production|external`

### Contract surface

- Contrato existente a respetar: `Account Complete 360, MCP protected-resource contract, TASK-1626 gateway contract and Globe provider contracts`
- Contrato nuevo o modificado: `explicit external identity organization binding, issuer/client validation, provider entitlement revalidation and auditable revocation`
- Backward compatibility: `gated; Entra internal issuer and fleet reader remain unchanged until external canaries pass`
- Full API parity: `operator-managed bindings and grants use canonical server-side primitives; MCP is a consumer and never writes tables or policy ad hoc`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.organizations plus the canonical identity/membership surface selected during discovery; no duplicate customer organization table`
- Invariantes que no se pueden romper:
  - `Account 360 organization remains the commercial/customer source of truth.`
  - `An external identity organization is usable only through an explicit audited binding to one canonical organization.`
  - `Gateway scopes do not replace Globe workspace/capability/credits/rights enforcement.`
  - `Revocation fails closed in both gateway dispatch and provider policy.`
- Tenant/space boundary: `derived server-side from verified issuer subject/client and explicit Account 360 binding; Globe independently resolves its authorized workspace`
- Idempotency/concurrency: `binding/grant/revocation commands require idempotency and atomic audit semantics; token validation and read dispatch are stateless`
- Audit/outbox/history: `append-only binding/grant/revocation audit and reliable invalidation/signal posture selected with the canonical identity primitive`

### Migration, backfill and rollout

- Migration posture: `additive migration after schema discovery; no automatic backfill or customer grant`
- Default state: `external customer issuer and all external provider capabilities OFF; internal Entra canary ON`
- Backfill plan: `dry-run inventory of existing organizations only; operator allowlist creates each first binding after review`
- Rollback path: `disable external issuer/provider flag, revoke binding/grant, retain append-only audit; Entra canary and existing Globe fleet reader stay available`
- External coordination: `explicit operator approval, identity-provider tenant/plan, auth.efeonce.org DNS/TLS, secrets, client registrations, provider configuration and staged customer consent`

### Security and access

- Auth/access gate: `OAuth 2.1 authorization code + PKCE, verified issuer/audience/client, explicit Account 360 binding and downstream Globe entitlement`
- Sensitive data posture: `identity metadata only; no bearer token, authorization code, client secret, raw error or customer prompt logged`
- Error contract: `canonical authorization and provider-denial codes; sanitized errors with domain capture`
- Abuse/rate-limit posture: `gateway rate limit per client/principal, PKCE/state validation, replay defense and provider circuit breaker`

### Runtime evidence

- Local checks: `gateway contract/auth-negative tests, binding primitive tests, provider policy tests and task/docs gates`
- DB/runtime checks: `migration dry-run, audited binding/grant/revoke readback and no-unbound-dispatch assertion`
- Integration checks: `OAuth metadata/PKCE and registration flow with Claude, Codex and ChatGPT; allow/base-only/revoke canaries`
- Reliability signals/logs: `redacted issuer/client/binding mismatch, entitlement denial, revocation propagation and provider dispatch signals`
- Production verification sequence: `one allowlisted organization, read-only Globe reader, then base-only deny and revoke with documented rollback before wider onboarding`

### Acceptance criteria additions

- [ ] Account 360, binding and provider sources of truth are named and no second customer organization model exists.
- [ ] Gateway and Globe independently fail closed for absent/revoked binding or capability.
- [ ] Migration, audit, revocation and rollback behavior are verified before customer access.
- [ ] Real Claude, Codex and ChatGPT OAuth canaries cover allow, base-only deny and revocation.
- [ ] No token, code, secret or raw provider response appears in logs or error responses.

## Scope

### Slice 0 — Decision and schema discovery

- Obtain explicit acceptance of the ADR and selected identity-provider plan before external provisioning.
- Inventory Account 360 organization, canonical person/membership and Globe workspace contracts; propose the minimal
  additive binding schema, command/reader/audit and invalidation contract.

### Slice 1 — External identity and Account 360 binding

- Provision the accepted customer identity issuer and custom domain with configuration/secrets managed outside source.
- Implement audited, idempotent organization/person/grant binding primitives with additive migration and no automatic
  customer backfill.

### Slice 2 — Gateway/provider enforcement

- Add gated dual-issuer gateway validation without changing the internal Entra canary.
- Resolve the verified binding server-side and require Globe provider revalidation of organization, workspace and
  capability before dispatch.

### Slice 3 — Client canary and first customer rollout

- Test OAuth/PKCE, registration compatibility and MCP initialize with Claude, Codex and ChatGPT.
- Allowlist one read-only Globe capability for one organization; prove allow, base-only deny, expiry and revocation
  before enabling any wider customer access.

## Out of Scope

- A customer administration UI, SCIM, broad SSO rollout or self-service entitlement management.
- Globe writes, credit/spend, approvals, rights-sensitive tooling or any capability not separately approved.
- Replacing Account 360, moving Globe policy into the gateway, or disabling the Entra internal reader/canary.
- Provisioning WorkOS or any other provider before ADR acceptance and commercial approval.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`Slice 0 -> Slice 1 -> Slice 2 -> Slice 3`. Slice 2 MUST preserve the Entra internal issuer and fleet reader;
Slice 3 MUST prove base-only denial and revocation before it allows a second organization or capability.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| External ID becomes a second tenant source of truth | identity / Account 360 | medium | explicit binding only; architecture review and migration tests | unbound or conflicting organization binding |
| Valid token reaches wrong Globe workspace | MCP / Globe | medium | gateway binding plus provider revalidation, fail-closed deny test | tenant/workspace mismatch denial |
| Revocation lags and leaks access | identity / MCP / Globe | medium | short-lived token, grant version/invalidation and revoke canary | revoked principal dispatch attempt |
| External issuer disrupts current reader | gateway | low | dual issuer gated; retain Entra internal path and provider flag | internal canary regression |
| OAuth client incompatibility | external MCP clients | medium | metadata/registration and PKCE canary for each target client | per-client auth compatibility result |

### Feature flags / cutover

- External issuer validation and every external Globe capability default to OFF.
- Keep the existing Entra issuer/internal `globe.producer.fleet.list` path ON and independent.
- Revert: disable the external issuer/capability flag, revoke binding/grant, then redeploy gateway/provider policy if
  necessary; target recovery is under five minutes for access denial.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Slice 1 | disable issuer, revoke operator-created binding/grant, retain audit | < 5 min | yes |
| Slice 2 | flag external issuer/provider OFF and redeploy prior revision if needed | < 5 min | yes |
| Slice 3 | remove organization allowlist and verify denial; keep internal Entra canary | < 5 min | yes |

### Production verification sequence

1. Verify no behavior changes with external issuer and capabilities OFF.
2. Create one reviewed, audited binding for a non-production or explicitly allowlisted organization.
3. Complete OAuth/PKCE and MCP initialize from each target client.
4. Prove permitted reader access, base-only denial, expired token denial and revoked-grant denial.
5. Verify Globe workspace/capability revalidation and redacted telemetry.
6. Observe signals before adding another organization or capability; stop and roll back on any mismatch.

### Out-of-band coordination required

Explicit operator approval for the identity-provider account and commercial plan, `auth.efeonce.org` DNS/TLS,
production secrets, client registrations and the first customer onboarding consent.

## Acceptance Criteria

- [ ] The ADR is accepted and the selected provider/plan is explicitly approved before external provisioning.
- [ ] An Account 360 organization is the sole customer anchor and has an audited external identity binding.
- [ ] Gateway and Globe both deny unknown, base-only, expired or revoked access.
- [ ] The Entra internal canary and `globe.producer.fleet.list` remain available through the transition.
- [ ] Claude, Codex and ChatGPT canaries pass OAuth/PKCE plus MCP initialize for the allowlisted organization.
- [ ] No write, spend, approval or rights-sensitive Globe capability is exposed by this task.

## Verification

- `pnpm task:lint --task TASK-1631`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Gateway/provider contract and auth-negative tests in `../efeonce-mcp` and `../efeonce-globe`
- Staging and production allow/base-only/revoke evidence, redacted and attached to the task before rollout

## Closing Protocol

- [ ] Lifecycle and file location match the real state.
- [ ] Task registry, README, ADR, MCP runbook and skill mirrors are synchronized.
- [ ] Handoff and changelog record the accepted implementation and live evidence.
- [ ] Access, revocation, error redaction and rollback evidence are retained.

## Follow-ups

- Customer self-service administration and SCIM/enterprise SSO require separate discovery and task/ADR scope.
- Each additional provider or write-capable Globe tool requires its own capability, entitlement and rollout gate.

## Open Questions

- Confirm the selected external identity provider and commercial plan after explicit operator review.
- Select the exact canonical Greenhouse membership primitive and additive binding schema during Slice 0 discovery.
