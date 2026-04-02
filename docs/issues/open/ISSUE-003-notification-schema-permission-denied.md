# ISSUE-003 — Permission denied for schema greenhouse_notifications

## Ambiente
preview

## Detectado
- **Fecha:** 2026-04-01
- **Canal:** Sentry alert (ID: 6cf1d3d7314f48bd81eb0e2678e4e38e)
- **Síntoma/Frecuencia:** Error en POST `/api/internal/webhooks/notification-dispatch`

## Síntoma
El endpoint de dispatch de notificaciones falla con:
```
error: permission denied for schema greenhouse_notifications
```
Stack trace:
- `src/lib/postgres/client.ts:191` → `pool.query()`
- `src/lib/notifications/schema.ts:72` → `runGreenhousePostgresQuery(sql)`
- `src/lib/webhooks/consumers/notification-dispatch.ts:101` → `ensureNotificationSchema()`

## Causa raíz
El usuario `greenhouse_runtime` no tenía privilegio `USAGE` sobre el schema `greenhouse_notifications`. El schema fue creado originalmente con un owner distinto a `greenhouse_ops`, y los grants de `USAGE` no se habían propagado al runtime user.

La función `ensureNotificationSchema()` consulta `information_schema.tables` con `table_schema = 'greenhouse_notifications'`, lo cual requiere `USAGE` en el schema. Sin el grant, PostgreSQL rechaza la consulta.

## Impacto
- Todas las notificaciones in-app disparadas por webhooks fallaban silenciosamente en preview.
- No afecta producción (el schema tenía grants correctos allí).

## Solución
1. **DB grants (aplicados 2026-04-02):** Migración `20260402001200000_postgres-runtime-grant-reconciliation.sql` reconcilia `GRANT USAGE ON SCHEMA` + DML completo para `greenhouse_runtime` sobre `greenhouse_notifications` y todos los schemas de dominio.
2. **Ownership (aplicado 2026-04-02):** Migración `20260402000000000_consolidate-ownership-to-greenhouse-ops.sql` consolida ownership de todos los objetos a `greenhouse_ops`.
3. **Code hardening:** `ensureNotificationSchema()` ahora está envuelto en try/catch en `notification-dispatch.ts` — retorna `{ failed: 1 }` en vez de crashear el endpoint con 500.

## Verificación
- Confirmar en Sentry que no hay eventos nuevos de este tipo post 2026-04-02.
- Enviar un webhook de prueba a `/api/internal/webhooks/notification-dispatch` en preview y verificar respuesta 200.

## Estado
resolved

## Relacionado
- Commits: `0029b406` (grant reconciliation), `d3e41c34` (code hardening)
- Suspect commit en Sentry: `468005f` (harden postgres tls recovery)
- Migración: `migrations/20260402001200000_postgres-runtime-grant-reconciliation.sql`
- Setup script: `scripts/setup-postgres-notifications.sql`
