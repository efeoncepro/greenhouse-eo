# TASK-1727 — Candidate Portal Principal and Session Foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Backend impact: `migration|api|command|reader`
- Epic: `EPIC-011`
- Status real: `Diseno aceptado; runtime candidato inexistente`
- Rank: `TBD`
- Domain: `identity|hr|platform|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- GitHub Issue: `none`

## Summary

Crea el principal autenticable longitudinal para candidatos sobre el mismo `identity_profile_id` y `user_id` que
debe sobrevivir una futura activación laboral. Agrega claim post-apply, audiencia/capabilities self-service,
revocación/versionado de sesión y autorización own-resource sin convertir al candidato en cliente o `member`.

## Why This Task Exists

El login actual admite usuarios provisionados de cliente o internos y `/my` requiere `memberId`. No existe una
ceremonia segura para que un postulante reclame su identidad ni un contexto candidato explícito. Abrir el route
group actual o inferir acceso por email produciría privilegios incorrectos y riesgo de account takeover.

## Goal

- Mantener un solo principal y una sola persona durante candidatura, selección y vida laboral.
- Entregar sesión candidata fail-closed con capabilities estrechas y anti-IDOR.
- Endurecer claim, recuperación, rate limit, consumo atómico y revocación de sesiones.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CANDIDATE_ACCOUNT_LONGITUDINAL_MY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`

Reglas: email no prueba ownership; candidato no recibe defaults de cliente/interno; IDs sensibles se resuelven en
servidor; principal/facetas son aditivos y una colisión ambigua bloquea auto-linking.

## Normative Docs

- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.identity_profiles`, `greenhouse_core.client_users` y el apply canónico de TASK-353/354.
- `src/lib/auth.ts`, `src/lib/auth/magic-link.ts`, `src/lib/tenant/access.ts`.

### Blocks / Impacts

- Bloquea `TASK-1728`, `TASK-1729`, `TASK-1730`, `TASK-1731` y, transitivamente, `TASK-1761`.
- Impacta auth/session, route governance y recuperación de cuenta.

### Files owned

- `src/lib/auth/**`
- `src/lib/tenant/**`
- `src/app/api/auth/**`
- `migrations/*candidate*principal*`

## Current Repo State

### Already exists

- Persona Hiring person-first, NextAuth, magic links single-use y claims opcionales `identityProfileId/memberId`.

### Gap

- No hay audiencia candidata, account claim post-apply, sesión versionada ni bridge seguro desde email verificado.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/auth, src/lib/tenant y src/app/api/auth dentro del portal Greenhouse`
- Future candidate home: `remain-shared`
- Boundary: `claimCandidateAccount + resolveLongitudinalPersonSession + capability/resource authorization`
- Server/browser split: `credenciales, sesión, linking, stores y policy exclusivamente server-side`
- Build impact: `none; reutiliza stack auth actual`
- Extraction blocker: `sesión NextAuth, client_users, capability registry y transacción PG compartida`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration|api|command|reader`
- Source of truth afectado: `portal principal, login bindings, session version y grants de candidate self-service`
- Consumidores afectados: `public apply email, /my, Product API y activation bridge`
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: `src/lib/auth.ts`, `src/lib/auth/magic-link.ts`, capability/view registries.
- Contrato nuevo o modificado: `candidate account claim, candidate session context, own-resource subject`.
- Backward compatibility: `gated; sesiones client/internal no cambian con flag OFF`.
- Full API parity: `auth y autorización viven en primitives server-side compartidas por rutas/consumers`.

### Data model and invariants

- Entidades afectadas: `client_users o extensión canónica del principal; auth_magic_links; grants/session version`.
- Invariantes: un principal/persona; cero rol default; claim atómico; revocación elimina claims stale.
- Tenant/space boundary: `identityProfileId autenticado; candidateFacet resuelto en servidor`.
- Idempotency/concurrency: `consume UPDATE ... WHERE used_at IS NULL RETURNING; linking serializado`.
- Audit/outbox/history: `claim/link/recovery/deny sin token ni PII cruda`.

### Migration, backfill and rollout

- Migration posture: `additive`.
- Default state: `flag OFF`.
- Backfill plan: `ninguno masivo; claim solo por ceremonia verificada`.
- Rollback path: `flags OFF; conservar principal/audit y login interno existente`.
- External coordination: `People + Identity/Security sign-off y templates de email`.

### Security and access

- Auth/access gate: `email verificado + audience candidate_self_service + capabilities own`.
- Sensitive data posture: `PII de identidad; no payloads en token/log`.
- Error contract: `respuestas homogéneas anti-oracle; foreign/not-found indistinguibles`.
- Abuse/rate-limit posture: `IP + hash de email, TTL, single-use y sessionVersion`.

### Runtime evidence

- Local checks: `tests de claim, colisión, replay, revocación, defaults y auth regression`.
- DB/runtime checks: `migración + carrera de consumo concurrente + principal único`.
- Integration checks: `apply real de staging → email → claim → sesión candidata`.
- Reliability signals/logs: `candidate_account_claim_*`, `candidate_session_stale`, `candidate_access_denied`.
- Production verification sequence: `cohorte allowlisted de una aplicación; client/internal regression; rollback`.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

1. Auditar y fijar el modelo físico aditivo del principal/audiencias sin `tenant_type` coercion.
2. Implementar claim post-apply, linking/collision policy, recuperación y sessionVersion.
3. Registrar capabilities `hiring.self.*`/`person.self.*`, subject own-resource y negative tests.
4. Entregar flags, señales, emails/receipts y canary staging.

## Out of Scope

- Perfil profesional, CRUD de postulaciones, UI `/my`, creación de `member` o SSO externo nuevo.

## Detailed Spec

El modelo físico debe conservar `client_users.user_id` o su alias canónico mediante migración aditiva, separar audiencias de `tenant_type` y producir una transición atómica `unverified application email → verified principal binding`. El plan debe congelar schemas, error codes, capability grants y session invalidation antes de habilitar emails reales.

## Rollout Plan & Risk Matrix

- Orden: schema/registry → primitives OFF → synthetic claim → staging allowlist → candidate canary → producción.
- Riesgos: account takeover, default client role y sesión stale; mitigados con verificación, deny tests y versionado.
- Flags: `CANDIDATE_ACCOUNT_CLAIM_ENABLED` y `CANDIDATE_SELF_SERVICE_SESSION_ENABLED`, default OFF.
- Rollback: apagar flags; no revertir filas auditables/aditivas.
- Coordinación: Security/Privacy/People antes de email real.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Una postulación puede reclamar un único principal ligado al `identity_profile_id` correcto.
- [ ] Replay, email ambiguo, cuenta ajena, candidate-as-client y sesión revocada fallan cerrados.
- [ ] Sesiones internas/client existentes conservan comportamiento con flags OFF/ON.
- [ ] Capabilities propias no conceden rutas legales, laborales, de cliente o internas.

## Verification

- `pnpm task:lint --task TASK-1727`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Smoke autenticado y consultas read-only de staging.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff y changelog sincronizados.
- [ ] ADR/arquitectura reflejan el modelo físico realmente implementado.
- [ ] Rollback y revocación de sesión verificados en staging.

## Follow-ups

- `TASK-1728`, `TASK-1729`, `TASK-1730`, `TASK-1731`, `TASK-1761`.

## Delta 2026-08-21 — binding Microsoft posterior y source-neutral

`TASK-1761` debe ligar el OID/UPN corporativo al mismo `user_id`/`identity_profile_id` creado aquí. Email personal,
UPN y `accountEnabled` nunca sustituyen el principal longitudinal ni su lifecycle candidate/ex-collaborator.
