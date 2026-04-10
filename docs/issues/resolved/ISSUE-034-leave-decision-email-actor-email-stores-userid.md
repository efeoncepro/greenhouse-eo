# ISSUE-034 — Email de decision de permiso guarda userId en columna actor_email

## Ambiente

production + staging

## Detectado

2026-04-09, auditoria de codigo del flujo de emails de permisos

## Sintoma

La columna `actor_email` en `greenhouse_notifications.email_deliveries` contiene valores tipo `user-clx1234...` en vez de direcciones de email validas, para los registros de tipo `leave_request_decision`.

## Causa raiz

En `src/lib/sync/projections/notifications.ts:454`, al enviar el email `leave_request_decision` al solicitante, se pasa `actorUserId` como `actorEmail`:

```typescript
actorEmail: actorUserId ?? undefined  // BUG: es un user ID, no un email
```

Mientras que en la linea 484, el email `leave_review_confirmation` usa correctamente el email real del actor:

```typescript
actorEmail: actorRecipient.email  // CORRECTO
```

## Impacto

- **Data quality:** la columna `actor_email` en `email_deliveries` tiene datos semanticamente incorrectos para registros `leave_request_decision`
- **Auditoria:** si se usa `actor_email` para filtrar o buscar, los registros de decision de permiso no aparecerian al buscar por email
- **No afecta UX:** el email se envia correctamente al destinatario; solo el campo de tracking/audit es incorrecto

## Solucion

Resolver el email real del actor (reviewer) antes de pasarlo como `actorEmail`. Reutilizar la misma resolucion que ya se hace para `leave_review_confirmation` — obtener el `actorRecipient` via `getUserNotificationRecipient(actorUserId)` y usar su email.

## Verificacion

1. Aprobar o rechazar una solicitud de permiso
2. Verificar en `email_deliveries` que el registro de `leave_request_decision` tiene un email valido en `actor_email` (no un user ID)
3. Verificar que el email `leave_review_confirmation` sigue registrando el email correcto

## Estado

resolved — 2026-04-09

## Relacionado

- `src/lib/sync/projections/notifications.ts:454` — linea con el bug
- `src/lib/email/delivery.ts:151` — campo `actorEmail` en `createDeliveryRow`
- ISSUE-033 — descubierto en la misma auditoria
