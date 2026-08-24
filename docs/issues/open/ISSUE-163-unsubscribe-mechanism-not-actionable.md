# ISSUE-163 — El mecanismo de baja de correo no es accionable por ningún método

## Ambiente

production + staging (mismo código; el defecto no depende del ambiente)

## Detectado

2026-08-24, durante la revisión de arquitectura de `TASK-1764` (footers gobernados por perfil).
No lo reportó un usuario: emergió al verificar contra runtime la afirmación de la ADR de que
`unsubscribePolicy` es una decisión de presentación. El control que esa policy gobierna no funciona.

## Síntoma

Un destinatario que hace clic en «Dejar de recibir estos correos» en el pie del correo **no se da de
baja**. Tampoco funciona el botón «Cancelar suscripción» que Gmail y Yahoo muestran sobre el asunto.

Los tres caminos posibles fallan:

| Camino | Qué pasa |
|---|---|
| Clic humano en el enlace del pie (GET) | `405` — la ruta sólo exporta `POST` |
| Botón nativo del cliente de correo (one-click, RFC 8058) | `500` — el handler hace `request.json()` sobre un body `form-urlencoded` |
| `POST` bien formado con JSON | `400` — lee `action`/`emailType` del body, y la URL los lleva en el query string |

Efecto secundario silencioso: `payroll_receipt` **no renderiza** el enlace, pero el delivery igual
emite y persiste un token de 30 días en `auth_tokens` y manda el header `List-Unsubscribe`. Se guardan
credenciales de baja que ninguna superficie puede consumir.

## Causa raíz

Tres defectos independientes en la misma cadena:

1. **`src/lib/email/unsubscribe.ts:27`** compone la URL con los parámetros en el **query string** y la
   entrega como enlace plano (`<Link href>` en `src/emails/components/EmailLayout.tsx:171`), es decir
   un `GET`.
2. **`src/app/api/account/email-preferences/route.ts:10`** exporta únicamente `POST`, y lee `action` y
   `emailType` desde el **body**. No existe página intermedia, middleware ni rewrite que traduzca. El
   endpoint no tiene **ningún consumer** en `src/`.
3. **`src/lib/email/delivery.ts:901`** anuncia `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, un
   contrato que obliga a aceptar `application/x-www-form-urlencoded`; el handler no lo parsea.

**Origen documental:** `TASK-269` (`complete`) diseñó esta capacidad y cerró con dos piezas sin
entregar — su criterio `- [ ] POST /api/account/email-preferences permite toggle de suscripciones con
token o con sesión` quedó sin marcar, y su Slice «Página simple `/account/email-preferences` que
muestre tipos suscritos con toggles» nunca se construyó. El defecto no es una regresión posterior:
se cerró así.

**Defecto adyacente (misma causa de fondo, distinto eje):** `delivery.ts:1486` resuelve la prioridad
con `?? 'broadcast'`, así que cualquier `EmailType` ausente de `EMAIL_PRIORITY_MAP` y enviado a más de
un destinatario recibe token y headers de baja **automáticamente**. Es fail-open en la dimensión donde
la política canónica exige fail-closed. La corrección de ese default pertenece al registro de policy de
`EPIC-042`, no a este issue; se documenta acá porque comparte superficie.

## Impacto

- **Cumplimiento.** Los tres tipos que sí muestran el enlace —`notification`, `payroll_export`,
  `weekly_executive_digest`— ofrecen una vía de baja que no existe. `payroll_export` resuelve sus
  destinatarios desde `email_subscriptions`, así que es una lista real sin salida real.
- **Entregabilidad.** Un `List-Unsubscribe` que responde `500` al one-click de Gmail es peor que no
  declararlo: el proveedor lo interpreta como remitente que incumple su propio contrato, y empuja al
  usuario a marcar spam en vez de darse de baja.
- **Bloqueo de programa.** `EPIC-042` no puede declarar `unsubscribePolicy='required'` en ninguna
  cohorte mientras el mecanismo no funcione: sería escribir una regla sobre un control inerte.
- **Bloqueo de feature.** `TASK-1397` (Career Alerts) sería la **primera suscripción opt-in real** del
  sistema y declara en sus dependencias que estas primitivas «provide subscription, signed opt-out and
  delivery-ledger primitives». La mitad de esa frase es falsa. Su `Blocked by: none` es incorrecto.
- **Higiene de credenciales.** Tokens de 30 días persistidos para un tipo que no los expone.

## Solución

Requiere trabajo significativo y superficie visible nueva → se resuelve por task, no inline.
Dueña: **`TASK-1774`**. Alcance mínimo para cerrar este issue:

1. `GET` que ejecuta la baja de forma idempotente y responde una confirmación legible.
2. `POST` que acepta `application/x-www-form-urlencoded` con `List-Unsubscribe=One-Click`, además del
   JSON actual, y que lee `action`/`emailType` del query cuando no vienen en el body.
3. Dejar de emitir y persistir tokens para tipos que no renderizan el enlace.
4. Degradación honesta: un token inválido o vencido explica qué pasó, no responde `400` crudo.

La superficie gobernada de preferencias por tipo —la página con toggles que `TASK-269` planeó— queda
como carril `ui-ux` propio en `EPIC-042`, con su wireframe; no se resuelve con una respuesta mínima.

## Verificación

- Clic real desde una bandeja real (Gmail y Outlook Web) sobre un correo de `notification`: la baja
  ocurre y la confirmación es legible.
- Botón nativo «Cancelar suscripción» de Gmail sobre el mismo correo: responde `2xx` y la fila queda
  `active = FALSE` en `email_subscriptions`.
- Reenvío del mismo enlace ya usado: idempotente, sin `500`.
- `payroll_receipt` deja de generar filas en `auth_tokens` con `token_type = 'unsubscribe'`.
- Los tres tipos que muestran el enlace conservan su comportamiento de envío; ninguno gana ni pierde el
  control por este cambio.

## Estado

open

## Relacionado

- `TASK-1774` — dueña de la corrección.
- `TASK-269` (`complete`) — origen documental; cerró con el criterio del endpoint sin marcar y sin la
  página de preferencias.
- `TASK-1764` / `EPIC-042` — bloqueados para declarar `required` hasta que este issue cierre.
- `TASK-1397` — Career Alerts; primera suscripción opt-in real, hoy con `Blocked by: none` incorrecto.
- `TASK-1745` (`complete`) — lifecycle de entrega Resend; no cubre el opt-out.
