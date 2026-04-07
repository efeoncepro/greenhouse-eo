# ISSUE-027 — My Profile vacío tras migración a Person 360: resolución "me" retorna 404

## Ambiente

staging

## Detectado

2026-04-07, reporte directo del usuario tras merge de TASK-273 Phase F a develop.

## Síntoma

La vista `/my/profile` muestra todo vacío: sin avatar, sin cargo, sin departamento, sin asignaciones, sin leave requests, sin colegas en equipos. Todas las tabs (Perfil, Equipos, Proyectos, Colegas) aparecen sin datos.

## Causa raíz

`resolvePersonIdentifier()` en `src/lib/person-360/resolve-eo-id.ts` (línea 28) construía el WHERE clause como:

```sql
WHERE member_id = $1 OR user_id = $1
```

**Nunca incluía `identity_profile_id = $1`.**

Cuando un usuario real inicia sesión, su JWT contiene `identityProfileId` (e.g. `identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes`). La ruta `/api/person/me/360` resuelve "me" usando `tenant.identityProfileId ?? tenant.memberId ?? tenant.userId`. Para usuarios internos con identity link, `identityProfileId` toma prioridad.

El resolver pasaba ese identityProfileId a `resolvePersonIdentifier()`, que buscaba en `member_id` y `user_id` — pero el valor es un `identity_profile_id`, así que la query retornaba 0 rows → el resolver retornaba null → el endpoint retornaba 404 → la vista mostraba todo vacío.

Todas las demás funciones que consultan `person_360` (e.g. `getPersonProfile()`, `fetchIdentityFacet()`) SÍ buscan directamente por `identity_profile_id`. Solo esta función compartida de resolución de identifiers tenía el gap.

## Impacto

- `/my/profile` completamente roto para TODOS los usuarios internos con `identityProfileId` en su sesión (100% de colaboradores Efeonce).
- Solo afecta staging (TASK-273 Phase F no se había mergeado a producción).
- El endpoint 360 funcionaba correctamente cuando se invocaba con `member_id` directo (e.g. `julio-reyes`), enmascarando el bug durante las pruebas de staging con el agente E2E.

## Solución

Agregar `identity_profile_id = $1` al WHERE clause de `resolvePersonIdentifier()`:

```sql
-- Antes
WHERE member_id = $1 OR user_id = $1

-- Después
WHERE identity_profile_id = $1 OR member_id = $1 OR user_id = $1
```

Commit: `e12198da` — `fix(person-360): add identity_profile_id to resolvePersonIdentifier WHERE clause`

## Verificación

- `pnpm staging:request '/api/person/identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes/360?facets=identity,assignments,leave'` → HTTP 200, datos completos
- `resolvedDisplayName: "Julio Reyes"`, `resolvedAvatarUrl` presente, `resolvedJobTitle: "Managing Director & GTM"`
- 6 team members con avatares reales en faceta assignments
- 4 leave requests con paginación correcta
- Deploy `dpl_CtpTZKeYnjhDsaY5trEJfXFn3MAU` READY y asignado a `dev-greenhouse.efeoncepro.com`

## Estado

resolved

## Relacionado

- TASK-273 — Person Complete 360 federated serving layer (Phase F: consumer migration)
- `src/lib/person-360/resolve-eo-id.ts` — archivo modificado
- ISSUE-026 — incidente anterior en My Profile (crash por leave.requests nested object)
