import 'server-only'

import { query } from '@/lib/db'
import { isFinanceCoreClfIndexedEnabled } from '@/lib/finance/multi-currency/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-995 Slice 6 — Indexed-unit (UF/CLF) reliability signals.
 * ADR GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1 §11. All read-only, date-safe
 * (date − date = integer days; never EXTRACT(EPOCH …) on a DATE — TASK-893), and
 * degrade honestly to `unknown` on query failure.
 *
 *   1. finance.uf.rate_freshness                        — is the UF rate fresh?
 *   2. finance.indexed_unit.snapshot_missing            — CLF native fact w/o CLF→CLP snapshot.
 *   3. finance.indexed_unit.native_functional_drift     — native CLF × UF ≠ functional CLP.
 *   4. finance.indexed_unit.settlement_currency_violation — CLF leaked into a cash lane.
 *
 * `finance.indexed_unit.revaluation_unclassified` is intentionally deferred with
 * the revaluation-on-payment machinery (no live CLF cash flow yet — anti-drift,
 * mirroring TASK-990's deferral of its USD reader columns). Wire it when a CLF
 * receivable is actually settled.
 */

const degraded = (
  signalId: string,
  kind: ReliabilitySignal['kind'],
  label: string,
  source: string,
  error: unknown
): ReliabilitySignal => {
  captureWithDomain(error, 'finance', { tags: { source: `reliability_signal_${source}` } })

  return {
    signalId,
    moduleKey: 'finance',
    kind,
    source,
    label,
    severity: 'unknown',
    summary: 'No fue posible leer el signal. Revisa los logs.',
    observedAt: new Date().toISOString(),
    evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
  }
}

const SPEC_EVIDENCE = {
  kind: 'doc' as const,
  label: 'Spec',
  value: 'docs/architecture/GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1.md'
}

// ── 1. UF rate freshness ──────────────────────────────────────────────
export const UF_RATE_FRESHNESS_SIGNAL_ID = 'finance.uf.rate_freshness'
const UF_WARN_DAYS = 7
const UF_ERROR_DAYS = 30

export const getUfRateFreshnessSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ age_days: number | null }>(
      `SELECT (CURRENT_DATE - MAX(indicator_date))::int AS age_days
         FROM greenhouse_finance.economic_indicators
        WHERE indicator_code = 'UF'`
    )

    const ageDays = rows[0]?.age_days ?? null

    const severity: ReliabilitySignal['severity'] =
      ageDays === null ? 'error' : ageDays >= UF_ERROR_DAYS ? 'error' : ageDays >= UF_WARN_DAYS ? 'warning' : 'ok'

    return {
      signalId: UF_RATE_FRESHNESS_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'freshness',
      source: 'getUfRateFreshnessSignal',
      label: 'Frescura del valor UF',
      severity,
      summary:
        ageDays === null
          ? 'No hay valor UF en economic_indicators.'
          : `Último valor UF tiene ${ageDays} día${ageDays === 1 ? '' : 's'}.`,
      observedAt,
      evidence: [{ kind: 'metric', label: 'ageDays', value: String(ageDays) }, SPEC_EVIDENCE]
    }
  } catch (error) {
    return degraded(UF_RATE_FRESHNESS_SIGNAL_ID, 'freshness', 'Frescura del valor UF', 'getUfRateFreshnessSignal', error)
  }
}

// ── 2. Indexed-unit snapshot missing ──────────────────────────────────
export const INDEXED_UNIT_SNAPSHOT_MISSING_SIGNAL_ID = 'finance.indexed_unit.snapshot_missing'

export const getIndexedUnitSnapshotMissingSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  // Pre-rollout (flag OFF) no CLF native facts are written by design.
  if (!isFinanceCoreClfIndexedEnabled()) {
    return {
      signalId: INDEXED_UNIT_SNAPSHOT_MISSING_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getIndexedUnitSnapshotMissingSignal',
      label: 'Hecho CLF sin snapshot UF→CLP',
      severity: 'ok',
      summary: 'CLF indexado deshabilitado (FINANCE_CORE_CLF_INDEXED_ENABLED=false); sin hechos CLF esperados.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'flagEnabled', value: 'false' }, SPEC_EVIDENCE]
    }
  }

  try {
    const rows = await query<{ income: number; expense: number; obligation: number }>(
      `SELECT
         (SELECT COUNT(*) FROM greenhouse_finance.income
            WHERE native_currency = 'CLF' AND native_to_functional_fx_snapshot_id IS NULL)::int AS income,
         (SELECT COUNT(*) FROM greenhouse_finance.expenses
            WHERE native_currency = 'CLF' AND native_to_functional_fx_snapshot_id IS NULL)::int AS expense,
         (SELECT COUNT(*) FROM greenhouse_finance.payment_obligations
            WHERE native_currency = 'CLF' AND native_to_functional_fx_snapshot_id IS NULL)::int AS obligation`
    )

    const income = Number(rows[0]?.income ?? 0)
    const expense = Number(rows[0]?.expense ?? 0)
    const obligation = Number(rows[0]?.obligation ?? 0)
    const count = income + expense + obligation

    return {
      signalId: INDEXED_UNIT_SNAPSHOT_MISSING_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getIndexedUnitSnapshotMissingSignal',
      label: 'Hecho CLF sin snapshot UF→CLP',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todo hecho CLF nativo tiene su snapshot UF→CLP enlazado.'
          : `${count} hecho${count === 1 ? '' : 's'} CLF sin snapshot UF→CLP (income ${income} / expense ${expense} / obligation ${obligation}).`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'income', value: String(income) },
        { kind: 'metric', label: 'expense', value: String(expense) },
        { kind: 'metric', label: 'obligation', value: String(obligation) },
        SPEC_EVIDENCE
      ]
    }
  } catch (error) {
    return degraded(
      INDEXED_UNIT_SNAPSHOT_MISSING_SIGNAL_ID,
      'data_quality',
      'Hecho CLF sin snapshot UF→CLP',
      'getIndexedUnitSnapshotMissingSignal',
      error
    )
  }
}

// ── 3. Native↔functional drift (CLF × UF ≠ functional CLP) ─────────────
export const INDEXED_UNIT_NATIVE_FUNCTIONAL_DRIFT_SIGNAL_ID = 'finance.indexed_unit.native_functional_drift'
const DRIFT_TOLERANCE_CLP = 1

export const getIndexedUnitNativeFunctionalDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // native_amount (CLF) × snapshot.rate (CLP per CLF) must equal the locked
    // functional CLP (total_amount_clp) within tolerance. Only indexed-unit
    // snapshots participate (from_unit_class='indexed_unit').
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM (
         SELECT i.income_id
           FROM greenhouse_finance.income i
           JOIN greenhouse_finance.fx_snapshots s
             ON s.snapshot_id = i.native_to_functional_fx_snapshot_id
          WHERE i.native_currency = 'CLF'
            AND s.from_unit_class = 'indexed_unit'
            AND ABS(ABS(i.native_amount) * s.rate - ABS(i.total_amount_clp)) > $1
       ) drift`,
      [DRIFT_TOLERANCE_CLP]
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: INDEXED_UNIT_NATIVE_FUNCTIONAL_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getIndexedUnitNativeFunctionalDriftSignal',
      label: 'Drift CLF nativo ↔ CLP funcional',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todo income CLF reconcilia native × UF con su CLP funcional.'
          : `${count} income CLF con native × UF ≠ CLP funcional (tolerancia ${DRIFT_TOLERANCE_CLP} CLP).`,
      observedAt,
      evidence: [{ kind: 'metric', label: 'count', value: String(count) }, SPEC_EVIDENCE]
    }
  } catch (error) {
    return degraded(
      INDEXED_UNIT_NATIVE_FUNCTIONAL_DRIFT_SIGNAL_ID,
      'drift',
      'Drift CLF nativo ↔ CLP funcional',
      'getIndexedUnitNativeFunctionalDriftSignal',
      error
    )
  }
}

// ── 4. Settlement currency violation (CLF leaked into a cash lane) ─────
export const INDEXED_UNIT_SETTLEMENT_CURRENCY_VIOLATION_SIGNAL_ID =
  'finance.indexed_unit.settlement_currency_violation'

export const getIndexedUnitSettlementCurrencyViolationSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ accounts: number; orders: number; order_lines: number; legs: number }>(
      `SELECT
         (SELECT COUNT(*) FROM greenhouse_finance.accounts WHERE currency = 'CLF')::int AS accounts,
         (SELECT COUNT(*) FROM greenhouse_finance.payment_orders WHERE currency = 'CLF')::int AS orders,
         (SELECT COUNT(*) FROM greenhouse_finance.payment_order_lines WHERE currency = 'CLF')::int AS order_lines,
         (SELECT COUNT(*) FROM greenhouse_finance.settlement_legs WHERE currency = 'CLF')::int AS legs`
    )

    const accounts = Number(rows[0]?.accounts ?? 0)
    const orders = Number(rows[0]?.orders ?? 0)
    const orderLines = Number(rows[0]?.order_lines ?? 0)
    const legs = Number(rows[0]?.legs ?? 0)
    const count = accounts + orders + orderLines + legs

    return {
      signalId: INDEXED_UNIT_SETTLEMENT_CURRENCY_VIOLATION_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getIndexedUnitSettlementCurrencyViolationSignal',
      label: 'CLF filtrado a un plano cash',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Ningún plano cash (cuentas/órdenes/legs) contiene CLF.'
          : `CLF filtrado a plano cash: accounts ${accounts}, orders ${orders}, lines ${orderLines}, legs ${legs}.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'accounts', value: String(accounts) },
        { kind: 'metric', label: 'orders', value: String(orders) },
        { kind: 'metric', label: 'orderLines', value: String(orderLines) },
        { kind: 'metric', label: 'settlementLegs', value: String(legs) },
        SPEC_EVIDENCE
      ]
    }
  } catch (error) {
    return degraded(
      INDEXED_UNIT_SETTLEMENT_CURRENCY_VIOLATION_SIGNAL_ID,
      'data_quality',
      'CLF filtrado a un plano cash',
      'getIndexedUnitSettlementCurrencyViolationSignal',
      error
    )
  }
}
