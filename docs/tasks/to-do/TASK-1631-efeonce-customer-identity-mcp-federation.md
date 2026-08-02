# TASK-1631 — Efeonce Customer Identity and MCP Federation Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `customer-facing auth surface`
- UI ready: `not started`
- Wireframe: `required before implementation`
- Flow: `required before implementation`
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

Habilitar una identidad B2B de Efeonce para que organizaciones cliente existentes se autentiquen en clientes MCP
sin requerir una cuenta Entra de Efeonce. Account 360 conserva la organización comercial canónica; la identidad
externa sólo se enlaza explícitamente y Globe conserva workspace, capacidades, créditos y policy. El primer corte
es por invitación y allowlist de clientes existentes, nunca por signup público o dominio de correo. La superficie
de autenticación tiene despliegue, cookies y sesiones independientes de Greenhouse, pero converge en la misma
persona, organización y membresía canónicas; no crea una identidad o contraseña cliente paralela permanente.

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
- Iniciar la cohorte externa sólo desde organizaciones cliente ya existentes en Account 360: selección explícita,
  administrador designado, invitación auditable y grant read-only antes de OAuth. Ningún email o dominio crea
  membership, organización o acceso.
- Entregar una UI de acceso propia en `auth.efeonce.org`, aislada del gateway y de Greenhouse; WorkOS/AuthKit
  opera autenticación mediante APIs server-side y WorkOS Connect sigue emitiendo OAuth para MCP.
- Mantener sesiones y audiencias separadas por aplicación, enlazadas a un único `identity_profile`; definir en
  esta task la transición para que el login externo de Greenhouse pueda delegar posteriormente en el mismo plano
  de identidad aceptado, sin hacer que Greenhouse sea el issuer OAuth del MCP.

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
- `auth.efeonce.org` está aislado como runtime y sesión, no como identidad: una persona existente se enlaza al
  mismo `greenhouse_core.identity_profiles` y membresía canónica. Greenhouse, auth y MCP no comparten cookies,
  secretos de sesión ni tokens entre audiencias.
- La coexistencia inicial entre el login cliente actual de Greenhouse y WorkOS/IDP para MCP es transitoria. Esta
  task debe entregar el contrato de convergencia, account linking, recovery y revocación; el cutover del login de
  Greenhouse requiere su propio gate de rollout.
- La primera cohorte usa exclusivamente clientes existentes y allowlisted de Account 360. No hay signup público,
  import automático masivo ni admisión basada en el dominio de correo.
- El gateway valida autenticación/transport y delega. Globe conserva workspace, creative policy, credits y
  entitlement de la capacidad; ningún claim libre de organización/workspace autoriza una tool.
- Entra sigue siendo exclusivamente el canary interno durante la transición. No se deshabilita
  `globe.producer.fleet.list` ni se usa ese cliente como evidencia de acceso cliente.
- La configuración de WorkOS staging y discovery MCP no constituye acceso cliente. No crear producción, DNS,
  secretos, bindings ni desplegar la ruta pública de login mientras el ADR propuesto no tenga aceptación explícita.

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

- Existe una configuración WorkOS de staging para discovery MCP; no existe un issuer B2B activo para clientes,
  binding canónico de organización externa a Account 360, UI propia de login ni una prueba real
  base-only/allow/revoke por capacidad.
- El cliente Entra interno actual emite ambos scopes y por ello no demuestra denial por persona ni por cliente.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse para Account 360/identity binding; ../efeonce-mcp para OAuth validation y dispatch; ../efeonce-globe para provider policy`
- Future candidate home: `remain-shared`
- Boundary: `binding server-side identity_profile/Account 360 ↔ external subject/organization, entitlement resolver y provider policy revalidation; runtimes and sessions stay independent`
- Server/browser split: `auth browser UI is isolated at auth.efeonce.org; its server adapter alone accesses AuthKit APIs. Tokens, binding stores, identity-provider admin APIs, provider clients and secrets never reach browser code`
- Build impact: `dedicated auth UI/session deployment is independent from the MCP gateway; identity-provider SDK/configuration remains behind its server adapter`
- Extraction blocker: `authentication/session and Account 360 binding are cross-runtime contracts; implementation begins only after an approved topology, UI contract and identity plan`

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
  - `One existing customer person remains one canonical identity_profile; an external IDP subject is a source link, not a parallel person or credential authority inside Greenhouse.`
  - `Greenhouse, auth.efeonce.org and MCP keep separate cookies, session secrets and audiences; identity convergence never means browser-session sharing.`
  - `The target customer journey uses one external authentication relationship across MCP and customer-facing Greenhouse, with separate application sessions; initial coexistence must have a documented convergence and rollback path.`
  - `Only an existing Account 360 customer explicitly allowlisted by an audited operator command may receive an external identity binding or invitation.`
  - `An email address, email domain or WorkOS organization without that binding never creates customer membership, a capability grant or a Globe workspace right.`
  - `An external identity organization is usable only through an explicit audited binding to one canonical organization.`
  - `Gateway scopes do not replace Globe workspace/capability/credits/rights enforcement.`
  - `Revocation fails closed in both gateway dispatch and provider policy.`
- Tenant/space boundary: `derived server-side from verified issuer subject/client and explicit Account 360 binding; Globe independently resolves its authorized workspace`
- Idempotency/concurrency: `binding/grant/revocation commands require idempotency and atomic audit semantics; token validation and read dispatch are stateless`
- Audit/outbox/history: `append-only binding/grant/revocation audit and reliable invalidation/signal posture selected with the canonical identity primitive`

### Migration, backfill and rollout

- Migration posture: `additive migration after schema discovery; no automatic backfill or customer grant`
- Default state: `external customer issuer and all external provider capabilities OFF; internal Entra canary ON`
- Backfill plan: `dry-run inventory of existing client organizations only; no bulk enrollment. An operator allowlist creates each first binding, designated administrator and invitation after review`
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
- [ ] Existing-person linking, collision/manual review, recovery, deactivation and revocation map an external
      subject to one canonical `identity_profile`; email-only matching is rejected.
- [ ] The current Greenhouse customer login coexistence and future delegation to the accepted external identity
      plane are documented, with separate cookies/audiences and a separately gated cutover.
- [ ] Gateway and Globe independently fail closed for absent/revoked binding or capability.
- [ ] Migration, audit, revocation and rollback behavior are verified before customer access.
- [ ] Real Claude, Codex and ChatGPT OAuth canaries cover allow, base-only deny and revocation.
- [ ] No token, code, secret or raw provider response appears in logs or error responses.

## Scope

### Slice 0 — Decision, cohort policy and schema discovery

- Obtain explicit acceptance of the ADR and selected identity-provider plan before external provisioning.
- Inventory Account 360 organization, canonical person/membership and Globe workspace contracts; propose the minimal
  additive binding schema, command/reader/audit and invalidation contract.
- Inventory the current Greenhouse NextAuth, `client_users`, `identity_profiles`, source-link and `session_360`
  contracts. Define existing-account linking, conflicts/manual review, recovery, deactivation and revocation without
  exporting or sharing the Greenhouse session secret/cookie.
- Define the first existing-client eligibility read, operator allowlist command, designated-administrator input and
  invitation/revocation audit. Explicitly prohibit public signup, email-domain inference and automatic enrollment.
- Produce the design/flow and deployment contract for the custom `auth.efeonce.org` surface before browser code.
- Produce the target convergence contract by which customer-facing Greenhouse can later delegate authentication
  to the same accepted external identity plane while retaining its own application session and audience.

### Slice 1 — External identity and Account 360 binding

- Provision the accepted customer identity issuer and custom domain with configuration/secrets managed outside source.
- Implement the isolated custom Efeonce auth UI/session service; it uses AuthKit APIs server-side and does not turn
  the MCP gateway into a browser/session host.
- Implement audited, idempotent organization/person/grant binding primitives with additive migration, no automatic
  customer backfill and invitation only after an explicit existing-client allowlist review.
- When the invited person already exists, link the verified external subject to that `identity_profile`; do not
  create a second person or a second Greenhouse password. Exercise conflict and recovery paths before customer access.

### Slice 2 — Gateway/provider enforcement

- Add gated dual-issuer gateway validation without changing the internal Entra canary.
- Resolve the verified binding server-side and require Globe provider revalidation of organization, workspace and
  capability before dispatch.

### Slice 3 — Client canary and first customer rollout

- Test OAuth/PKCE, registration compatibility and MCP initialize with Claude, Codex and ChatGPT.
- Allowlist one read-only Globe capability for one organization; prove allow, base-only deny, expiry and revocation
  before enabling any wider customer access.

## Out of Scope

- Customer public signup, automatic enrollment by email domain, a customer administration UI, SCIM, broad SSO
  rollout or self-service entitlement management.
- Migrating the customer-facing Greenhouse login runtime in the first MCP slice. This task defines and validates
  the convergence contract; a later gated rollout performs that cutover.
- Globe writes, credit/spend, approvals, rights-sensitive tooling or any capability not separately approved.
- Replacing Account 360, moving Globe policy into the gateway, or disabling the Entra internal reader/canary.
- Production provisioning of WorkOS or any other provider before ADR acceptance and commercial approval.

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
| Existing Greenhouse customer receives a duplicate identity or credential | identity / customer experience | medium | deterministic `identity_profile` source-linking, conflict review and one-authentication target | duplicate profile, competing recovery path or unmatched subject |

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
2. Select one existing Account 360 client organization and create one reviewed, audited binding, designated
   administrator and invitation; do not use a synthetic customer or a domain-only match.
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
- [ ] An existing customer authenticating through the external plane resolves to the same canonical
      `identity_profile`; Greenhouse/auth/MCP sessions remain audience-separated.
- [ ] The customer-facing Greenhouse login convergence contract is approved, even though its runtime cutover is a
      later rollout gate.
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
- Customer-facing Greenhouse login cutover follows the convergence contract from this task and requires a separate
  implementation/rollout unit; it must not introduce a second customer identity store.
- Each additional provider or write-capable Globe tool requires its own capability, entitlement and rollout gate.

## Open Questions

- Confirm the selected external identity provider and commercial plan after explicit operator review.
- Select the exact canonical Greenhouse membership primitive and additive binding schema during Slice 0 discovery.
- Decide the cutover sequence for customer-facing Greenhouse authentication after the shared identity-link contract
  is proven, without changing the internal Entra path.
