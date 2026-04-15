# TASK-386 — Notificaciones In-App Real-Time via SSE

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-386-notifications-realtime-sse`
- Legacy ID: none
- GitHub Issue: none

## Summary

El dropdown de notificaciones hace polling a `/api/notifications/unread-count` cada 30 segundos. Un permiso aprobado puede tardar hasta 30s en aparecer para el empleado. Esta task reemplaza el polling por Server-Sent Events (SSE): una conexión persistente que el servidor empuja en tiempo real cuando llegan notificaciones nuevas, eliminando latencia percibida y reduciendo carga de DB.

## Why This Task Exists

Polling cada 30s es un patrón válido para MVP pero subóptimo en producción: genera carga constante en la DB aunque no haya notificaciones nuevas, y la latencia de hasta 30s rompe la sensación de inmediatez en flujos críticos (aprobación de permisos, alertas de nómina). SSE es el estándar para notificaciones push en aplicaciones web — más simple que WebSockets y compatible con Next.js serverless sin infraestructura adicional.

## Goal

- Reemplazar el polling de 30s por una conexión SSE persistente en `NotificationsDropdown`
- El servidor emite un evento `notification` cada vez que se crea una notificación para el usuario
- El cliente actualiza el unread count y opcionalmente muestra un toast de preview sin recargar la página
- Fallback graceful a polling si la conexión SSE se cae o el navegador no la soporta

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — la sesión debe validarse en el endpoint SSE

Reglas obligatorias:

- SSE en Vercel tiene límite de duración de función (60s por default en serverless, 300s con `maxDuration`). Usar `maxDuration = 300` y documentar que Vercel puede cerrar la conexión — el cliente debe reconectar automáticamente
- No introducir WebSockets ni infraestructura adicional (Redis pub/sub, etc.) — la solución debe funcionar en Vercel serverless puro
- El endpoint SSE debe respetar el mismo guard de auth que el resto de `/api/notifications/`
- El canal SSE es por usuario — nunca enviar notificaciones de otro usuario por la misma conexión

## Normative Docs

- `src/components/layout/shared/NotificationsDropdown.tsx` — componente actual a modificar
- `src/app/api/notifications/unread-count/route.ts` — ruta que se reemplaza como mecanismo primario
- `src/lib/notifications/notification-service.ts` — punto donde se crea la notificación, desde donde se debe emitir el SSE

## Dependencies & Impact

### Depends on

- `greenhouse_notifications.notifications` — tabla que se consulta para el stream
- `src/lib/notifications/notification-service.ts` — debe notificar al SSE después de hacer INSERT

### Blocks / Impacts

- TASK-387 (agrupación) — el stream SSE puede emitir eventos ya agrupados
- TASK-388 (acciones inline) — el toast de preview puede incluir acciones

### Files owned

- `src/app/api/notifications/stream/route.ts` — nuevo endpoint SSE
- `src/hooks/useNotificationStream.ts` — hook de cliente para SSE con reconexión
- `src/components/layout/shared/NotificationsDropdown.tsx` — eliminar polling, usar hook SSE

## Current Repo State

### Already exists

- `src/components/layout/shared/NotificationsDropdown.tsx` — polling con `setInterval(30000)`
- `src/app/api/notifications/unread-count/route.ts` — endpoint que se convierte en fallback
- `src/lib/notifications/notification-service.ts` — dispatch de notificaciones, punto de integración

### Gap

- No existe endpoint SSE
- No existe hook de cliente para SSE
- `NotificationService.dispatch()` no tiene mecanismo para notificar conexiones activas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Endpoint SSE

- Crear `src/app/api/notifications/stream/route.ts`
- `GET` con `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Validar sesión al conectar — cerrar con 401 si no autenticado
- Mantener la conexión abierta enviando un `comment: keepalive` cada 15s para evitar timeouts de proxy
- Al recibir una nueva notificación para el usuario: emitir `event: notification\ndata: {"unreadCount": N}\n\n`
- `maxDuration = 300` para Vercel

### Slice 2 — Mecanismo de notificación servidor→stream

- En `NotificationService.dispatch()`, después del INSERT, notificar al stream del usuario receptor
- Implementación más simple en Vercel serverless: el cliente re-abre la conexión SSE periódicamente (long-poll híbrido) — cada conexión SSE dura max 55s y el cliente reconecta automáticamente
- Alternativa: usar un flag en Redis o un endpoint de polling interno de 1s — evaluar durante Discovery

### Slice 3 — Hook de cliente con fallback

- Crear `src/hooks/useNotificationStream.ts`
- Abre `EventSource` a `/api/notifications/stream`
- En evento `notification`: actualiza unread count en estado local
- En error o cierre: reconectar con backoff exponencial (1s, 2s, 4s, max 30s)
- Fallback: si `EventSource` no está disponible o falla 3 veces seguidas, degradar a polling cada 60s

### Slice 4 — Integración en NotificationsDropdown

- Reemplazar `setInterval(30000)` por `useNotificationStream()`
- Al recibir evento SSE: actualizar badge, mostrar toast de preview con título de la notificación
- Mantener polling de `/api/notifications/unread-count` como fallback explícito (intervalo 120s)

## Out of Scope

- WebSockets — SSE es suficiente para notificaciones unidireccionales
- Redis pub/sub o infraestructura adicional
- Push notifications de navegador (notificaciones del OS)
- Notificaciones en tiempo real para otras entidades que no sean el usuario autenticado

## Detailed Spec

### Formato SSE

```
event: notification
data: {"unreadCount": 3, "latestTitle": "Tu permiso fue aprobado"}

: keepalive
```

### Patrón de reconexión en cliente

```typescript
// useNotificationStream.ts
const connect = () => {
  const es = new EventSource('/api/notifications/stream')
  es.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data)
    setUnreadCount(data.unreadCount)
    if (data.latestTitle) toast.info(data.latestTitle)
  })
  es.onerror = () => {
    es.close()
    setTimeout(connect, backoff) // exponential backoff
  }
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Al aprobarse un permiso, el badge del dropdown actualiza en menos de 3 segundos sin que el usuario recargue la página
- [ ] El endpoint `/api/notifications/stream` devuelve 401 sin sesión válida
- [ ] Si la conexión SSE se corta, el cliente reconecta automáticamente y recupera el unread count
- [ ] El polling de fallback sigue funcionando si SSE falla 3 veces seguidas
- [ ] `pnpm lint` y `pnpm tsc --noEmit` pasan sin errores
- [ ] `pnpm test` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Test manual: abrir dos ventanas (admin + empleado), aprobar un permiso en admin, verificar que el badge del empleado actualiza en <3s
- Verificar que la reconexión ocurre al desconectar y reconectar la red

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con limitación de duración de SSE en Vercel
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

## Follow-ups

- TASK-387 — el stream SSE puede emitir notificaciones ya agrupadas
- TASK-388 — el toast de preview puede incluir acciones inline
- Evaluar migración a WebSockets si SSE no es suficiente a escala

## Open Questions

- ¿Cómo notifica `NotificationService.dispatch()` a la conexión SSE activa del usuario sin Redis? La solución más pragmática en Vercel serverless es un hybrid: SSE con timeout de 55s + el cliente reconecta, y en cada reconexión recibe el estado actual. Confirmar durante Discovery si esto es aceptable o si se requiere infraestructura adicional.
