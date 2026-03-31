# TASK-059 — Provider Canónico Cross-Module para Tooling, Finance, Costos y Payroll

## Delta 2026-03-30
- La premisa original de esta task quedó corregida contra arquitectura, modelo de datos y runtime:
  - no corresponde crear `greenhouse_core.tool_providers`
  - la identidad canónica vigente ya es `greenhouse_core.providers`
  - `greenhouse_finance.suppliers` es extensión Finance del provider
  - `greenhouse_ai.tool_catalog`, `member_tool_licenses`, `credit_wallets` y `credit_ledger` siguen siendo runtime transaccional del dominio tooling, no tablas a mover al core
- Se cerró el gap reactivo que faltaba alrededor del provider:
  - `provider.upserted`
  - `finance.supplier.created`
  - `finance.supplier.updated`
  - nueva proyección `provider_tooling`
  - nuevo snapshot mensual `greenhouse_serving.provider_tooling_snapshots`
  - nueva vista latest-state `greenhouse_serving.provider_tooling_360`
- La sinergia con costos, finanzas y payroll ya no queda implícita:
  - `provider_tooling` consume tooling inventory + licencias + usage ledger + expenses Finance + exposure payroll mensual
  - `/api/finance/analytics/trends?type=tools` ya usa el snapshot canónico provider-centric en vez de agrupar por `supplier_name`/`description`
- Aterrizaje UI del objeto canónico:
  - `Finance > Suppliers` pasa a ser la home visible del lens `provider 360`
  - el listado muestra cobertura de vínculo canónico `supplier -> provider`
  - el detalle del supplier suma tab `Provider 360` con KPIs, composición de costo y proveniencia del snapshot
  - el tab nuevo ya abre drilldowns hacia `Finance Expenses`, `AI Tooling` y `Payroll`
  - `AI Tooling` acepta `providerId` y `tab` por query string para sostener la navegación contextual desde Finanzas

## Estado

Completa.

## Problema real corregido

La versión original de la task asumía un estado viejo del repo:

1. Proponía una identidad nueva `tool_providers` cuando el portal ya tiene `greenhouse_core.providers`.
2. Proponía mover licencias y ledger al core cuando el patrón vigente es:
   - identidad compartida en `greenhouse_core`
   - workflow transaccional de tooling en `greenhouse_ai`
   - extensión payable en `greenhouse_finance`
3. Trataba la sinergia cross-module como diseño futuro, aunque `TASK-057`, Cost Intelligence y People ya consumían eventos de tooling cost.

La corrección arquitectónica es:

- `Provider` sigue siendo el objeto canónico compartido.
- `Supplier` sigue siendo el perfil Finance del provider.
- `Tool`, `License`, `Wallet` y `Ledger` siguen siendo entidades del runtime AI/tooling.
- la expansión correcta no era crear otra identidad, sino materializar una lectura provider-centric reusable y reactiva.

## Implementación cerrada

### 1. Identidad canónica preservada

- Se mantuvo `greenhouse_core.providers` como ancla única del objeto.
- `upsertProviderFromFinanceSupplierInPostgres()` ahora además publica `provider.upserted`.

### 2. Finance ya emite eventos de supplier

- `seedFinanceSupplierInPostgres()` ahora publica:
  - `finance.supplier.created`
  - `finance.supplier.updated`
- Esto cierra el hueco reactivo del bridge `supplier_id -> provider_id`.

### 3. Snapshot provider-centric mensual

Nueva materialización:

- `greenhouse_serving.provider_tooling_snapshots`

Nueva vista latest-state:

- `greenhouse_serving.provider_tooling_360`

Métricas materializadas por `provider_id` y período:

- inventario de tools
- tools activos
- licencias activas
- miembros activos con licencias
- wallets totales y activas
- costo mensual estimado por suscripción
- costo mensual usage-based desde ledger
- gasto Finance ligado al provider vía supplier
- cantidad de miembros con nómina afectados por ese provider
- masa de costo payroll asociada a miembros licenciados
- costo total provider-centric del período

### 4. Proyección reactiva nueva

Nueva proyección:

- `src/lib/sync/projections/provider-tooling.ts`

Domain:

- `finance`

Triggers principales:

- `provider.upserted`
- `finance.supplier.created`
- `finance.supplier.updated`
- `ai_tool.created`
- `ai_tool.updated`
- `ai_license.created`
- `ai_license.reactivated`
- `ai_license.updated`
- `ai_wallet.created`
- `ai_wallet.updated`
- `ai_wallet.credits_consumed`
- `finance.expense.created`
- `finance.expense.updated`
- `finance.license_cost.updated`
- `finance.tooling_cost.updated`
- `payroll_period.calculated`
- `payroll_period.approved`
- `payroll_period.exported`
- `payroll_entry.upserted`

Evento saliente nuevo por snapshot materializado:

- `provider.tooling_snapshot.materialized`

### 5. Consumer real actualizado

Se cortó un consumer que todavía leía semántica vieja:

- `GET /api/finance/analytics/trends?type=tools`

Antes:

- agrupaba por `supplier_name` o `description`

Ahora:

- consume `greenhouse_serving.provider_tooling_snapshots`
- agrupa por `provider_name`
- expone además `activeLicenseCount` y `activeMemberCount`

## Contrato resultante

`Provider` ahora responde operativamente:

- qué vendor/plataforma es
- qué tools dependen de él
- qué supplier profile lo representa en Finance
- cuántas licencias activas tiene
- cuánto costo mensual concentra por suscripción, usage y expenses
- cuántos miembros payroll-scoped están expuestos a ese provider

Esto deja al provider listo para follow-ons de:

- dashboard de providers
- procurement / renewals
- compliance tooling
- explain surfaces de costo por vendor

## Acceptance Criteria

- [x] La task ya no asume `tool_providers` ni una identidad paralela al provider canónico.
- [x] `provider.upserted` existe para cambios del objeto canónico desde Finance supplier bridge.
- [x] `finance.supplier.created/updated` existen para cambios estructurales Finance ↔ Provider.
- [x] Existe snapshot reactivo mensual provider-centric con tooling + finance + payroll exposure.
- [x] Existe vista latest-state reusable para consumers futuros.
- [x] Existe evento saliente por materialización del snapshot.
- [x] Existe al menos un consumer real leyendo la capa nueva.
- [x] Existe surface visible en Finanzas para leer el provider canónico desde supplier detail.
- [x] Existe drilldown contextual desde Finanzas hacia `AI Tooling` y `Expenses`.
- [x] `pnpm exec vitest run src/lib/providers/provider-tooling-snapshots.test.ts src/lib/sync/projections/provider-tooling.test.ts src/lib/sync/event-catalog.test.ts`
- [x] `pnpm exec vitest run 'src/app/api/finance/suppliers/[id]/route.test.ts' src/views/greenhouse/finance/SupplierProviderToolingTab.test.tsx`
- [x] `pnpm exec eslint src/lib/providers/provider-tooling-snapshots.ts src/lib/providers/provider-tooling-snapshots.test.ts src/lib/providers/postgres.ts src/lib/finance/postgres-store.ts src/lib/sync/projections/provider-tooling.ts src/lib/sync/projections/provider-tooling.test.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts src/app/api/finance/analytics/trends/route.ts`
- [x] `pnpm exec tsc --noEmit --pretty false`

## Dependencies & Impact

- **Depende de:** `greenhouse_core.providers`, `greenhouse_finance.suppliers`, `greenhouse_ai.tool_catalog`, `greenhouse_ai.member_tool_licenses`, `greenhouse_ai.credit_wallets`, `greenhouse_ai.credit_ledger`
- **Depende de:** `TASK-057`, `TASK-162`, `TASK-067` a `TASK-071`
- **Impacta a:** Finance analytics, procurement/provider governance, Cost Intelligence, People/loaded cost, futuros dashboards provider-centric
- **Archivos owned:**
  - `src/lib/providers/postgres.ts`
  - `src/lib/providers/provider-tooling-snapshots.ts`
  - `src/lib/sync/projections/provider-tooling.ts`
  - `scripts/setup-postgres-canonical-360.sql`
  - `src/app/api/finance/analytics/trends/route.ts`

## Notas de arquitectura

- Esta task no mueve tablas de tooling al core.
- Esta task no redefine `supplier_id` como identidad global.
- Esta task institucionaliza al provider como hub canónico y deja las demás entidades en sus dominios correctos.
- `src/lib/providers/monthly-snapshot.ts` sigue existiendo como carril legacy aislado, pero al cierre de esta task no tiene consumers activos detectados fuera de su propio archivo; queda como deuda técnica separada, no como remanente bloqueante de `TASK-059`.
- La verificación visual autenticada del slice nuevo fue intentada en local, pero el entorno respondió con redirección a `/login`; la task se considera cerrada porque el contrato, la navegación, la reactividad y la cobertura automática quedaron completos.
