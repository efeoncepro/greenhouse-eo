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

resolved (2026-08-19) — el lifecycle de entrega está operativo en producción y verificado contra runtime.

**Aplicado y verificado el 2026-08-19:**

- Migraciones `20260819064224037_task-1745-resend-provider-lifecycle` y
  `20260819072130586_task-1746-assessment-access-recovery` (13:00 UTC).
- Webhook `6cdbad94-cdda-4b80-b633-21583c8bb07e` **enabled** sobre `https://greenhouse.efeoncepro.com/api/webhooks/resend`
  con los **9** eventos suscritos; `email.suppressed` se agregó el 2026-08-19 18:41 UTC al detectarse que faltaba
  (su ausencia dejaba ciego al bloqueo de reenvío de `recover-email.ts`, que consulta ese estado).
- Secreto `greenhouse-resend-webhook-signing-secret-production` v1 + `RESEND_WEBHOOK_SIGNING_SECRET_SECRET_REF`
  en Vercel Production. Probado en vivo: sin firma responde `401`; con configuración ausente responde `503`
  reintentable, nunca `200 ignored` — que era la causa raíz de la supresión de reintentos.
- Índices `idx_email_deliveries_provider_status` y `uq_email_deliveries_token_intent_v2` creados y validados.
- CONTRACT de credencial aplicado y `convalidated`; su guard se probó en transacción revertida y rechaza correctamente
  una rotación de hash sin rotación de versión.
- Reconciliación histórica ejecutada (ventana 30 días, cursor agotado).

**Lo que la reconciliación reveló — y es el hallazgo operativo real del incidente:** de los despachos reconciliados,
**43 nunca llegaron al destinatario**: 23 `suppressed` y 20 `bounced`. El desglose de Hiring es lo relevante para People:

| Tipo de correo | suppressed | bounced |
|---|---|---|
| `hiring_application_confirmation` | 14 | 9 |
| `hiring_assessment_assigned` | **5** | **3** |
| `hiring_decision_rejected` | 2 | — |
| `hiring_decision_selected` | 1 | — |
| `hiring_stage_advanced` | — | 1 |

**Corrección (misma sesión, tras inspeccionar los destinatarios):** los **44** despachos fallidos van **todos a
dominios internos de Efeonce** — `efeoncepro.com` (23), `efeonce.org` (13), `greenhouse.efeonce.org` (7) y
`efeonce.test` (1). **Cero destinatarios externos.** Los 8 `hiring_assessment_assigned` que fallaron son direcciones de
prueba/QA (`ta***@efeonce.org`, `t8***@efeoncepro.com`, `qa***@efeonce.org`), no candidatas reales. **Ningún candidato
real quedó sin su test**, y no hay trabajo de rescate para People. Lo que el dato sí revela es otra cosa: datos
sintéticos y de prueba transitando el pipeline de correo productivo, que es la misma clase de problema que
`ISSUE-159`.

Con eso, el incidente queda cerrado **sin cola operativa**: el lifecycle ahora distingue aceptación de entrega, y la
evidencia disponible dice que el daño temido (candidatas sin su test) no ocurrió.

**Huecos declarados, no cerrados:**

- **78 despachos de los últimos 30 días siguen sin lifecycle** porque su último evento en Resend es de engagement
  (`opened`/`clicked`) y el reconciliador clasifica eso como `unsupported` en vez de inferir `delivered`. Es honesto
  (no inventa), pero pierde una señal que el propio `opened` implica. Decisión a revisar, no un bug.
- **283 despachos con `resend_id` anteriores a la ventana de 30 días** quedan sin reconciliar por diseño del lookback.
- `redrivePendingResendWebhookEvents` sigue sin caller automático: no hay cron ni Scheduler que lo ejecute.

## Relacionado

- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `TASK-269`, `TASK-1689`, `TASK-1719`, `TASK-1745`, `TASK-1746`, `TASK-1747`
