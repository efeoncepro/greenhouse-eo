# TASK-1071 — Cleanup: revocar el viewCode legacy `administracion.design_system`

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `chore`
- Epic: `—`
- Status real: `Bloqueada hasta que TASK-1070 llegue a producción`

## Problem

TASK-1070 movió el Design System de `/admin/design-system` a `/design-system` y el
viewCode de `administracion.design_system` a `plataforma.design_system`. Por
seguridad de **deploy-ordering** sobre el Cloud SQL compartido (`greenhouse-pg-dev`,
usado por todos los runtimes), la migración de TASK-1070 dejó el viewCode legacy
`administracion.design_system` **activo + granted** — revocarlo mientras producción
corre el código viejo (que aún lee ese viewCode y sirve `/admin/design-system`)
rompería el acceso de los admins en producción hasta el deploy del código nuevo.

El legacy quedó como dead-weight inofensivo. Este cleanup lo retira.

## Precondition (BLOQUEANTE)

**No ejecutar hasta que TASK-1070 esté desplegado a producción** (develop → main),
es decir, cuando ningún runtime sirva ya `/admin/design-system` ni lea el viewCode
`administracion.design_system`. Verificar que el código nuevo (ruta `/design-system`
+ viewCode `plataforma.design_system`) esté live en producción antes de aplicar.

## Solution

Migración append-only (View Registry Governance Pattern) que marca el viewCode legacy
como retirado, SIN borrar filas:

```sql
-- Up
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1071'
WHERE view_code = 'administracion.design_system';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1071'
WHERE view_code = 'administracion.design_system';

-- Down: restaurar granted=TRUE + active=TRUE para el legacy.
```

## Dependencies & Impact

- **Depende de:** TASK-1070 desplegado a producción.
- **Impacta a:** ninguno (el viewCode legacy ya no lo lee ningún código tras TASK-1070).

## Verification

- `pnpm migrate:up` aplica sin error.
- `SELECT granted FROM role_view_assignments WHERE view_code='administracion.design_system'`
  → todos `FALSE`.
- Acceso a `/design-system` sigue funcionando para colaboradores + admins (vía el
  viewCode nuevo `plataforma.design_system`).
- Reliability: cero warnings `role_view_fallback_used` sobre el viewCode nuevo.
