# Envío, idempotencia y límites de Resend

Verificado contra documentación oficial el 2026-08-20.

## Envío e idempotencia

- `POST /emails` acepta hasta 50 destinatarios por campo `to`.
- `Idempotency-Key` es opcional, de 1 a 256 caracteres y se conserva 24 horas.
- Está soportada en `POST /emails` y `POST /emails/batch`.
- Repetir la misma key con el mismo payload devuelve la respuesta original sin un segundo envío.
- La misma key con otro payload devuelve `409 invalid_idempotent_request`.
- Dos requests simultáneos con la misma key pueden devolver `409 concurrent_idempotent_requests`;
  reintenta después con la misma key y payload.

La key identifica una intención estable de envío, no un intento HTTP. Nunca generes una key nueva
para un retry ambiguo.

## Batch, schedule y adjuntos

- Batch admite hasta 100 emails por request y cuenta como un request para rate limiting.
- Si un email del batch es inválido, el request completo falla.
- Batch no admite `attachments` ni `scheduled_at`.
- Un email individual puede programarse hasta 30 días; se puede reprogramar o cancelar. Un envío
  cancelado no puede reprogramarse.
- El tamaño total de un email, adjuntos incluidos tras Base64, no puede superar 40 MB.

## Rate limits y cuotas

- Default: 5 requests/segundo por team, compartido por todas sus API keys.
- Lee `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset` y `retry-after`.
- Las cuotas diaria/mensual son distintas del rate limit; sent y received cuentan para cuota.
- `429` puede significar rate limit, cuota diaria o cuota mensual: decide por `type`, no sólo status.

## Taxonomía de retry

| Respuesta                            | Acción                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `400/401/403/404/405/422`            | Corrige request, credencial, permiso o recurso; no hagas retry ciego.  |
| `409 invalid_idempotent_request`     | No reintentes sin corregir key o payload.                              |
| `409 concurrent_idempotent_requests` | Espera y reintenta con la misma key/payload.                           |
| `429 rate_limit_exceeded`            | Respeta `retry-after`; conserva la misma key.                          |
| `429 daily                           | monthly_quota_exceeded`                                                | Espera ventana o cambia plan con autorización; retry inmediato no ayuda. |
| `500`                                | Retry acotado con backoff y la misma key; consulta status si persiste. |

## Suppressions

- Una dirección con hard bounce o complaint entra a suppression y Resend evita el siguiente envío.
- El alcance documentado es por team: cubre todos sus dominios y subdominios.
- Observa `email.suppressed` y `suppression.added|removed`; un response de creación de email no
  sustituye el lifecycle.
- Remover una suppression es una mutación deliberada: valida causa y riesgo de reputación antes.

## Headers y entregabilidad

Para correo masivo gestionado fuera de Broadcasts, usa `List-Unsubscribe` y
`List-Unsubscribe-Post` conforme RFC 8058. Nunca uses custom headers para transportar secretos.

## Fuentes oficiales

- [Send Email](https://resend.com/docs/api-reference/emails/send-email)
- [Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Send Batch Emails](https://resend.com/docs/api-reference/emails/send-batch-emails)
- [Usage Limits](https://resend.com/docs/api-reference/rate-limit)
- [Errors](https://resend.com/docs/api-reference/errors)
- [Schedule Email](https://resend.com/docs/dashboard/emails/schedule-email)
- [Attachments](https://resend.com/docs/dashboard/emails/attachments)
- [Email Suppressions](https://resend.com/docs/dashboard/emails/email-suppressions)
