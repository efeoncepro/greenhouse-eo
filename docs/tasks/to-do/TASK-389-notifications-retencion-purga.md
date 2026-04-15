# TASK-389 — Notificaciones In-App: Retención y Purga Automática

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-389-notifications-retencion-purga`
- Legacy ID: none
- GitHub Issue: none

## Summary

Las notificaciones in-app se acumulan indefinidamente en la tabla `notifications`. Sin un job de purga, en un año de operación con múltiples eventos diarios la tabla crece hasta degradar el rendimiento del dropdown y el feed. Esta task implementa dos crons: uno que archiva notificaciones leídas con más de 30 días, y otro que borra físicamente las archivadas con más de 90 días.

## Why This Task Exists

El sistema de emails ya tiene su cron de retención (`email-data-retention`). El sistema de notificaciones in-app no tiene ninguno. Las notificaciones leídas no tienen valor operativo pasados 30 días, y las archivadas son ruido puro. Sin purga, la query del dropdown (que filtra `WHERE archived_at IS NULL`) empieza a paginar sobre un set creciente.

## Goal

- Notificaciones leídas con más de 30 días se archivan automáticamente (`archived_at = NOW()`)
- Notificaciones archivadas con más de 90 días se borran físicamente
- El `notification_log` se purga después de 180 días
- Crons idempotentes, en batches pequeños para evitar locks largos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — patrones de DML en Postgres

Reglas obligatorias:

- El archivado nunca borra datos — solo setea `archived_at`
- El borrado físico solo aplica a registros ya archivados (dos fases, no una)
- Las notificaciones no leídas nunca se archivan automáticamente — solo las leídas (`read_at IS NOT NULL`)
- Los crons deben ser idempotentes: re-ejecutar no causa efectos secundarios

## Normative Docs

- `src/app/api/cron/email-data-retention/route.ts` — patrón de cron de retención a replicar
- `greenhouse_notifications.notifications` — tabla target (columnas: `read_at`, `archived_at`, `created_at`)
- `greenhouse_notifications.notification_log` — tabla de audit log a purgar

## Dependencies & Impact

### Depends on

- `greenhouse_notifications.notifications` con columnas `read_at`, `archived_at`
- `greenhouse_notifications.notification_log` — verificar que existe

### Blocks / Impacts

- Ninguna task bloqueada
- Mejora rendimiento de TASK-386 (SSE) y TASK-387 (agrupación) al reducir tamaño de tabla

### Files owned

- `src/app/api/cron/notification-retention/route.ts` — nuevo cron
- `vercel.json` — registrar el cron

## Current Repo State

### Already exists

- `greenhouse_notifications.notifications` — con `read_at` y `archived_at` (verificar en migración)
- `greenhouse_notifications.notification_log` — tabla de audit [verificar]
- Patrón de cron en `src/app/api/cron/email-data-retention/route.ts`
- `vercel.json` — ya tiene 3 crons de email, agregar 1 de notificaciones

### Gap

- No existe cron de retención para notificaciones in-app
- Sin purga, la tabla crece indefinidamente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cron de retención

- Crear `src/app/api/cron/notification-retention/route.ts` con `maxDuration = 60`
- Paso 1 — Archivar leídas antiguas (batch de 500):
  ```sql
  UPDATE greenhouse_notifications.notifications
  SET archived_at = NOW(), updated_at = NOW()
  WHERE read_at IS NOT NULL
    AND read_at < NOW() - INTERVAL '30 days'
    AND archived_at IS NULL
  LIMIT 500
  RETURNING notification_id
  ```
- Paso 2 — Borrar archivadas viejas (batch de 500):
  ```sql
  DELETE FROM greenhouse_notifications.notifications
  WHERE archived_at IS NOT NULL
    AND archived_at < NOW() - INTERVAL '90 days'
  LIMIT 500
  RETURNING notification_id
  ```
- Paso 3 — Purgar notification_log antiguo:
  ```sql
  DELETE FROM greenhouse_notifications.notification_log
  WHERE created_at < NOW() - INTERVAL '180 days'
  LIMIT 1000
  ```
- Responder con `{ archived: N, deleted: N, logPurged: N, ranAt }`

### Slice 2 — Registro en vercel.json

- Agregar cron `notification-retention` con schedule semanal: `"0 4 * * 0"` (4am domingo Santiago)
- Verificar que `requireCronAuth` está disponible (ya usado en `email-data-retention`)

## Out of Scope

- Retención de `notification_preferences` — estas no tienen fecha de expiración natural
- Archivado manual desde la UI (el usuario ya puede archivar individualmente si la UI lo soporta)
- Configuración de períodos de retención desde UI — env vars son suficientes

## Detailed Spec

```typescript
const ARCHIVE_AFTER_DAYS = parseInt(process.env.NOTIFICATION_ARCHIVE_AFTER_DAYS ?? '30', 10)
const DELETE_AFTER_DAYS = parseInt(process.env.NOTIFICATION_DELETE_AFTER_DAYS ?? '90', 10)
const LOG_PURGE_AFTER_DAYS = parseInt(process.env.NOTIFICATION_LOG_PURGE_AFTER_DAYS ?? '180', 10)
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `POST /api/cron/notification-retention` responde 200 con `{ archived, deleted, logPurged }`
- [ ] Notificaciones leídas con `read_at < NOW() - 30 days` quedan con `archived_at IS NOT NULL`
- [ ] Notificaciones no leídas nunca se archivan aunque sean antiguas
- [ ] Notificaciones archivadas con `archived_at < NOW() - 90 days` son borradas físicamente
- [ ] El cron es idempotente — re-ejecutar no genera efectos adicionales
- [ ] El cron está registrado en `vercel.json`
- [ ] `pnpm lint` y `pnpm tsc --noEmit` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- Llamada manual en staging, verificar respuesta y confirmar en DB que solo se archivaron leídas

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

## Follow-ups

- Agregar endpoint de archivado manual desde la UI del feed (si se pide)
- Evaluar índice en `(read_at, archived_at)` si la tabla supera 100k filas
