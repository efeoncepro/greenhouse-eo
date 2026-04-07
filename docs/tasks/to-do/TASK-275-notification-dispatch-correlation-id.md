# TASK-275 — Notification Dispatch Correlation ID

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-275-notification-dispatch-correlation`
- Legacy ID: n/a
- GitHub Issue: —

## Summary

Agregar un `dispatch_correlation_id` a `notification_log` que almacene el `batch_id` ya generado por `sendEmail()`. Hoy ambas tablas (`notification_log` y `email_deliveries`) se escriben independientemente sin columna de referencia compartida — el único vínculo posible es un JOIN temporal por `user_id` + proximidad de `created_at`, que es frágil y propenso a cross-products.

## Why This Task Exists

Durante la resolución de ISSUE-025, se descubrió que `notification_log` y `email_deliveries` no comparten ningún identificador. Para vincular los 18 registros afectados fue necesario un JOIN heurístico (`user_id` + ±10 segundos), que produjo falsos positivos que requirieron filtrado manual con `EXCEPT`. Esto hace inviable cualquier query operativa, dashboard de trazabilidad o diagnóstico automatizado del flujo notificación → email.

## Goal

- JOIN directo entre `notification_log` y `email_deliveries` via `dispatch_correlation_id = batch_id`
- Trazabilidad completa del dispatch: notificación → log → delivery → resend event
- Queries operativas triviales para Admin Notifications y Ops Health

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- Toda DDL via migración versionada (`pnpm migrate:create`)
- Commits: migración + `db.d.ts` juntos
- `notification_log` y `email_deliveries` viven en schema `greenhouse_notifications`

## Normative Docs

- `docs/issues/resolved/ISSUE-025-sendmail-status-aggregation-skipped-as-sent.md` — contexto del gap y backfill temporal

## Dependencies & Impact

### Depends on

- Schema `greenhouse_notifications` (ya existe)
- Tabla `greenhouse_notifications.notification_log` (ya existe)
- Tabla `greenhouse_notifications.email_deliveries` (ya existe, tiene `batch_id UUID`)
- `src/lib/email/delivery.ts` — `sendEmail()` ya genera y retorna `batch_id` como `deliveryId`

### Blocks / Impacts

- TASK-023 (Notification System) — cerrada, pero esta task extiende su modelo
- Admin Notifications view — podrá hacer JOINs directos post-implementación
- Cualquier futuro dashboard de email delivery health

### Files owned

- `migrations/YYYYMMDDHHMMSS_add-dispatch-correlation-id-to-notification-log.sql`
- `src/lib/notifications/notification-service.ts` (cambio en `logDispatch` + dispatch flow)
- `src/types/db.d.ts` (regenerado)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — DISCOVERY & PLAN (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — SCOPE & SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migración DDL

- `ALTER TABLE greenhouse_notifications.notification_log ADD COLUMN dispatch_correlation_id UUID`
- Columna nullable (registros históricos no la tienen)
- Índice: `CREATE INDEX idx_notification_log_dispatch_correlation ON greenhouse_notifications.notification_log (dispatch_correlation_id) WHERE dispatch_correlation_id IS NOT NULL`

### Slice 2 — Wiring en notification-service.ts

- En el dispatch flow (líneas ~144-191 de `notification-service.ts`):
  - Capturar `emailResult.deliveryId` (que es el `batch_id`)
  - Pasarlo a `logDispatch()` como nuevo parámetro `dispatchCorrelationId`
- En `logDispatch()` (línea ~310):
  - Agregar parámetro `dispatchCorrelationId?: string`
  - Incluir en el INSERT: `dispatch_correlation_id = $N`

### Slice 3 — Backfill de registros históricos

- UPDATE los ~30 registros existentes usando el JOIN temporal (`user_id` + ±10s) que ya se probó en ISSUE-025
- Incluir el UPDATE como parte de la migración SQL (idempotente)

## Out of Scope

- Cambios en `email_deliveries` (ya tiene `batch_id`, no necesita columna nueva)
- FK formal entre tablas (el correlation ID es suficiente; las tablas se escriben en momentos distintos del request)
- Cambios en la UI de Admin Notifications (se beneficia automáticamente cuando haga JOINs)

## Detailed Spec

### Estado actual del flujo

```
dispatch()
  ├─ sendEmailNotification() → sendEmail()
  │   └─ genera batch_id (UUID)
  │   └─ INSERT email_deliveries con batch_id
  │   └─ retorna { deliveryId: batch_id, status, ... }
  │
  └─ logDispatch(null, userId, category, 'email', status, ...)
      └─ INSERT notification_log SIN referencia al batch_id  ← GAP
```

### Estado objetivo

```
dispatch()
  ├─ sendEmailNotification() → sendEmail()
  │   └─ genera batch_id (UUID)
  │   └─ INSERT email_deliveries con batch_id
  │   └─ retorna { deliveryId: batch_id, status, ... }
  │
  └─ logDispatch(null, userId, category, 'email', status, ..., batch_id)
      └─ INSERT notification_log CON dispatch_correlation_id = batch_id
```

### Query operativa habilitada

```sql
SELECT nl.*, ed.resend_id, ed.status AS ed_status, ed.error_message AS ed_error
FROM greenhouse_notifications.notification_log nl
LEFT JOIN greenhouse_notifications.email_deliveries ed
  ON ed.batch_id = nl.dispatch_correlation_id
WHERE nl.channel = 'email'
ORDER BY nl.created_at DESC;
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Columna `dispatch_correlation_id` existe en `notification_log`
- [ ] Todo email dispatch nuevo escribe el `batch_id` en `notification_log.dispatch_correlation_id`
- [ ] Registros históricos backfilled (verificar con `SELECT count(*) FROM notification_log WHERE channel='email' AND dispatch_correlation_id IS NULL` → 0)
- [ ] JOIN directo `notification_log ↔ email_deliveries` funciona sin heurística temporal
- [ ] `pnpm build` y `pnpm lint` pasan
- [ ] Tipos Kysely regenerados y committeados

## Verification

```bash
pnpm migrate:up
pnpm build
pnpm lint
# Query de verificación post-migración:
# SELECT count(*) FROM greenhouse_notifications.notification_log WHERE channel='email' AND dispatch_correlation_id IS NULL;
# → debe ser 0
```

## Closing Protocol

1. Mover archivo a `docs/tasks/complete/`
2. Actualizar `docs/tasks/README.md`
3. Actualizar `Handoff.md` y `changelog.md`
4. Chequeo de impacto cruzado en `docs/tasks/to-do/`

## Follow-ups

- Considerar agregar `dispatch_correlation_id` a la vista de Admin Notifications para debugging directo desde UI
- Evaluar si el channel `in_app` también necesita correlation (hoy `notification_id` cumple ese rol)
