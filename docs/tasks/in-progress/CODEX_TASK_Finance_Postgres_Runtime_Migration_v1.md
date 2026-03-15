# CODEX TASK — Finance PostgreSQL Runtime Migration (v1)

## Resumen

Esta task abre la lane de migracion operacional de `Finance` hacia PostgreSQL.

No reemplaza `CODEX_TASK_Financial_Module_v2.md`.
La complementa.

`v2` sigue siendo el brief de cierre funcional y QA del modulo.
Esta `v1` se enfoca en sacar a `Finance` del write path en BigQuery.

Rutas activas:
- `/finance`
- `/finance/income`
- `/finance/expenses`
- `/finance/suppliers`
- `/finance/clients`
- `/finance/reconciliation`

Objetivo de esta task:
- mover tablas y writes operativos de `Finance` a PostgreSQL
- mantener las lecturas analiticas pesadas en BigQuery mientras sea sano
- dejar contratos API estables para frontend

## Delta 2026-03-15 Slice 1 materializado

Primer corte ya ejecutado:
- schema `greenhouse_finance` materializado en Cloud SQL
- tablas activas:
  - `accounts`
  - `suppliers`
  - `exchange_rates`
- vista 360 agregada:
  - `greenhouse_serving.provider_finance_360`
- repository nuevo:
  - `src/lib/finance/postgres-store.ts`
- rutas ya en `Postgres first`:
  - `GET/POST /api/finance/accounts`
  - `PUT /api/finance/accounts/[id]`
  - `GET/POST /api/finance/exchange-rates`
  - `GET /api/finance/exchange-rates/latest`
  - `GET/POST /api/finance/exchange-rates/sync`
  - `GET /api/finance/expenses/meta` para cuentas
- backfill ejecutado desde BigQuery:
  - `accounts`: `1`
  - `suppliers`: `2`
  - `exchange_rates`: `0`

Decisión 360 aplicada:
- `suppliers` se modeló como extension operativa de `providers`
- el backfill materializa `financial_vendor` en `greenhouse_core.providers`
- la relación `provider -> supplier` queda expuesta en `provider_finance_360`

Boundary deliberado:
- `suppliers` no se cortó todavía a PostgreSQL en runtime principal
- razón: `AI Tooling` sigue consumiendo `greenhouse.fin_suppliers` en BigQuery y no conviene romper ese bridge en esta misma tanda

## Por que esta lane existe ahora

`Finance` ya recibio varias tandas de hardening y QA.
El siguiente cuello estructural ya no es la UI sino el store:
- conciliacion y movimientos siguen siendo mutables en BigQuery
- cuentas, proveedores, ingresos y egresos siguen sujetos a las limitaciones del warehouse
- el modulo todavia mezcla runtime operacional con calculos analiticos

La direccion correcta ya esta decidida en arquitectura:
- `PostgreSQL` para estados operativos y workflows mutables
- `BigQuery` para marts, conformed, historico y reporting

## Estado actual de partida

### Ya existe

- backend de `Finance` funcional y QAeado
- contratos canonicos para:
  - `clientId`
  - `memberId`
  - `providerId`
  - `payrollEntryId`
- sync diario de tipo de cambio
- bridge `Supplier -> Provider`
- foundation `greenhouse_core` y `greenhouse_sync`

### Todavia no existe

- schema `greenhouse_finance` en PostgreSQL
- repository `Finance -> PostgreSQL`
- corte de conciliacion a `Postgres first`
- separacion limpia entre:
  - tablas operativas mutables
  - marts y vistas analiticas

## Alineacion obligatoria con arquitectura

Revisar antes de implementar:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`

Reglas obligatorias:
- `Finance` sigue siendo owner de su dominio transaccional
- `client_id`, `member_id` y `provider_id` siguen siendo los anchors canonicos
- no usar `supplier_id`, `client_profile_id` o `hubspot_company_id` como identidad universal nueva
- no mover dashboards 360 pesados a PostgreSQL por default

## Scope de esta task

### 1. Materializar schema operativo

Crear `greenhouse_finance` en PostgreSQL con el subset operativo del modulo:
- `accounts`
- `suppliers`
- `client_profiles` si sigue siendo necesario como compat layer
- `income`
- `expenses`
- `reconciliation_periods`
- `bank_statement_rows`
- `exchange_rates`

### 2. Crear repository layer

Crear store y helpers dedicados, por ejemplo:
- `src/lib/finance/postgres-store.ts`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/postgres-income.ts`
- `src/lib/finance/postgres-expenses.ts`

Objetivo:
- encapsular SQL
- poder migrar rutas por slices
- no mezclar queries de Postgres dentro de handlers

### 3. Cortar write path operativo

Migrar a `Postgres first`:
- creacion/edicion de cuentas
- creacion/edicion de suppliers
- creacion/edicion de income
- creacion/edicion de expenses
- pagos de income
- conciliacion completa:
  - periodos
  - import de extractos
  - match
  - unmatch
  - exclude
  - auto-match

### 4. Mantener analitica donde convenga

Durante fase 1:
- `dashboard/summary`
- `dashboard/cashflow`
- `dashboard/aging`
- `dashboard/by-service-line`

pueden seguir leyendo marts o agregados existentes si eso reduce riesgo.

La regla es:
- writes y estados mutables en PostgreSQL
- reporting pesado puede seguir en BigQuery hasta que exista sync consolidado

### 5. Preparar publicacion a BigQuery

Los writes relevantes deben quedar listos para emitir eventos en:
- `greenhouse_sync.outbox_events`

Eso habilitara despues:
- marts financieros
- reporting historico
- reconciliacion analitica

## No scope

- rediseño UI de `Finance`
- reescribir widgets del dashboard si el contrato no cambia
- reemplazar todos los marts financieros en esta misma task
- mover HubSpot o Notion raw a PostgreSQL
- redefinir el modelo 360 de cliente fuera de la arquitectura vigente

## Boundary segura para trabajo en paralelo

Archivos y zonas permitidas:
- `src/lib/finance/**`
- `src/app/api/finance/**`
- `scripts/setup-postgres-finance*.{sql,ts}`
- `scripts/backfill-postgres-finance*.{sql,ts}`
- docs de `Finance` relacionados

No deberia tocar:
- `src/lib/payroll/**`
- `src/app/api/hr/payroll/**`
- `src/lib/hr-core/**`
- `scripts/setup-bigquery-source-sync*`

## Dependencias cruzadas

Depende de:
- `greenhouse_core.clients`
- `greenhouse_core.members`
- `greenhouse_core.providers`
- `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` para el futuro desacople de CRM/Delivery live reads

Puede avanzar en paralelo con:
- `CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md`
- `CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`

## Entregables esperados

- schema `greenhouse_finance` materializado
- repository PostgreSQL funcional
- rutas operativas `Finance` en `Postgres first`
- fallback controlado durante rollout
- notas claras de que endpoints siguen temporariamente sobre BigQuery por ser analiticos

## Criterios de aceptacion

### Runtime operativo

- se puede crear y editar supplier
- se puede crear y editar income
- se puede registrar pago de income
- se puede crear y editar expense
- se puede crear periodo de conciliacion
- se puede importar extracto
- se puede hacer match, unmatch, exclude y auto-match

### Infra

- `Finance` deja de depender de DDL o writes runtime en BigQuery
- las rutas mutables no hacen `CREATE`, `ALTER`, `MERGE` ni bootstrap mutante en request-time
- Preview puede correr sobre PostgreSQL sin romper los endpoints existentes

### Datos

- todas las relaciones siguen ancladas a ids canonicos
- `provider_id` sobrevive al corte supplier/runtime
- exchange rates quedan persistidos en el store operativo o en un bridge claro hacia este

## Primeros archivos sugeridos

- `src/lib/finance/shared.ts`
- `src/lib/finance/reconciliation.ts`
- `src/lib/finance/canonical.ts`
- `src/app/api/finance/reconciliation/**`
- `src/app/api/finance/income/**`
- `src/app/api/finance/expenses/**`
- `src/app/api/finance/suppliers/**`
- `src/app/api/finance/accounts/**`

## Handoff recomendado para Claude

Si Claude toma esta lane:
- debe tratar `Finance` como modulo operativo, no como dashboard-only
- debe evitar mover widgets analiticos a PostgreSQL antes de tener sync listo
- debe privilegiar el corte de estados mutables y conciliacion
- cualquier cambio UI se deja para una fase separada salvo que sea indispensable para mantener contratos
