# ISSUE-024 — Admin Notifications: errores silenciosos ocultan estado real del sistema

## Ambiente

staging + preview

## Detectado

- **Fecha:** 2026-04-06
- **Canal:** Revisión manual solicitada por usuario — vista `/admin/notifications` mostraba todos los KPIs en cero y ambos canales como "idle".

## Síntoma

La vista de administración de notificaciones (`/admin/notifications`) muestra:

- 0 enviadas 24h, 0 in-app, 0 email, 0 fallidas
- Ambos canales (in-app y email) con estado "idle"
- Sin registros en la tabla de dispatch reciente
- Sin indicación alguna de si hay un error de infraestructura o simplemente no hay datos

No hay forma de distinguir "no se han enviado notificaciones" de "las queries están fallando silenciosamente".

## Causa raíz

Múltiples problemas concurrentes:

1. **Error handling silencioso en `get-admin-notifications-overview.ts`**: Los 6 bloques `catch` del backend (safeCount ×5, channelHealth, lastSignalAt, recentDispatch) atrapaban excepciones y devolvían ceros/defaults sin logging alguno. Si las tablas no existían o las queries fallaban, el admin veía ceros sin ninguna señal de error.

2. **`logDispatch()` catch vacío en `notification-service.ts`**: El método que registra cada despacho en `notification_log` tenía un `catch {}` completamente vacío — si el INSERT fallaba (ej. columna faltante, permisos), se tragaba el error sin traza.

3. **Test dispatch sin validación de schema**: La ruta `POST /api/admin/ops/notifications/test-dispatch` llamaba directamente a `NotificationService.dispatch()` sin invocar `ensureNotificationSchema()` primero. Si las tablas no existían, lanzaba un 500 genérico sin detalle útil.

4. **Setup script con columna faltante**: `scripts/setup-postgres-notifications.sql` definía `notification_log` sin la columna `metadata JSONB`, aunque el código (`logDispatch()`) la inserta. Re-ejecutar el script dejaría la tabla incompleta.

5. **Sin diagnóstico visible en frontend**: La vista no tenía ningún mecanismo para informar al administrador que algo andaba mal — solo mostraba ceros, indistinguibles de un sistema sin actividad.

## Impacto

- El administrador no puede saber si el sistema de notificaciones funciona o está roto.
- Errores de infraestructura (tablas faltantes, permisos, schema drift) quedan completamente ocultos.
- El botón "Probar Despacho" falla sin explicar por qué si el schema no está listo.

## Solución

### 1. Logging en `get-admin-notifications-overview.ts`

Agregado `console.error` con etiqueta descriptiva a los 6 bloques catch: `safeCount` (con label parametrizado), channel health, lastSignalAt, y recentDispatch. Los errores ahora son visibles en logs del servidor.

### 2. Logging en `notification-service.ts`

Reemplazado `catch {}` vacío en `logDispatch()` con `console.error` que incluye userId, category y channel para traceabilidad.

### 3. Schema validation en test-dispatch

Agregado `ensureNotificationSchema()` con try/catch dedicado al inicio de la ruta. Si el schema no está listo, devuelve 503 con el detalle del error en vez de un 500 genérico. También se enriquece la respuesta exitosa con `detail: result`.

### 4. Fix del setup script

Agregada columna `metadata JSONB DEFAULT '{}'` a la definición de `notification_log` en `setup-postgres-notifications.sql`.

### 5. Diagnósticos en el frontend

- Nuevo campo `diagnostics: string[]` en la interfaz `AdminNotificationsOverview`.
- El backend recolecta mensajes de diagnóstico cuando detecta problemas (tabla no encontrada, queries fallidas).
- `AdminNotificationsView.tsx` muestra un `Alert` de tipo warning con la lista de diagnósticos cuando hay problemas, permitiendo al admin distinguir "sin actividad" de "sistema con errores".

## Archivos modificados

- `src/lib/admin/get-admin-notifications-overview.ts` — logging + diagnostics field + diagnostics collection
- `src/lib/notifications/notification-service.ts` — logDispatch error logging
- `src/app/api/admin/ops/notifications/test-dispatch/route.ts` — ensureNotificationSchema + error handling
- `src/views/greenhouse/admin/AdminNotificationsView.tsx` — Alert banner for diagnostics
- `scripts/setup-postgres-notifications.sql` — metadata column added to notification_log

## Verificación

- `npx tsc --noEmit` — zero errores en archivos de notificaciones
- `npx eslint` — zero errores en los 4 archivos fuente modificados
- Diagnóstico visible: si `notification_log` no existe, el admin ve un banner amarillo explícito en vez de ceros silenciosos
- Si las queries fallan, los errores aparecen en `console.error` del servidor con etiquetas identificables

## Estado

resolved — fix committeado en `develop` (commit `b06e0340`), verificado en staging. Resolución: 2026-04-07.

## Relacionado

- `ISSUE-003` — Permission denied for schema greenhouse_notifications (resuelto previamente)
- Migración `20260402001200000_postgres-runtime-grant-reconciliation.sql` — grants de USAGE en greenhouse_notifications
