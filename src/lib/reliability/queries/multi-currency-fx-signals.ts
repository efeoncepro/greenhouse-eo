import 'server-only'

import { query } from '@/lib/db'
import { isFinanceCoreMxnEnabled } from '@/lib/finance/multi-currency/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-990 Slice 8 — Multi-currency / FX reliability signals (5).
 *
 * Defense-in-depth detectors for the MXN finance-core rollout. All read-only,
 * date-safe (date − date = integer days; NEVER EXTRACT(EPOCH …) on a DATE —
 * TASK-893), and degrade honestly to `unknown` on query failure.
 *
 *   1. finance.fx.mxn_rate_freshness        — is the MXN/CLP rate fresh?
 *   2. finance.fx.snapshot_missing          — native row without FX evidence.
 *   3. finance.nubox_export.foreign_amount_missing — export invoice w/o foreign amount.
 *   4. finance.multi_currency.native_equivalent_drift — 3-plane reconciliation drift.
 *   5. finance.cash_signal.unsupported_currency — cash signal in a non-finance_core currency.
 */

const FINANCE_CORE_CCY = ['CLP', 'USD', 'MXN']

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
  value: 'docs/tasks/in-progress/TASK-990-mxn-multi-currency-finance-core.md'
}

// ── 1. MXN rate freshness ─────────────────────────────────────────────
export const MXN_RATE_FRESHNESS_SIGNAL_ID = 'finance.fx.mxn_rate_freshness'
const MXN_RATE_WARN_DAYS = 7
const MXN_RATE_ERROR_DAYS = 30

export const getMxnRateFreshnessSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ has_exposure: boolean; age_days: number | null }>(
      `SELECT
         (EXISTS (SELECT 1 FROM greenhouse_finance.income   WHERE native_currency = 'MXN')
          OR EXISTS (SELECT 1 FROM greenhouse_finance.expenses WHERE native_currency = 'MXN')) AS has_exposure,
         (SELECT (CURRENT_DATE - MAX(rate_date))::int
            FROM greenhouse_finance.exchange_rates
           WHERE from_currency = 'MXN' AND to_currency = 'CLP') AS age_days`
    )

    const hasExposure = Boolean(rows[0]?.has_exposure)
    const ageDays = rows[0]?.age_days ?? null

    let severity: ReliabilitySignal['severity'] = 'ok'
    let summary: string

    if (!hasExposure) {
      severity = 'ok'
      summary = 'Sin exposición MXN nativa; freshness del rate MXN/CLP no aplica.'
    } else if (ageDays === null) {
      severity = 'error'
      summary = 'Hay facturas/gastos MXN nativos pero NO existe rate MXN/CLP registrado.'
    } else if (ageDays >= MXN_RATE_ERROR_DAYS) {
      severity = 'error'
      summary = `El rate MXN/CLP tiene ${ageDays} días (≥ ${MXN_RATE_ERROR_DAYS}). Stale para emisión/pago.`
    } else if (ageDays >= MXN_RATE_WARN_DAYS) {
      severity = 'warning'
      summary = `El rate MXN/CLP tiene ${ageDays} días (≥ ${MXN_RATE_WARN_DAYS}).`
    } else {
      summary = `Rate MXN/CLP fresco (${ageDays} días).`
    }

    return {
      signalId: MXN_RATE_FRESHNESS_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'lag',
      source: 'getMxnRateFreshnessSignal',
      label: 'Frescura del rate MXN/CLP',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'hasExposure', value: String(hasExposure) },
        { kind: 'metric', label: 'ageDays', value: ageDays === null ? 'none' : String(ageDays) },
        SPEC_EVIDENCE
      ]
    }
  } catch (error) {
    return degraded(MXN_RATE_FRESHNESS_SIGNAL_ID, 'lag', 'Frescura del rate MXN/CLP', 'getMxnRateFreshnessSignal', error)
  }
}

// ── 2. FX snapshot missing ────────────────────────────────────────────
export const FX_SNAPSHOT_MISSING_SIGNAL_ID = 'finance.fx.snapshot_missing'

export const getFxSnapshotMissingSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ income_n: number; expense_n: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM greenhouse_finance.income
           WHERE native_currency IS NOT NULL AND native_to_functional_fx_snapshot_id IS NULL) AS income_n,
         (SELECT COUNT(*)::int FROM greenhouse_finance.expenses
           WHERE native_currency IS NOT NULL AND native_to_functional_fx_snapshot_id IS NULL) AS expense_n`
    )

    const incomeN = Number(rows[0]?.income_n ?? 0)
    const expenseN = Number(rows[0]?.expense_n ?? 0)
    const count = incomeN + expenseN

    return {
      signalId: FX_SNAPSHOT_MISSING_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getFxSnapshotMissingSignal',
      label: 'Native row sin FX snapshot',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Toda fila con plano nativo tiene su FX snapshot native→functional enlazado.'
          : `${count} fila${count === 1 ? '' : 's'} con native_currency pero sin native_to_functional_fx_snapshot_id (income ${incomeN} / expense ${expenseN}).`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'income', value: String(incomeN) },
        { kind: 'metric', label: 'expense', value: String(expenseN) },
        SPEC_EVIDENCE
      ]
    }
  } catch (error) {
    return degraded(FX_SNAPSHOT_MISSING_SIGNAL_ID, 'data_quality', 'Native row sin FX snapshot', 'getFxSnapshotMissingSignal', error)
  }
}

// ── 3. Nubox export foreign amount missing ────────────────────────────
export const NUBOX_EXPORT_FOREIGN_AMOUNT_MISSING_SIGNAL_ID = 'finance.nubox_export.foreign_amount_missing'

export const getNuboxExportForeignAmountMissingSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  // Pre-rollout (flag OFF) the foreign plane is intentionally NOT sourced, so
  // every DTE 110/111/112 has native_amount NULL by design — do not alarm.
  if (!isFinanceCoreMxnEnabled()) {
    return {
      signalId: NUBOX_EXPORT_FOREIGN_AMOUNT_MISSING_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getNuboxExportForeignAmountMissingSignal',
      label: 'Factura exportación sin monto extranjero',
      severity: 'ok',
      summary: 'Foreign sourcing deshabilitado (FINANCE_CORE_MXN_ENABLED=false); plano nativo no esperado aún.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'flagEnabled', value: 'false' }, SPEC_EVIDENCE]
    }
  }

  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM greenhouse_finance.income
        WHERE dte_type_code IN ('110','111','112')
          AND native_amount IS NULL
          AND COALESCE(is_annulled, FALSE) = FALSE`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: NUBOX_EXPORT_FOREIGN_AMOUNT_MISSING_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getNuboxExportForeignAmountMissingSignal',
      label: 'Factura exportación sin monto extranjero',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Toda factura de exportación (DTE 110/111/112) tiene su monto extranjero nativo.'
          : `${count} factura${count === 1 ? '' : 's'} de exportación con native_amount NULL pese a foreign sourcing habilitado.`,
      observedAt,
      evidence: [{ kind: 'metric', label: 'count', value: String(count) }, SPEC_EVIDENCE]
    }
  } catch (error) {
    return degraded(
      NUBOX_EXPORT_FOREIGN_AMOUNT_MISSING_SIGNAL_ID,
      'data_quality',
      'Factura exportación sin monto extranjero',
      'getNuboxExportForeignAmountMissingSignal',
      error
    )
  }
}

// ── 4. Native equivalent drift (3-plane reconciliation) ───────────────
export const NATIVE_EQUIVALENT_DRIFT_SIGNAL_ID = 'finance.multi_currency.native_equivalent_drift'

export const getNativeEquivalentDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // For each native row WITH a native→functional snapshot, verify
    // total_amount_clp == native_amount × snapshot.rate (±1 CLP). For rows that
    // also carry the USD reporting plane, verify amount_usd == total_amount_clp
    // × reporting_rate (±0.01 USD). Rows missing the snapshot are signal #2's job.
    const rows = await query<{ functional_n: number; reporting_n: number }>(
      `SELECT
         (
           SELECT COUNT(*)::int FROM (
             SELECT i.income_id FROM greenhouse_finance.income i
               JOIN greenhouse_finance.fx_snapshots fs ON fs.snapshot_id = i.native_to_functional_fx_snapshot_id
              WHERE i.native_currency IS NOT NULL AND i.native_amount IS NOT NULL
                AND ABS(i.total_amount_clp - (i.native_amount * fs.rate)) > 1
             UNION ALL
             SELECT e.expense_id FROM greenhouse_finance.expenses e
               JOIN greenhouse_finance.fx_snapshots fs ON fs.snapshot_id = e.native_to_functional_fx_snapshot_id
              WHERE e.native_currency IS NOT NULL AND e.native_amount IS NOT NULL
                AND ABS(e.total_amount_clp - (e.native_amount * fs.rate)) > 1
           ) d
         ) AS functional_n,
         (
           SELECT COUNT(*)::int FROM (
             SELECT i.income_id FROM greenhouse_finance.income i
               JOIN greenhouse_finance.fx_snapshots fs ON fs.snapshot_id = i.functional_to_reporting_fx_snapshot_id
              WHERE i.amount_usd IS NOT NULL
                AND ABS(i.amount_usd - (i.total_amount_clp * fs.rate)) > 0.01
             UNION ALL
             SELECT e.expense_id FROM greenhouse_finance.expenses e
               JOIN greenhouse_finance.fx_snapshots fs ON fs.snapshot_id = e.functional_to_reporting_fx_snapshot_id
              WHERE e.amount_usd IS NOT NULL
                AND ABS(e.amount_usd - (e.total_amount_clp * fs.rate)) > 0.01
           ) d
         ) AS reporting_n`
    )

    const functionalN = Number(rows[0]?.functional_n ?? 0)
    const reportingN = Number(rows[0]?.reporting_n ?? 0)
    const count = functionalN + reportingN

    return {
      signalId: NATIVE_EQUIVALENT_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getNativeEquivalentDriftSignal',
      label: 'Drift de equivalencia nativa (3 planos)',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Los 3 planos reconcilian por el ancla CLP (native→functional ±1 CLP, functional→reporting ±0,01 USD).'
          : `${count} fila${count === 1 ? '' : 's'} con drift de planos (functional ${functionalN} / reporting ${reportingN}): el equivalente persistido no reconcilia con su FX snapshot.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'functionalDrift', value: String(functionalN) },
        { kind: 'metric', label: 'reportingDrift', value: String(reportingN) },
        SPEC_EVIDENCE
      ]
    }
  } catch (error) {
    return degraded(
      NATIVE_EQUIVALENT_DRIFT_SIGNAL_ID,
      'drift',
      'Drift de equivalencia nativa (3 planos)',
      'getNativeEquivalentDriftSignal',
      error
    )
  }
}

// ── 5. Cash signal unsupported currency ───────────────────────────────
export const CASH_SIGNAL_UNSUPPORTED_CURRENCY_SIGNAL_ID = 'finance.cash_signal.unsupported_currency'

export const getCashSignalUnsupportedCurrencySignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM greenhouse_finance.external_cash_signals
        WHERE currency IS NOT NULL AND currency <> ALL($1::text[])`,
      [FINANCE_CORE_CCY]
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: CASH_SIGNAL_UNSUPPORTED_CURRENCY_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getCashSignalUnsupportedCurrencySignal',
      label: 'Cash signal en moneda no soportada',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todo external_cash_signal está en una moneda finance_core (CLP/USD/MXN).'
          : `${count} external_cash_signal${count === 1 ? '' : 's'} en una moneda fuera de finance_core (CLP/USD/MXN).`,
      observedAt,
      evidence: [{ kind: 'metric', label: 'count', value: String(count) }, SPEC_EVIDENCE]
    }
  } catch (error) {
    return degraded(
      CASH_SIGNAL_UNSUPPORTED_CURRENCY_SIGNAL_ID,
      'data_quality',
      'Cash signal en moneda no soportada',
      'getCashSignalUnsupportedCurrencySignal',
      error
    )
  }
}
