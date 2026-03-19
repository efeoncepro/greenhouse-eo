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

## Delta 2026-03-15 Slice 2 materializado — Income, Expenses, Payments

Segundo corte ejecutado por Claude. Cubre el write path completo de income, expenses y pagos.

### Schema y DDL

- `scripts/setup-postgres-finance-slice2.sql` — DDL para 7 tablas + vista `income_360`
- `scripts/setup-postgres-finance-slice2.ts` — runner TypeScript
- `scripts/backfill-postgres-finance-slice2.ts` — backfill BigQuery → PostgreSQL (escrito, NO ejecutado aún)
- `scripts/setup-postgres-finance.sql` — actualizado con DDL Slice 2 inline

Tablas creadas en `greenhouse_finance`:
- `client_profiles` — perfiles de facturación
- `income` — facturas emitidas a clientes
- `income_payments` — pagos individuales (reemplaza JSON `payments_received` de BigQuery)
- `factoring_operations` — operaciones de factoring
- `expenses` — egresos operativos
- `reconciliation_periods` — periodos de conciliación
- `bank_statement_rows` — líneas de extractos bancarios

Vista serving:
- `greenhouse_finance.income_360` — income + client context + factoring

### Repository layer

- `src/lib/finance/postgres-store-slice2.ts` (~1100 líneas)
  - Readiness check independiente: `assertFinanceSlice2PostgresReady()` con TTL cache de 60s
  - Chequea 6 tablas requeridas sin depender de Slice 1
  - Exports principales:
    - `listFinanceIncomeFromPostgres()` — lista income con payments JOIN
    - `getFinanceIncomeFromPostgres()` — detalle income + payments array
    - `createFinanceIncomeInPostgres()` — insert income + outbox event
    - `createFinanceIncomePaymentInPostgres()` — insert payment + update income (transaccional con `FOR UPDATE`)
    - `listFinanceExpensesFromPostgres()` — lista expenses
    - `getFinanceExpenseFromPostgres()` — detalle expense
    - `createFinanceExpenseInPostgres()` — insert expense + outbox event
    - `listFinanceIncomePaymentsFromPostgres()` — payments standalone
    - `buildMonthlySequenceIdFromPostgres()` — genera sequence IDs (INC-2026-03-001)
  - Todos los writes publican a `greenhouse_sync.outbox_events`

### Rutas wired a Postgres-first

| Ruta | Método | Postgres-first | BigQuery fallback |
|------|--------|----------------|-------------------|
| `/api/finance/income` | GET | `listFinanceIncomeFromPostgres()` | BigQuery `fin_income` |
| `/api/finance/income` | POST | `createFinanceIncomeInPostgres()` | BigQuery INSERT |
| `/api/finance/income/[id]` | GET | `getFinanceIncomeFromPostgres()` | BigQuery SELECT |
| `/api/finance/income/[id]/payment` | POST | `createFinanceIncomePaymentInPostgres()` | BigQuery JSON update |
| `/api/finance/expenses` | GET | `listFinanceExpensesFromPostgres()` | BigQuery `fin_expenses` |
| `/api/finance/expenses` | POST | `createFinanceExpenseInPostgres()` | BigQuery INSERT |
| `/api/finance/expenses/[id]` | GET | `getFinanceExpenseFromPostgres()` | BigQuery SELECT |

Patrón de fallback: `try { postgres } catch { if (!shouldFallbackFromFinancePostgres(error)) throw; } // BigQuery fallback`

### Archivos de ruta modificados

- `src/app/api/finance/income/route.ts` — GET + POST wired
- `src/app/api/finance/income/[id]/route.ts` — GET wired
- `src/app/api/finance/income/[id]/payment/route.ts` — POST wired
- `src/app/api/finance/expenses/route.ts` — GET + POST wired
- `src/app/api/finance/expenses/[id]/route.ts` — GET wired

### Decisiones arquitectónicas Slice 2

1. **Income payments como tabla propia**: En BigQuery, payments era un JSON array `payments_received` dentro de `fin_income`. En Postgres, se normalizó a tabla `income_payments` con FK a `income.income_id`. El GET de income desde Postgres devuelve payments como array (JOIN + aggregation). BigQuery fallback sigue usando el JSON array.

2. **Readiness independiente**: `assertFinanceSlice2PostgresReady()` es separado de `assertFinancePostgresReady()` (Slice 1). Así un ambiente que solo tiene Slice 1 no se rompe al intentar usar Slice 2.

3. **PUT no migrado**: Los endpoints PUT de income y expenses siguen operando solo contra BigQuery. Razón: requieren lógica de resolución de contexto compleja (`resolveFinanceClientContext`, `resolveFinanceMemberContext`) que conviene migrar como un tercer slice separado.

4. **Sequence IDs**: `buildMonthlySequenceIdFromPostgres()` genera IDs como `INC-2026-03-001` usando `COUNT(*) + 1` dentro del mes. Si Postgres no está disponible, cae al `buildMonthlySequenceId()` de BigQuery.

### Backfill

Script `scripts/backfill-postgres-finance-slice2.ts` escrito pero **NO ejecutado**. Backfilla:
- `client_profiles` desde `fin_client_profiles`
- `income` desde `fin_income`
- `income_payments` desde JSON `payments_received` de `fin_income`
- `expenses` desde `fin_expenses`
- `reconciliation_periods` desde `fin_reconciliation_periods`
- `bank_statement_rows` desde `fin_bank_statement_rows`

### Pendientes Slice 2

- [ ] Ejecutar backfill (`pnpm exec tsx scripts/backfill-postgres-finance-slice2.ts`)
- [ ] Migrar PUT income y PUT expenses a Postgres-first
- [ ] Migrar reconciliation runtime (match/unmatch/exclude/auto-match)
- [ ] Verificar TypeScript: `pnpm tsc --noEmit` (pasó localmente antes del commit)

### Commit

- `8375edb` en `fix/codex-operational-finance` — pushed to origin

## Delta 2026-03-15 Consumers hybridizados para no romper provisioning live

Primer corte de consumers legacy ejecutado sobre `Finance > Clients`.

### Rutas ajustadas

- `GET /api/finance/clients`
- `GET /api/finance/clients/[id]`

### Patrón aplicado

- `canonical first`
  - `greenhouse_conformed.crm_companies`
  - `greenhouse_conformed.crm_deals`
  - `greenhouse.client_service_modules`
- `live fallback`
  - `hubspot_crm.companies`
  - `hubspot_crm.deals`

### Motivo

- El flujo `HubSpot -> Greenhouse` sigue promoviendo clientes en tiempo real cuando una empresa cambia de estado.
- Cortar estos consumers a `projection only` habría introducido desfase visible hasta que corriera el sync.

### Regla operativa derivada para el resto de Finance

- Mientras exista provisioning live, los consumers deben migrarse en modo híbrido.
- `sync-only` solo es válido cuando el dominio ya no depende de visibilidad en tiempo real.
- Archivos: 10 (1 nuevo + 9 modificados)

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
- `docs/tasks/to-do/CODEX_TASK_Financial_Module_v2.md`

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
- `docs/tasks/complete/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`

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
