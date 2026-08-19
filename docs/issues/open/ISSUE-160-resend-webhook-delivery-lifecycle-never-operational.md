# ISSUE-160 — Resend despacha correos, pero Greenhouse nunca captura su lifecycle de entrega

## Ambiente

Producción (Resend + Vercel + `greenhouse_notifications`).

## Detectado

2026-08-18, durante la investigación de candidatos con tests marcados como enviados que no recibieron correo.

## Síntoma

`email_deliveries.status='sent'` se presenta como envío exitoso, pero Greenhouse no puede distinguir aceptación de la API, entrega al servidor del destinatario, rebote, demora, fallo o supresión. Hiring tampoco puede basar una recuperación de test en evidencia de entrega.

## Causa raíz

El handler `POST /api/webhooks/resend` existe desde TASK-269, pero nunca se registró un webhook en la cuenta de Resend ni se provisionó su secreto de firma en producción. La API de Resend lista cero webhooks. El handler además resuelve el secreto de forma síncrona aunque el secreto por referencia se carga asíncronamente; un cold start podría reconocerlo como ausente y responder `200 ignored`, eliminando el retry del proveedor.

## Impacto

- 426 entregas históricas; 393 tienen `resend_id`, pero ninguna tiene `delivered_at`, `bounced_at` o `complained_at`.
- `greenhouse_notifications.email_engagement` está vacío, incluido el marcador de deduplicación por `svix-id`.
- Los operadores no pueden confirmar que un test llegó ni recuperar de forma segura el acceso de una candidata que no recibió el correo.

## Solución

Ejecutar TASK-1745 para reparar el handler, registrar el webhook firmado y reconciliar estado reciente; ejecutar TASK-1746 y TASK-1747 para la recuperación gobernada de acceso al test y su superficie operativa.

## Verificación

- El dashboard/API de Resend muestra un webhook habilitado para el endpoint productivo y los eventos declarados.
- Un correo de smoke genera un evento firmado, un único registro deduplicado y la transición correcta de `email_deliveries`.
- La reconciliación deja explícito qué entregas históricas siguen sin confirmación; no inventa `delivered`.

## Estado

open

## Relacionado

- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `TASK-269`, `TASK-1689`, `TASK-1719`, `TASK-1745`, `TASK-1746`, `TASK-1747`
