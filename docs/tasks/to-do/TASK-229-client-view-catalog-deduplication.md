# TASK-229 - Client View Catalog Deduplication

## Delta 2026-04-05
- Dependencia TASK-225 cerrada — duplicados del catálogo cliente documentados en `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` §1.5 Drift #2
- Los 5 `viewCode` duplicados identificados: `cliente.equipo`, `cliente.revisiones`, `cliente.analytics`, `cliente.campanas`, `cliente.notificaciones`
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

Limpiar duplicados en el catálogo de vistas del portal cliente identificados en `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` sección 1.5 (Drift #2).

## Why This Task Exists

El registry de vistas en `view-access-catalog.ts` tiene duplicados en el bloque `cliente`:

- `cliente.equipo`
- `cliente.revisiones`
- `cliente.analytics`
- `cliente.campanas`
- `cliente.notificaciones`

Estos view codes aparecen repetidos, lo que causa inconsistencia en la gobernanza de acceso y puede generar permisos duplicados o conflictivos cuando se implementen overrides por vista.

## Goal

- Eliminar duplicados del catálogo de vistas cliente
- Verificar que cada `viewCode` es único globalmente
- Alinear el catálogo con las rutas reales del portal cliente

## Scope

### Slice 1 - Auditoría

- Listar todos los `viewCode` duplicados en `view-access-catalog.ts`
- Verificar cuáles corresponden a rutas reales vs phantom entries
- Documentar cuál entry conservar y cuál eliminar

### Slice 2 - Limpieza

- Eliminar entries duplicadas en `view-access-catalog.ts`
- Agregar validación en build/test que detecte duplicados
- Actualizar governance fallback si referencia los codes eliminados

## Dependencies & Impact

### Depends on

- `TASK-225 - Internal Roles, Hierarchies & Approval Ownership Model`

### Impacts to

- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/get-admin-view-access-governance.ts`
- Vista `/admin/views` (governance UI)

### Files owned

- `docs/tasks/to-do/TASK-229-client-view-catalog-deduplication.md`
- `src/lib/admin/view-access-catalog.ts`

## Acceptance Criteria

- [ ] Cero `viewCode` duplicados en el catálogo
- [ ] Validación automatizada que previene duplicados futuros
- [ ] Governance UI refleja catálogo limpio
- [ ] Sin regresión de acceso para usuarios cliente

## Verification

- `pnpm build`
- `pnpm lint`
- Verificar `/admin/views` muestra catálogo sin duplicados
