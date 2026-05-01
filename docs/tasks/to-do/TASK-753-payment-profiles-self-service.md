# TASK-753 — Payment Profiles Self-Service (Mi cuenta de pago + Notificaciones)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-749`, `TASK-716` (Notification Hub)
- Branch: `task/TASK-753-payment-profiles-self-service`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilita que el colaborador consulte y solicite cambios sobre su propio
perfil de pago desde su Greenhouse personal. Reduce tickets a finance y
automatiza la notificación al beneficiario cuando su perfil cambia
(creación, aprobación, supersede, cancelación).

## Why This Task Exists

Hoy un colaborador no tiene visibilidad de cómo se le paga. Si quiere
cambiar de banco o verificar que su cuenta sigue activa, abre un ticket
manual a finance. Tampoco recibe confirmación cuando finance modifica su
perfil — entera del cambio cuando el pago llega (o no llega) a otra
cuenta.

Self-service no significa que el colaborador apruebe su propio cambio —
significa que solicita el cambio (entra como `pending_approval`), finance
aprueba con maker-checker, y se le notifica con datos enmascarados.

## Goal

- Vista "Mi cuenta de pago" en Greenhouse personal del colaborador (read-only del activo + solicitar cambio)
- Notificación email al beneficiario cuando su perfil cambia (vía Notification Hub TASK-716)
- Solicitudes del colaborador entran como `pending_approval` con `created_by=member.userId`

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md` (cuando exista, dependencia TASK-716)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- El colaborador NUNCA puede aprobar su propio perfil — el endpoint debe rechazar si `request.user.memberId == profile.beneficiaryId`.
- Notificaciones siempre con datos enmascarados; nunca enviar `account_number_full` por email.
- Audit log debe distinguir `created_by_member` vs `created_by_admin`.
- La vista personal NO debe mostrar perfiles de otras personas (scope estricto al `memberId` del session).

## Dependencies & Impact

### Depends on

- `TASK-749` (V1 dual-surface)
- `TASK-716` (Notification Hub email transport)

### Blocks / Impacts

- Reduce carga operativa de finance team
- Habilita compliance con el principio de "el beneficiario sabe cuál es su cuenta de pago"

### Files owned

- `src/app/(dashboard)/me/payment-profile/page.tsx`
- `src/views/greenhouse/me/MyPaymentProfileView.tsx`
- `src/lib/finance/beneficiary-payment-profiles/notify-beneficiary.ts`
- `src/lib/sync/projections/payment-profile-notifications.ts`

## Scope

### Slice 1 — Vista "Mi cuenta de pago"

- Page route `/me/payment-profile` con guard `requireTenantContext` (no necesita finance role).
- View muestra perfiles del session user (`beneficiaryType=member, beneficiaryId=session.memberId`) en read-only enmascarado.
- Botón "Solicitar cambio" abre dialog que envía POST con `created_by=memberId` y entra como `pending_approval`.
- Endpoint backend valida que el caller solo crea perfiles para `beneficiaryId == session.memberId`.

### Slice 2 — Notificación al beneficiario

- Projection consumer en `src/lib/sync/projections/payment-profile-notifications.ts` que escucha:
  - `finance.beneficiary_payment_profile.created`
  - `finance.beneficiary_payment_profile.approved`
  - `finance.beneficiary_payment_profile.superseded`
  - `finance.beneficiary_payment_profile.cancelled`
- Para cada evento, lookup del email del beneficiario (member.publicEmail o identityProfile.email) y envío vía Notification Hub TASK-716.
- Template email en español tuteo con datos enmascarados (provider, método, `•••• 1234`, fecha de cambio, motivo si aplica).

### Slice 3 — Compliance audit

- Diferencia `created_by_member` vs `created_by_admin` en audit log via flag `metadata_json.requested_by='member'`.
- Surface ops queue muestra badge "Solicitado por colaborador" para esos pendings.

## Out of Scope

- Verificación de cuenta con micro-deposits (queda en TASK-754)
- Vault externo (TASK-754)
- Edición avanzada del colaborador (V1: solo solicitar cambio simple, no editar campos heredados)

## Acceptance Criteria

- [ ] Colaborador entra a `/me/payment-profile` y ve su perfil activo enmascarado
- [ ] Colaborador solicita cambio → entra como `pending_approval` con flag `requested_by_member`
- [ ] Email se envía al beneficiario al aprobar/cancelar/supersede su perfil
- [ ] Endpoint rechaza intentos de crear perfiles para otro `memberId`

## Verification

- `pnpm vitest run src/views/greenhouse/me src/lib/sync/projections/payment-profile-notifications`
- `pnpm exec eslint src/app/\\(dashboard\\)/me src/views/greenhouse/me`
- Smoke: login como colaborador → ver propio perfil → solicitar cambio → admin aprueba → recibir email

## Closing Protocol

- [ ] `Lifecycle` sincronizado, archivo movido, README, Handoff, changelog
- [ ] Chequeo cruzado con TASK-716 cuando esté listo
