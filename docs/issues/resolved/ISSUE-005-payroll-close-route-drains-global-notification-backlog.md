# ISSUE-005 — Payroll close route drains global notification backlog

## Ambiente

preview + production

## Detectado

2026-04-05, auditoría de código del módulo Payroll

## Síntoma

Al cerrar un período de nómina desde `POST /api/hr/payroll/periods/[periodId]/close`, la request no despacha solo la notificación del período recién exportado. También puede publicar eventos pendientes ajenos en el outbox y procesar reacciones pendientes del dominio `notifications`, aumentando latencia y mezclando side effects no relacionados con la acción del usuario.

## Causa raíz

La route de cierre llama `dispatchPayrollExportNotifications()` sin scope por `periodId`.

**Call site** — `src/app/api/hr/payroll/periods/[periodId]/close/route.ts`:

```ts
const notificationDispatch =
  currentPeriod?.status === 'exported' || !exportedNow ? null : await dispatchPayrollExportNotifications()
```

`dispatchPayrollExportNotifications()` ejecuta dos consumidores globales:

1. `publishPendingOutboxEvents({ batchSize: 100 })`
2. `processReactiveEvents({ domain: 'notifications' })`

**Implementación** — `src/lib/payroll/dispatch-payroll-export-notifications.ts`:

```ts
outbox = await publishPendingOutboxEvents({ batchSize: 100 })
reactive = await processReactiveEvents({ domain: 'notifications' })
```

`publishPendingOutboxEvents()` no filtra por aggregate ni por período; toma cualquier evento `pending` del outbox. `processReactiveEvents()` tampoco se limita al período recién exportado; procesa eventos `published` accionables del dominio `notifications`.

## Impacto

- Cerrar una nómina puede disparar publicaciones o notificaciones atrasadas que no pertenecen a ese período.
- La latencia del botón de cierre depende del backlog global del outbox/reactive lane, no solo del período actual.
- El usuario puede asociar emails o side effects ajenos al período que acaba de cerrar.
- Se vuelve más difícil auditar qué acción generó qué envío downstream.

## Solución

Se reemplazó `dispatchPayrollExportNotifications()` — que llamaba consumidores globales (`publishPendingOutboxEvents` + `processReactiveEvents`) inline en la request del usuario — por una variante scoped al `periodId` exportado.

La función ya no drena el backlog global del outbox ni procesa reacciones pendientes del lane `notifications`. En su lugar, retorna un descriptor scoped confirmando que el evento `payroll_period.exported` fue emitido transaccionalmente por `closePayrollPeriod()` y será procesado asincrónicamente por el ops-worker cron (cada ~5 min).

Archivos modificados:
- `src/lib/payroll/dispatch-payroll-export-notifications.ts` — reescrito como función scoped (acepta `periodId`, no llama consumidores globales)
- `src/app/api/hr/payroll/periods/[periodId]/close/route.ts` — pasa `periodId` a la función refactorizada
- Tests actualizados para reflejar el nuevo contrato

## Verificación

1. `pnpm build` — pasa sin errores
2. `npx tsc --noEmit` — pasa sin errores de tipos
3. `pnpm test` — 224 archivos, 943 tests pasan, cero regresiones
4. La respuesta del endpoint sigue incluyendo `notificationDispatch` (ahora scoped: `{ event, periodId, dispatch: 'async' }`) o `null` si el período ya estaba exported
5. Los consumidores globales (`outbox-consumer.ts`, `reactive-consumer.ts`) no fueron modificados — el ops-worker cron sigue operando normalmente

## Estado

resolved

## Relacionado

- `src/app/api/hr/payroll/periods/[periodId]/close/route.ts`
- `src/lib/payroll/dispatch-payroll-export-notifications.ts`
- `src/lib/sync/outbox-consumer.ts`
- `src/lib/sync/reactive-consumer.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-094-payroll-close-and-csv-download-separation.md`
