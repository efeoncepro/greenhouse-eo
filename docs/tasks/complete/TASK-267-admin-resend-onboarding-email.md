# TASK-267 — Reenviar email de onboarding desde ficha de usuario

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `identity`, `admin`, `email`
- Blocked by: `none`
- Branch: `task/TASK-267-admin-resend-onboarding-email`
- Legacy ID: —
- GitHub Issue: —

## Summary

El boton "Reenviar onboarding" en la ficha de usuario de Admin (`/admin/users/[id]`) es un placeholder sin funcionalidad. Necesita un endpoint backend que reenvie el email de invitacion/onboarding al usuario, regenerando el link de setup si expiro, y un handler frontend que lo invoque con feedback visual.

## Why This Task Exists

El boton existe en la UI (`UserDetailHeader.tsx`) sin `onClick` — al hacer click no pasa nada. Cuando un admin necesita reenviar la invitacion a un usuario con status `invited` que no ha completado su setup (password reset pending), tiene que hacerlo manualmente fuera del portal. Esto es friction operativo para onboarding de nuevos colaboradores y clientes.

## Goal

- El admin puede reenviar el email de onboarding desde la ficha del usuario con un click
- El sistema valida que el usuario esta en estado elegible para reenvio (invited, password reset pending)
- El email usa el template de onboarding existente del sistema de email delivery (Resend + react-email)
- Feedback visual: toast de exito o error despues de la operacion
- Registro en audit log

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — ciclo de vida del usuario, estados
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — email delivery via Resend

Reglas obligatorias:

- Requiere `requireAdminTenantContext()` — solo admin puede reenviar
- Registrar accion en audit trail
- No reenviar a usuarios que ya estan `active` — solo `invited` o con password reset pending

## Normative Docs

- `src/views/greenhouse/admin/users/UserDetailHeader.tsx` — boton placeholder actual (linea ~92)
- `src/app/api/admin/email-deliveries/` — patron existente de email delivery
- `src/lib/email/` — templates de email existentes [verificar]

## Dependencies & Impact

### Depends on

- Sistema de email delivery (Resend) ya operativo
- Template de email de onboarding [verificar si existe o hay que crearlo]
- `UserDetailHeader.tsx` con boton placeholder

### Blocks / Impacts

- UX de onboarding de nuevos usuarios
- Flujo de re-invitacion cuando un link expira

### Files owned

- `src/app/api/admin/users/[id]/resend-onboarding/route.ts` — endpoint (NUEVO)
- `src/views/greenhouse/admin/users/UserDetailHeader.tsx` — cablear onClick

## Current Repo State

### Already exists

- `UserDetailHeader.tsx` con boton "Reenviar onboarding" sin onClick
- Sistema de email delivery con Resend
- `requireAdminTenantContext()` para auth guard
- Patron de audit trail en `view_access_log` y outbox

### Gap

- No existe endpoint para reenviar onboarding
- No hay onClick cableado en el boton
- Template de email de onboarding [verificar si existe]
- No hay validacion de estado elegible para reenvio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — API endpoint POST /api/admin/users/:userId/resend-onboarding

- Auth: `requireAdminTenantContext()`
- Validar que el usuario existe y esta en estado elegible (`invited`, `password_reset_pending`)
- Regenerar token/link de setup si expiro
- Enviar email via Resend con template de onboarding
- Registrar en audit trail
- Retornar `{ sent: true }` o error con razon

### Slice 2 — Cablear boton en UserDetailHeader

- Agregar onClick que llame al endpoint
- Loading state mientras se envia
- Toast de exito: "Email de onboarding reenviado."
- Toast de error si el usuario no es elegible o falla el envio
- Deshabilitar boton si el usuario ya esta `active`

## Out of Scope

- Crear nuevos templates de email (usar existente)
- Flujo de self-service para el usuario (reset password desde login)
- Bulk resend (reenviar a multiples usuarios a la vez)
- Tracking de apertura/click del email

## Acceptance Criteria

- [ ] El boton "Reenviar onboarding" envia el email al usuario con status `invited`
- [ ] El boton esta deshabilitado para usuarios con status `active`
- [ ] Toast de exito despues de envio exitoso
- [ ] Toast de error con razon si el envio falla o el usuario no es elegible
- [ ] La operacion queda registrada en audit trail
- [ ] `pnpm build`, `pnpm lint` pasan sin errores

## Verification

- `pnpm build`
- `pnpm lint`
- Verificacion manual: reenviar onboarding a un usuario invited, verificar que el email llega

## Closing Protocol

- [ ] Verificar que el boton funciona en staging
- [ ] Actualizar `docs/documentation/admin-center/` si corresponde

## Follow-ups

- Bulk resend desde la tabla de usuarios (seleccionar multiples y reenviar)
- Tracking de delivery del email de onboarding
- Auto-resend despues de X dias sin activacion
