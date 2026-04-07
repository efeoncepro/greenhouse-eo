# ISSUE-021 — Ventana de retry de emails fallidos limitada a 1 hora

## Ambiente

production + staging

## Detectado

2026-04-06, revision de codigo end-to-end del modulo de emails

## Sintoma

Emails que fallan y no se reintentaron exitosamente dentro de 1 hora son abandonados permanentemente, incluso si solo fallaron 1 vez de las 3 permitidas.

## Causa raiz

`src/lib/email/delivery.ts` linea 557:

```sql
WHERE status = 'failed'
  AND attempt_number < 3
  AND created_at > NOW() - INTERVAL '1 hour'
```

El filtro `created_at > NOW() - INTERVAL '1 hour'` descarta emails creados hace mas de 1 hora. Si Resend tiene una caida de mas de 1 hora, todos los emails fallidos durante ese periodo son abandonados permanentemente.

El cron corre cada 5 minutos, dando ~12 oportunidades en esa hora. Pero si el problema es persistente (Resend caido, DNS, rate limit), la ventana no es suficiente.

## Impacto

- Emails de invitacion, password reset, y nomina pueden perderse si hay una ventana de downtime > 1 hora
- No hay alerta ni log cuando un email se abandona por antiguedad
- El admin solo ve "failed" en el historial sin saber que no se volvera a intentar

## Solucion

Ampliar la ventana a 24 horas:

```sql
AND created_at > NOW() - INTERVAL '24 hours'
```

El limite real de reintentos ya esta controlado por `attempt_number < 3`. La ventana temporal es un guard extra que deberia ser generoso, no restrictivo.

Opcionalmente agregar un log o metrica cuando un email agota reintentos.

## Verificacion

1. Crear un delivery con status `'failed'`, `attempt_number = 1`, `created_at` de hace 2 horas
2. Ejecutar `processFailedEmailDeliveries()`
3. Verificar que el delivery es reclamado e intentado

## Estado

resolved — ventana expandida a 24 horas (`INTERVAL '24 hours'`). Fix en `develop` (TASK-269). Resolución: 2026-04-07.

## Relacionado

- `src/lib/email/delivery.ts` (linea 557)
- `src/app/api/cron/email-delivery-retry/route.ts`
