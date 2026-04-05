# TASK-228 - Employee Legacy Role Code Convergence

## Delta 2026-04-05
- Dependencia TASK-225 cerrada — `employee` y `finance_manager` formalmente marcados como deprecated en la spec canónica
- Ruta de convergencia documentada en `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` §7
- Esta task puede comenzar sin blockers

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Status real: `Diseño`
- Rank: `[pending]`
- Domain: `identity / platform`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Converger el role code legacy `employee` hacia `collaborator` y `finance_manager` hacia `finance_admin` + `finance_analyst`, alineando seeds, TypeScript, runtime y documentación.

## Why This Task Exists

`GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` sección 7 documenta drift reconocido:

- `employee` sigue vivo en runtime tipado, pero el contrato visible ya privilegia `collaborator`
- `finance_manager` sigue vivo en runtime tipado, pero la taxonomía target distingue `finance_analyst` y `finance_admin`

Estos legacy codes crean ambiguedad: `employee` deriva `routeGroups: ['internal', 'employee']` pero no tiene bloque propio de vistas. Nuevos módulos no saben si usar `employee` o `collaborator`.

## Goal

- Marcar `employee` y `finance_manager` como explícitamente deprecated en código
- Migrar usuarios con `employee` a `collaborator` 
- Migrar usuarios con `finance_manager` a `finance_admin` o `finance_analyst` según corresponda
- Eliminar los codes legacy del runtime activo (mantener en TypeScript como deprecated)

## Scope

### Slice 1 - Auditoría

- Contar usuarios con `employee` asignado
- Contar usuarios con `finance_manager` asignado
- Documentar impacto en route groups si se eliminan

### Slice 2 - Migración

- Script de migración: `employee` → `collaborator` (preservando otros roles)
- Script de migración: `finance_manager` → `finance_admin` (o split según perfil)
- Verificación post-migración de acceso

### Slice 3 - Limpieza

- Marcar en `role-codes.ts` como `@deprecated`
- Remover de `ROLE_ROUTE_GROUPS` o dejar como alias temporal
- Actualizar seeds y fixtures
- Actualizar docs

## Dependencies & Impact

### Depends on

- `TASK-225 - Internal Roles, Hierarchies & Approval Ownership Model`

### Impacts to

- `src/config/role-codes.ts`
- `src/lib/tenant/role-route-mapping.ts`
- `src/lib/admin/view-access-catalog.ts`
- Seeds y fixtures de desarrollo

### Files owned

- `docs/tasks/to-do/TASK-228-employee-legacy-role-convergence.md`
- `src/config/role-codes.ts`
- `src/lib/tenant/role-route-mapping.ts`
- Scripts de migración

## Acceptance Criteria

- [ ] Cero usuarios con `employee` como único role code
- [ ] Cero usuarios con `finance_manager` como único role code
- [ ] Codes marcados como `@deprecated` en TypeScript
- [ ] Runtime funciona sin regresión de acceso
- [ ] Docs actualizados

## Verification

- `pnpm build`
- `pnpm lint`
- Auditoría pre/post de usuarios y sus route groups efectivos
