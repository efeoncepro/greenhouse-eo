# TASK-390 — Notificaciones In-App: Broadcast Admin

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-386`
- Branch: `task/TASK-390-notifications-broadcast-admin`
- Legacy ID: none
- GitHub Issue: none

## Summary

No hay forma de que un admin envíe una notificación in-app a todos los usuarios, a un segmento (ej. "todos los colaboradores de Efeonce", "todos los contactos del cliente X") o a un usuario específico sin escribir código. Esta task agrega un endpoint de broadcast admin y una UI mínima en el Admin Center para componer y despachar notificaciones manuales — anuncios de mantenimiento, novedades operativas, alertas de plataforma.

## Why This Task Exists

Hoy si Efeonce necesita comunicar una ventana de mantenimiento o un cambio operativo urgente, las opciones son: email manual, WhatsApp, o push a GitHub. Ninguna llega al portal donde los usuarios están trabajando. El sistema de notificaciones in-app tiene toda la infraestructura para este caso — falta solo el canal de entrada para que un admin dispare el mensaje sin deploy.

## Goal

- Endpoint `POST /api/admin/notifications/broadcast` que crea notificaciones para un segmento de usuarios
- UI en Admin Center con formulario de composición (título, cuerpo, categoría, segmento target)
- Preview de recipients antes de enviar
- Registro en audit log con el admin que disparó el broadcast

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — solo `efeonce_admin` puede hacer broadcast
- `src/config/notification-categories.ts` — categorías disponibles para broadcast

Reglas obligatorias:

- Solo `efeonce_admin` puede hacer broadcast — `requireAdminTenantContext()` con verificación de role
- El broadcast nunca sobrescribe preferencias — si el usuario tiene `in_app_enabled: false` para esa categoría, no recibe la notificación
- Límite de recipients por request: 500 (para evitar timeouts en Vercel)
- El audit log debe incluir: admin_user_id, segment, recipient_count, timestamp, título

## Normative Docs

- `src/lib/notifications/notification-service.ts` — `NotificationService.dispatch()` a llamar en loop
- `src/lib/tenant/authorization.ts` — `requireAdminTenantContext()`
- `src/config/notification-categories.ts` — categorías disponibles
- `src/views/greenhouse/admin/` — estructura de vistas admin existentes

## Dependencies & Impact

### Depends on

- `greenhouse_notifications.notifications` — tabla destino del broadcast
- `greenhouse_notifications.notification_log` — registro del broadcast
- `TASK-386` (SSE) — idealmente los recipients reciben la notificación en real-time

### Blocks / Impacts

- TASK-294 (Novedades) — el broadcast puede ser el mecanismo de distribución de novedades a clientes

### Files owned

- `src/app/api/admin/notifications/broadcast/route.ts` — nuevo endpoint
- `src/views/greenhouse/admin/AdminNotificationBroadcastView.tsx` — nueva vista
- `src/app/(dashboard)/admin/notifications/broadcast/page.tsx` — nueva página admin

## Current Repo State

### Already exists

- `src/lib/notifications/notification-service.ts` — dispatch individual ya funcional
- `src/lib/tenant/authorization.ts` — guards de admin disponibles
- `src/config/notification-categories.ts` — catálogo de categorías
- `src/views/greenhouse/admin/` — patrón de vistas admin para replicar
- `greenhouse_notifications.notification_log` — audit log disponible

### Gap

- No existe endpoint de broadcast admin
- No existe UI de composición de notificaciones manuales
- No hay segmentación de recipients (todos, por role, por tenant)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Endpoint de broadcast

- Crear `POST /api/admin/notifications/broadcast`
- Body: `{ title, body, category, actionUrl?, segment: 'all' | 'collaborators' | 'clients' | 'tenant:{tenantId}' | 'user:{userId}' }`
- Requiere `requireAdminTenantContext()` + verificación de role `efeonce_admin`
- Resolver recipients según `segment`: query a `client_users` filtrada por role/tenant
- Llamar `NotificationService.dispatch()` para cada recipient (respetando preferencias)
- Registrar en `notification_log` con `channel = 'broadcast_admin'`
- Responder con `{ dispatched: N, skipped: N, broadcastId }`

### Slice 2 — Vista de composición en Admin Center

- Crear `AdminNotificationBroadcastView.tsx`
- Campos: título (max 80 chars), cuerpo (max 300 chars, textarea), categoría (select de categorías admin-eligibles), segmento (radio group), URL de acción (opcional)
- Preview: al seleccionar segmento, mostrar conteo estimado de recipients
- Botón de envío con confirmación: "Estás a punto de enviar a N usuarios. ¿Confirmar?"
- Al éxito: mostrar resumen `{ dispatched, skipped }` y opción de ver log

### Slice 3 — Historial de broadcasts

- `GET /api/admin/notifications/broadcasts` — listar broadcasts enviados desde `notification_log WHERE channel = 'broadcast_admin'`
- Mostrar en la vista admin: fecha, admin, segmento, título, dispatched/skipped

## Out of Scope

- Broadcast por email simultáneo (se agrega en follow-up)
- Scheduling de broadcasts (enviar en el futuro)
- Segmentación avanzada (ej. por Space, por capability)
- Templates predefinidos de mensajes

## Detailed Spec

### Segmentos disponibles

```typescript
type BroadcastSegment =
  | 'all'                    // todos los usuarios activos
  | 'collaborators'          // users con role collaborator en efeonce_internal
  | 'clients'                // todos los usuarios tipo client
  | `tenant:${string}`       // todos los usuarios de un tenant específico
  | `user:${string}`         // un usuario específico (para testing)
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un admin puede enviar una notificación a "todos los colaboradores" desde Admin Center sin código
- [ ] El endpoint rechaza con 403 a usuarios que no son `efeonce_admin`
- [ ] Las preferencias de usuario se respetan — si deshabilitó la categoría, no recibe la notificación
- [ ] El historial de broadcasts muestra el admin que envió, el segmento y el resultado
- [ ] El endpoint con segmento `user:{id}` funciona para testing en staging
- [ ] `pnpm lint` y `pnpm tsc --noEmit` pasan
- [ ] `pnpm test` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Test manual: enviar broadcast de prueba a `user:{agentUserId}` en staging y verificar que aparece en el dropdown

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

## Follow-ups

- TASK-294 (Novedades): el broadcast puede ser el canal de publicación de novedades hacia clientes
- Agregar canal email al broadcast (enviar notificación + email simultáneamente)
- Segmentación avanzada por Space o capability
