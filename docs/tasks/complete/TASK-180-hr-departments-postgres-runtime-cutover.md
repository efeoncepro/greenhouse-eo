## Delta 2026-04-01 — auditoría live del cutover
- Verificación live en `greenhouse-pg-dev` y BigQuery dev:
  - `greenhouse_core.departments` existe pero hoy está vacío (`0` filas)
  - `greenhouse.departments` en BigQuery también está vacío (`0` filas)
  - `greenhouse_core.members.department_id` y `greenhouse.team_members.department_id` hoy no tienen valores poblados (`0` miembros con departamento en ambos stores)
- Consecuencia operativa:
  - en este entorno `dev` no hace falta backfill inicial de datos para cerrar el cutover
  - la task debe seguir dejando un carril idempotente de backfill/reconciliación para otros entornos, pero no debe asumir drift real ya existente en `dev`
- Restricción de schema confirmada:
  - `greenhouse_core.departments` **no** tiene columna `space_id`
  - `head_member_id` tampoco tiene FK real a `greenhouse_core.members(member_id)`; la integridad de ese vínculo debe endurecerse en esta lane si el cutover la exige
- Regla de tenancy corregida para esta lane:
  - `HR > Departments` sigue siendo un módulo interno del tenant `efeonce`
  - el aislamiento vigente se resuelve por `TenantContext` + route group/view access, no por filtro `space_id` en la tabla `greenhouse_core.departments`

## Delta 2026-04-01 — implementación cerrada
- Runtime cortado:
  - `src/lib/hr-core/service.ts` ya usa PostgreSQL para `listDepartments`, `getDepartmentById`, `createDepartment`, `updateDepartment`
  - `getHrCoreMetadata()` ya sirve departamentos desde PostgreSQL
  - `getMemberHrProfile()` y `updateMemberHrProfile()` ya resuelven/asignan `department_id` por el carril canónico Postgres
- Store y data lane:
  - nuevo store `src/lib/hr-core/postgres-departments-store.ts`
  - nuevo backfill idempotente `scripts/backfill-hr-departments-to-postgres.ts`
  - BigQuery `greenhouse.departments` queda sin writes operativos desde el módulo
- Integridad:
  - nueva migración `20260402001000000_hr-departments-head-member-fk.sql`
  - endurece `head_member_id -> greenhouse_core.members(member_id)` e índices de apoyo
- Verificación ejecutada:
  - `pnpm exec vitest run src/lib/hr-core/postgres-departments-store.test.ts src/lib/hr-core/service.test.ts src/app/api/hr/core/departments/route.test.ts src/app/api/hr/core/departments/[departmentId]/route.test.ts` ✅
  - `pnpm lint` ✅
  - `pnpm build` ✅
  - `pnpm exec tsc --noEmit --pretty false` ✅
- Validación DB cerrada:
  - `AGENTS.md` confirmó que el carril CLI correcto requiere Cloud SQL Auth Proxy
  - `pnpm pg:doctor --profile=runtime` y `--profile=migrator` pasaron por `127.0.0.1:15432`
  - `pnpm migrate:up` quedó aplicado y en estado `No migrations to run!`
  - `pnpm db:generate-types` regeneró `src/types/db.d.ts`

## Delta 2026-04-01
- TASK-184/TASK-185 (Database Tooling Foundation) ahora disponible: todo schema change de esta task debe ir como migración versionada via `pnpm migrate:create`. Usar `src/lib/db.ts` para nuevos queries tipados (Kysely).

# TASK-180 - HR Departments Postgres Runtime Cutover

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Implementada`
- Rank: `51`
- Domain: `hr / data / platform`

## Summary

Cortar `HR > Departments` y el runtime asociado de estructura organizacional a PostgreSQL como source of truth, alineando `greenhouse_core.departments` con `greenhouse_core.members` y retirando el write path operativo legacy sobre BigQuery.

El objetivo no es solo corregir el error visible `Unable to create department.`, sino cerrar la contradicción de dominio actual: `leave` y varias relaciones HR ya consumen departamentos desde Postgres, mientras `/hr/departments` todavía lee y escribe `greenhouse.departments` en BigQuery.

## Why This Task Exists

Hoy existe un drift estructural dentro de `HR Core`:

- `members` y el grafo humano que administra HR ya son Postgres-first o dependen fuertemente de `greenhouse_core`
- `leave` ya consume `greenhouse_core.departments` en [postgres-leave-store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/hr-core/postgres-leave-store.ts)
- pero `/hr/departments` sigue montado sobre queries a BigQuery en [service.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/hr-core/service.ts)

Ese split deja varios riesgos reales:

- fallos visibles en mutaciones por comportamiento de BigQuery con parámetros `NULL`
- joins operativos cruzados entre stores para `head_member_id` y `department_id`
- divergencia entre la lista administrable en `HR > Departments` y lo que consumen otros módulos HR
- imposibilidad de tratar `departments` como ancla organizacional canónica junto a `members`

La arquitectura vigente del repo ya apunta en otra dirección:

- [GREENHOUSE_POSTGRES_CANONICAL_360_V1.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md) declara `greenhouse_core.departments` dentro del core canónico
- [Greenhouse_HRIS_Architecture_v1.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/Greenhouse_HRIS_Architecture_v1.md) trata la estructura organizacional como parte del HRIS
- [setup-postgres-canonical-360.sql](/Users/jreye/Documents/greenhouse-eo/scripts/setup-postgres-canonical-360.sql) ya crea `greenhouse_core.departments`

La task existe para cerrar esa incoherencia y evitar que `departments` siga siendo una isla legacy BigQuery-first dentro de un dominio que ya evolucionó a Postgres.

## Goal

- Convertir `greenhouse_core.departments` en source of truth operativo para `HR > Departments`
- Cortar reads y writes de `/api/hr/core/departments` a PostgreSQL
- Alinear `departments`, `members`, `head_member_id` y `department_id` dentro del mismo store operacional
- Definir el destino del legacy BigQuery path: proyección downstream, snapshot histórico o retiro explícito

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- `greenhouse_core.departments` debe ser la ancla canónica del dominio organizacional interno
- `HR > Departments` no debe seguir escribiendo contra BigQuery una vez hecho el cutover
- BigQuery puede permanecer como downstream de analytics o compatibilidad transicional, pero no como write path operativo principal
- las relaciones `department_id` y `head_member_id` deben resolverse en el mismo store que `members`
- el cutover debe ser gradual y verificable; no asumir equivalencia de datos sin backfill/checks previos

## Dependencies & Impact

### Depends on

- `greenhouse_core.departments` ya definido en `scripts/setup-postgres-canonical-360.sql`
- `greenhouse_core.members` como ancla del `head_member_id` y `department_id`
- `src/lib/hr-core/postgres-leave-store.ts` como consumer existente de departamentos en Postgres
- `TASK-170` como lane ya cerrada que consolidó `leave` sobre PostgreSQL
- acceso sano a PostgreSQL (`pnpm pg:doctor --profile=runtime` y `--profile=migrator`) antes del cutover real

### Impacts to

- `/hr/departments`
- `/api/hr/core/departments`
- metadata HR usada por formularios y selectores de departamentos
- `getMemberHrProfile()` y updates de perfiles HR cuando resuelven `department_id`
- follow-ons HRIS que dependan de estructura organizacional: onboarding, document vault, performance, org charts futuros
- cualquier consumer que hoy asuma que `greenhouse.departments` en BigQuery sigue siendo la verdad operativa

### Files owned

- `src/lib/hr-core/service.ts`
- `src/lib/hr-core/shared.ts`
- `src/app/api/hr/core/departments/route.ts`
- `src/app/api/hr/core/departments/[departmentId]/route.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/hr-core/schema.ts`
- `src/types/hr-core.ts`
- `scripts/setup-postgres-canonical-360.sql`
- `scripts/backfill-hr-departments-to-postgres.ts`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

## Current Repo State

### Ya existe

- `greenhouse_core.departments` ya está modelado en PostgreSQL
- `leave` ya lee departamentos desde Postgres
- `members.department_id` ya referencia el mismo objeto organizacional canónico
- el portal ya tiene surface visible de administración en `/hr/departments`

### Gap actual

- `/hr/departments` sigue montado sobre BigQuery
- la mutación `createDepartment()` todavía usa `INSERT INTO \`${projectId}.greenhouse.departments\``
- existe riesgo de drift entre BigQuery y Postgres
- no hay contrato explícito de sync/backfill/cutover para departamentos
- la UI puede administrar un dataset distinto del que consumen otros slices HR

## Scope

### Slice 1 - Verificación y estrategia de datos

- auditar completitud entre `greenhouse.departments` en BigQuery y `greenhouse_core.departments` en PostgreSQL
- definir si el estado inicial requiere backfill BigQuery -> Postgres
- documentar reglas de reconciliación para:
  - `department_id`
  - `parent_department_id`
  - `head_member_id`
  - `business_unit`
  - `active`
  - `sort_order`
- dejar script idempotente de backfill si aplica

### Slice 2 - Store Postgres-first para Departments

- crear o extraer un store dedicado Postgres-first para departamentos dentro de `hr-core`
- mover `listDepartments`, `getDepartmentById`, `createDepartment` y `updateDepartment` a PostgreSQL
- reutilizar contratos de mapeo compatibles con `HrDepartment`
- asegurar validaciones de integridad:
  - `department_id` único
  - `parent_department_id` válido
  - `head_member_id` válido cuando exista

### Slice 3 - API y consumers HR

- cortar `/api/hr/core/departments` y el route detail a Postgres
- revisar `getHrCoreMetadata()` y demás consumers de departamentos para que no mezclen stores
- revisar `getMemberHrProfile()` y update flows de perfiles HR para que `department_id` resuelva desde el mismo carril
- preservar compatibilidad del payload público del módulo

### Slice 4 - Legacy BigQuery path y proyección downstream

- decidir y documentar qué pasa con `src/lib/hr-core/schema.ts` y el provisioning legacy de `greenhouse.departments`
- retirar writes operativos a BigQuery
- si analytics aún necesita la tabla legacy, definir carril de publicación downstream desde Postgres
- dejar explícito si `greenhouse.departments` queda:
  - read-only histórico
  - sincronizado por proyección
  - o deprecado para futuros consumers

### Slice 5 - Testing, observabilidad y rollout

- agregar tests de store y API para create/update/list sobre Postgres
- cubrir regresión del caso raíz: departamento padre `null`
- validar permisos y responses de error del módulo
- documentar rollout y rollback operativo

## Out of Scope

- rediseñar la UI de `/hr/departments`
- implementar org chart visual o árboles drag-and-drop
- canonizar todavía `business_unit` como dominio independiente
- migrar todo `HR Core` completo a Postgres en una sola lane
- reabrir `TASK-026` ni mezclar esta lane con contract types

## Acceptance Criteria

- [x] existe una estrategia explícita de completitud/backfill entre BigQuery y PostgreSQL para departamentos
- [x] `/api/hr/core/departments` lee desde PostgreSQL
- [x] create/update de departamentos escriben en PostgreSQL
- [x] `HR > Departments` deja de depender del write path BigQuery-first
- [x] `head_member_id` y `department_id` quedan alineados con `greenhouse_core.members`
- [x] el legacy BigQuery path queda clasificado como downstream, histórico o deprecado
- [x] hay tests de regresión para create/list/update del módulo
- [x] `pnpm lint` pasa
- [x] `pnpm test` cubre el slice nuevo
- [x] `pnpm exec tsc --noEmit --pretty false` no introduce errores nuevos

## Verification

- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `pnpm lint`
- `pnpm test`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- smoke manual en `/hr/departments`:
  - crear departamento raíz
  - crear subdepartamento
  - editar responsable
  - verificar reflejo correcto en perfiles HR y consumers relacionados

Resultado de este turno:

- `pnpm exec vitest run src/lib/hr-core/postgres-departments-store.test.ts src/lib/hr-core/service.test.ts src/app/api/hr/core/departments/route.test.ts src/app/api/hr/core/departments/[departmentId]/route.test.ts` ✅
- `pnpm lint` ✅
- `pnpm build` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm pg:doctor --profile=runtime` ✅
- `pnpm pg:doctor --profile=migrator` ✅
- `pnpm migrate:up` ✅
- `pnpm db:generate-types` ✅

## Follow-ups

- evaluar un task posterior de `HR Core Postgres Runtime Consolidation` si más superficies del módulo siguen BigQuery-first
- si BigQuery sigue siendo consumer analítico, modelar outbox/proyección explícita en vez de dual-write silencioso
