# ISSUE-050 — Staging salta correos de permisos porque el runtime reactivo no tiene Resend configurado

## Ambiente

staging (`dev-greenhouse.efeoncepro.com`) + runtime reactivo de notifications/email

## Detectado

2026-04-15, investigación manual tras reporte de solicitud de permiso médico de Daniela Ferreira.

## Síntoma

Al crear una solicitud de permiso en staging:

- la notificación in-app sí puede aparecer al revisor
- pero los correos transaccionales asociados al flujo (`leave_request_submitted`, `leave_request_pending_review`) no salen

Desde la UI parece que "no llegó el correo", aunque la solicitud y el evento sí existan.

## Causa raíz

La lógica de permisos sí publicó el evento canónico y la proyección de notificaciones sí corrió:

- `leave_request.created` existe en eventos recientes de operaciones para `leave-f7b4f48c-cea0-4c0a-89ee-fb4152a8344c`
- Julio Reyes sí tiene una notificación in-app `leave_review` para esa solicitud

El problema está en el canal email del runtime que procesa la proyección reactiva. Evidencia concreta en staging:

- `leave_request_submitted` para `dferreira@efeoncepro.com` quedó `status = skipped`
- `leave_request_pending_review` para `jreyes@efeoncepro.com` quedó `status = skipped`
- ambos con `errorMessage = "RESEND_API_KEY is not configured."`

Esto indica drift de configuración entre el portal staging y el runtime que procesa correos reactivos (`ops-worker` / runtime reactivo), no un fallo de negocio del flujo HR.

La causa estructural confirmada es mixta:

- `src/lib/resend.ts` resolvía Resend solo desde `process.env.RESEND_API_KEY`
- `services/ops-worker/deploy.sh` no propagaba ningún contrato explícito para email (`RESEND_API_KEY` / `RESEND_API_KEY_SECRET_REF` ni `EMAIL_FROM`)

Resultado: el portal web podía tener Resend configurado y aun así el worker reactivo quedarse sin credencial efectiva.

## Impacto

- Los usuarios pueden creer que la solicitud no notificó a nadie.
- Se pierde confirmación por correo al solicitante.
- El revisor puede depender solo del in-app, lo que vuelve el flujo inconsistente.
- El problema puede afectar otros correos reactivos del mismo runtime, no solo HR Leave.

## Solución

Remediación robusta esperada:

1. alinear la capa canónica de Resend para que resuelva `RESEND_API_KEY` vía `Secret Manager -> env fallback`
2. alinear el deploy de `ops-worker` para que consuma `RESEND_API_KEY_SECRET_REF` y `EMAIL_FROM`
3. volver a probar un `leave_request.created` real y confirmar que:
   - se mantiene la notificación in-app
   - el solicitante recibe `leave_request_submitted`
   - el reviewer recibe `leave_request_pending_review`

## Verificación

Validado en staging durante la investigación:

1. `GET /api/notifications?unreadOnly=true&pageSize=10` autenticado como Julio Reyes devuelve la notificación in-app de Daniela
2. `GET /api/admin/email-deliveries?search=dferreira@efeoncepro.com&pageSize=20` muestra `leave_request_submitted` skipped por `RESEND_API_KEY is not configured.`
3. `GET /api/admin/email-deliveries?search=jreyes@efeoncepro.com&pageSize=20` muestra `leave_request_pending_review` skipped por la misma razón

Pendiente para cerrar:

4. confirmar la configuración efectiva del runtime reactivo/`ops-worker`
5. desplegar el worker con `RESEND_API_KEY_SECRET_REF` efectivo
6. reprobar el flujo completo con correos enviados exitosamente

## Estado

open

## Relacionado

- `docs/issues/resolved/ISSUE-049-leave-review-modal-stale-actions-and-brittle-approval-policy.md`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/email/delivery.ts`
- `src/lib/resend.ts`
- `services/ops-worker/`
