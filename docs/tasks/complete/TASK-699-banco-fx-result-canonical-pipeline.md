# TASK-699 — Banco "Resultado cambiario" Canonical FX P&L Pipeline

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La card "Resultado cambiario" en `/finance/bank` siempre muestra `$0` y nadie puede distinguir entre "sin exposición FX" (correcto) y "cálculo incompleto" (deuda). Este task introduce un pipeline canónico de FX P&L que captura las 3 fuentes legítimas (realized en pago, translation por revaluación de saldos no-CLP, realized por transferencias internas), separa columnas en `account_balances`, expone una VIEW reutilizable `greenhouse_finance.fx_pnl_breakdown`, un helper `src/lib/finance/fx-pnl.ts`, y reemplaza el cero silencioso por un estado UI honesto con breakdown por fuente.

## Why This Task Exists

Hoy `account_balances.fx_gain_loss_clp` mezcla un solo mecanismo (rate del documento vs rate del pago para invoices/expenses no-CLP). El consumidor `getBankOverview` suma esa columna y la muestra como "Resultado cambiario acumulado por cuenta", pero:

1. **Solo cubre 1 de 3 fuentes** de FX P&L canónico de tesorería.
2. **Translation FX** (revaluación de cuentas USD/UF/EUR al cierre del período) no se computa nunca, así un cliente con saldo USD verá $0 incluso si el tipo de cambio se mueve.
3. **Internal transfers** entre cuentas de monedas distintas no generan registro de spread vs rate de mercado.
4. **Cero silencioso**: la card no distingue entre "sin exposición FX" (caso Efeonce hoy: 100% CLP) y "cálculo incompleto / dato faltante". Mismo anti-patrón que `provisioning_status='pending_setup'` resolvió para Teams channels.
5. **Sin trazabilidad**: no hay forma de auditar el FX result acumulado — falta breakdown por fuente, por cuenta y serie temporal.

Análogo conceptual: ya tenemos este patrón resuelto en `income_settlement_reconciliation` (TASK-571) — un `amount_paid` que une 3 mecanismos legítimos vía VIEW + helper TS + guardia anti-divergencia. Hay que aplicarlo a FX result.

## Goal

- Pipeline canónico de FX P&L con 3 fuentes unificadas en una VIEW SQL reutilizable.
- `account_balances` con columnas separadas para realized (settlement) y translation (revaluación) FX, sin perder histórico.
- Helper TS `src/lib/finance/fx-pnl.ts` como única read API que consumers (UI, API, P&L de Finance Intelligence, Reliability signal) usan.
- UI Banco con estado honesto: "Sin exposición FX" cuando aplica, total + tooltip con breakdown cuando hay actividad, advertencia explícita cuando la materialización falla.
- Reliability signal `Finance FX Reconciliation` para detectar materialización detenida o rate ausente para cuentas no-CLP activas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- Migración aditiva. No romper contratos existentes — si hay rows en `account_balances.fx_gain_loss_clp` esos valores se preservan en la columna nueva `fx_gain_loss_realized_clp`.
- VIEW + helper único. Cualquier consumer que necesite FX P&L lo lee de `getBankFxPnlBreakdown` o de la VIEW canónica. No re-derivar la ecuación en SQL ad-hoc.
- Comments SQL documentando: ecuación canónica, tres fuentes, "no re-derivar", "extender VIEW + helper cuando aparezca un mecanismo nuevo".
- `captureWithDomain(err, 'finance', ...)` para cualquier excepción nueva.
- Patrón canónico copiado del existente `income_settlement_reconciliation` (TASK-571).

## Normative Docs

- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — matriz canónica de monedas, FX policy, currency registry.
- `migrations/20260426135618436_add-income-settlement-reconciliation-view.sql` — patrón canónico VIEW + comments + helper.
- `src/lib/finance/income-settlement.ts` — helper canónico a espejar.

## Dependencies & Impact

### Depends on

- `greenhouse_finance.account_balances` (migración `20260408120005013`)
- `greenhouse_finance.income_payments` y `expense_payments` con columnas `fx_gain_loss_clp`, `exchange_rate_at_payment`, `amount_clp` (migración `20260408091711953`)
- `greenhouse_finance.income.exchange_rate_to_clp` (migración `20260417190539017`)
- `resolveExchangeRateToClp` en `src/lib/finance/exchange-rates.ts`
- `RELIABILITY_REGISTRY` (`src/lib/reliability/registry.ts`)

### Blocks / Impacts

- Finance Intelligence P&L (cuando se construya el módulo, debe leer FX P&L de este pipeline)
- Reliability Control Plane: nueva fila "FX Reconciliation" en el dashboard
- Cualquier export/snapshot futuro del Banco view (Excel, PDF)

### Files owned

- `migrations/<timestamp>_task-699-fx-pnl-canonical-pipeline.sql`
- `src/lib/finance/fx-pnl.ts`
- `src/lib/finance/__tests__/fx-pnl.test.ts`
- `src/lib/finance/account-balances.ts` (modificación: split de fx_gain_loss + translation FX)
- `src/lib/finance/expense-payment-ledger.ts` (sin cambio en lógica, solo verificar contrato)
- `src/lib/finance/payment-ledger.ts` (sin cambio en lógica, solo verificar contrato)
- `src/app/api/finance/bank/route.ts` (response shape extendido)
- `src/views/greenhouse/finance/BankView.tsx` (UI honesta + breakdown tooltip)
- `src/types/finance.ts` (types nuevos)
- `src/lib/reliability/finance/fx-reconciliation.ts` (signal nuevo)
- `src/lib/reliability/registry.ts` (módulo `finance.fx_reconciliation` o extender `finance`)

## Current Repo State

### Already exists

- `account_balances.fx_gain_loss_clp` materializada por día (solo realized en payments)
- `income_payments.fx_gain_loss_clp` y `expense_payments.fx_gain_loss_clp` con rate doc vs rate pago
- `BankView` ya renderiza `data.kpis.fxGainLossClp` con `formatAmount(..., 'CLP')`
- `getBankOverview` ya suma por período en `account_balances` (línea 1128–1130)
- Patrón canónico de VIEW + helper para `income_settlement_reconciliation` (TASK-571)

### Gap

- Sin translation FX (revaluación de saldos no-CLP). Una cuenta USD con saldo permanente nunca genera resultado cambiario aunque el tipo de cambio se mueva.
- Sin internal transfer FX. El botón "Transferencia interna" del Banco no captura spread vs rate de mercado.
- Cero silencioso indistinguible de cálculo incompleto.
- Sin breakdown por fuente: no se puede auditar de dónde viene el total.
- Sin reliability signal para detectar pipeline detenido.
- Comment SQL en `account_balances.fx_gain_loss_clp` no advierte que la métrica está incompleta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (skip — implementación ya alineada)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema migration

- Migración aditiva: agregar `fx_gain_loss_realized_clp NUMERIC(14,2) NOT NULL DEFAULT 0` y `fx_gain_loss_translation_clp NUMERIC(14,2) NOT NULL DEFAULT 0` a `account_balances`.
- Backfill: `UPDATE account_balances SET fx_gain_loss_realized_clp = fx_gain_loss_clp` (preserva histórico — el valor actual es 100% realized por construcción).
- `fx_gain_loss_clp` queda como columna agregada calculada por trigger o derivada en lectura. Decisión: dejar la columna y mantenerla como `fx_gain_loss_realized_clp + fx_gain_loss_translation_clp` actualizada en `materializeAccountBalance` para máxima compatibilidad sin trigger.
- VIEW `greenhouse_finance.fx_pnl_breakdown` que expone por cuenta + fecha: `account_id`, `balance_date`, `currency`, `realized_clp`, `translation_clp`, `total_clp`, derivable a totales por período en consumer.
- Comments SQL documentando ecuación canónica + "no re-derivar" + "extender ambos VIEW + helper".

### Slice 2 — Translation FX en materializeAccountBalance

- Para cuentas con `currency != 'CLP'`: computar translation FX como diferencia entre `closing_balance × rate_today − closing_balance_clp_previous_day` (o `opening_balance × rate_today` si es el primer día del período).
- Si no hay rate disponible para el día (`resolveExchangeRateToClp` falla o devuelve null), translation FX = 0 y registrar warning vía `captureWithDomain(err, 'finance', { extra: { source: 'fx_pnl_translation', accountId, balanceDate } })`. **No** bloquea la materialización — degrada honestamente.
- Persistir el rate usado: ya existe `fx_rate_used` en `account_balances`. Reutilizar.

### Slice 3 — Helper canónico `fx-pnl.ts` + integración en getBankOverview

- `src/lib/finance/fx-pnl.ts` con shape similar a `income-settlement.ts`:
  - `getBankFxPnlBreakdown({ year, month, accountId? })` → `{ totalClp, realizedClp, translationClp, internalTransferClp, byAccount: [...] }`.
  - Comment header documentando 3 fuentes y "extender VIEW + helper cuando aparezca mecanismo nuevo".
- `getBankOverview` deja de sumar `fx_gain_loss_clp` inline (línea 1128–1130) y delega a `getBankFxPnlBreakdown`.
- API response shape extendida: `kpis.fxGainLoss: { totalClp, realizedClp, translationClp, internalTransferClp, hasExposure: boolean, isDegraded: boolean }`. Backward-compat: mantener `kpis.fxGainLossClp` como alias del total durante una versión.

### Slice 4 — UI honesta en BankView

- Card "Resultado cambiario" muestra:
  - **Sin exposición FX** (avatar gris, stat `—`, subtitle "Sin cuentas en moneda extranjera") cuando `hasExposure === false` (todas las cuentas activas son CLP).
  - **`{totalClp}` CLP** + tooltip con breakdown (Realizado / Translación / Transferencias internas) cuando hay exposición.
  - **`Pendiente de cálculo`** + avatar warning cuando `isDegraded === true` (hubo error en una fuente).
- El tooltip vive en un componente reutilizable porque el mismo breakdown se puede mostrar al click sobre la cuenta individual.

### Slice 5 — Reliability signal + registry

- Función nueva `getFinanceFxReconciliationSignal()` en `src/lib/reliability/finance/fx-reconciliation.ts`:
  - **Healthy**: no hay cuentas no-CLP, o todas materializaron translation FX en el día.
  - **Degraded**: alguna cuenta no-CLP tiene `closing_balance_clp IS NULL` o `fx_rate_used IS NULL` en el último día.
  - **Failed**: `materializeAccountBalance` falló para alguna cuenta no-CLP en las últimas 24h (consultar Sentry vía `captureWithDomain` tag `finance` + extra source).
- Registrar como subsystem signal en el registry de `finance` (no crear módulo separado — la card vive bajo Finance).

### Slice 6 — Tests

- `src/lib/finance/__tests__/fx-pnl.test.ts`: 4 escenarios (no exposure, only realized, only translation, mix realized + translation).
- Test SQL VIEW con fixtures (puede ser un test integration que ya use mock del PG client si existe).
- Test de regresión en `getBankOverview` para asegurar backward-compat del campo `kpis.fxGainLossClp`.

## Out of Scope

- **Internal transfer FX como tabla nueva**: el botón "Transferencia interna" hoy crea movimientos pero no persiste rate spread como FX P&L diferenciado. Se incluye como parámetro en la VIEW (`internal_transfer_clp`) pero retorna `0` hasta que TASK derivada (a crear en follow-ups) construya `internal_transfers` table con rate tracking.
- Refactor de `payment-ledger.ts` / `expense-payment-ledger.ts`: la lógica actual de realized FX en payments queda exactamente igual.
- Histórico backfill de translation FX para fechas pasadas: solo se computa de la fecha de migración hacia adelante. Las fechas anteriores quedan con translation = 0 (que es el valor actual implícito).

## Detailed Spec

### Migration `<timestamp>_task-699-fx-pnl-canonical-pipeline.sql`

```sql
-- Up
SET search_path = greenhouse_finance, public;

ALTER TABLE greenhouse_finance.account_balances
  ADD COLUMN IF NOT EXISTS fx_gain_loss_realized_clp NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fx_gain_loss_translation_clp NUMERIC(14, 2) NOT NULL DEFAULT 0;

UPDATE greenhouse_finance.account_balances
   SET fx_gain_loss_realized_clp = fx_gain_loss_clp
 WHERE fx_gain_loss_realized_clp = 0
   AND fx_gain_loss_clp <> 0;

CREATE OR REPLACE VIEW greenhouse_finance.fx_pnl_breakdown AS
SELECT
  ab.account_id,
  ab.balance_date,
  ab.currency,
  ab.fx_gain_loss_realized_clp::numeric(14,2)    AS realized_clp,
  ab.fx_gain_loss_translation_clp::numeric(14,2) AS translation_clp,
  0::numeric(14,2)                                AS internal_transfer_clp,
  (
    ab.fx_gain_loss_realized_clp
    + ab.fx_gain_loss_translation_clp
  )::numeric(14,2) AS total_clp
FROM greenhouse_finance.account_balances ab;

COMMENT ON VIEW greenhouse_finance.fx_pnl_breakdown IS
'Canonical FX P&L breakdown per account and date. Unifies 3 sources: realized (rate doc vs rate pago), translation (revaluación de saldos no-CLP), internal transfers. Read API: src/lib/finance/fx-pnl.ts. Do not re-derive; extend BOTH view + helper when new source appears.';

COMMENT ON COLUMN greenhouse_finance.account_balances.fx_gain_loss_clp IS
'DEPRECATED — total agregado de fx_gain_loss_realized_clp + fx_gain_loss_translation_clp. Mantenido por compatibilidad. Usar VIEW greenhouse_finance.fx_pnl_breakdown o helper src/lib/finance/fx-pnl.ts para nuevos consumers.';

COMMENT ON COLUMN greenhouse_finance.account_balances.fx_gain_loss_realized_clp IS
'Realized FX desde settlements (rate documento vs rate pago para invoices/expenses no-CLP). Origen: income_payments + expense_payments via getDailyFxGainLoss().';

COMMENT ON COLUMN greenhouse_finance.account_balances.fx_gain_loss_translation_clp IS
'Translation FX por revaluación diaria de saldos no-CLP. (closing_balance × rate_today) − previous_closing_balance_clp. Cero para cuentas CLP por construcción.';

-- Down
DROP VIEW IF EXISTS greenhouse_finance.fx_pnl_breakdown;

ALTER TABLE greenhouse_finance.account_balances
  DROP COLUMN IF EXISTS fx_gain_loss_translation_clp,
  DROP COLUMN IF EXISTS fx_gain_loss_realized_clp;
```

### `src/lib/finance/fx-pnl.ts` — shape

```ts
export interface FxPnlSourceBreakdown {
  realizedClp: number
  translationClp: number
  internalTransferClp: number
  totalClp: number
}

export interface FxPnlAccountBreakdown extends FxPnlSourceBreakdown {
  accountId: string
  currency: string
}

export interface BankFxPnlBreakdown extends FxPnlSourceBreakdown {
  hasExposure: boolean       // true cuando hay al menos 1 cuenta activa no-CLP
  isDegraded: boolean        // true cuando alguna cuenta no-CLP no pudo materializar translation
  byAccount: FxPnlAccountBreakdown[]
}

export const getBankFxPnlBreakdown = async (
  options: { year: number; month: number; accountId?: string }
): Promise<BankFxPnlBreakdown>
```

### Translation FX cálculo (Slice 2)

Pseudocódigo dentro de `materializeAccountBalance`:

```ts
let translationClp = 0
if (currency !== 'CLP') {
  const rateToday = fxRateUsed
  const previousClosingClp = previous?.closing_balance_clp != null
    ? roundCurrency(toNumber(previous.closing_balance_clp))
    : null

  if (previousClosingClp != null && rateToday > 0) {
    // closing_balance is in native currency; previousClosingClp is already CLP
    const todayClosingClp = roundCurrency(closingBalance * rateToday)
    translationClp = roundCurrency(todayClosingClp - previousClosingClp - (periodInflows - periodOutflows) * rateToday)
  }
}
```

Nota: la fórmula descuenta el efecto de movimientos del día para aislar la revaluación pura del saldo previo. Documentar en comment del helper.

### UI honest empty state (Slice 4)

```tsx
const fx = data.kpis.fxGainLoss

const fxStat = !fx.hasExposure
  ? '—'
  : fx.isDegraded
  ? 'Pendiente'
  : formatAmount(fx.totalClp, 'CLP')

const fxSubtitle = !fx.hasExposure
  ? 'Sin cuentas en moneda extranjera'
  : fx.isDegraded
  ? 'Materialización pendiente — revisar Reliability'
  : `Realizado ${formatAmount(fx.realizedClp, 'CLP')} · Translación ${formatAmount(fx.translationClp, 'CLP')}`

const fxColor = !fx.hasExposure ? 'secondary' : fx.isDegraded ? 'error' : 'warning'
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `pnpm migrate:up` aplicó la migración sin errores (`20260427130504368_task-699-fx-pnl-canonical-pipeline.sql`) y `pnpm pg:doctor` quedó healthy.
- [x] `account_balances.fx_gain_loss_realized_clp` recibió el backfill desde `fx_gain_loss_clp` (todo lo previo era realized por construcción).
- [x] VIEW `greenhouse_finance.fx_pnl_breakdown` creada con grants a `greenhouse_runtime`/`greenhouse_migrator`/`greenhouse_app` y comments canónicos anti re-derive.
- [x] `getBankFxPnlBreakdown` (`src/lib/finance/fx-pnl.ts`) devuelve `hasExposure: false` cuando todas las cuentas activas son CLP — verificado por test `returns hasExposure=false when only CLP accounts are active`.
- [x] `BankView` muestra "Sin exposición FX" con stat `—` cuando `hasExposure === false` y "Pendiente" + warning cuando `isDegraded === true`.
- [x] `materializeAccountBalance` calcula translation FX como `closing_balance_clp − previous_closing_balance_clp − net_movement_clp` para cuentas no-CLP con rate disponible.
- [x] Cuando `resolveExchangeRateToClp` falla (network/provider), captura el error vía `captureWithDomain(err, 'finance', { tags: { source: 'fx_pnl_translation' }, ... })`, deja `translation = 0` y NO bloquea la materialización.
- [x] `kpis.fxGainLossClp` se preserva como alias backward-compat (= `kpis.fxGainLoss.totalClp`).
- [x] Helper `fx-pnl.ts` lee únicamente desde la VIEW y test guardrail valida que NUNCA hace `FROM income_payments` o `FROM expense_payments` directo.
- [x] `pnpm lint`, `npx tsc --noEmit`, y `npx vitest run src/lib/finance` (52 archivos / 365 tests) en verde.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test src/lib/finance`
- `pnpm staging:request "/api/finance/bank?year=2026&month=4"` para confirmar shape nuevo en producción.
- Verificación visual en preview de Vercel: card "Resultado cambiario" muestra "Sin exposición FX".

## Closing Protocol

- [x] `Lifecycle` actualizado a `complete`
- [x] Archivo movido a `docs/tasks/complete/`
- [x] `docs/tasks/README.md` sincronizado (entry actualizada en bullet TASK-699 + tabla `In Progress` no lo lista)
- [x] `Handoff.md` actualizado con resumen y referencias a archivos canónicos
- [x] `changelog.md` actualizado
- [x] Chequeo de impacto cruzado: TASK-571 (settlement reconciliation) — patrón replicado, no requiere cambios. TASK-475 (FX platform foundation) — `resolveExchangeRateToClp` reutilizado sin cambios. TASK-281 (payment instruments + FX tracking) — sin impacto, `payment-ledger` lógica intacta.
- [x] CLAUDE.md sección "Finance — reconciliación" extendida con la sub-sección FX P&L canónica.

## Follow-ups

- Internal transfer FX: crear TASK derivada para introducir tabla `greenhouse_finance.internal_transfers` con rate spread tracking. Hoy queda como source con valor 0 en la VIEW.
- Histórico backfill de translation FX para meses anteriores si Efeonce o un cliente nuevo activa cuenta USD con saldo histórico.
- Exportar breakdown FX en el snapshot Excel/PDF del Banco (cuando se implemente export).
- Finance Intelligence P&L: cuando se construya, debe consumir esta VIEW para el componente "Resultado cambiario" del estado de resultados.
