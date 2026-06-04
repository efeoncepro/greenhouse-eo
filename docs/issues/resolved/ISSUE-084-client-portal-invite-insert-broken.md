# ISSUE-084 — Invitación al portal cliente rota (INSERT client_users sin user_id + auth_mode inválido)

> **Estado:** Resuelto
> **Ambiente:** producción + staging + local (latente desde antes de TASK-1001)
> **Detectado:** 2026-06-04 (durante verificación e2e de TASK-1010)
> **Resuelto:** 2026-06-04
> **Severidad:** Alta (el flujo de invitación al portal estaba 100% roto — ninguna invitación podía crearse)

## Síntoma

`inviteClientPortalUser` (helper SSOT de invitación, usado por el onboarding TASK-1001 **y** por `/api/admin/invite`) falla al crear un usuario nuevo:

```
error: null value in column "user_id" of relation "client_users" violates not-null constraint
```

Detectado al correr la verificación e2e real de la invitación (con `creative@efeoncepro.com`) — nunca se había ejercido contra la DB real (los unit tests mockean `client.query`).

## Causa raíz

El INSERT a `greenhouse_core.client_users` tenía **dos defectos**, ambos contra el schema actual:

1. **No proveía `user_id`** — la columna es `NOT NULL` sin default (patrón canónico: generar `randomUUID()`, como hace SCIM provisioning). El INSERT solo daba `(email, full_name, client_id, status, auth_mode, created_at)`.
2. **`auth_mode='credentials'`** — el CHECK `client_users_auth_mode_invariant` (TASK-742) exige `credentials ⇒ password_hash IS NOT NULL`. Un invitado fresco no tiene password → el CHECK rechaza la fila (fallaría incluso tras arreglar #1).

Además, el flujo de **activación** (`accept-invite`) seteaba `password_hash` + `status='active'` pero **no transicionaba `auth_mode`** — dejándolo incompleto: una fila `auth_mode='invited'` con password seteado violaría el CHECK (`invited ⇒ password_hash IS NULL`).

**Por qué quedó latente:** el INSERT pre-data TASK-1001 (venía del `/api/admin/invite` original, commit `f560721ad`/`376ca1752`). El CHECK `client_users_auth_mode_invariant` se agregó **después** (TASK-742, ~2026-04-30) + la columna `user_id` quedó NOT NULL sin default. Los unit tests mockean la DB → nunca ejercieron el INSERT real contra el schema (mismo patrón que ISSUE-071: queries con constraints deben probarse contra PG real).

## Impacto

- **Invitación al portal cliente (onboarding TASK-1001/1010) + `/api/admin/invite`: 100% rotos** para usuarios nuevos. Ninguna persona del portal podía ser invitada.
- No había detección (ningún test e2e/integración cubría el path real).

## Solución (robusta, lifecycle completo — no parche)

1. **`inviteClientPortalUser`** (`src/lib/client-onboarding/invite-client-portal-user.ts`): genera `user_id = randomUUID()` (canónico, como SCIM) + INSERT con `auth_mode='invited'` (CHECK-válido: password_hash NULL). `tenant_type` usa su default `'client'` (correcto para portal users).
2. **`accept-invite`** (`src/app/api/account/accept-invite/route.ts`): al setear `password_hash`, transiciona `auth_mode = CASE WHEN microsoft_oid IS NOT NULL THEN 'both' ELSE 'credentials' END` — CHECK-válido post-activación (ambos exigen password_hash NOT NULL, que se está seteando). Maneja también el caso SSO-linked.
3. **Guard de regresión** (`invite-client-portal-user.test.ts`): asserta que el INSERT incluye `user_id` + `auth_mode='invited'` (no `'credentials'`).

## Verificación

E2E contra DB real (throwaway, cleanup 100%):
- Invite → `created:true`, `user_id` generado, `auth_mode='invited'`, `password_hash=null`, `tenant_type='client'`, rol `client_manager` asignado, `emailSent:true` (Resend). ✅ CHECK ok.
- Activación (mismo UPDATE que accept-invite) → `auth_mode='credentials'`, `status='active'`, password seteado → CHECK cumplido. ✅
- Unit suite `invite-client-portal-user.test` 8/8 (incl. guard de regresión).

## Lección

Helper extraído + cerrado (TASK-1001) sin ejercerlo contra la DB real → el bug de schema-contract (NOT NULL + CHECK) pasó los unit tests mockeados. Reafirma la regla ISSUE-071: SQL embebido con constraints se prueba contra PG real antes de declarar listo.
