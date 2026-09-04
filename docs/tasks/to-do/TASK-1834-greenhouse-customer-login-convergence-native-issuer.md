# TASK-1834 — Greenhouse Customer Login Convergence on the Native Issuer

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Especificación; contrato de convergencia del Slice 0 de TASK-1631 (2026-08-05) sin implementación`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `TASK-1832 (cohorte MCP viva) y TASK-1833 (aseguramiento cerrado)`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar el emisor propio `auth.efeonce.org` como provider OIDC adicional de NextAuth para el login
customer-facing de Greenhouse, resolviendo la persona por el mismo source link `(environment, subject)` que
usa MCP, sin cambiar la sesión ni la cookie del portal, sin crear una segunda persona ni un segundo
credencial, y con rollback igual a retirar el provider. Es el contrato de convergencia del Slice 0 de
`TASK-1631`, con gate propio y posterior a la cohorte MCP.

## Why This Task Exists

Sin convergencia, una persona cliente termina con dos relaciones de autenticación permanentes: la del
portal (credenciales Greenhouse) y la del emisor (passkeys). El ADR de federación lo permite sólo como
estado transitorio. Esta task cierra la divergencia por el camino ya diseñado: un solo plano de identidad
externo, dos sesiones ligadas por audiencia.

## Goal

- Provider OIDC `efeonce-auth` en `src/lib/auth.ts` detrás de flag, con discovery del emisor, PKCE y
  `client_id` confidencial pre-registrado por command de `TASK-1829`.
- Callback que resuelve `identity_profile` por `(environment, subject)` en `identity_profile_source_links`;
  sin link → acceso denegado con error canónico es-CL, nunca creación de persona.
- Login clásico de clientes conservado por defecto; el nuevo provider aparece sólo para organizaciones con
  binding activo (lectura del binding en server).
- Rollback probado: retirar el provider deja bindings y perfiles intactos y el login clásico funcionando.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (§Slice 0 convergence contract)
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (§Session access lifecycle, §Auth resilience)

Reglas obligatorias:

- NUNCA compartir cookie, secreto ni sesión entre el portal y el emisor; el portal sigue emitiendo su NextAuth session.
- NUNCA crear un `identity_profile` ni un `client_users` desde el callback; sólo enlazar a uno existente con link active.
- NUNCA tocar el path interno de Entra ni el de credenciales existentes.
- Derivación de acceso con el predicado de ciclo de vida de `user_role_assignments` (TASK-987).
- Usar `requireServerSession`/`getOptionalServerSession` canónicos; sin `try/catch + redirect` ad hoc.

## Normative Docs

- `docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md` (actualizar al cerrar)

## Dependencies & Impact

### Depends on

- `TASK-1829` (emisor OIDC con `openid-configuration`, cliente confidencial), `TASK-1631` (source links y bindings), `TASK-1832` (cohorte viva), `TASK-1833` (aseguramiento).
- `src/lib/auth.ts`, `src/lib/tenant/access.ts`, `identity_profile_source_links`.

### Blocks / Impacts

- Login cliente de Greenhouse (superficie visible sin cambio de layout: aparece un botón de provider; copy desde `src/lib/copy/`).
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`.

### Files owned

- `src/lib/auth.ts` (provider adicional gated)
- `src/lib/auth/efeonce-issuer-provider.ts` (nuevo)
- `src/lib/tenant/access.ts` (lookup por source link externo) `[verificar función de lookup vigente]`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `docs/manual-de-uso/identity/ingresar-con-efeonce-id.md` (nuevo)

## Current Repo State

### Already exists

- NextAuth 4 con Entra + credentials + magic link; `getTenantAccessRecordByEmail`/`ByUserId`.
- Contrato de convergencia escrito en el ADR de federación (2026-08-05).

### Gap

- Sin provider OIDC hacia un emisor propio; sin lookup por `(environment, subject)` en el path de login.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/auth.ts` y `src/lib/auth/**` (portal Next.js)
- Future candidate home: `portal`
- Boundary: provider NextAuth que consume el emisor por OIDC estándar; lookup por reader canónico de identidad
- Server/browser split: server; el browser sólo ve el botón del provider
- Build impact: none
- Extraction blocker: auth/session del portal (inherente al portal)

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `identity_profile_source_links` (lectura), sesión NextAuth del portal
- Consumidores afectados: login cliente del portal
- Runtime target: `production` (Vercel), con staging previo

### Contract surface

- Contrato existente a respetar: `NextAuth` options en `src/lib/auth.ts`; `TenantAccessRecord`
- Contrato nuevo o modificado: provider `efeonce-auth`; helper `resolveTenantAccessByExternalSubject(environmentId, subject)`
- Backward compatibility: `gated` (`CUSTOMER_LOGIN_EFEONCE_ISSUER_ENABLED`)
- Full API parity: n/a (autenticación de sesión); la elegibilidad se lee del binding canónico

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna nueva
- Invariantes que no se pueden romper:
  - `Un login por el emisor sólo tiene éxito con un source link active y un binding de organización active.`
  - `La sesión del portal no contiene ni reutiliza tokens del emisor.`
- Write-target allowlist: `N/A — sin escrituras`
- Tenant/space boundary: organización por binding; roles por `user_role_assignments` con predicado de ciclo de vida
- Idempotency/concurrency: lectura
- Audit/outbox/history: `auth_attempts` con `provider = efeonce-auth`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: flag `false` en Preview, staging y Production
- Backfill plan: none
- Rollback path: flag `false` + redeploy (< 5 min); retirar provider no toca datos
- External coordination: cliente confidencial registrado en el emisor; env vars en Vercel (3 targets) y redeploy

### Security and access

- Auth/access gate: OIDC con PKCE + `id_token` verificado por JWKS; predicado de ciclo de vida
- Sensitive data posture: sin PII nueva
- Error contract: `canonicalErrorResponse`/copy es-CL para "cuenta no enlazada"
- Abuse/rate-limit posture: la del emisor

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/auth`
- DB/runtime checks: `auth_attempts` con el provider; sin filas nuevas en `identity_profiles`
- Integration checks: login en staging con persona de la cohorte; persona sin link denegada; rollback verificado
- Reliability signals/logs: `identity.customer_login.issuer_unlinked_attempt` steady = 0
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist — N/A, sin tablas nuevas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 — PLAN MODE: lo produce el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Provider y lookup

- Provider OIDC gated; lookup por `(environment, subject)`; denegación canónica sin link.

### Slice 2 — Elegibilidad y rollout

- Botón visible sólo para organizaciones con binding; flag por target; docs y manual.

## Out of Scope

- Retirar el login por credenciales de clientes existentes (decisión posterior con la cohorte migrada).
- Personas internas (Entra) y cualquier cambio de layout del login (si hiciera falta, task ui-ux propia).

## Detailed Spec

- Provider: `{ id: 'efeonce-auth', type: 'oauth', wellKnown: 'https://auth.efeonce.org/.well-known/openid-configuration', authorization: { params: { scope: 'openid', code_challenge_method: 'S256' } }, idToken: true, checks: ['pkce','state'] }`.
- Callback `signIn`: `sub` + `environmentId` (por issuer) → source link → `TenantAccessRecord`; sin match → `member_identity_not_linked` análogo para clientes.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2. Nada se prende en Production antes de que `TASK-1832` y `TASK-1833` estén cerradas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Callback crea persona duplicada | identity | low | prohibición explícita + test negativo | `subject_collision` |
| Provider visible para organizaciones sin binding | customer experience | medium | elegibilidad server-side | `issuer_unlinked_attempt` |
| Rotación de issuer (dominio) rompe el provider | identity | low | `wellKnown` desde el registry de environments | fallo de discovery |

### Feature flags / cutover

- `CUSTOMER_LOGIN_EFEONCE_ISSUER_ENABLED` (default `false`) en Vercel Production, staging y Preview; ledger actualizado; redeploy tras cambiar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag `false` + redeploy | < 5 min | sí |
| Slice 2 | flag `false` + redeploy | < 5 min | sí |

### Production verification sequence

1. Staging flag ON: persona de la cohorte entra por el emisor; misma `identity_profile`; sin filas nuevas.
2. Staging: persona sin link denegada con copy canónico.
3. Production flag ON con cooldown 24 h; monitoreo de `auth_attempts` 7 días.

### Out-of-band coordination required

- Registro del cliente confidencial en el emisor; env vars Vercel; comunicación a la organización piloto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una persona con source link y binding activos entra al portal por el emisor y obtiene la misma `identity_profile` y roles que por el login clásico.
- [ ] Una persona sin link recibe denegación canónica es-CL y no se crea ninguna fila de identidad.
- [ ] La sesión del portal no contiene tokens del emisor; cookies y secretos siguen separados.
- [ ] Retirar el provider (flag OFF + redeploy) deja el login clásico intacto y los bindings sin cambios.
- [ ] `auth_attempts` registra intentos con `provider = efeonce-auth`.
- [ ] Documentación funcional y manual publicados.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/auth`
- login real en staging y rollback verificado

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md`, `Handoff.md` y `changelog.md` actualizados
- [ ] chequeo de impacto cruzado sobre `TASK-1631`, docs de identidad
- [ ] ledger de flags al día

## Follow-ups

- Retiro del login por credenciales para organizaciones migradas (task propia).

## Open Questions

- Si el botón del emisor se muestra siempre o sólo por organización elegible (recomendación: por organización).
