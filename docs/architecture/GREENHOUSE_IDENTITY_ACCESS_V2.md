# Greenhouse Identity & Access Architecture V2

## Delta 2026-04-17 — `password_hash` mutation guardrails (TASK-451 / ISSUE-053)

### Problema detectado

Un batch a las 08:00 UTC (dentro del ciclo de syncs de Entra + HubSpot) escribió sobre `greenhouse_core.client_users.password_hash` en la DB `greenhouse-pg-dev`, dejando inutilizable el login con credentials para `jreyes@efeoncepro.com` en staging. Producción comparte la misma DB; la hipótesis de por qué prod seguía aceptando el login es que ese usuario tenía un JWT de sesión ya emitido (NextAuth no re-valida el hash por request).

Investigación confirmó dos cosas:

1. El único writer legítimo en runtime de `password_hash` son `/api/account/reset-password` y `/api/account/accept-invite`.
2. `scripts/backfill-postgres-identity-v2.ts` también escribía `password_hash = COALESCE($8, password_hash)` leyendo desde BigQuery — vulnerabilidad latente que ya había causado la rotación silenciosa.

### Regla canónica

**`client_users.password_hash` es user-initiated. No se sincroniza desde BigQuery, HubSpot, Entra, SCIM ni ningún sistema externo. Nunca.** Los únicos flujos que lo mutan son:

| Flujo | Entry point | Source |
|---|---|---|
| Password reset self-service | `POST /api/account/reset-password` | `user_reset` |
| Invite acceptance (set initial password) | `POST /api/account/accept-invite` | `accept_invite` |
| Bootstrap admin / test fixture | `scripts/` bajo control explícito | `bootstrap_admin` / `test_fixture` |

Cualquier otro path que mute `password_hash` es un bug y es **rechazado a nivel DB**.

### Defensa en profundidad

#### 1. Trigger DB (`client_users_password_guard`)

Migration `20260417165907294_task-451-password-hash-mutation-guard.sql` instala:

```sql
CREATE FUNCTION greenhouse_core.guard_password_hash_mutation() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
    IF current_setting('app.password_change_authorized', TRUE) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'password_hash mutation not authorized.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_users_password_guard
BEFORE UPDATE ON greenhouse_core.client_users
FOR EACH ROW EXECUTE FUNCTION greenhouse_core.guard_password_hash_mutation();
```

Comportamiento:

- `UPDATE ... SET password_hash = X` sin `SET LOCAL app.password_change_authorized = 'true'` → **excepción `P0001`**.
- `UPDATE ... SET last_login_at = ...` (sin tocar password) → pasa siempre.
- `UPDATE ... SET password_hash = OLD.password_hash` (no-op) → `IS DISTINCT FROM` filtra y pasa.

#### 2. Helper de aplicación (`withPasswordChangeAuthorization`)

`src/lib/identity/password-mutation.ts` es la única API autorizada para escribir `password_hash`:

```ts
await withPasswordChangeAuthorization(
  { userId, source: 'user_reset' },
  async client => {
    await client.query(
      `UPDATE greenhouse_core.client_users
         SET password_hash = $1, password_hash_algorithm = 'bcrypt', updated_at = now()
         WHERE user_id = $2`,
      [passwordHash, userId]
    )
  }
)
```

Qué hace internamente:

1. Abre una transacción (`withTransaction`).
2. Ejecuta `SET LOCAL app.password_change_authorized = 'true'`.
3. Corre el callback del caller (el UPDATE real).
4. Publica `identity.password_hash.rotated` al outbox con `{userId, source, actorUserId, rotatedAt}`.
5. Commit.

**Regla para contributors:** si tu código necesita escribir `password_hash`, lo único correcto es llamar al helper. Cualquier otro camino será rechazado por el trigger.

#### 3. Outbox event (`identity.password_hash.rotated`)

- `aggregate_type = 'identity_credential'`
- `aggregate_id = userId`
- `event_type = 'identity.password_hash.rotated'`
- `payload = { userId, source, actorUserId, rotatedAt }`

El evento es informativo; no bloquea la escritura. Queda persistido en `greenhouse_sync.outbox_events` para que cualquier consumer futuro pueda alertar (Slack/Sentry) si el `source` es inesperado. Follow-up abierto: wire del alerter en TASK posterior.

### Reglas para todo desarrollo futuro

1. **Ningún batch, sync, cron, backfill o migration puede SET `password_hash`**. Si tu cambio lo necesita, estás diseñando mal.
2. **Ningún reader externo (BigQuery, HubSpot, Entra, SCIM, Notion) es fuente de verdad para passwords.** No se mirror, no se backfillea, no se reconcilia.
3. Si tienes un caso de bootstrap legítimo (seed admin en un ambiente nuevo, fixture de test), usa el helper con `source: 'bootstrap_admin'` o `source: 'test_fixture'` — queda trazado en outbox.
4. **El helper requiere transacción.** No uses `runGreenhousePostgresQuery` pelado para escribir `password_hash`.
5. Si algo intenta mutar `password_hash` sin autorización y ves el error `password_hash mutation not authorized`, **no desactives el trigger ni seteés el flag sin pensar**. Investiga por qué ese path quiere escribir passwords.

### Cambios aplicados

- `migrations/20260417165907294_task-451-password-hash-mutation-guard.sql` — trigger + función.
- `src/lib/identity/password-mutation.ts` — helper `withPasswordChangeAuthorization`.
- `src/app/api/account/reset-password/route.ts` — migrado al helper (`source: 'user_reset'`).
- `src/app/api/account/accept-invite/route.ts` — migrado al helper (`source: 'accept_invite'`).
- `scripts/backfill-postgres-identity-v2.ts` — removidos `password_hash` + `password_hash_algorithm` del SELECT BigQuery y del UPDATE PG.
- `src/lib/sync/event-catalog.ts` — agregados `AGGREGATE_TYPES.identityCredential` + `EVENT_TYPES.identityPasswordHashRotated`.
- `src/lib/identity/__tests__/password-mutation.test.ts` — 5 unit tests.

### Referencias

- Incidente: `docs/issues/resolved/ISSUE-053-password-hash-overwritten-by-batch-sync.md`
- Task: `docs/tasks/complete/TASK-451-password-hash-mutation-guardrails.md`
- Pattern relacionado: `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` (trigger + session var como convención canónica de mutation guardrails)

---

## Delta 2026-04-13 — portal home contract converges on `/home` with centralized policy resolution (TASK-400)

- `/home` queda como startup contract canónico del portal.
- `portalHomePath` ya no se resuelve con fallbacks dispersos en root, auth, provisioning o shell; vive en una policy centralizada del runtime.
- La policy actual distingue explícitamente:
  - `client_default` → `/home`
  - `internal_default` → `/home`
  - `hr_workspace` → `/hr/payroll`
  - `finance_workspace` → `/finance`
  - `my_workspace` → `/my`
- Los aliases legacy siguen soportados y se normalizan antes de llegar a sesión/UI:
  - `/dashboard` → `/home`
  - `/internal/dashboard` → `/home`
  - `/finance/dashboard` → `/finance`
  - `/hr/leave` → `/hr/payroll`
  - `/my/profile` → `/my`
- `/dashboard` puede seguir existiendo como feature route legacy para compatibilidad, pero ya no es el contrato de arranque ni el fallback estructural de acceso denegado.

## Delta 2026-04-10 — hierarchy governance stays broad-only and preserves manual precedence (TASK-330)

- `HR > Jerarquía` mantiene su carácter broad HR/admin; no se abre a supervisoría limitada.
- La nueva gobernanza de drift vive en la misma surface:
  - `GET /api/hr/core/hierarchy/governance`
  - `POST /api/hr/core/hierarchy/governance/run`
  - `POST /api/hr/core/hierarchy/governance/proposals/[proposalId]/resolve`
- Regla vigente:
  - Entra puede sugerir drift de supervisoría
  - Greenhouse manual mantiene precedencia por defecto
  - solo RRHH/Admin puede aprobar el cambio formal
  - `workflow_approval_snapshots` no se reescribe por resolver drift histórico

## Delta 2026-04-10 — org chart explorer materialized without a new route group (TASK-329)

- La capability de supervisor ya no se limita a `/hr`, `/hr/team` y `/hr/approvals`; ahora también aterriza en:
  - `/hr/org-chart`
  - `GET /api/hr/core/org-chart`
- Regla vigente:
  - `routeGroup: hr` sigue siendo el carril broad HR
  - supervisoría limitada sigue derivándose on-demand desde `reporting_lines` + `approval_delegate`
  - no se crea `routeGroup` ni `role_code` nuevo para `supervisor`
- Comportamiento efectivo:
  - HR/admin puede abrir el explorer completo
  - un supervisor con subtree access puede abrir `/hr/org-chart`, ver solo su subárbol visible y enfocar personas puntuales sin heredar acceso amplio a `HR > Jerarquía`

## Delta 2026-04-10 — supervisor workspace materialized without a new route group (TASK-328)

- La capability de supervisor ya no vive solo en readers y guards; ahora tiene surfaces runtime:
  - `/hr` como landing supervisor-aware
  - `/hr/team`
  - `/hr/approvals`
- Regla vigente:
  - `routeGroup: hr` sigue siendo el carril broad HR
  - supervisoría limitada sigue derivándose on-demand desde `reporting_lines` + `approval_delegate`
  - no se crea `routeGroup` ni `role_code` nuevo para `supervisor`
- Comportamiento efectivo:
  - HR/admin conserva el dashboard amplio en `/hr`
  - un supervisor con subtree access puede entrar a `/hr`, `/hr/team` y `/hr/approvals` aunque no tenga `hr_manager`
  - la cola materializada sigue leyendo `workflow_approval_snapshots`; no recalcula autoridad inline en la UI

## Delta 2026-04-05 — Entra sync cierra ciclo completo: avatar + identity link + person_360 v2 (TASK-256 / ISSUE-014)

### Entra sync pipeline (completo)

El cron `entra-profile-sync` ahora ejecuta el ciclo completo para cada usuario interno:

1. **Match**: OID primero → email directo → alias email via `buildEfeonceEmailAliasCandidates()` (cruza `@efeonce.org` ↔ `@efeoncepro.com`)
2. **Backfill OID**: si el match fue por email, backfill `microsoft_oid` en `client_users` para futuros syncs
3. **Update client_users**: sync `full_name`, `active`/`status` desde Entra `accountEnabled`
4. **Ensure identity_profile link**: si `client_users.identity_profile_id` es NULL:
   - Busca `identity_profiles` por `canonical_email`
   - Si existe → linkea. Si no existe → crea uno nuevo y linkea.
5. **Update identity_profiles**: sync `job_title`, `full_name`, `canonical_email`
6. **Update members**: sync `role_title`, `location_country`, `location_city`, `phone`
7. **Sync avatar**: fetch foto de Microsoft Graph (`/users/{oid}/photo/$value`) → upload a GCS via `uploadGreenhouseMediaAsset()` → update `client_users.avatar_url` + BQ via `setUserAvatarAssetPath()`

### person_360 VIEW v2

La VIEW `greenhouse_serving.person_360` fue reemplazada para exponer campos enriched:
- `resolved_avatar_url` (de `client_users.avatar_url`, sincronizado desde Graph via GCS)
- `resolved_job_title`, `resolved_phone`, `resolved_email`
- `department_name`, `job_level`, `employment_type`, `linked_systems`, `active_role_codes`

Migracion: `20260405164846570_person-360-v2-enriched-view.sql`

### Resultado

- Todo usuario interno activo tiene `identity_profile_id` linkeado despues del cron
- `person_360` retorna fila con datos enriched para todos los usuarios internos
- Mi Perfil muestra avatar, cargo, telefono, departamento, y sistemas vinculados
- 7/8 usuarios internos tienen avatar sincronizado desde Microsoft Graph

### Normalizacion de source systems

Funcion SQL `greenhouse_core.canonical_source_system(raw TEXT)` normaliza `source_system` values a nombres display-friendly en la VIEW `person_360`:

| Raw DB values | Canonical | Mostrado en UI |
|---|---|---|
| `azure_ad`, `azure-ad`, `microsoft_sso`, `entra` | `microsoft` | Si |
| `hubspot`, `hubspot_crm` | `hubspot` | Si |
| `notion` | `notion` | Si |
| `google`, `google_oauth`, `google_workspace` | `google` | Si |
| `deel`, `deel_hr`, `deel_com` | `deel` | Si |
| `greenhouse_auth`, `greenhouse_team` | `NULL` | No (filtrado) |

Regla: nuevos source systems se agregan al CASE de la funcion SQL, no al frontend ni al TypeScript.

### Source files

- `src/lib/entra/graph-client.ts` — `fetchEntraUserPhoto()`
- `src/lib/entra/profile-sync.ts` — sync engine con avatar + identity link
- `src/app/api/cron/entra-profile-sync/route.ts` — cron handler
- `src/lib/tenant/internal-email-aliases.ts` — alias matching cross-domain
- `greenhouse_core.canonical_source_system()` — funcion SQL de normalizacion

## Delta 2026-04-05 — Agent Auth (headless session for agents & E2E)

### Endpoint

- `POST /api/auth/agent-session`
- Source: `src/app/api/auth/agent-session/route.ts`

### Purpose

Generate a valid NextAuth JWT session cookie without interactive login. Designed for:

- AI coding agents that need to test authenticated pages
- Playwright E2E tests that need to skip the login form
- Any headless automation that requires a valid session

### Security model

| Guard                         | Behavior                                              |
| ----------------------------- | ----------------------------------------------------- |
| `AGENT_AUTH_SECRET` not set   | Endpoint returns 404 (invisible)                      |
| `VERCEL_ENV === 'production'` | Returns 403 unless `AGENT_AUTH_ALLOW_PRODUCTION=true` |
| Secret comparison             | `crypto.timingSafeEqual` — timing-safe                |
| Email not found               | 404 (user must exist in tenant access table)          |

### Request / Response

```
POST /api/auth/agent-session
Content-Type: application/json

{ "secret": "<AGENT_AUTH_SECRET>", "email": "user@example.com" }
```

```json
{
  "cookieName": "next-auth.session-token",
  "cookieValue": "<JWT>",
  "email": "user@example.com",
  "userId": "user-xxx",
  "portalHomePath": "/home"
}
```

### Token shape

The JWT is generated via `next-auth/jwt` `encode()` with the same payload shape as a normal login session — all tenant fields (roleCodes, authorizedViews, projectScopes, etc.) are populated from the tenant access record.

### Playwright setup script

`scripts/playwright-auth-setup.mjs` — two modes:

- **API mode** (default): calls `/api/auth/agent-session`, no browser needed
- **Credentials mode** (`AGENT_AUTH_MODE=credentials`): opens browser, fills login form

Output: `.auth/storageState.json` — compatible with Playwright's `storageState` option.

### Dedicated agent user

A dedicated PostgreSQL-provisioned user exists exclusively for agent and E2E test sessions. This avoids using personal accounts for automated workflows.

| Field           | Value                                            |
| --------------- | ------------------------------------------------ |
| `user_id`       | `user-agent-e2e-001`                             |
| `email`         | `agent@greenhouse.efeonce.org`                   |
| `password`      | `Gh-Agent-2026!`                                 |
| `password_hash` | bcrypt cost-12 (`$2b$12$Du4oz...`)               |
| `tenant_type`   | `efeonce_internal`                               |
| `auth_mode`     | `credentials`                                    |
| `roles`         | `efeonce_admin` + `collaborator`                 |
| `timezone`      | `America/Santiago`                               |
| `migration`     | `20260405151705425_provision-agent-e2e-user.sql` |

The migration inserts into `greenhouse_core.client_users` and two rows into `greenhouse_core.user_role_assignments`. All INSERTs use `ON CONFLICT DO NOTHING` for idempotency.

### Why a dedicated user?

- **Isolation**: personal accounts can change passwords, roles, or be deactivated — breaking CI/E2E silently.
- **Auditability**: events emitted under `user-agent-e2e-001` are immediately identifiable as automated.
- **Least surprise**: agents never accidentally modify personal data or trigger supervisor-based workflows.
- **Reproducibility**: all agents and environments share the same deterministic identity, reducing test flakiness.

### Tenant resolution flow

```
POST /api/auth/agent-session { secret, email }
  │
  ├─ timingSafeEqual(secret, AGENT_AUTH_SECRET) → 401 if mismatch
  ├─ VERCEL_ENV === 'production' && !ALLOW_PRODUCTION → 403
  │
  └─ getTenantAccessRecordForAgent(email)
       │
       ├─ 1. PostgreSQL: greenhouse_serving.session_360 WHERE email = $1
       │     → returns user_id, tenant_type, roles[], member_id, ...
       │     → ALL LEFT JOINs: works even without member/identity links
       │
       └─ 2. If PG returns null → BigQuery fallback (getIdentityAccessRecord)
             → same field contract as PG path
       │
       └─ encode JWT via NextAuth → return { cookieName, cookieValue, portalHomePath }
```

### Environment variables

| Variable                      | Required              | Purpose                                              | Default                        |
| ----------------------------- | --------------------- | ---------------------------------------------------- | ------------------------------ |
| `AGENT_AUTH_SECRET`           | Yes                   | Shared secret (generate with `openssl rand -hex 32`) | —                              |
| `AGENT_AUTH_EMAIL`            | Yes                   | Email of the user to authenticate as                 | `agent@greenhouse.efeonce.org` |
| `AGENT_AUTH_ALLOW_PRODUCTION` | No                    | Set `true` to allow in production (not recommended)  | `false`                        |
| `AGENT_AUTH_PASSWORD`         | Only credentials mode | Password for login form                              | `Gh-Agent-2026!`               |
| `AGENT_AUTH_MODE`             | No                    | `api` (default) or `credentials`                     | `api`                          |

### Staging verification (2026-04-05)

- Agent Auth verified working on staging: `POST /api/auth/agent-session` → HTTP 200, JWT for `user-agent-e2e-001`
- `AGENT_AUTH_SECRET` and `AGENT_AUTH_EMAIL` are configured in Vercel for Staging + Preview(develop)
- **Accessing staging programmatically** requires the Vercel SSO bypass header because `ssoProtection.deploymentType = "all_except_custom_domains"` protects all non-production-custom-domain deployments:
  - Use the `.vercel.app` URL: `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`
  - Add header: `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET`
  - Do NOT use the custom domain `dev-greenhouse.efeoncepro.com` (still protected by SSO, not exempt)
- **NEVER manually create** `VERCEL_AUTOMATION_BYPASS_SECRET` in Vercel — it is system-managed. A manual variable shadows the real one and silently breaks bypass (see ISSUE-013).

## Delta 2026-04-05 — Mi Perfil identity chain fix (TASK-255)

### Problema

`GET /api/my/profile` respondia 422 para usuarios internos autenticados. Causa raiz: el path BigQuery de login (`getIdentityAccessRecord` en `src/lib/tenant/access.ts`) no seleccionaba `cu.member_id` ni `cu.identity_profile_id`, y la funcion `authorize()` de credentials en `src/lib/auth.ts` no incluia `memberId` ni `identityProfileId` en el user object retornado — el JWT quedaba sin estos campos.

### Cambios

1. **BigQuery query**: `cu.member_id` y `cu.identity_profile_id` agregados al SELECT y GROUP BY de `getIdentityAccessRecord()`. Todos los callers (credentials, Microsoft SSO, Google SSO) heredan el fix automaticamente.
2. **Credentials authorize()**: `memberId`, `identityProfileId`, `spaceId`, `organizationId`, `organizationName` agregados al return object. SSO no tenia este bug porque lee `tenant.*` directamente en el JWT callback.
3. **Profile route**: `/api/my/profile` usa `requireTenantContext()` (no `requireMyTenantContext()`). Intenta `person_360` si `memberId` existe, fallback a `session.user` si no. Un usuario autenticado nunca ve "Perfil no disponible".

### Tipos y proyecciones nuevos

- `PersonProfileSummary` — tipo compartido en `src/types/person-360.ts`
- `toPersonProfileSummary(Person360)` — proyeccion canonico desde `person_360`
- `toPersonProfileSummaryFromSession(session.user)` — fallback desde JWT session data

### Regla

El contrato `TenantAccessRow` (fields del session resolution) debe tener paridad de columnas entre el path PostgreSQL (`session_360`) y el path BigQuery (`getIdentityAccessRecord`). Todo campo nuevo que se agregue a `session_360` debe ir tambien en el SELECT/GROUP BY de BigQuery.

## Delta 2026-04-05 — Identity Spec Residual Gaps (TASK-253)

### Gaps cerrados

- **Gap 1 (Approval Snapshot):** Evolucionado y cerrado con contrato compartido — leave ya no depende solo de `supervisor_member_id`; ahora congela autoridad por etapa en `greenhouse_hr.workflow_approval_snapshots`, incluyendo delegación, fallback y override.
- **Gap 2 (scope.revoked):** `revokeStaleProjectScopes()` en `tenant-member-provisioning.ts` desactiva scopes obsoletos y emite `scope.revoked` al outbox. Complementa la emisión de `scope.assigned` de TASK-248.
- **Gap 4 (user.deactivated / user.reactivated):** Eventos canónicos emitidos desde ambas vías:
  - Admin Center: `deactivateMember()` emite `user.deactivated` (deactivatedBy: 'admin')
  - SCIM: `updateUser()` emite `user.deactivated` o `user.reactivated` (deactivatedBy: 'scim')
- Aggregate type `userLifecycle` agregado al catálogo
- Payloads: `UserDeactivatedPayload`, `UserReactivatedPayload`
- Ambos eventos en `REACTIVE_EVENT_TYPES`

### Estado de compliance con spec

Todos los gaps identificados al contrastar `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` + `GREENHOUSE_IDENTITY_ACCESS_V2.md` contra el código están cerrados (TASK-247 + TASK-248 + TASK-253).

## Delta 2026-04-05 — Identity & Platform Block Hardening (TASK-247)

- Race conditions cerradas: superadmin count con `FOR UPDATE` dentro de tx, primary demotion con `FOR UPDATE`
- `RoleGuardrailError` class para HTTP 400 en errores de negocio de role assignment
- `administracion.cuentas` viewCode registrado, VerticalMenu actualizado
- Paginación en `listResponsibilities`, error handling en AdminAccountsView
- 5 event types en `REACTIVE_EVENT_TYPES`, payload interfaces tipadas
- Test unitario VIEW_REGISTRY, input validation POST responsibilities

## Delta 2026-04-05 — Identity & Access Spec Compliance (TASK-248)

### Audit events implementados

- `scope.assigned` / `scope.revoked` — emitidos al asignar/revocar project scopes via outbox
- `auth.login.success` — emitido via NextAuth `events.signIn` (fire-and-forget, post-session)
- `auth.login.failed` — emitido inline en `authorize()` al fallar password credentials
- Payloads tipados: `ScopeAssignedPayload`, `ScopeRevokedPayload`, `LoginSuccessPayload`, `LoginFailedPayload`
- Todos en `REACTIVE_EVENT_TYPES` para futuros consumers

### Legacy role codes completamente eliminados

- `employee` y `finance_manager` eliminados del runtime TypeScript
- 1 usuario migrado: `employee` → `collaborator` (user-efeonce-internal-daniela-ferreira)
- Route group `employee` eliminado del type system
- BigQuery seeds conservan referencia histórica con descripción "Removed"
- `efeonce_admin` ahora tiene 8 route groups (sin `employee`)

### Route group mapping actualizado

- `efeonce_operations` ahora incluye `people` (formaliza drift #1 de ROLES_HIERARCHIES §1.5)
- `hr_payroll` ahora incluye `people` (formaliza drift #1)
- `canAccessPeopleModule` simplificado sin fallback redundante

## Delta 2026-04-05 — Superadministrador bootstrap & assignment policy (TASK-226)

### Policy formalizada

- El perfil owner/founder recomendado es `efeonce_admin` + `collaborator`
- `efeonce_admin` implica acceso total a todas las vistas posibles del portal (9 route groups)
- `collaborator` garantiza la experiencia personal (Mi Ficha, Mi Nómina, etc.)
- Constante canónica: `SUPERADMIN_PROFILE_ROLES` en `src/config/role-codes.ts`

### Bootstrap

- El primer Superadministrador se crea vía `POST /api/admin/invite` con `role_codes: ['efeonce_admin']`
- El sistema auto-agrega `collaborator` si no está incluido (policy code en invite + role-management)
- Si no existe ningún Superadministrador activo, `pnpm pg:doctor` reporta warning

### Governance

- Solo un Superadministrador puede asignar o revocar el rol `efeonce_admin` a otro usuario
- No se puede revocar el último Superadministrador activo del sistema
- Todo cambio de roles emite eventos audit: `role.assigned`, `role.revoked`
- `assigned_by_user_id` se registra en cada assignment (audit trail)

### Guardrails implementados

- `updateUserRoles()` en `role-management.ts` verifica:
  1. Actor es admin si el cambio toca `efeonce_admin`
  2. No se puede dejar el sistema sin superadmin
  3. `efeonce_admin` siempre incluye `collaborator`
  4. Emite outbox events para audit

## Delta 2026-04-03 — internal roles and hierarchies separated into their own canonical spec

Este documento sigue siendo la fuente canónica para:

- auth principal
- sesión
- RBAC
- route groups
- access runtime

Pero la semántica de:

- taxonomía interna de roles
- nombres visibles amigables
- supervisoría
- estructura departamental
- ownership operativo por scope

ya debe leerse en:

- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`

Regla operativa:

- `supervisor` no es un role code; es una relación derivada de `reports_to_member_id`
- `departments` no reemplaza ownership operativo ni aprobaciones por sí solo
- la surface de administración de supervisoría se expone como vista `equipo.jerarquia` bajo el route group `hr`
- la matriz base `role_code -> routeGroups -> catálogo de vistas` debe leerse en `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`

## Purpose

Define the unified permissions, roles, and access model for Greenhouse as a single Next.js application serving three distinct audiences through route-group separation:

1. **Client-facing** — external clients seeing their ICO dashboards, projects, capabilities
2. **Collaborator-facing** — internal Efeonce team members seeing their personal payroll, leave, expenses, tools
3. **Internal/Admin** — Efeonce operators, HR, finance, and administrators managing the platform

This document supersedes the informal role model scattered across earlier Codex tasks (`Agency_Operator_Layer`, `HR_Core_Module`, `Financial_Module`, `AI_Tooling_Credit_System`) and consolidates them into one canonical contract.

Use together with:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

## Status

This is the target access architecture. The PostgreSQL canonical backbone is already provisioned (`greenhouse_core` schema in `greenhouse-pg-dev`). The tables defined in this document extend that backbone with a mature RBAC model that replaces the early `role: 'client' | 'admin'` field on `greenhouse.clients`.

## Delta 2026-03-30 — Principal-first auth, person-first human resolution

Este documento sigue siendo `principal-first` para auth y access runtime.

Eso no contradice el contrato `person-first` del modelo 360:

- sesión, login, preferencias, inbox y overrides continúan anclados en `client_users.user_id`
- surfaces que representen humanos no deberían tratar `client_user` como raíz humana si existe resolución canónica por persona

Regla operativa:

- access runtime puede seguir resolviendo desde `user_id`
- consumers de preview, recipients y admin read surfaces deben enriquecer la sesión con `identity_profile_id` y `member_id` cuando corresponda
- migraciones futuras no deben romper compatibilidad con tablas o logs que hoy son `userId`-scoped por diseño

## Delta 2026-04-02 — Delivery identity coverage closes on the canonical graph

Para Delivery y `ICO`, el contrato operativo ya no debe asumirse como solo `notion_user_id -> member_id`.

Regla operativa:

- reconciliación de responsables Notion debe cerrar sobre el grafo canónico `identity_profile -> member/client_user`
- `greenhouse.team_members` puede seguir existiendo como carril BigQuery de sync, pero no debe convertirse en autoridad silenciosa por encima de `greenhouse_core.*`
- cuando un link de identidad se aprueba, la persistencia canónica debe vivir también en `greenhouse_core.identity_profile_source_links`
- los controles de coverage para Delivery deben poder auditarse por `space_id` y período antes de recalcular un reporte mensual

## Core Design Decisions

### Decision 1: Single app, three audiences

Greenhouse is one Next.js application deployed on Vercel. Audience separation happens through Next.js route groups, not separate deployments.

Route group families:

- `/dashboard`, `/proyectos`, `/sprints`, `/campanas`, `/equipo`, `/settings` → client-facing
- `/my/*` → collaborator-facing (personal self-service)
- `/internal/*` → agency operator views (cross-tenant visibility)
- `/admin/*` → platform administration
- `/hr/*` → HR management (leave admin, payroll, attendance)
- `/finance/*` → financial management
- `/people/*` → people management and collaborator read surfaces

### Decision 2: Same login, multiple roles

A single identity (one `client_users` record / one SSO principal) can hold multiple roles simultaneously. The session resolves all applicable roles at login time. Route guards check role membership, not a single `role` string.

This means:

- An Efeonce collaborator logs in via Microsoft SSO
- The session resolves their `user_id`, `client_id`, and all assigned `role_codes`
- They see sidebar sections for every route group their roles grant access to
- A person can be both a `collaborator` (sees "Mis Permisos") and an `hr_manager` (sees HR admin) and a `finance_analyst` (sees Finance)

### Decision 3: Roles are composable, not hierarchical

Roles are not a strict hierarchy where `admin > operator > client`. They are composable permissions that can be combined. An `efeonce_admin` does not automatically get `finance_analyst` unless explicitly assigned.

Exception: `efeonce_admin` has a universal override that grants access to all route groups. This is the only hierarchical rule.

### Decision 4: Tenant context is always present

Every authenticated session carries a `client_id` (the tenant context). For external clients, this is their company. For Efeonce internal users, this is the `efeonce` tenant. When an operator or admin navigates into a specific client Space, the active tenant context switches.

### Decision 5: PostgreSQL is the target store

The RBAC tables live in `greenhouse_core` in PostgreSQL. During migration, BigQuery `greenhouse.client_users` and `greenhouse.user_role_assignments` remain as compatibility reads. New writes should target PostgreSQL.

## Identity Model

### Auth Principal

The auth principal is the login entity. One person = one auth principal.

Canonical anchor: `greenhouse_core.client_users.user_id`

An auth principal carries:

- `user_id` — Greenhouse-assigned UUID
- `client_id` — the home tenant (FK to `greenhouse_core.clients`)
- `identity_profile_id` — optional link to the broader cross-system identity graph
- `email` — login email
- `full_name` — display name
- `tenant_type` — `'client'` or `'efeonce_internal'`
- `auth_mode` — `'microsoft_sso'`, `'google_sso'`, `'credentials'`
- `status` — `'active'`, `'suspended'`, `'deactivated'`
- `active` — boolean

### Collaborator Link

For Efeonce internal users, the auth principal links to a collaborator record:

- `greenhouse_core.members.member_id`

This link is established through `identity_profile_id` (shared between `client_users` and `members`) or through a direct `member_id` FK on `client_users` when the mapping is explicit.

This is what enables the collaborator-facing experience: the session knows the person is both an auth principal (can log in) and a collaborator (has payroll, leave balances, tool licenses).

### External Client Users

For external client users, there is no collaborator link. They authenticate, get a tenant context, and see only their client-scoped data. Their `tenant_type` is `'client'` and they hold client-facing roles only.

## Role Catalog

### Role Families

Roles are grouped into families that map to the three audiences plus cross-cutting concerns.

#### Family: Client

Roles for external client users accessing their portal experience.

| role_code           | role_name         | Description                                                                       | Route Groups |
| ------------------- | ----------------- | --------------------------------------------------------------------------------- | ------------ |
| `client_executive`  | Client Executive  | CMO/VP-level. Sees executive dashboard, high-level KPIs, team overview.           | `client`     |
| `client_manager`    | Client Manager    | Marketing manager. Deeper operational context, project drilldowns, sprint detail. | `client`     |
| `client_specialist` | Client Specialist | Restricted to specific projects or campaigns. Uses scope filters.                 | `client`     |

#### Family: Collaborator

Roles for Efeonce team members accessing their personal self-service.

| role_code      | role_name   | Description                                                                                                | Route Groups |
| -------------- | ----------- | ---------------------------------------------------------------------------------------------------------- | ------------ |
| `collaborator` | Colaborador | Rol base de toda persona interna de Efeonce. Acceso a permisos, asistencia, nómina, perfil y herramientas. | `my`         |

#### Family: Agency Operations

Roles for Efeonce team members with cross-tenant operational visibility.

| role_code            | role_name       | Description                                                                                                      | Route Groups |
| -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| `efeonce_account`    | Líder de Cuenta | Responde por relaciones con clientes, salud de cuentas y contexto operativo/comercial de sus clientes asignados. | `internal`   |
| `efeonce_operations` | Operaciones     | Visibilidad operativa cross-tenant: capacidad, bloqueos, utilización y backlog de revisión.                      | `internal`   |

#### Family: Domain Operators

Roles for Efeonce team members managing specific internal domains.

| role_code          | role_name                        | Description                                                                                  | Route Groups |
| ------------------ | -------------------------------- | -------------------------------------------------------------------------------------------- | ------------ |
| `hr_manager`       | Gestión HR                       | Administra personas, permisos, asistencia, estructura organizacional y catálogos HR.         | `hr`         |
| `hr_payroll`       | Nómina                           | Procesa períodos, entradas y compensaciones de payroll.                                      | `hr`         |
| `finance_analyst`  | Analista de Finanzas             | Opera ingresos, egresos, conciliación y suppliers; lectura ampliada sobre finanzas.          | `finance`    |
| `finance_admin`    | Administrador de Finanzas        | Acceso completo de escritura financiera, incluyendo cuentas, tipos de cambio y conciliación. | `finance`    |
| `people_viewer`    | Lectura de Personas              | Acceso de lectura a perfiles de colaboradores, assignments y capacidad.                      | `people`     |
| `ai_tooling_admin` | Administrador de Herramientas AI | Gestiona catálogo de herramientas, licencias, wallets y créditos.                            | `ai_tooling` |

#### Family: Platform Admin

| role_code       | role_name          | Description                                                                                                                 | Route Groups |
| --------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `efeonce_admin` | Superadministrador | Universal override. Todos los route groups. Gestión de tenants, usuarios, roles, feature flags y acceso total a Greenhouse. | `*` (all)    |

### Role Composition Examples

Real-world role assignments for typical Efeonce personas:

| Persona                | Assigned Roles                                        | What They See                                                                  |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Julio (founder)        | `collaborator`, `efeonce_admin`                       | Self-service personal + `Superadministrador` con acceso total                  |
| Account Lead           | `collaborator`, `efeonce_account`, `people_viewer`    | Self-service + cuentas + lectura de personas                                   |
| Operations Lead        | `collaborator`, `efeonce_operations`, `people_viewer` | Self-service + operación transversal + lectura de personas                     |
| HR Business Partner    | `collaborator`, `hr_manager`, `hr_payroll`            | Self-service + gestión HR + nómina                                             |
| Finance Lead           | `collaborator`, `finance_admin`                       | Self-service + administración financiera                                       |
| Junior Designer        | `collaborator`                                        | Solo experiencia personal: permisos, asistencia, nómina, perfil y herramientas |
| External CMO (Sky)     | `client_executive`                                    | Client dashboard, projects, team, capabilities for their tenant only           |
| External Marketing Mgr | `client_manager`                                      | Deeper client operational context, sprint drilldowns                           |
| External Coordinator   | `client_specialist`                                   | Scoped to specific projects/campaigns within their tenant                      |

### Default Role Assignment Rules

When a user is created or provisioned:

- External client users: assigned `client_executive` or `client_manager` based on admin decision at onboarding. No default auto-assignment.
- Efeonce internal users (detected by `@efeonce.org` or `@efeoncepro.com` email domain): automatically assigned `collaborator`. Additional roles assigned explicitly by admin.
- SCIM-provisioned users: assigned `collaborator` automatically. Role escalation requires admin action.

## Route Group Model

### Route Group Registry

Route groups are the enforcement boundary. Each route group maps to a set of URL prefixes and requires at least one matching role.

| route_group  | URL Prefixes                                                                                                                      | Required Roles (any of)                                                                                             | Tenant Context        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `client`     | `/home`, `/dashboard`, `/proyectos`, `/sprints`, `/campanas`, `/equipo`, `/settings`                                              | `client_executive`, `client_manager`, `client_specialist`, `efeonce_account`, `efeonce_operations`, `efeonce_admin` | Active tenant         |
| `my`         | `/my/leave`, `/my/attendance`, `/my/expenses`, `/my/tools`, `/my/payroll`, `/my/profile`                                          | `collaborator`, `efeonce_admin`                                                                                     | Home tenant (efeonce) |
| `internal`   | `/home`, `/admin`, `/internal/dashboard`, `/internal/clientes`, `/internal/capacidad`, `/internal/riesgos`, `/internal/kpis`    | `efeonce_account`, `efeonce_operations`, `efeonce_admin`                                                            | Cross-tenant          |
| `hr`         | `/hr/leave`, `/hr/attendance`, `/hr/org-chart`, `/hr/payroll`, `/hr/approvals`, `/hr/hierarchy`, `/hr/departments`                | `hr_manager`, `hr_payroll`, `efeonce_admin`                                                                         | Efeonce tenant        |
| `finance`    | `/finance`, `/finance/income`, `/finance/expenses`, `/finance/suppliers`, `/finance/reconciliation`, `/finance/clients`          | `finance_analyst`, `finance_admin`, `efeonce_admin`                                                                 | Efeonce tenant        |
| `people`     | `/people`, `/people/[memberId]`                                                                                                   | `people_viewer`, `hr_manager`, `efeonce_operations`, `efeonce_admin`                                                | Efeonce tenant        |
| `ai_tooling` | `/ai-tools/catalog`, `/ai-tools/licenses`, `/ai-tools/wallets`, `/ai-tools/ledger`                                                | `ai_tooling_admin`, `efeonce_admin`                                                                                 | Efeonce tenant        |
| `admin`      | `/admin/tenants`, `/admin/users`, `/admin/roles`, `/admin/scopes`, `/admin/feature-flags`                                         | `efeonce_admin`                                                                                                     | Cross-tenant          |

Notes:

- `hr` remains the broad HR route group. It must not be used as a proxy for “has direct reports”.
- Supervisor-limited access is derived at reader/page level from reporting hierarchy and active delegation, not from a dedicated route group or role code.
- `/hr/approvals`, `/hr/team` y `/hr/org-chart` ya existen como surfaces runtime para supervisoría limitada; `HR > Jerarquía` sigue siendo broad HR/admin.

### Enforcement Architecture

#### Server-side guards

Every route group has a layout-level guard that runs server-side:

```
src/app/(dashboard)/my/layout.tsx        → requireRouteGroup('my')
src/app/(dashboard)/hr/layout.tsx        → requireRouteGroup('hr')
src/app/(dashboard)/finance/layout.tsx   → requireRouteGroup('finance')
src/app/(dashboard)/internal/layout.tsx  → requireRouteGroup('internal')
src/app/(dashboard)/admin/layout.tsx     → requireRouteGroup('admin')
```

#### Guard resolution

```typescript
function requireRouteGroup(group: RouteGroup): void {
  const session = getServerSession()
  if (!session) redirect('/login')

  const userRoles = session.roleCodes // string[]
  const allowedRoles = ROUTE_GROUP_ROLES[group] // from registry

  // efeonce_admin bypasses all checks
  if (userRoles.includes('efeonce_admin')) return

  // Check if any user role grants access to this route group
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  if (!hasAccess) redirect('/unauthorized')
}
```

#### API route protection

API routes use the same pattern but return `403` instead of redirecting:

```typescript
function requireApiAccess(group: RouteGroup): void {
  const session = getServerSession()
  if (!session) throw new ApiError(401)

  const userRoles = session.roleCodes
  if (userRoles.includes('efeonce_admin')) return

  const allowedRoles = ROUTE_GROUP_ROLES[group]
  if (!userRoles.some(role => allowedRoles.includes(role))) {
    throw new ApiError(403)
  }
}
```

## Scope Model

### Scope Levels

Beyond roles, some users have further restrictions on what data they can see within their granted route groups.

| scope_level       | Purpose                                                       | Applies To          |
| ----------------- | ------------------------------------------------------------- | ------------------- |
| `tenant_all`      | Can see all data within their tenant. Default for most roles. | All                 |
| `project_subset`  | Can only see specific projects.                               | `client_specialist` |
| `campaign_subset` | Can only see specific campaigns.                              | `client_specialist` |
| `client_subset`   | Can only see specific client tenants.                         | `efeonce_account`   |

### Scope Assignment Tables

Scopes are assigned per user and stored in dedicated assignment tables:

- `greenhouse_core.user_project_scopes` — which projects a user can see
- `greenhouse_core.user_campaign_scopes` — which campaigns a user can see
- `greenhouse_core.user_client_scopes` — which client tenants an operator can see

### Scope Enforcement

Scope enforcement happens at the query layer, not the route guard layer:

- Route guards check role membership (can you access this route group?)
- Query filters check scope membership (which data within that route group can you see?)

Example: an `efeonce_account` user accessing `/internal/clientes` passes the route guard. But the query only returns clients where `client_id IN (user's assigned client scopes)`.

## Permission Sets (TASK-263)

Permission Sets are named, reusable bundles of view codes that act as **Layer 2** in the view access resolution pipeline. They sit between role-based access (Layer 1) and user overrides (Layer 3).

### Resolution Formula

```
AuthorizedViews = Rol(base) ∪ PermissionSets(aditivos) ∪ UserOverrides(excepciones)
```

Permission Sets are **additive only** — they can grant access to additional views but never revoke what a role already grants. Only user overrides (Layer 3) can revoke a specific view.

### Tables

- `greenhouse_core.permission_sets` — named bundles with `set_id`, `set_name`, `view_codes[]`, `is_system`, `section`
- `greenhouse_core.user_permission_set_assignments` — user ↔ set assignments with `expires_at`, `reason`, `assigned_by_user_id`

### System Sets (seeded)

| Set ID | Name | Section | Views |
|--------|------|---------|-------|
| `pset-gestion-financiera` | Gestion Financiera | finanzas | 11 |
| `pset-nomina-completa` | Nomina Completa | equipo | 3 |
| `pset-agencia-ops` | Agencia Operaciones | gestion | 5 |
| `pset-solo-lectura-agencia` | Solo Lectura Agencia | gestion | 3 |
| `pset-admin-plataforma` | Admin Plataforma | administracion | 12 |
| `pset-mi-ficha-completa` | Mi Ficha Completa | mi_ficha | 8 |

System sets are editable in their view codes but not deletable.

### API Endpoints

- `GET/POST /api/admin/views/sets` — list and create
- `GET/PUT/DELETE /api/admin/views/sets/:setId` — detail, update, soft-delete
- `GET/POST /api/admin/views/sets/:setId/users` — list and assign users
- `DELETE /api/admin/views/sets/:setId/users/:userId` — revoke user
- `GET /api/admin/team/roles/:userId/effective-views` — resolved views with source attribution

### Effective Views Source Attribution

Each effective view reports its source: `role`, `role_fallback`, `permission_set`, or `user_override`, with `sourceId` and `sourceName` for traceability.

### Re-login Requirement

`authorizedViews` is resolved at login and stored in the JWT. Changes to Permission Set assignments require the user to re-login to take effect. Future: evaluate TTL-based refresh.

### Audit

Actions logged to `view_access_log`: `grant_set`, `revoke_set`, `create_set`, `update_set`, `delete_set`. Outbox events: `viewAccessSetAssigned`, `viewAccessSetRevoked`.

### Spec

Full spec: `docs/architecture/GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md`

## Supervisor Derivation

For HR workflows (leave approvals), the supervisor is not a role — it is a relationship derived from reporting hierarchy, with compatibility through `greenhouse_core.members.reports_to_member_id`.

Rules:

- When a collaborator submits a leave request, the system resolves authority from `greenhouse_core.reporting_lines` plus any active `approval_delegate`
- The resolved decision is frozen in `greenhouse_hr.workflow_approval_snapshots`
- If the collaborator has no supervisor (top of hierarchy), the first active stage falls back to HR role holders defined by the workflow domain
- A person does not need a `supervisor` role to approve leave — they approve because they are the `reports_to` target of the requester
- HR managers can override or finalize any leave request regardless of the reporting chain
- Session payload keeps `memberId`, but supervisor subtree visibility is still derived on demand from `reporting_lines` / `approval_delegate` instead of being flattened into a broad session role

## Session Payload

The authenticated session must carry enough context to resolve access without additional database lookups on every request.

### Session shape

```typescript
interface GreenhouseSession {
  userId: string // client_users.user_id
  clientId: string // home tenant client_id
  tenantType: 'client' | 'efeonce_internal'
  email: string
  fullName: string
  roleCodes: string[] // all assigned role_codes
  routeGroups: string[] // derived from roleCodes at login
  memberId?: string // if collaborator, link to members.member_id
  identityProfileId?: string // cross-system identity root
  activeClientId?: string // for operators: the Space they're currently viewing
  projectScopes?: string[] // for client_specialist
  campaignScopes?: string[] // for client_specialist
  clientScopes?: string[] // for efeonce_account
  featureFlags?: string[] // tenant-level feature flags
  timezone: string
  portalHomePath: string // where to redirect after login
}
```

### Session resolution at login

1. Authenticate via NextAuth.js (Microsoft SSO, Google SSO, or credentials)
2. Resolve `client_users` record by email or SSO identifier
3. Load all `user_role_assignments` where `active = true` and within `effective_from`/`effective_to`
4. Derive `routeGroups` from `roleCodes` using the route group registry
5. If `tenant_type = 'efeonce_internal'`, attempt to resolve `member_id` from `members` via `identity_profile_id`
6. Load scope assignments if applicable roles are present
7. Load tenant feature flags
8. Determine `portalHomePath` through the centralized portal-home policy (roles + route groups + legacy alias normalization)

#### Auth flow UX states (TASK-130)

Durante la resolución de sesión, la UI pasa por estados explícitos con feedback visual:

- **Steps 1**: `Login.tsx` muestra `LoadingButton` (credenciales) o `CircularProgress` (SSO) + `LinearProgress` global. Todo el formulario se deshabilita (`isAnyLoading`).
- **Step 1 error**: `mapAuthError()` categoriza el error NextAuth y muestra `Alert` con severity diferenciada — `error` para credenciales/acceso, `warning` para red/provider.
- **Steps 2-8**: Tras auth exitosa, `Login.tsx` entra en estado `isTransitioning` — logo + spinner + "Preparando tu espacio de trabajo...". El formulario se oculta.
- **Redirect**: `router.replace('/auth/landing')` redirige a server component que resuelve `portalHomePath`. `auth/landing/loading.tsx` muestra skeleton durante la resolución.

Errores categorizados por NextAuth error code:

| Error code          | Mensaje UX                          | Severity |
| ------------------- | ----------------------------------- | -------- |
| `CredentialsSignin` | Email o contraseña incorrectos      | error    |
| `AccessDenied`      | Cuenta sin acceso al portal         | error    |
| `SessionRequired`   | Sesión expirada                     | error    |
| fetch/network       | No se pudo conectar con el servidor | warning  |
| provider timeout    | Proveedor no respondió              | warning  |

### Portal home path resolution

| Policy key          | Resolution rule                                                            | Home Path     |
| ------------------- | -------------------------------------------------------------------------- | ------------- |
| `hr_workspace`      | `routeGroup = hr` o rol `hr_manager` / `hr_payroll`                        | `/hr/payroll` |
| `finance_workspace` | `routeGroup = finance` o rol `finance_admin` / `finance_analyst`           | `/finance`    |
| `my_workspace`      | `collaborator` puro sin takeover de `efeonce_admin` / `efeonce_operations` | `/my`         |
| `internal_default`  | tenant `efeonce_internal` sin home funcional más específica                 | `/home`       |
| `client_default`    | tenant `client` sin home funcional más específica                           | `/home`       |

Los valores legacy persistidos se reescriben por compatibilidad antes de producir sesión:

| Legacy path           | Normalized path |
| --------------------- | --------------- |
| `/dashboard`          | `/home`         |
| `/internal/dashboard` | `/home`         |
| `/finance/dashboard`  | `/finance`      |
| `/hr/leave`           | `/hr/payroll`   |
| `/my/profile`         | `/my`           |

## Sidebar Composition

The sidebar is built dynamically from the session's `routeGroups`.

### Sidebar sections

Each route group maps to a sidebar section with its own navigation items. Sections only render if the user has the corresponding route group.

| Section           | Route Group  | Nav Items                                                                       |
| ----------------- | ------------ | ------------------------------------------------------------------------------- |
| **Mi Greenhouse** | `my`         | Mi Perfil, Mis Permisos, Mi Asistencia, Mis Gastos, Mis Herramientas, Mi Nómina |
| **Pulse**         | `client`     | Dashboard, Proyectos, Ciclos, Equipo, Campañas                                  |
| **Agencia**       | `internal`   | Pulse Global, Clientes, Capacidad, Riesgos, KPIs                                |
| **Personas**      | `people`     | Directorio, Detalle                                                             |
| **HR**            | `hr`         | Permisos, Asistencia, Organización, Nómina, Aprobaciones                        |
| **Finanzas**      | `finance`    | Dashboard, Ingresos, Egresos, Proveedores, Clientes, Conciliación               |
| **AI & Tools**    | `ai_tooling` | Catálogo, Licencias, Wallets, Consumos                                          |
| **Admin**         | `admin`      | Spaces, Usuarios, Roles, Scopes, Feature Flags                                  |

### Section ordering in sidebar

Fixed order:

1. Mi Greenhouse (personal, always first if present)
2. Pulse (client context)
3. Agencia (cross-tenant)
4. Personas
5. HR
6. Finanzas
7. AI & Tools
8. Admin (always last if present)

## Audit Model

### Audit events

Every permission-relevant action must be logged:

| Event Type              | Logged When                                     |
| ----------------------- | ----------------------------------------------- |
| `role_assigned`         | A role is granted to a user                     |
| `role_revoked`          | A role is removed from a user                   |
| `scope_assigned`        | A project, campaign, or client scope is granted |
| `scope_revoked`         | A scope is removed                              |
| `user_created`          | A new auth principal is created                 |
| `user_deactivated`      | A user is deactivated                           |
| `user_reactivated`      | A user is reactivated                           |
| `login_success`         | Successful authentication                       |
| `login_failed`          | Failed authentication attempt                   |
| `session_impersonation` | An admin enters a client Space context          |

### Audit table

`greenhouse_core.audit_events` stores immutable event records with:

- `event_id` — UUID
- `event_type` — from catalog above
- `actor_user_id` — who performed the action
- `target_user_id` — who was affected (nullable)
- `target_client_id` — which tenant was affected (nullable)
- `metadata` — JSONB with event-specific details
- `ip_address` — request origin
- `created_at` — timestamp

## Migration from Current Model

### Current state

Today the system uses:

- `role` field on `greenhouse.clients` (BigQuery): `'client' | 'operator' | 'admin'`
- `can_view_all_spaces` boolean on the same table
- Route group checks in `authorization.ts` based on these fields
- PostgreSQL `greenhouse_core.client_users`, `greenhouse_core.roles`, `greenhouse_core.user_role_assignments` already exist but contain only seed data

### Migration path

Phase 1: Backfill PostgreSQL role assignments from current BigQuery state

- Every user with `role = 'client'` gets `client_executive` (or `client_manager` based on admin review)
- Every user with `role = 'operator'` gets `collaborator` + `efeonce_account` + `efeonce_operations`
- Every user with `role = 'admin'` gets `collaborator` + `efeonce_admin`
- Efeonce internal users additionally get `collaborator`

Phase 2: Update session resolution

- Session resolution reads roles from PostgreSQL `user_role_assignments` instead of the `role` field
- Derive `routeGroups` from role catalog
- Keep BigQuery `clients.role` as compatibility fallback during transition

Phase 3: Update route guards

- Replace `session.user.role === 'admin'` checks with `session.routeGroups.includes('admin')`
- Replace `session.user.can_view_all_spaces` with `session.routeGroups.includes('internal')`

Phase 4: Remove legacy fields

- Deprecate `role` and `can_view_all_spaces` from `greenhouse.clients`
- All access resolution flows through `user_role_assignments`

## Non-Negotiable Rules

1. No route is ever accessible without an authenticated session.
2. No data is ever returned without tenant-context filtering.
3. `efeonce_admin` is the only universal override. Every other role must be explicitly checked.
4. Roles are stored in `user_role_assignments` with `effective_from`/`effective_to` for temporal validity.
5. Scope enforcement happens at the query layer, not the UI layer. Hiding a sidebar link is not security.
6. Supervisor relationships are derived from org structure, not from role assignments.
7. Audit events are immutable. No DELETE on `audit_events`.
8. Session must not require a database call per request for role checks. Roles are resolved at login and cached in the JWT/session token.
9. External client users can never hold internal roles (`collaborator`, `hr_manager`, `finance_analyst`, etc.).
10. Internal Efeonce users always have `collaborator` as a base role in addition to any domain roles.

## Cross-References

- `GREENHOUSE_OPERATIONAL_ATTRIBUTION_MODEL_V1.md` — modelo canónico de atribución operativa (4 capas: source identity → identity profile → operational actor → attribution role). Este documento define cómo la identidad resuelta por el sistema de identity access se traduce a crédito operativo en Delivery, ICO y Performance Report.

## Operational Note

If a future agent changes:

- the role catalog
- route group assignments
- scope enforcement rules
- session payload shape
- audit event types

They must update:

- this document
- `project_context.md`
- `Handoff.md`
- `changelog.md`
