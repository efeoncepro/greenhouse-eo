# TASK-1012 — Invitación al portal: URL de activación cross-env + sync de estado de entrega (Resend)

> **Lifecycle:** to-do
> **Type:** implementation
> **Priority:** P2
> **Effort:** Bajo
> **Branch:** `task/TASK-1012-invite-activation-cross-env-url-and-delivery-status`
> **Epic:** EPIC-CLIENT-360 (follow-up de TASK-1010 / ISSUE-084)
> **Creada:** 2026-06-04 (durante verificación e2e de TASK-1010)

## Summary

Dos gaps de robustez detectados al verificar end-to-end la invitación al portal cliente (post-fix ISSUE-084):

1. **Link de activación cross-environment (P2, bloquea testear activación en staging).** El email de invitación arma la URL con `NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'` ([invite-client-portal-user.ts:165](../../src/lib/client-onboarding/invite-client-portal-user.ts#L165)). En **staging** la env var no apunta a staging → el link manda al usuario a **producción**. El token JWT se firmó con el `NEXTAUTH_SECRET` de staging; producción lo verifica con su propio secret → `jwtVerify` falla en `validateToken` → `valid:false` → la pantalla muestra "Este enlace de invitación ya fue usado o ha expirado", aunque la fila del token **sí existe** en la DB compartida (Cloud SQL es único para staging+prod) y `used=false`/no expirado.
2. **El estado de entrega de Resend no se sincroniza a `email_deliveries` (P3, observabilidad).** Verificado live: un correo que rebotó (`creative@efeoncepro.com`) quedó con `status='sent'` en `greenhouse_notifications.email_deliveries`; el `last_event='bounced'` solo se ve consultando la API de Resend. Greenhouse no "ve" bounces/delivered → no hay alerta cuando una invitación rebota.

**No es bug de lógica del flujo** — la invitación funciona correctamente en producción (URL=prod, firmado por secret de prod, misma DB). El gap #1 es de configuración/robustez cross-env; el #2 es de observabilidad de entrega.

## Why

- **#1:** imposible verificar la activación end-to-end desde staging (el único path de QA pre-release). Además, si algún día `NEXT_PUBLIC_APP_URL` queda mal seteado en prod, todas las invitaciones romperían silenciosamente. La robustez exige que el link apunte SIEMPRE al entorno que firmó el token.
- **#2:** una invitación que rebota (typo, buzón inexistente) queda invisible; el operador cree que "se envió" cuando nunca llegó. Sin telemetría de bounce no hay forma de detectarlo salvo que el invitado reclame.

## Goal

1. El email de invitación apunta SIEMPRE al entorno que firmó el token (staging→staging, prod→prod), de forma robusta y no dependiente de que un humano setee bien una env var.
2. El estado real de entrega de Resend (`delivered`/`bounced`/`complained`) se refleja en `greenhouse_notifications.email_deliveries` y es observable (signal/alerta cuando una invitación rebota).

## Current Repo State

**Ya existe:**
- `src/lib/client-onboarding/invite-client-portal-user.ts` — helper SSOT (fix ISSUE-084 aplicado). Línea 165 arma `inviteUrl`.
- `src/lib/auth-tokens.ts` — `generateToken` (JWT HS256, firma con `getSecretKey()` ← `NEXTAUTH_SECRET`) + `validateToken` (`jwtVerify` + DB check `used=false AND expires_at>now()`).
- `src/app/(blank-layout-pages)/auth/accept-invite/page.tsx` — valida on-load vía POST `/api/account/validate-token` (no consume; consume en submit).
- `src/app/api/account/validate-token/route.ts` + `accept-invite/route.ts`.
- `greenhouse_notifications.email_deliveries` — tabla con `resend_id`, `status`, `bounced_at`. El `status` se setea a `sent` al despachar y **no se actualiza** con eventos posteriores.
- Resend API expone `GET /emails/{id}` con `last_event`; Resend soporta **webhooks** de `email.delivered`/`email.bounced`/`email.complained`.

**Gap:**
- `inviteUrl` depende de una env var que en staging no apunta a staging → cross-env JWT verify failure.
- No hay endpoint/handler que reciba los webhooks de Resend ni que reconcilie `email_deliveries.status` contra el estado real.

## Scope (slices)

### Slice 1 — URL de activación robusta (P2)
Opciones (elegir la más robusta; **preferida: derivar del origin del request + fallback a env var por entorno**):
- **A (preferida):** derivar el base URL del `request` (header `origin`/`host`) cuando la invitación se dispara desde una request HTTP (`/api/admin/invite`, onboarding). Para paths sin request (crons, workers) usar `NEXT_PUBLIC_APP_URL`. Garantiza que el link apunte al entorno que está sirviendo (= el que firmó el token, mismo secret).
- **B (complemento):** setear `NEXT_PUBLIC_APP_URL` por entorno en Vercel (staging→`https://dev-greenhouse.efeoncepro.com`, prod→`https://greenhouse.efeoncepro.com`). Defensa en profundidad; no resuelve el path-sin-request por sí solo pero cubre el fallback.
- **C (evaluar):** firmar los tokens transaccionales con un secret dedicado (`GREENHOUSE_TOKEN_SECRET`) compartido entre entornos, independiente de `NEXTAUTH_SECRET` (que debe seguir aislado por entorno para sesiones). Haría los tokens portables cross-env — pero introduce un secret nuevo + no resuelve que el link debe apuntar al entorno correcto igual. Documentar pros/cons; probablemente NO en V1.

Decisión recomendada: **A + B**. No C (no agrega valor neto sobre A para este caso y suma superficie de secret).

### Slice 2 — Sync de estado de entrega Resend → `email_deliveries` (P3)
- Endpoint webhook `/api/webhooks/resend` (HMAC verify con signing secret de Resend) que recibe `email.delivered`/`email.bounced`/`email.complained` y actualiza `email_deliveries.status` + `bounced_at` por `resend_id`.
- Reliability signal `notifications.email.invite_bounce` (kind=data_quality, severity=warning si >0 en ventana, steady=0) sobre invitaciones con `status='bounced'`.
- (Alternativa más simple si no se quiere webhook: cron de reconciliación que consulta `GET /emails/{id}` para los `sent` recientes y actualiza el status. Menos óptimo — preferir webhook.)

## Out of Scope
- Reescribir el flujo de tokens/JWT (solo el base-URL + el secret si se elige C).
- Cambiar el diseño de la pantalla `accept-invite` (funciona; el mensaje "expirado" es correcto dado el input).
- Bounce handling de otros emails transaccionales fuera de invitaciones (el webhook puede cubrirlos, pero el signal se acota a invitaciones en V1).

## Acceptance Criteria
- [ ] Una invitación disparada desde staging genera un link a la URL de staging; el usuario puede activar (set password) y queda `auth_mode='credentials'`/`status='active'` — verificado e2e en staging.
- [ ] Una invitación en prod sigue apuntando a prod (no regresión).
- [ ] Path sin request (si aplica) usa `NEXT_PUBLIC_APP_URL` correcto por entorno.
- [ ] Un bounce de Resend deja `email_deliveries.status='bounced'` + `bounced_at` seteado, y el signal lo refleja.
- [ ] Tests: guard de que `inviteUrl` se deriva del origin cuando hay request; unit del handler de webhook Resend (delivered/bounced/complained).

## Rollout Plan & Risk Matrix
- **Riesgo:** bajo. Slice 1 es additive (cambia cómo se computa una URL). Slice 2 es un endpoint nuevo + columna ya existente.
- **Flags/cutover:** no requiere flag. El webhook de Resend requiere registrar el endpoint en el dashboard de Resend (out-of-band, documentar).
- **Rollback:** revert PR + redeploy. El webhook se desregistra en Resend si hace falta.
- **Verificación en prod:** tras release, invitar a un email de prueba real y confirmar link→prod + activación; confirmar que un bounce sintético actualiza el status.
- **Coordinación out-of-band:** (a) setear `NEXT_PUBLIC_APP_URL` en Vercel staging; (b) registrar webhook + obtener signing secret en Resend → GCP Secret Manager.

## Follow-ups
- Considerar unificar el patrón de base-URL en TODOS los emails transaccionales (no solo invitación) si comparten el mismo hardcode de dominio.
