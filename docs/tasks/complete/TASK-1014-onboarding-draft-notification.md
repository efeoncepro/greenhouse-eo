# TASK-1014 — Notificación (in-app + email) al abrirse un onboarding draft por deal-trigger

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (push proactivo: un caso draft del deal-trigger ya no depende solo de que alguien mire el inbox)
- Effort: `Bajo`
- Type: `implementation` (notificación reactiva sobre infra canónica existente)
- Epic: `EPIC-CLIENT-360`
- Domain: `commercial|notifications`
- Derived from: `TASK-1013` (Slice 4 diferido) · `TASK-1010` (deal-trigger) · `TASK-992` (lifecycle)
- Creada/Completada: 2026-06-05 (local-first en `develop`)

## Summary

TASK-1013 hizo los casos de onboarding **encontrables** (cockpit + discoverability cruzada — el "pull"). Esta task agrega el **"push"**: cuando el deal-trigger (TASK-1010) abre un caso de onboarding en **borrador** (deal HubSpot closed-won), Greenhouse notifica a los operadores **in-app + email** para que no se quede esperando activación sin que nadie lo sepa.

Sin migración, sin endpoint nuevo, sin flag nuevo: **100% reuso del sistema de notificaciones canónico** (`NotificationService` + `notificationProjection` reactiva + categorías + template de email genérico `notification`).

## Implementation

- **Nueva categoría** `client_onboarding_draft` (`src/config/notification-categories.ts` + copy en `src/lib/copy/dictionaries/es-CL/emails.ts` + union `NotificationCategoryCopyCode`): `audience: 'internal'`, `defaultChannels: ['in_app', 'email']`, `priority: 'high'`, icon `tabler-rocket`. Label "Onboarding por activar".
- **Handler reactivo** en `notificationProjection` (`src/lib/sync/projections/notifications.ts`) para el evento `client.lifecycle.case.opened` (ya emitido por `provisionClientLifecycle` en la misma tx, solo en creación real — no en re-run idempotente):
  - **Re-lee el caso** vía `getActiveCaseForOrganization` (TASK-771: nunca confía el payload).
  - **Filtra**: solo `triggerSource === 'hubspot_deal' && status === 'draft'`. Casos manuales/wizard (el operador ya está en el flujo) o ya activados → skip honesto.
  - **Idempotencia**: dedup por `metadata->>'eventId'` per-recipient (mirror del handler `payroll_period.calculated`) + el reactive consumer ya garantiza at-most-once por `(event_id, handler)`.
  - **Dispatch**: title "Onboarding por activar: {org}", body + `actionUrl: /agency/clients/{orgId}/lifecycle` (donde se activa).
- **Destinatarios** (decisión del operador): `efeonce_admin + efeonce_account + efeonce_operations + finance_admin` (resolver `getOnboardingDraftRecipients`, role-based vía `getRoleCodeNotificationRecipients`).

## Cadena async (canónica)

```text
deal HubSpot closed-won → webhook (hubspot-deals.ts) → provisionClientLifecycle(draft)
  → outbox event client.lifecycle.case.opened (misma tx)
    → outbox publisher (Cloud Scheduler) → published
      → reactive consumer → notificationProjection (re-lee caso, filtra deal-draft)
        → NotificationService.dispatch (in_app + email, idempotente)
```

## Verificación

- Gates: tsc 0 · eslint 0. Tests focales: `notification-categories.test.ts` (pin del registry extendido: 14 categorías) + 2 tests nuevos en `notifications.test.ts` (deal-draft → dispatch; manual/no-draft → skip). Suite focal verde.
- Runtime: la cadena requiere `CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED` (ON en prod desde TASK-1010) + el outbox publisher + reactive consumer (Cloud Scheduler, ya corriendo). Se verifica en vivo con el primer deal real closed-won.

## Out of Scope

- Teams (la decisión fue in-app + email).
- Notificación en otras transiciones del caso (activado/bloqueado/completado) — el operador ya está en el flujo; se puede agregar como categorías derivadas si emerge necesidad.
