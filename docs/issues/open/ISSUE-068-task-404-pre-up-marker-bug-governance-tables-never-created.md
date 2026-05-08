# ISSUE-068 — TASK-404 governance tables never created (pre-up-marker bug)

## Estado

Open

## Ambiente

Greenhouse EO — Postgres `greenhouse-pg-dev` (Cloud SQL `efeonce-group:us-east4`).

## Detectado

2026-05-08, durante discovery de TASK-611 (recalibración pre-execution V1.1 del spec
`GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1`).

## Síntoma

TASK-404 (`docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md`) está
marcado como cerrado en el README, pero las 3 tablas que el spec declara como entregables
no existen en Postgres:

- `greenhouse_core.role_entitlement_defaults`
- `greenhouse_core.user_entitlement_overrides`
- `greenhouse_core.entitlement_governance_audit_log`

Verificación: `grep "GreenhouseCoreRoleEntitlement\\|GreenhouseCoreUserEntitlement\\|GreenhouseCoreEntitlementGovernance" src/types/db.d.ts` retorna 0 matches. `kysely-codegen` introspect 378 tablas en Postgres y ninguna corresponde a las 3 tablas governance.

## Causa raíz

Pre-up-marker bug en `migrations/20260417044741101_task-404-entitlements-governance.sql`.
Las sentencias `CREATE TABLE` están bajo el marker `-- Down Migration` en lugar de bajo `-- Up Migration`. La sección Up del archivo está vacía.

```sql
-- Up Migration

-- Down Migration
CREATE TABLE greenhouse_core.role_entitlement_defaults (...)
CREATE TABLE greenhouse_core.user_entitlement_overrides (...)
CREATE TABLE greenhouse_core.entitlement_governance_audit_log (...)
```

Cuando `node-pg-migrate` corre la migration:

1. Parsea el archivo buscando `-- Up Migration` para identificar la sección Up.
2. La sección Up queda vacía (no SQL entre `-- Up Migration` y `-- Down Migration`).
3. Registra la migration en `pgmigrations` como aplicada SIN ejecutar las CREATE TABLE.

Es exactamente el patrón anti-regresión documentado en `CLAUDE.md` ("Database — Migration markers (anti pre-up-marker bug)") y que TASK-768 Slice 1 también encontró históricamente.

## Impacto

**Magnitud**: alto a futuro, bajo hoy.

- **Hoy**: el runtime de entitlements de Greenhouse es 100% pure-function (compone capabilities desde `roleCodes + routeGroups + authorizedViews` en cada request). No depende de las governance tables. Por eso el sistema funciona sin ellas.
- **Bloquea**: cualquier feature que dependa de overrides finos persistidos por usuario o defaults configurables por rol (Admin Center > Gobernanza de acceso). Esa surface está construida en UI pero los writes no llegan a ningún lado.
- **Bloquea (TASK-611 V1)**: la decisión Slice 2 de NO agregar FK desde grants persistidos a `capabilities_registry` se origina aquí — la tabla canónica de grants no existe.
- **Layer 5 audit log**: el spec V1 §5 layer 5 referencia `entitlement_grant_audit_log` (TASK-404). Como la tabla no existe, ese layer está ausente. La projection de TASK-611 es read-only, así que no requiere audit log propio (el gap es para el Admin Center mutations).

Cualquier feature futura que asuma que estas tablas existen va a romper silenciosamente — `INSERT INTO greenhouse_core.role_entitlement_defaults` falla con `relation does not exist`.

## Solución

Crear una migration nueva (no editar la legacy — está aplicada) que reuse el SQL de `20260417044741101_task-404-entitlements-governance.sql` pero bajo `-- Up Migration` correctamente:

1. Copiar SQL de `CREATE TABLE` desde la migration legacy.
2. Crear nuevo file `pnpm migrate:create task-404-fix-governance-tables-pre-up-marker`.
3. Pegar el SQL bajo `-- Up Migration`.
4. Agregar `DO $$ ... RAISE EXCEPTION` block que verifica `information_schema.tables` (anti-recurrencia).
5. Agregar `GRANT SELECT, INSERT, UPDATE, DELETE` a `greenhouse_runtime` per la migration original.
6. Down migration: `DROP TABLE` de las 3 tablas (idempotente con `IF EXISTS`).
7. `pnpm pg:connect:migrate` aplica.
8. `pnpm db:generate-types` regenera Kysely types.
9. Verificar manualmente que las 3 nuevas interfaces aparecen en `db.d.ts`.

Una vez aplicado, abrir TASK derivada para:
- Conectar el Admin Center UI (TASK-404 surfaces) a writes reales.
- Wire del consumer reactivo de `access.entitlement_*_changed` a invalidación de cache (TASK-611 Slice 6 ya está listo para esto).
- Considerar agregar FK desde `role_entitlement_defaults.capability` y `user_entitlement_overrides.capability` a `capabilities_registry.capability_key` (cierra defense-in-depth Layer 1 que TASK-611 V1 dejó deferred).

## Verificación

Post-fix:

```bash
pnpm db:generate-types
grep "GreenhouseCoreRoleEntitlementDefaults\\|GreenhouseCoreUserEntitlementOverrides\\|GreenhouseCoreEntitlementGovernanceAuditLog" src/types/db.d.ts
# Debe retornar 3 matches.

pnpm pg:doctor  # OK
```

Manual:

```sql
SELECT count(*) FROM greenhouse_core.role_entitlement_defaults;
SELECT count(*) FROM greenhouse_core.user_entitlement_overrides;
SELECT count(*) FROM greenhouse_core.entitlement_governance_audit_log;
-- Las 3 deben devolver 0 rows (tabla creada pero vacía hasta seed).
```

## Relacionado

- `docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md` — task de origen.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` Delta 2026-04-17 — declara las 3 tablas como contrato.
- `docs/tasks/in-progress/TASK-611-organization-workspace-facet-projection-entitlements-foundation.md` — discovery que detectó el bug.
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Delta 2026-05-08 — recalibración V1.1 que documenta este gap.
- `CLAUDE.md` — sección "Database — Migration markers (anti pre-up-marker bug)" (regla canónica que esta migration violó).
- `migrations/20260417044741101_task-404-entitlements-governance.sql` — archivo bugged (línea 1: `-- Up Migration` / línea 3: `-- Down Migration` con CREATE TABLE debajo).

## Siguiente paso

Esta issue queda Open. La fix vive como TASK derivada (P2) — no es bloqueante para TASK-611 ni para operación diaria del portal. El documento sirve como auditoría del hallazgo y el contrato de remediación cuando se priorice.
