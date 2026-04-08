# TASK-283 — Finance Bank & Treasury Module

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-283-finance-bank-treasury`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Modulo de tesoreria que consolida saldos reales por cuenta bancaria, tarjeta y fintech con saldos materializados reactivamente, transferencias internas, coverage de asignacion, discrepancia vs extracto y posicion multi-moneda con exposicion cambiaria. Construido sobre la infraestructura de payment instruments (TASK-281), settlement ledger (TASK-282) y reconciliacion existente.

## Why This Task Exists

Hoy no hay una vista unificada de tesoreria. La informacion de cuentas esta dispersa:

- **Cash Position** muestra agregados globales pero no desglosa por cuenta
- **Reconciliacion** tiene detalle por periodo/cuenta pero es un flujo operativo de matching, no una vista de saldos
- **Payment ledgers** registran cobros y pagos con `payment_account_id` pero no se agrupan por cuenta
- **Settlement legs** tienen `instrument_id` pero no existe agregacion

El resultado: el CFO no puede responder "cuanto tiene cada cuenta" sin entrar a 3 superficies distintas. No hay saldo materializado, no hay snapshot auditable, no hay forma de registrar transferencias entre cuentas propias sin distorsionar el flujo neto, y no hay alerta cuando el saldo calculado difiere del extracto bancario.

## Goal

- Vista `/finance/bank` con saldos por cuenta, ingresos/salidas del periodo, estado de conciliacion
- Tabla `account_balances` materializada reactivamente desde outbox events
- Transferencias internas entre cuentas propias sin afectar flujo neto
- Coverage visible: % de pagos con instrumento asignado + asignacion retroactiva
- Discrepancia: delta entre saldo Greenhouse y extracto bancario por cuenta
- Posicion multi-moneda: equivalente CLP consolidado, exposicion cambiaria, FX gain/loss por cuenta
- Seccion de tarjetas de credito: cupo CLP/USD, consumo, cupo disponible
- Snapshot auditable de saldo por periodo (cierre mensual)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — modulo Finance canonical
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — dual-store patterns
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — patron de materializacion reactiva
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — eventos outbox disponibles
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — migration framework

Reglas obligatorias:

- Migracion ANTES del deploy
- `account_balances` se materializa reactivamente, no con cron
- El saldo persistido es la fuente de verdad para la UI; el calculo on-the-fly es solo recovery/backfill
- Transferencias internas no deben afectar ingresos ni egresos netos
- Snapshots de cierre son inmutables una vez cerrados
- No crear conexiones DB fuera de `src/lib/postgres/client.ts`

## Normative Docs

- `docs/documentation/finance/modulos-caja-cobros-pagos.md` — doc funcional de caja (actualizar al cerrar)
- `docs/tasks/complete/TASK-280-finance-cash-modules-ingresos-egresos.md` — payment ledgers
- `docs/tasks/complete/TASK-281-payment-instruments-registry-fx-tracking.md` — instruments + FX

## Dependencies & Impact

### Depends on

- `greenhouse_finance.accounts` — tabla de instrumentos con `instrument_category`, `provider_slug`, `opening_balance` (TASK-281, complete)
- `greenhouse_finance.income_payments` — `payment_account_id` vincula cobros a cuentas (TASK-280, complete)
- `greenhouse_finance.expense_payments` — `payment_account_id` vincula pagos a cuentas (TASK-280, complete)
- `greenhouse_finance.settlement_groups` / `settlement_legs` — ledger de movimientos por instrumento (TASK-282, in-progress)
- `greenhouse_finance.fin_reconciliation_periods` — periodos de conciliacion por cuenta/mes
- `greenhouse_finance.fin_bank_statement_rows` — extractos bancarios importados
- Outbox events: `finance.income_payment.recorded`, `finance.expense_payment.recorded`
- Exchange rate infrastructure: `resolveExchangeRateToClp()`, `/api/finance/exchange-rates/latest`

### Blocks / Impacts

- `TASK-245` (Finance Signal Engine) — puede consumir `account_balances` para alertas de tesoreria
- `TASK-282` (Reconciliation & Settlement) — Banco lee de settlement_legs y reconciliation_periods
- Cash Position view (`/finance/cash-position`) — puede simplificarse delegando detalle por cuenta a Banco

### Files owned

- `migrations/YYYYMMDDHHMMSS_create-account-balances.sql`
- `src/lib/finance/account-balances.ts` (materializacion + readers)
- `src/lib/finance/internal-transfers.ts` (registro de transferencias)
- `src/app/api/finance/bank/route.ts` (GET consolidado)
- `src/app/api/finance/bank/[accountId]/route.ts` (detalle + movimientos)
- `src/app/api/finance/bank/transfer/route.ts` (POST transferencia interna)
- `src/views/greenhouse/finance/BankView.tsx` (vista principal)
- `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`
- `src/views/greenhouse/finance/components/InternalTransferDrawer.tsx`

## Current Repo State

### Already exists

- `greenhouse_finance.accounts` con 10 columnas de instrumentos, logos, metadata_json (TASK-281)
- `income_payments` y `expense_payments` con `payment_account_id`, `exchange_rate_at_payment`, `amount_clp`, `fx_gain_loss_clp`
- `settlement_groups` y `settlement_legs` con `instrument_id`, `counterparty_instrument_id`, `leg_type` incluyendo `internal_transfer` (TASK-282)
- `fin_reconciliation_periods` con `account_id`, `opening_balance`, `closing_balance_bank`, `closing_balance_system`, `difference`, `status`
- `fin_bank_statement_rows` con `match_status`, `matched_payment_id`, `matched_settlement_leg_id`
- `PaymentInstrumentChip` componente con logos SVG de 20 proveedores
- Reactive projection infrastructure: 4 projections activas con outbox + ops-worker
- `resolveExchangeRateToClp()` y `resolveExchangeRate()` bidireccional
- Cash Position view con grafico 12 meses y KPIs globales
- Navigation menu con seccion Flujo bajo Finanzas

### Gap

- No existe tabla `account_balances` — saldo por cuenta no esta materializado
- No hay endpoint que agregue ingresos/salidas por cuenta
- No hay forma de registrar transferencias internas (movimiento entre cuentas propias)
- No hay vista que muestre saldo por cuenta con desglose
- No hay coverage tracking de `payment_account_id` (pagos sin cuenta asignada son invisibles)
- No hay comparacion automatica saldo Greenhouse vs extracto bancario por cuenta
- No hay snapshot de cierre mensual de saldo por cuenta
- No hay vista especifica de tarjetas de credito con cupos y consumo
- No hay exposicion cambiaria ni FX gain/loss por cuenta individual

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema & Materialization

- Crear tabla `greenhouse_finance.account_balances`:
  - `balance_id` (PK, UUID)
  - `account_id` (FK → accounts, NOT NULL)
  - `balance_date` (date, NOT NULL)
  - `currency` (text, NOT NULL)
  - `opening_balance` (numeric, default 0)
  - `period_inflows` (numeric, default 0) — entradas del dia/periodo
  - `period_outflows` (numeric, default 0) — salidas del dia/periodo
  - `closing_balance` (numeric, default 0) — opening + inflows - outflows
  - `closing_balance_clp` (numeric) — equivalente CLP al tipo de cambio del dia
  - `fx_rate_used` (numeric) — tipo de cambio aplicado
  - `fx_gain_loss_clp` (numeric, default 0) — resultado cambiario acumulado de la cuenta
  - `transaction_count` (integer, default 0)
  - `last_transaction_at` (timestamptz)
  - `computed_at` (timestamptz, default now)
  - `is_period_closed` (boolean, default false) — snapshot inmutable despues de cierre
  - `closed_by_user_id` (text)
  - `closed_at` (timestamptz)
  - UNIQUE constraint: `(account_id, balance_date)`
- Crear funcion `materializeAccountBalance(accountId, date)` en `src/lib/finance/account-balances.ts`:
  - Lee `opening_balance` de accounts (si es primer periodo) o `closing_balance` del dia anterior
  - Agrega settlement_legs del dia WHERE `instrument_id = accountId` (con fallback a payment ledgers si settlement_legs no esta poblado)
  - UPSERT en `account_balances`
  - Calcula `closing_balance_clp` via `resolveExchangeRateToClp()`
- Registrar projection `finance.account_balance` en reactive infrastructure:
  - Trigger en `finance.income_payment.recorded` → recompute balance de la cuenta del pago
  - Trigger en `finance.expense_payment.recorded` → idem
- Backfill: materializar saldos historicos para todas las cuentas activas
- Grants a `greenhouse_app` y `greenhouse_runtime`

### Slice 2 — Internal Transfers

- Crear `src/lib/finance/internal-transfers.ts`:
  - `recordInternalTransfer({ fromAccountId, toAccountId, amount, currency, transferDate, reference, notes })`
  - Crea un `settlement_group` con `settlement_mode = 'internal'`
  - Crea 2 `settlement_legs`: uno `outgoing` desde cuenta origen, uno `incoming` a cuenta destino, ambos con `leg_type = 'internal_transfer'`
  - Publica evento `finance.internal_transfer.recorded`
  - Recomputa saldo de ambas cuentas
- Crear endpoint `POST /api/finance/bank/transfer`:
  - Validacion: cuentas deben existir, activas, monedas compatibles o con FX
  - Si monedas distintas: registrar `fx_conversion` leg adicional
- Agregar evento al catalogo y projections

### Slice 3 — API Consolidado

- Crear `GET /api/finance/bank`:
  - Query params: `year`, `month` (default: mes actual)
  - Para cada cuenta activa:
    - Leer `account_balances` del mes solicitado (o computar on-the-fly si no existe)
    - `period_inflows`, `period_outflows`, `closing_balance`
    - Estado de conciliacion: ultimo `fin_reconciliation_periods` de esa cuenta
    - Discrepancia: `closing_balance - closing_balance_bank` (del periodo de conciliacion)
    - Ultima actividad: `last_transaction_at`
  - KPIs globales:
    - Saldo total CLP (sum de closing_balance WHERE currency = 'CLP')
    - Saldo total USD
    - Equivalente CLP consolidado (CLP + USD * dolar observado)
    - Cuentas activas count
    - Coverage: % de pagos del periodo con `payment_account_id` asignado
    - Resultado cambiario global (sum de `fx_gain_loss_clp`)
  - Seccion tarjetas: accounts WHERE instrument_category = 'credit_card':
    - Cupo CLP / USD de metadata_json
    - Consumo del periodo (= outflows del periodo)
    - Cupo disponible = limite - consumo
- Crear `GET /api/finance/bank/[accountId]`:
  - Detalle de una cuenta: metadata completa, balance actual, historial de balances (12 meses)
  - Movimientos recientes: settlement_legs del periodo actual vinculados a esa cuenta
  - Reconciliacion: estado del periodo actual + link

### Slice 4 — Vista Principal (BankView)

- Crear `src/views/greenhouse/finance/BankView.tsx`:
  - **KPIs** (6 cards): Saldo CLP, Saldo USD, Equivalente CLP, Cuentas activas, Coverage, Resultado cambiario
  - **Tabla de cuentas** con TanStack React Table:
    - Columnas: Instrumento (logo), Categoria (chip), Moneda, Saldo apertura, Ingresos, Salidas, Saldo estimado, Discrepancia (chip rojo si > 0), Conciliacion (chip), Ultima actividad
    - Sorting por cualquier columna
    - Filtro por moneda, categoria, texto
    - Agrupacion visual: CLP arriba, USD abajo (o toggle flat)
  - **Seccion TC** (card separada o tab):
    - Tabla de tarjetas: nombre, red (logo), emisor (logo), cupo CLP, cupo USD, consumo, disponible
  - **Boton "Transferencia interna"** → abre InternalTransferDrawer
- Crear `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`:
  - Click en fila de tabla → drawer lateral con:
    - Header: logo + nombre + moneda + saldo actual
    - Mini chart: barras ingresos/salidas ultimos 6 meses (Recharts)
    - Timeline de movimientos del periodo actual
    - Estado de conciliacion + link directo
- Crear `src/views/greenhouse/finance/components/InternalTransferDrawer.tsx`:
  - Formulario: cuenta origen (select con logos), cuenta destino (select), monto, fecha, referencia, notas
  - Si monedas distintas: mostrar tipo de cambio y equivalente
- Crear page `src/app/(dashboard)/finance/bank/page.tsx`
- Agregar a navegacion: "Banco" en seccion Flujo despues de "Posicion de caja"
- Registrar viewCode `finanzas.banco` en view-access-catalog

### Slice 5 — Coverage & Asignacion Retroactiva

- En BankView, KPI de coverage: "X de Y pagos (Z%) tienen instrumento asignado"
- Si coverage < 100%: alert banner con "Hay N pagos sin cuenta asignada"
- Crear drawer `AssignAccountDrawer`:
  - Lista de pagos sin `payment_account_id` del periodo
  - Checkbox de seleccion multiple
  - Select de cuenta destino con logos
  - Boton "Asignar" → bulk UPDATE en payment ledgers
  - Recomputa saldos de la cuenta asignada

### Slice 6 — Period Close & Snapshot

- En AccountDetailDrawer, boton "Cerrar periodo" (solo si mes ya termino):
  - Marca `account_balances.is_period_closed = true`
  - Registra `closed_by_user_id` y `closed_at`
  - Una vez cerrado, no se puede modificar retroactivamente
- Si un pago retroactivo afecta un periodo cerrado: warning visible pero no bloquea (soft lock)
- En la tabla principal, chip "Cerrado" / "Abierto" por cuenta/mes

## Out of Scope

- Importacion de extractos bancarios (eso es Reconciliacion, ya existe)
- Conexion directa a APIs bancarias (follow-up futuro)
- Conciliacion row-by-row (ya existe en `/finance/reconciliation`)
- Alerts automaticas de tesoreria (TASK-245 Finance Signal Engine)
- Acceso granular por cuenta basado en `responsible_user_id` (follow-up, campo ya existe)

## Detailed Spec

### Schema: `account_balances`

```sql
CREATE TABLE IF NOT EXISTS greenhouse_finance.account_balances (
  balance_id          TEXT PRIMARY KEY,
  account_id          TEXT NOT NULL REFERENCES greenhouse_finance.accounts(account_id),
  balance_date        DATE NOT NULL,
  currency            TEXT NOT NULL,
  opening_balance     NUMERIC NOT NULL DEFAULT 0,
  period_inflows      NUMERIC NOT NULL DEFAULT 0,
  period_outflows     NUMERIC NOT NULL DEFAULT 0,
  closing_balance     NUMERIC NOT NULL DEFAULT 0,
  closing_balance_clp NUMERIC,
  fx_rate_used        NUMERIC,
  fx_gain_loss_clp    NUMERIC NOT NULL DEFAULT 0,
  transaction_count   INTEGER NOT NULL DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_period_closed    BOOLEAN NOT NULL DEFAULT FALSE,
  closed_by_user_id   TEXT,
  closed_at           TIMESTAMPTZ,
  UNIQUE (account_id, balance_date)
);

CREATE INDEX idx_account_balances_account_date
  ON greenhouse_finance.account_balances (account_id, balance_date DESC);

CREATE INDEX idx_account_balances_date
  ON greenhouse_finance.account_balances (balance_date);
```

### Materialization Strategy

```
Event: finance.income_payment.recorded
  → extract payment_account_id from payload
  → if payment_account_id exists:
      materializeAccountBalance(payment_account_id, payment_date)

Event: finance.expense_payment.recorded
  → same logic

Event: finance.internal_transfer.recorded
  → materializeAccountBalance(from_account_id, transfer_date)
  → materializeAccountBalance(to_account_id, transfer_date)
```

Fallback para periodo sin settlement_legs:
```sql
-- Inflows: cobros asignados a esta cuenta
SELECT COALESCE(SUM(amount), 0) AS inflows
FROM greenhouse_finance.income_payments
WHERE payment_account_id = $1
  AND payment_date >= $2 AND payment_date <= $3

-- Outflows: pagos asignados a esta cuenta
SELECT COALESCE(SUM(amount), 0) AS outflows
FROM greenhouse_finance.expense_payments
WHERE payment_account_id = $1
  AND payment_date >= $2 AND payment_date <= $3
```

### Internal Transfer Settlement Structure

```
settlement_group:
  group_direction: 'internal'
  settlement_mode: 'internal'
  source_payment_type: NULL
  source_payment_id: NULL
  primary_instrument_id: from_account_id

settlement_legs:
  [0] leg_type: 'internal_transfer', direction: 'outgoing',
      instrument_id: from_account_id, amount: X, currency: CLP
  [1] leg_type: 'internal_transfer', direction: 'incoming',
      instrument_id: to_account_id, amount: X, currency: CLP

-- Si hay FX (CLP→USD):
  [2] leg_type: 'fx_conversion', direction: 'outgoing',
      instrument_id: from_account_id, amount: X_CLP
  [3] leg_type: 'fx_conversion', direction: 'incoming',
      instrument_id: to_account_id, amount: X_USD, fx_rate: rate
```

### Coverage Calculation

```sql
WITH period_payments AS (
  SELECT payment_account_id
  FROM greenhouse_finance.income_payments
  WHERE payment_date >= $1 AND payment_date <= $2
  UNION ALL
  SELECT payment_account_id
  FROM greenhouse_finance.expense_payments
  WHERE payment_date >= $1 AND payment_date <= $2
)
SELECT
  COUNT(*) AS total,
  COUNT(payment_account_id) AS with_account,
  ROUND(COUNT(payment_account_id)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS coverage_pct
FROM period_payments
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Tabla `account_balances` creada con migracion versionada
- [ ] Materializacion reactiva: saldo se recomputa al registrar cobro, pago o transferencia
- [ ] Backfill: cuentas con historial de pagos tienen saldos materializados
- [ ] `GET /api/finance/bank` retorna saldos por cuenta, KPIs globales, coverage y seccion TC
- [ ] `GET /api/finance/bank/[accountId]` retorna detalle + movimientos + historial 12 meses
- [ ] `POST /api/finance/bank/transfer` registra transferencia interna entre cuentas
- [ ] BankView con tabla de cuentas, 6 KPIs, seccion TC, filtros por moneda/categoria
- [ ] AccountDetailDrawer con mini chart, timeline de movimientos, link a conciliacion
- [ ] InternalTransferDrawer funcional con soporte multi-moneda
- [ ] Coverage KPI visible + asignacion retroactiva masiva
- [ ] Discrepancia: delta vs extracto bancario visible en tabla
- [ ] Period close: snapshot inmutable por cuenta/mes
- [ ] Posicion multi-moneda: equivalente CLP + exposicion cambiaria
- [ ] FX gain/loss por cuenta individual
- [ ] Navegacion: "Banco" visible en seccion Flujo de Finance
- [ ] viewCode `finanzas.banco` registrado y accesible para admin y finance
- [ ] `pnpm build` y `pnpm lint` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Validacion manual:
  - Registrar pago con instrumento asignado → verificar saldo se actualiza reactivamente
  - Registrar transferencia interna CLP → verificar que saldo neto no cambia
  - Registrar transferencia interna CLP→USD → verificar FX y saldos en ambas cuentas
  - Verificar coverage: registrar pago sin cuenta → coverage baja
  - Asignar cuenta retroactivamente → saldo se recomputa
  - Cerrar periodo → verificar que queda inmutable
  - Verificar discrepancia: importar extracto con saldo distinto → chip rojo visible
  - Verificar seccion TC: cupo, consumo, disponible correcto

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` con schema account_balances, internal transfers, bank endpoints
- [ ] Actualizar `GREENHOUSE_EVENT_CATALOG_V1.md` con evento `finance.internal_transfer.recorded`
- [ ] Actualizar `docs/documentation/finance/modulos-caja-cobros-pagos.md` con seccion Banco
- [ ] Actualizar `project_context.md` con modulo Banco
- [ ] Regenerar `db.d.ts` post-migracion

## Follow-ups

- Integracion directa con APIs bancarias (Open Banking Chile cuando disponible)
- Acceso granular por cuenta basado en `responsible_user_id`
- Cash flow forecasting: proyeccion de saldos futuros basada en compromisos pendientes
- Alertas de tesoreria: saldo bajo, discrepancia alta, cupo TC agotandose (TASK-245)
- Reconciliacion automatica: auto-match de settlement_legs contra bank_statement_rows
- Dashboard ejecutivo de cash runway / burn rate
- Export: CSV / PDF de estado de cuentas por periodo

## Open Questions

- Granularidad de `account_balances`: diaria vs mensual. Propuesta: **diaria** para precision, con vista mensual como agregacion. El storage es bajo (~365 filas/cuenta/anio).
- Soft lock vs hard lock en period close: propuesta soft lock (warning pero no bloquea) para no frenar operaciones si un pago retroactivo llega tarde.
- Nombre del menu: "Banco" vs "Tesoreria" vs "Cuentas". Propuesta: **"Banco"** — corto, claro, diferenciado de "Cuentas" que ya existe en Admin.
