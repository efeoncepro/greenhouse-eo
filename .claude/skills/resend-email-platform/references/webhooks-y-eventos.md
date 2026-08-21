# Webhooks y eventos de Resend

Verificado contra documentación oficial el 2026-08-20.

## Recepción segura

1. Lee el body crudo como texto; parsear y reserializar antes de verificar invalida la firma.
2. Verifica `svix-id`, `svix-timestamp` y `svix-signature` con el signing secret del endpoint.
3. Rechaza firma inválida antes de persistir o ejecutar efectos.
4. Persiste `svix-id` como clave de deduplicación y responde `200` sólo cuando la recepción quedó
   aceptada de forma durable.
5. No registres el signing secret: las respuestas de create, retrieve o list webhooks pueden
   incluirlo.

La entrega es at-least-once y el orden no está garantizado. Usa `created_at` para ordenar y diseña
transiciones monotónicas; un `email.opened` puede llegar antes que `email.delivered`.

## Catálogo actual: 19 eventos

- Email (11): `email.bounced`, `email.clicked`, `email.complained`, `email.delivered`,
  `email.delivery_delayed`, `email.failed`, `email.opened`, `email.received`, `email.scheduled`,
  `email.sent`, `email.suppressed`.
- Domain (3): `domain.created`, `domain.updated`, `domain.deleted`.
- Contact (3): `contact.created`, `contact.updated`, `contact.deleted`.
- Suppression (2): `suppression.added`, `suppression.removed`.

Semántica load-bearing:

- `email.sent`: la API aceptó el envío; no prueba entrega.
- `email.delivered`: el servidor del destinatario aceptó el mensaje; no prueba lectura.
- `email.delivery_delayed`: problema temporal, no rebote final.
- `email.bounced`: rechazo permanente del servidor destino.
- `email.suppressed`: Resend evitó el despacho por suppression.

## Retries y replay

El schedule actual de la página dedicada es: inmediato, 5 s, 5 min, 30 min, 2 h, 5 h, 10 h y
10 h adicionales. El dashboard muestra el siguiente intento; Resend puede deshabilitar un endpoint
que falla persistentemente.

El dashboard permite replay manual de mensajes `failed` y `succeeded`.

- [NO-DOC] La documentación no garantiza si un replay conserva o cambia `svix-id`.
- No desactives la deduplicación para permitir replay. Primero observa la identidad del replay; si
  conserva el ID, usa un carril operativo explícito y auditado para reprocesar el evento almacenado.
- El handler debe ser idempotente también por efecto de negocio, no sólo por delivery ID.

## Persistencia y privacidad

Resend retiene datos de email 30 días en planes no Enterprise. Guarda localmente lo necesario para
auditoría y reconciliación con retención propia. Los payloads pueden contener emails, IPs y URLs de
click; aplica acceso, minimización y borrado proporcional.

## Fuentes oficiales

- [Verify Webhook Requests](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Managing Webhooks](https://resend.com/docs/webhooks/introduction)
- [Event Types](https://resend.com/docs/webhooks/event-types)
- [Retries and Replays](https://resend.com/docs/webhooks/retries-and-replays)
- [How to Store Webhooks Data](https://resend.com/docs/dashboard/webhooks/how-to-store-webhooks-data)
