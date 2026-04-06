# ISSUE-018 — Usuario invitado se crea con status 'pending' en vez de 'invited'

## Ambiente

production + staging

## Detectado

2026-04-06, revision de codigo end-to-end del modulo de emails

## Sintoma

Los usuarios creados via invitacion tienen status `'pending'` en la base de datos, pero la logica de negocio (TASK-267, admin overview, filtros) asume que los usuarios invitados tienen status `'invited'`.

## Causa raiz

`src/app/api/admin/invite/route.ts` linea 54:

```sql
INSERT INTO greenhouse_core.client_users (email, full_name, client_id, status, auth_mode, created_at)
VALUES ($1, $2, $3, 'pending', 'credentials', now())
```

El status hardcodeado es `'pending'`. Sin embargo:
- `getAdminAccessOverview()` cuenta `COUNTIF(status = 'invited')` como KPI de usuarios invitados
- TASK-267 valida que el usuario este en estado `'invited'` para permitir reenvio
- El admin overview muestra "Invitados: 0" incluso cuando hay usuarios con invitaciones pendientes

## Impacto

- KPI "Usuarios invitados" en Admin siempre muestra 0
- TASK-267 (reenviar onboarding) no encontrara usuarios elegibles
- Inconsistencia entre el estado real del usuario y el estado esperado por el sistema

## Solucion

Cambiar el status a `'invited'` en el INSERT del invite route:

```sql
VALUES ($1, $2, $3, 'invited', 'credentials', now())
```

El flujo de `accept-invite` ya actualiza a `'active'` al completar el setup.

## Verificacion

1. Invitar un usuario nuevo
2. Verificar que su status en PG es `'invited'`
3. Verificar que el KPI de invitados en Admin refleja el conteo correcto
4. Completar el onboarding y verificar que el status cambia a `'active'`

## Estado

open

## Relacionado

- `src/app/api/admin/invite/route.ts`
- `src/app/api/account/accept-invite/route.ts`
- `src/lib/admin/get-admin-access-overview.ts` (KPI `invited_users`)
- TASK-267 (reenviar onboarding)
