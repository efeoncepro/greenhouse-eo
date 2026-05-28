# TASK-948 — Greenhouse Identity Broker for Kortex SSO

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Implementation complete; staging rollout/smoke pending`
- Rank: `TBD`
- Domain: `identity|platform|ops`
- Blocked by: `none`
- Branch: `develop` (operator override: no branch switch)
- Legacy ID: `none`
- GitHub Issue: `optional`
- Cross-ref: `TASK-413` (password identity bridge hardening), `TASK-884`/`TASK-885` (ecosystem access control plane + Kortex capability catalog)

## Summary

Greenhouse se convierte en el broker canonico de identidad para Kortex Operator Console. En vez de que Kortex capture passwords Greenhouse o duplique Microsoft Entra, Kortex redirige a Greenhouse, Greenhouse autentica con sus providers existentes (Microsoft SSO, Google o credenciales), emite un authorization code de un solo uso y Kortex lo intercambia server-to-server por una identidad scopeada.

## Why This Task Exists

El login actual de Kortex delega el usuario/password a Greenhouse por `/api/integrations/v1/sister-platforms/identity`. Ese contrato es correcto para credenciales Greenhouse, pero no cubre a operadores que normalmente entran al portal por Microsoft SSO. Integrar Microsoft directamente en Kortex resolveria el sintoma, pero duplicaria ownership de identidad, claims, redirect URIs, lifecycle de usuarios y auditoria.

La opcion enterprise validada con `software-architect-2026` es "Sign in with Greenhouse": Greenhouse conserva el source of truth de identidad/acceso y Kortex actua como relying party/confidential client.

## Goal

- Formalizar e implementar un carril OAuth2/OIDC-style authorization-code para sister platforms.
- Mantener Greenhouse como source of truth de identidad, access checks y auditabilidad.
- Conectar Kortex a Greenhouse SSO mediante un provider Auth.js/custom provider sin compartir passwords ni tokens Microsoft.
- Dejar fallback/rollback operativo durante cutover para evitar lockout de operadores.

## Non-Regression Boundary — Identity, SCIM and SSO

Esta task es **aditiva**. No autoriza reescribir ni tocar el sistema de identidad existente de Greenhouse.

Hard boundaries:

- NO modificar el provider Microsoft SSO existente de Greenhouse, sus callbacks, scopes, client ID, client secret, tenant config, redirect URIs o claim mapping.
- NO modificar el provider Google, credentials provider, `auth_mode`, session callback, JWT callback, cookies, `portalHomePath` ni el resolver general de sesión salvo que el cambio sea un wrapper aditivo del broker y tenga tests focales.
- NO modificar SCIM, endpoints SCIM, Microsoft Entra provisioning, Graph sync, `GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`, `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` ni reglas de workforce intake.
- NO cambiar `client_users`, `members`, `identity_profiles`, role assignment semantics, routeGroups, authorizedViews o entitlements globales como efecto colateral del broker.
- NO tocar Azure App Registration / Microsoft Entra config para Greenhouse como parte del plan normal. Cualquier ajuste Entra requeriria discovery separado, ADR/update explicito y validacion de no-regresion.
- NO reemplazar `/api/auth/[...nextauth]` ni crear un segundo sistema de sesiones Greenhouse.
- SI el agente detecta que necesita tocar SSO/SCIM/core identity para implementar este broker, debe parar y abrir decision nueva; no puede continuar como TASK-948.

Required non-regression gates:

- Smoke Greenhouse Microsoft SSO normal: usuario entra al portal Greenhouse igual que antes.
- Smoke credentials login Greenhouse normal: usuario con password entra igual que antes.
- Smoke SCIM discovery/provisioning read-only: endpoints responden y no hay drift nuevo en provisioning.
- Existing identity/access tests green before any production flip.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- Greenhouse autentica al usuario; Kortex no recibe password, password hash, Microsoft access token, Microsoft refresh token ni cookies Greenhouse.
- Kortex debe usar authorization code one-time + TTL corto + `state` + `nonce` + PKCE + redirect URI allowlist.
- El exchange debe ser server-to-server y auditado por consumer, user, redirect URI, outcome y latencia.
- El carril password `/api/integrations/v1/sister-platforms/identity` queda transicional/break-glass; no debe ser la UX primaria post-cutover.
- Access design debe distinguir `views`/surfaces visibles de `entitlements`/capabilities finas cuando haya UI o Admin Center para administrar el broker.
- La implementacion debe ser aditiva y flag-gated; cualquier cambio en SCIM, SSO core, Entra config o callbacks existentes queda fuera de scope y bloquea ejecucion.

## Normative Docs

- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/documentation/identity/scim-entra-provisioning.md`
- `docs/documentation/identity/sistema-auth-resiliente.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `docs/documentation/plataforma/sister-platform-bindings.md`
- `docs/tasks/to-do/TASK-413-kortex-identity-bridge-hardening.md`
- Sibling runtime reference: `../dev/kortex/apps/web/src/libs/auth.ts`
- Sibling runtime reference: `../dev/kortex/services/agent/kortex_agent/card_api.py`

## Dependencies & Impact

### Depends on

- Existing Greenhouse auth/session providers (Microsoft SSO, Google, credentials) in the portal.
- `greenhouse_core.sister_platform_consumers` and related helpers in `src/lib/sister-platforms/*`.
- Kortex Auth.js runtime in sibling repo.
- Approved redirect URI inventory for Kortex staging, production and localhost dev.

### Blocks / Impacts

- Kortex operator login with Greenhouse Microsoft SSO.
- Future sister-platform SSO lane for Verk or other peer systems.
- TASK-413 should remain as hardening of the legacy/password lane, not the primary login direction.

### Files owned

- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `src/app/api/auth/sister-platforms/authorize/route.ts` — NEW
- `src/app/api/integrations/v1/sister-platforms/oauth/token/route.ts` — NEW
- `src/app/api/integrations/v1/sister-platforms/oauth/userinfo/route.ts` — NEW
- `src/lib/sister-platforms/oauth-broker.ts` — NEW
- `src/lib/sister-platforms/consumers.ts`
- `src/lib/sister-platforms/types.ts`
- `migrations/*task-948*sister-platform-identity-broker*.sql` — NEW
- `src/lib/reliability/queries/sister-platform-oauth-signals.ts` — NEW
- `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/reliability/registry.ts`
- `docs/tasks/in-progress/TASK-948-greenhouse-identity-broker-kortex-sso.md`
- Sibling Kortex repo: `../dev/kortex/apps/web/src/libs/auth.ts`
- Sibling Kortex repo: `../dev/kortex/apps/web/src/app/login/*`

## Current Repo State

### Already exists

- Greenhouse exposes a password-based sister-platform identity endpoint at `/api/integrations/v1/sister-platforms/identity`.
- `src/lib/sister-platforms/types.ts` models `sister_platform_consumers`.
- `src/lib/sister-platforms/consumers.ts` handles consumer records, token hashing, scopes and metadata.
- `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md` already declares Kortex as an active sister platform and rejects shared DB/secrets.
- `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` already defines Greenhouse-owned desired access state for Kortex capabilities.

### Gap

- No Greenhouse authorization endpoint exists for sister-platform interactive SSO.
- No one-time authorization-code store exists for sister platforms.
- No OAuth/OIDC-style token/userinfo exchange exists for Kortex.
- Kortex login UI still treats email/password as the primary login path.
- Microsoft SSO success inside Greenhouse does not currently translate into a Kortex session.

## Scope

### Slice 0 — ADR + contract registration

- Add accepted ADR delta to `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`.
- Add identity broker lane delta to `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`.
- Index the decision in `DECISIONS_INDEX.md`.
- Register this task in `TASK_ID_REGISTRY.md` and `docs/tasks/README.md`.

### Slice 1 — Schema and client registration

- Add storage for sister-platform OAuth clients or extend `sister_platform_consumers.metadata` with an explicit schema and validation helper.
- Add `sister_platform_authorization_codes` with hashed code, code challenge, redirect URI, nonce/state metadata, TTL, consumed_at and failure audit fields.
- Add optional opaque `sister_platform_access_tokens` storage if `userinfo` requires a short-lived token beyond immediate exchange.
- Seed/update Kortex OAuth client with strict redirect URI allowlist for staging, production and local development.

### Slice 2 — Broker core in Greenhouse

- Create `src/lib/sister-platforms/oauth-broker.ts` as the single source of truth for validate-client, issue-code, consume-code and build-identity-payload.
- Add `/api/auth/sister-platforms/authorize`:
  - validates `client_id`, `redirect_uri`, `response_type=code`, `state`, `nonce`, PKCE challenge and allowed scopes.
  - requires Greenhouse session; unauthenticated users go through the normal Greenhouse login and return to the original authorize URL.
  - issues a short-lived one-time code and redirects back to Kortex with `code` + original `state`.
- Add `/api/integrations/v1/sister-platforms/oauth/token`:
  - validates client authentication, redirect URI, PKCE verifier and code TTL.
  - consumes code exactly once.
  - returns a short-lived access token or an immediate identity envelope, depending on final contract.
- Add `/api/integrations/v1/sister-platforms/oauth/userinfo` if the token response does not inline all claims.

### Slice 3 — Security, audit and observability

- Add audit/request logging for authorize success, authorize reject, exchange success, exchange reject and replay attempts.
- Add reliability signals:
  - `identity.sister_platform_oauth.exchange_failure_rate`
  - `identity.sister_platform_oauth.redirect_rejected`
  - `identity.sister_platform_oauth.stale_client_config`
- Add rate limiting and redaction at every auth boundary.
- Ensure logs never include authorization codes, PKCE verifier, raw access tokens, passwords or upstream Microsoft tokens.

### Slice 4 — Kortex Auth.js consumer

- In sibling Kortex repo, add a custom provider/button `Continuar con Greenhouse`.
- Wire authorize URL, token URL, userinfo/identity payload mapping and callback URL.
- Keep credentials/password bridge as break-glass during rollout, hidden or secondary depending on operator decision.
- Validate that a Microsoft SSO user in Greenhouse can land in Kortex with the expected operator console session.

### Slice 5 — Rollout, docs and cleanup

- Enable in staging for Kortex only.
- Run manual browser smoke Kortex -> Greenhouse Microsoft SSO -> Kortex dashboard.
- Update functional documentation and operator runbook.
- Decide whether TASK-413 remains open only for password lane hardening or is superseded by a follow-up deprecation task.

## Out of Scope

- A public OIDC provider for arbitrary third parties.
- Sharing Microsoft tokens, upstream refresh tokens, Greenhouse session cookies, DB access or password hashes with Kortex.
- Retiring `/api/integrations/v1/sister-platforms/identity` in this same task.
- A broad Admin Center provisioning UI for all sister-platform OAuth clients.
- SCIM provisioning or Microsoft Entra app registration changes.
- Any modification to existing Greenhouse SSO providers, callbacks, session semantics, SCIM provisioning, Graph sync or Entra provisioning jobs.

## Detailed Spec

### Authorization request

Expected shape:

```text
GET /api/auth/sister-platforms/authorize
  ?client_id=kortex
  &redirect_uri=https%3A%2F%2Fkortex-kappa.vercel.app%2Fapi%2Fauth%2Fcallback%2Fgreenhouse
  &response_type=code
  &scope=openid%20profile%20email%20kortex.operator_console.access
  &state=<opaque>
  &nonce=<opaque>
  &code_challenge=<S256 challenge>
  &code_challenge_method=S256
```

Hard validation:

- `client_id` exists, active and allowed for identity broker.
- `redirect_uri` exact-match allowlist, no wildcard and no prefix matching.
- `response_type` must be `code`.
- `state`, `nonce`, `code_challenge` are required.
- `scope` is subset of client allowed scopes.
- Greenhouse session user must be active and eligible for Kortex access.

### Token exchange

Expected shape:

```text
POST /api/integrations/v1/sister-platforms/oauth/token
grant_type=authorization_code
client_id=kortex
client_secret=<server-secret-or-private-auth>
code=<one-time-code>
redirect_uri=<same redirect_uri>
code_verifier=<pkce-verifier>
```

Hard validation:

- code hash exists, not expired, not consumed, bound to client and redirect URI.
- PKCE verifier matches `code_challenge`.
- code is marked consumed atomically before returning success.
- exchange replay emits audit event and returns generic failure.

### Identity payload V1

The payload should be minimal and stable:

```json
{
  "sub": "greenhouse:user:<user_id>",
  "email": "user@example.com",
  "name": "Display Name",
  "tenantId": "efeonce",
  "identityProfileId": "identity-profile-id",
  "roles": ["EFEONCE_ADMIN"],
  "capabilities": ["kortex.operator_console.access"],
  "issuedAt": "2026-05-28T00:00:00.000Z",
  "expiresAt": "2026-05-28T00:05:00.000Z"
}
```

Do not include raw route groups, raw Greenhouse session cookies, password metadata or upstream provider tokens.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (ADR/task) -> Slice 1 (schema/client) -> Slice 2 (broker routes) -> Slice 3 (signals/rate limits) -> Slice 4 (Kortex consumer) -> Slice 5 (staging/prod rollout).
- Slice 4 MUST NOT be promoted to primary UX before Slice 3 observability exists.
- Production flip MUST happen Kortex-only before generalizing the broker lane to other sister platforms.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Authorization code replay | identity / SSO | medium | hash code, TTL corto, `consumed_at` atomic, PKCE, audit event | `identity.sister_platform_oauth.exchange_failure_rate` |
| Open redirect por redirect URI laxa | identity / security | medium | exact-match allowlist per client, no wildcard, no prefix match | `identity.sister_platform_oauth.redirect_rejected` |
| Kortex lockout durante cutover | ops / Kortex | medium | dual path staged rollout, password bridge break-glass, flag rollback | manual smoke + Kortex auth logs |
| Tenant or capability leakage | identity / access | low | payload minimo, scope allowlist, access resolver canonico | audit log + denied exchange events |
| Regressions in Greenhouse Microsoft SSO, credentials login or SCIM | identity / SCIM / SSO | low | additive endpoints only, no provider/callback/SCIM edits, focused no-regression smokes before flip | SCIM provisioning logs + auth smoke failures |
| Cognitive debt por custom OAuth | platform | medium | ADR, task slices, focused tests, Auth.js provider contract docs | task review + `task:lint` |

### Feature flags / cutover

- `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=false` default.
- `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS=kortex` or DB status allowlist.
- Kortex sibling flag `KORTEX_GREENHOUSE_SSO_ENABLED=false` default.
- Revert path: disable Kortex flag first; if needed disable Greenhouse broker flag. Estimated revert: <5 min via env var + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert docs/task only | <5 min | si |
| Slice 1 | Leave additive tables disabled; revert migration only before prod data use | 15-30 min | parcial |
| Slice 2 | Disable `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED` | <5 min | si |
| Slice 3 | Keep signals/audit additive; disable broker if noisy | <5 min | si |
| Slice 4 | Disable `KORTEX_GREENHOUSE_SSO_ENABLED`, return to password bridge | <5 min | si |
| Slice 5 | Roll back flags and keep legacy identity bridge | <5 min | si |

### Production verification sequence

1. Run unit/focal tests for broker helpers and API routes.
2. Verify staging client config and redirect URI allowlist.
3. Greenhouse no-regression smoke: Microsoft SSO -> portal Greenhouse.
4. Greenhouse no-regression smoke: credentials login -> portal Greenhouse.
5. SCIM no-regression smoke/read-only health check against the existing Entra provisioning contract.
6. Browser smoke: Kortex staging -> Greenhouse login -> Microsoft SSO -> Kortex dashboard.
7. Check audit logs and reliability signals after successful and rejected exchanges.
8. Enable production Kortex-only.
9. Keep password bridge available as break-glass until at least 7 days of successful SSO logins.

## Acceptance Criteria

- [x] ADR is accepted and indexed in `DECISIONS_INDEX.md`.
- [x] `TASK-948` passes `pnpm task:lint --task TASK-948`.
- [x] Greenhouse has authorization-code broker routes behind flags or DB enablement.
- [x] Codes are one-time, TTL-bound, PKCE-bound and redirect URI-bound.
- [ ] Kortex can authenticate an operator through Greenhouse Microsoft SSO in staging. Pending env/secret rollout and browser smoke.
- [ ] Password bridge is no longer primary UX after cutover, but rollback remains documented. Runtime supports this, but cutover flag remains OFF.
- [x] No password hashes, Microsoft tokens, upstream refresh tokens or Greenhouse session cookies leave Greenhouse.
- [x] Audit and reliability signals cover success, failure, replay and redirect rejection.
- [ ] Existing Greenhouse Microsoft SSO, Google/credentials login, SCIM discovery/provisioning and session behavior remain unchanged and smoke-verified. Code boundary preserved; manual smokes pending staging rollout.
- [x] No diff to existing SSO provider config, SCIM endpoints, Entra provisioning contract, Graph sync or global session callbacks unless a separate ADR/task is opened.

## Verification

- `pnpm task:lint --task TASK-948`
- `pnpm pg:doctor`
- `pnpm pg:connect --status`
- `pnpm pg:connect:migrate`
- Existing identity/access focal tests covering Microsoft SSO, credentials session callback and SCIM helpers.
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- Focused Greenhouse ESLint for TASK-948 runtime files.
- Focused Kortex ESLint for `src/libs/auth.ts`, `src/app/login/page.tsx`, `src/views/Login.tsx`.
- Manual smoke: Greenhouse Microsoft SSO -> Greenhouse portal.
- Manual/read-only smoke: SCIM/Entra provisioning contract remains healthy.
- Manual smoke: Kortex -> Greenhouse Microsoft SSO -> Kortex dashboard.

### Verification Log — 2026-05-28

- ✅ `pnpm pg:doctor` passed before implementation.
- ✅ `pnpm task:lint --task TASK-948` passed.
- ✅ `pnpm pg:connect --status` showed only the TASK-948 migration pending before apply.
- ✅ `pnpm pg:connect:migrate` applied `20260528163738200_task-948-sister-platform-identity-broker.sql` to Cloud SQL dev and regenerated `src/types/db.d.ts`.
- ✅ `pnpm pg:connect --status` after apply reports `No migrations to run`.
- ✅ `pnpm exec tsc --noEmit --pretty false` passed after migration/type regeneration.
- ✅ `pnpm lint` passed after all Greenhouse runtime/docs-adjacent code changes.
- ✅ `pnpm build` passed; routes include `/api/auth/sister-platforms/authorize` and `/api/integrations/v1/sister-platforms/oauth/{token,userinfo}`.
- ✅ Kortex focused ESLint passed for the touched login/auth files.
- ⚠️ Kortex full `npx tsc --noEmit --pretty false` still fails on pre-existing unrelated sibling repo type errors (`@core/components/mui/IconButton.tsx`, console audit/dashboard numeric props, control-plane result narrowing, PostCSS duplicate types, etc.).
- ⚠️ Staging browser smoke and SCIM read-only smoke are pending because runtime flags/secrets are still OFF and Kortex OAuth client seed requires real pilot IDs not present in `.env.local`.
