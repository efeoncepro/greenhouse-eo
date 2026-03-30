# TASK-134 - Notification Identity Model Hardening

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Descubierta`
- Domain: `notifications`

## Summary

Consolidar Greenhouse Notifications sobre un modelo `person-first`, usando `identity_profile` como raíz canónica, `member` como faceta fuerte para HR/Payroll y `client_user` como capacidad de acceso al portal.

## Delta 2026-03-30

- `TASK-141` quedó cerrada como baseline institucional.
- `TASK-141` ya dejó contrato institucional y primer resolver shared en:
  - `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
  - `src/lib/identity/canonical-person.ts`
- El carril de notifications ya adoptó ese resolver en slices base:
  - `src/lib/notifications/person-recipient-resolver.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
- El remanente de esta task ya no es “definir persona/member/user”, sino endurecer Notifications como sistema transversal sobre ese contrato preservando inbox/preferences `userId`-scoped.

## Why This Task Exists

Durante el cierre real de `TASK-117` y el hardening de `TASK-129` apareció un drift estructural:

- algunas rutas resolvían recipients desde `member`
- otras desde `client_user`
- la capa de inbox/preferencias vive por `user_id`, lo que está bien para portal access, pero no como identidad humana raíz

Ese drift hace que una persona válida pueda quedar fuera de una notificación si el vínculo a `client_user` no está completo, aunque la persona exista canónicamente en `identity_profiles` y/o `members`.

## Goal

- dejar explícito el contrato canónico del sistema de notificaciones
- centralizar recipient resolution en una sola capa `person-first`
- mantener compatibilidad con inbox/preferences `userId`-scoped
- hacer que `email-only` sea fallback institucional y no excepción ad hoc

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-117` - payroll auto-calculation + payroll ops notifications
- `TASK-129` - webhook notifications via outbound bus

### Impacts to

- `src/lib/notifications/*`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/webhooks/consumers/notification-recipients.ts`
- `/notifications`
- preferencias y dedupe de recipients `email-only`

### Files owned

- `src/lib/notifications/person-recipient-resolver.ts`
- `src/lib/notifications/notification-service.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/webhooks/consumers/notification-recipients.ts`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

## Current Repo State

### Ya existe

- resolver compartido `person-first`
- compatibilidad con `identityProfileId`, `memberId`, `userId` y `email-only`
- `TASK-117` y `TASK-129` ya consumen el patrón nuevo en las rutas críticas

### Gap actual

- inbox y preferencias siguen user-scoped por diseño
- falta cerrar la política institucional completa de cómo evoluciona Notifications como sistema transversal

## Acceptance Criteria

- [ ] contrato de recipient `person-first` documentado e institucionalizado
- [ ] callers nuevos no nacen `client_user-first`
- [ ] el sistema distingue claramente identidad humana vs capacidad portal
- [ ] quedan claros los límites de lo que seguirá siendo `userId`-scoped
