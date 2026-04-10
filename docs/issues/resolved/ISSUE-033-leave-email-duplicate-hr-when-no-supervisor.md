# ISSUE-033 — Emails duplicados a HR cuando solicitud de permiso salta etapa de supervisor

## Ambiente

production + staging

## Detectado

2026-04-09, auditoria de codigo del flujo de emails de permisos

## Sintoma

Cuando un colaborador crea una solicitud de permiso sin supervisor asignado (va directo a `pending_hr`), los revisores HR reciben **2 emails identicos** de tipo `leave_request_pending_review` y **2 notificaciones in-app** por la misma solicitud.

## Causa raiz

En `src/lib/hr-core/postgres-leave-store.ts:1660-1674`, la creacion de una solicitud sin supervisor publica dos eventos al outbox:

1. `leave_request.created` — siempre se publica
2. `leave_request.escalated_to_hr` — se publica adicionalmente si `status === 'pending_hr'`

El handler de notificaciones en `src/lib/sync/projections/notifications.ts` procesa ambos eventos de forma independiente:

- **`leave_request.created` (linea 253-257):** cuando no hay `supervisorMemberId`, resuelve `getHrReviewRecipients()` como fallback y les envia email + notificacion in-app.
- **`leave_request.escalated_to_hr` (linea 338):** tambien llama `getHrReviewRecipients()` y envia email + notificacion in-app a los mismos destinatarios.

La deduplicacion del reactive log (`outbox_reactive_log`) no protege contra esto porque son **dos event_ids distintos** con **handler keys distintos** (`notification_dispatch:leave_request.created` vs `notification_dispatch:leave_request.escalated_to_hr`).

El flujo normal con supervisor no tiene el problema porque `created` notifica al supervisor y `escalated_to_hr` notifica a HR — destinatarios distintos.

## Impacto

- **HR reviewers** reciben el doble de emails y notificaciones por cada solicitud sin supervisor
- Genera ruido operativo y reduce la confianza en las notificaciones del sistema
- La tabla `email_deliveries` registra envios duplicados, inflando metricas
- Afecta a todo leave type que no asigne supervisor en la creacion

## Solucion

En el handler de `leave_request.created`, cuando no hay `supervisorMemberId`, NO enviar emails ni notificaciones a HR. Dejar que el evento `leave_request.escalated_to_hr` (que siempre se publica cuando `status === 'pending_hr'`) sea el unico responsable de notificar a HR.

## Verificacion

1. Crear solicitud de permiso sin supervisor asignado
2. Verificar que HR recibe exactamente 1 email `leave_request_pending_review` y 1 notificacion in-app
3. Verificar que el solicitante sigue recibiendo su email de confirmacion normalmente
4. Verificar que el flujo con supervisor (created → supervisor notificado → escalated → HR notificado) sigue intacto

## Estado

resolved — 2026-04-09

## Relacionado

- `src/lib/hr-core/postgres-leave-store.ts` — publicacion de eventos outbox
- `src/lib/sync/projections/notifications.ts` — handlers de `leave_request.created` y `leave_request.escalated_to_hr`
- `src/lib/sync/reactive-consumer.ts` — procesamiento de eventos y deduplicacion
- `services/ops-worker/` — Cloud Run worker que procesa el outbox
