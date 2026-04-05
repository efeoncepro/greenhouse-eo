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

- Cambiar el flujo para que el cierre de Payroll no drene consumidores globales inline.
- Opción A: publicar solo el evento del período y dejar que cron/admin consumers hagan el resto.
- Opción B: introducir un dispatch scoped al `periodId` recién exportado.
- Mantener la respuesta del close route acotada al período actual y no al backlog de `notifications` completo.

## Plan de resolución sin pérdida funcional

### Funcionalidad que se debe preservar

- El operador debe poder seguir cerrando un período desde `POST /api/hr/payroll/periods/[periodId]/close` sin cambiar el flujo principal de uso.
- El período recién cerrado debe seguir disparando su notificación downstream de Payroll.
- La respuesta del cierre debe seguir reflejando el resultado del período actual y no degradar la UX del módulo.

### Comportamiento que sí debe eliminarse

- Que el cierre de un período drene backlog global del outbox o del lane reactivo de `notifications`.
- Que side effects ajenos al período recién cerrado queden acoplados a esa request.

### Estrategia propuesta

1. Mantener `closePayrollPeriod()` como fuente del cambio de estado del período actual, sin mover esa responsabilidad fuera del route de cierre.
2. Reemplazar `dispatchPayrollExportNotifications()` por una variante scoped al `periodId` exportado, o por un publish puntual del evento del período ya emitido por el close path.
3. Dejar el procesamiento global del backlog en cron/admin consumers, no en la request síncrona del usuario.
4. Conservar un resultado de `notificationDispatch` orientado al período actual para no romper el contrato visible del endpoint.

### Tradeoff aceptado

- Si el fix requiere volver asíncrona parte del despacho, se acepta perder únicamente el drenado inline del backlog global.
- No se acepta perder la notificación del período actual ni obligar al operador a ejecutar un paso manual adicional para cerrar/exportar normalmente.

## Verificación

1. Crear backlog pendiente en `greenhouse_sync.outbox_events` y/o `outbox_reactive_log` para eventos no relacionados con Payroll.
2. Ejecutar `POST /api/hr/payroll/periods/[periodId]/close` sobre un período `approved`.
3. Confirmar que la acción no publica ni procesa eventos ajenos al período cerrado.
4. Confirmar que la notificación downstream del período actual sigue saliendo correctamente.

## Estado

open

## Relacionado

- `src/app/api/hr/payroll/periods/[periodId]/close/route.ts`
- `src/lib/payroll/dispatch-payroll-export-notifications.ts`
- `src/lib/sync/outbox-consumer.ts`
- `src/lib/sync/reactive-consumer.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-094-payroll-close-and-csv-download-separation.md`
