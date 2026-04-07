# ISSUE-025 — sendEmail() reporta 'sent' cuando todos los recipients fueron skipped

## Metadata

| Campo     | Valor                          |
| --------- | ------------------------------ |
| ID        | `ISSUE-025`                    |
| Ambiente  | production + staging + preview |
| Detectado | 2026-04-06                     |
| Severidad | media                          |
| Estado    | resolved                       |
| Resuelto  | 2026-04-06                     |

## Sintoma

`notification_log` registra emails con `status = 'sent'` mientras que los registros correspondientes en `email_deliveries` tienen `status = 'skipped'` con error `"RESEND_API_KEY is not configured."`. Los KPIs de Admin Notifications reportan envíos exitosos que en realidad no se entregaron.

## Evidencia

```sql
-- 18 notification_log entries marcadas 'sent' cuyo email real fue 'skipped'
SELECT nl.notification_log_id, nl.channel, nl.status, ed.status AS delivery_status, ed.error
FROM greenhouse_notifications.notification_log nl
JOIN greenhouse_notifications.email_deliveries ed
  ON nl.notification_log_id::text = ed.metadata->>'notification_log_id'
WHERE nl.channel = 'email' AND nl.status = 'sent' AND ed.status = 'skipped';
```

Resultado: 18 filas donde `notification_log.status = 'sent'` pero `email_deliveries.status = 'skipped'`.

## Causa raiz

En `src/lib/email/delivery.ts`, la función `sendEmail()` agrega resultados de múltiples recipients pero solo rastreaba `sawFailure`:

```typescript
// ANTES (bug)
let sawFailure = false;
for (const result of recipientResults) {
  if (result.status === 'failed') sawFailure = true;
}
return { status: sawFailure ? 'failed' : 'sent', ... };
```

Cuando todos los recipients eran `'skipped'` (e.g. RESEND_API_KEY no configurada), `sawFailure` quedaba en `false` y la función retornaba `'sent'`.

## Impacto

- **Data inconsistency**: `notification_log` muestra falsos positivos de envío exitoso
- **KPIs inflados**: Admin Notifications Overview reporta emails enviados que nunca se entregaron
- **Diagnóstico dificultado**: sin inspeccionar `email_deliveries`, no hay señal de que los emails no salieron

## Solucion

Agregado tracking de `sawSkipped` en la agregación de `sendEmail()`:

```typescript
// DESPUÉS (fix)
let sawFailure = false;
let sawSkipped = false;
for (const result of recipientResults) {
  if (result.status === 'failed') sawFailure = true;
  else if (result.status === 'skipped') sawSkipped = true;
}
return { status: sawFailure ? 'failed' : sawSkipped ? 'skipped' : 'sent', ... };
```

Test unitario agregado para el escenario "all recipients skipped".

## Verificacion

- 4/4 tests de delivery passing
- 2/2 tests de notification service passing
- `npx tsc --noEmit` — OK

## Archivos modificados

- `src/lib/email/delivery.ts` — fix en `sendEmail()` aggregate status
- `src/lib/email/delivery.test.ts` — test para escenario all-skipped

## Relacionado

- ISSUE-024 — observabilidad de Admin Notifications (detectó los KPIs inconsistentes que llevaron a este hallazgo)
- ISSUE-019 — `ensureEmailSchema()` ejecuta DDL en cada envío
