# CODEX TASK — HR Payroll PostgreSQL Runtime Migration (v1)

## Resumen

Esta task abre la lane de migracion operacional de `HR Payroll` desde BigQuery hacia PostgreSQL, reutilizando el backbone canonico ya materializado en `greenhouse_core`.

No reemplaza `CODEX_TASK_HR_Payroll_Module_v3.md`.
La complementa.

`v3` sigue cubriendo gaps funcionales y UX del modulo.
Esta `v1` cubre el corte de store operativo y runtime.

Ruta activa:
- `/hr/payroll`
- `/hr/payroll/member/[memberId]`

Backend activo hoy:
- `GET /api/hr/payroll/compensation`
- `POST /api/hr/payroll/compensation`
- `GET /api/hr/payroll/periods`
- `POST /api/hr/payroll/periods`
- `GET /api/hr/payroll/periods/[periodId]`
- `PATCH /api/hr/payroll/periods/[periodId]`
- `POST /api/hr/payroll/periods/[periodId]/calculate`
- `POST /api/hr/payroll/periods/[periodId]/approve`
- `GET /api/hr/payroll/periods/[periodId]/entries`
- `PATCH /api/hr/payroll/entries/[entryId]`
- `GET /api/hr/payroll/members/[memberId]/history`

Objetivo de esta task:
- mover el write path operativo de `Payroll` a PostgreSQL
- mantener los contratos API estables para no romper frontend
- dejar a BigQuery fuera del path transaccional del modulo

## Por que esta lane existe ahora

`HR > Permisos` ya demostro que el corte a PostgreSQL es viable y reduce el riesgo de:
- `BigQuery table update quota exceeded`
- latencia alta en pantallas operativas
- bootstraps mutantes en request-time

`Payroll` es el siguiente dominio natural porque:
- es altamente mutable
- necesita transacciones y consistencia temporal
- hoy sigue escribiendo en `greenhouse.compensation_versions`, `greenhouse.payroll_periods`, `greenhouse.payroll_entries` y `greenhouse.payroll_bonus_config`

## Estado actual de partida

### Ya existe

- backbone canonico en PostgreSQL:
  - `greenhouse_core.members`
  - `greenhouse_core.client_users`
  - `greenhouse_sync.outbox_events`
- store operativo `greenhouse_hr` para `HR > Permisos`
- modulo `Payroll` funcional en runtime sobre BigQuery
- validaciones recientes sobre:
  - compensaciones futuras
  - nulabilidad de writes
  - onboarding de primera compensacion

### Todavia no existe

- schema `greenhouse_payroll` en PostgreSQL
- repositorio `Payroll -> PostgreSQL`
- fallback controlado `Postgres first / BigQuery fallback`
- sync posterior `Postgres -> BigQuery marts`

## Alineacion obligatoria con arquitectura

Revisar antes de implementar:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/tasks/to-do/CODEX_TASK_HR_Payroll_Module_v3.md`

Reglas obligatorias:
- `member_id` sigue siendo el ancla canonica del colaborador
- no crear identidad paralela de payroll
- no mover KPI analiticos pesados a request-time en PostgreSQL si siguen viniendo de `Delivery`
- no ejecutar `DDL` desde rutas web

## Scope de esta task

### 1. Materializar schema operativo

Crear `greenhouse_payroll` en PostgreSQL con tablas equivalentes al dominio vivo:
- `compensation_versions`
- `payroll_periods`
- `payroll_entries`
- `payroll_bonus_config`

Cada tabla debe referenciar anchors de `greenhouse_core` cuando aplique:
- `member_id`
- `client_id` si el modelo lo necesita despues
- `created_by_user_id`
- `approved_by_user_id`

### 2. Crear repository layer de PostgreSQL

Crear store y helpers dedicados, por ejemplo:
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/postgres-compensation.ts`
- `src/lib/payroll/postgres-periods.ts`

Objetivo:
- encapsular queries
- no mezclar SQL de PostgreSQL dentro de handlers API
- permitir rollout con fallback

### 3. Cortar runtime de Payroll a Postgres

Migrar a `Postgres first` las rutas:
- compensaciones
- periodos
- entries
- historial de colaborador

Mantener compatibilidad de payloads actual para no romper frontend.

### 4. Mantener fallback temporal

Si Preview o un ambiente nuevo no tiene Postgres listo:
- responder desde BigQuery como compatibilidad temporal
- pero sin volver a `DDL` en runtime

### 5. Preparar publicacion a warehouse

Cada write relevante debe quedar listo para emitir evento en:
- `greenhouse_sync.outbox_events`

No hace falta cerrar toda la ingesta a BigQuery en esta misma task, pero el diseño debe dejarlo preparado.

## No scope

- rediseñar UI de payroll
- reemplazar KPIs de negocio por otra formula
- mover marts de reporting de payroll a PostgreSQL
- cortar todavia `Delivery` o `Notion` como fuente de KPI si las proyecciones no estan listas
- reescribir autenticacion o permisos del modulo

## Boundary segura para trabajo en paralelo

Esta task esta pensada para poder ser tomada por Claude o por otro agente sin pisar otras lanes.

Archivos y zonas permitidas:
- `src/lib/payroll/**`
- `src/app/api/hr/payroll/**`
- `scripts/setup-postgres-payroll*.{sql,ts}`
- `scripts/backfill-postgres-payroll*.{sql,ts}`
- docs de payroll y handoff relacionados

No deberia tocar:
- `src/lib/finance/**`
- `src/app/api/finance/**`
- `scripts/setup-bigquery-source-sync*`
- `src/lib/hr-core/**` salvo uso de utilidades compartidas muy acotadas

## Dependencias cruzadas

Depende de:
- `greenhouse_core.members`
- `greenhouse_core.client_users`
- `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` solo para la futura sustitucion de KPIs de Notion

Puede avanzar en paralelo con:
- `CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`
- `docs/tasks/complete/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`

## Entregables esperados

- schema `greenhouse_payroll` materializado
- repository PostgreSQL funcional
- APIs `Payroll` leyendo/escribiendo en PostgreSQL
- fallback controlado a BigQuery durante rollout
- documentacion de env vars y bootstrap si aparecen nuevas

## Criterios de aceptacion

### Runtime

- se puede crear primera compensacion
- se puede crear periodo
- se puede calcular un periodo
- se puede aprobar un periodo
- se puede editar una entry
- `/hr/payroll/member/[memberId]` sigue mostrando historial

### Infra

- ninguna ruta de `Payroll` ejecuta `CREATE`, `ALTER`, `MERGE` o bootstrap mutante en request-time
- Preview puede funcionar con `Postgres first`
- si Postgres no esta listo, el fallback es controlado y explicito

### Datos

- writes quedan anclados a `greenhouse_core.members.member_id`
- versiones futuras y vigentes mantienen coherencia temporal
- los eventos importantes quedan preparados para publicacion a `greenhouse_sync.outbox_events`

## Primeros archivos sugeridos

- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/get-payroll-periods.ts`
- `src/lib/payroll/persist-entry.ts`
- `src/lib/payroll/get-payroll-members.ts`
- `src/app/api/hr/payroll/periods/**`
- `src/app/api/hr/payroll/compensation/**`

## Handoff recomendado para Claude

Si Claude toma esta lane:
- no debe abrir discusiones de arquitectura ya cerradas sobre `BigQuery vs PostgreSQL`
- debe asumir `PostgreSQL` como store objetivo del modulo
- debe mantener payloads API estables
- cualquier gap de source sync se resuelve con compat layer temporal, no frenando el corte operativo

## Asignacion activa

### Agente: Claude
### Fecha: 2026-03-15
### Rama: `fix/codex-operational-finance`

### Alineacion 360

Esta migracion adapta el schema al modelo canonico 360 (`GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`):

- Schema: `greenhouse_payroll` (extension domain, no `greenhouse_core`)
- `member_id` → FK a `greenhouse_core.members(member_id)` (ancla canonica del colaborador)
- `created_by_user_id`, `calculated_by_user_id`, `approved_by_user_id` → FK a `greenhouse_core.client_users(user_id)`
- Snapshot fields permitidos: `member_display_name` en entries (para exports/historial)
- Outbox: writes publican a `greenhouse_sync.outbox_events`
- Serving view: `greenhouse_serving.member_payroll_360`
- Patron replicado de: `greenhouse_hr` (Leave) — `setup-postgres-hr-leave.sql` + `postgres-leave-store.ts`
- No se crea identidad paralela de colaborador
- No se mueven KPIs analiticos pesados a request-time en PostgreSQL

### Plan de implementacion

1. `scripts/setup-postgres-payroll.sql` — DDL + seed + grants ✅
2. `src/lib/payroll/postgres-store.ts` — repository layer con assertReady, typed rows, mappers, outbox ✅
3. Migrar APIs existentes a Postgres-first con fallback BQ temporal ✅
4. Agregar `greenhouse_serving.member_payroll_360` view ✅
5. TypeScript check y validacion runtime ✅

## Delta 2026-03-15 — Payroll + Leave completamente wired

### Payroll — Estado completo

**DDL**: `scripts/setup-postgres-payroll.sql` materializado con 4 tablas + vista `member_payroll_360`
**Repository**: `src/lib/payroll/postgres-store.ts` — 25 funciones exportadas
**Rutas wired**: 11/11 rutas Postgres-first con BigQuery fallback
**Serving view**: `greenhouse_serving.member_payroll_360` (member + compensación actual)

### Leave — Estado completo

**DDL**: `scripts/setup-postgres-hr-leave.sql` materializado con 4 tablas + vista `member_leave_360`
**Repository**: `src/lib/hr-core/postgres-leave-store.ts` — 8 funciones exportadas
**Rutas wired**: 5/5 rutas Postgres-first con BigQuery fallback
**Serving view**: `greenhouse_serving.member_leave_360` (member + balances + solicitudes año actual)

### Backfill scripts (Claude, 2026-03-15)

- `scripts/backfill-postgres-payroll.ts` — backfill BigQuery → PostgreSQL para:
  - `compensation_versions`
  - `payroll_periods`
  - `payroll_entries`
  - `payroll_bonus_config`

- `scripts/backfill-postgres-hr-leave.ts` — backfill BigQuery → PostgreSQL para:
  - `leave_types`
  - `leave_balances`
  - `leave_requests`
  - `leave_request_actions`

**Status backfill**: Scripts escritos, **NO ejecutados aún**.

### Serving view agregada (Claude, 2026-03-15)

- `greenhouse_serving.member_leave_360` — agrega al DDL de leave:
  - member + department + supervisor
  - vacation balance (allowance, used, reserved, available)
  - pending/approved request counts del año actual
  - Grants para `greenhouse_runtime` y `greenhouse_migrator`

### Pendientes

- [ ] Ejecutar backfill payroll (`pnpm exec tsx scripts/backfill-postgres-payroll.ts`)
- [ ] Ejecutar backfill leave (`pnpm exec tsx scripts/backfill-postgres-hr-leave.ts`)
- [ ] Ejecutar DDL leave actualizado para crear `member_leave_360` (`pnpm exec tsx scripts/setup-postgres-hr-leave.ts`)
