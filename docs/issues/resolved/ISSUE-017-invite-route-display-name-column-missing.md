# ISSUE-017 — invite/route.ts consulta columna inexistente `display_name` en clients

## Ambiente

production + staging

## Detectado

2026-04-06, revision de codigo end-to-end del modulo de emails

## Sintoma

El email de invitacion dice "te invito a unirte al equipo de **Greenhouse**" en vez del nombre real del cliente (ej: "Efeonce Group"). El nombre del cliente nunca se muestra correctamente en ningun email de invitacion.

## Causa raiz

`src/app/api/admin/invite/route.ts` linea 91 ejecuta:

```sql
SELECT display_name FROM greenhouse_core.clients WHERE client_id = $1
```

La tabla `greenhouse_core.clients` no tiene columna `display_name` — tiene `client_name` (confirmado en Kysely types `db.d.ts` linea 283). El query falla silenciosamente (devuelve 0 rows), y el fallback en linea 95 asigna `'Greenhouse'` como nombre.

## Impacto

- **Todos los emails de invitacion** en produccion muestran "Greenhouse" en vez del nombre del cliente
- El email pierde contexto — el usuario invitado no sabe a que organizacion se esta uniendo
- Afecta la conversion de onboarding (el usuario puede ignorar el email por falta de contexto)

## Solucion

Cambiar `display_name` por `client_name` en la query:

```sql
SELECT client_name FROM greenhouse_core.clients WHERE client_id = $1
```

Y actualizar linea 95:

```typescript
const clientName = clients[0]?.client_name || 'Greenhouse'
```

Fix de 1 linea, sin migracion.

## Verificacion

1. Invitar un usuario desde Admin
2. Verificar que el email muestra el nombre real del cliente
3. Verificar en `greenhouse_notifications.email_deliveries` que el context incluye el nombre correcto

## Estado

resolved — fix en `develop` (TASK-269 email hardening). Query corregida a `client_name`. Resolución: 2026-04-07.

## Relacionado

- `src/app/api/admin/invite/route.ts`
- TASK-267 (reenviar onboarding — usa el mismo flujo)
