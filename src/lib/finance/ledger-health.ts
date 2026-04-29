import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Finance Ledger Health (TASK-702 Slice 7).
 * ==========================================
 *
 * Single read-only entry point for runtime drift detection across the entire
 * finance ledger. Surfaces 4 dimensions:
 *
 *   1. Settlement reconciliation drift — VIEW
 *      `income_settlement_reconciliation` (TASK-571) reports incomes where
 *      `amount_paid != cash + factoring_fee + withholding`.
 *
 *   2. Phantom payments — income_payments / expense_payments con
 *      payment_account_id IS NULL y NOT superseded. Cada phantom es un
 *      payment generado por Nubox sync sin anclaje a una cuenta concreta.
 *
 *   3. Account balance freshness — última fecha materializada de
 *      account_balances vs CURRENT_DATE. Stale > 2 días = degraded.
 *
 *   4. Unanchored expense_payments del período activo — expense_payments
 *      cuyo expense.* anchors están todos null (no payroll_entry_id, no
 *      tool_catalog_id, no supplier_id, no tax_type, no loan_account_id).
 *
 * Consumido por:
 *   - GET /api/admin/finance/ledger-health (admin endpoint).
 *   - Reliability dashboard (signal en finance module via captureMessageWithDomain).
 *   - Cron diario que dispara alerts si drift > N.
 */

export interface LedgerHealthSnapshot {
  healthy: boolean
  checkedAt: string
  settlementDrift: {
    driftedIncomesCount: number
    sampleDrifted: Array<{ incomeId: string; totalAmount: number; amountPaid: number; expectedSettlement: number; drift: number }>
  }
  phantoms: {
    incomePhantomsCount: number
    expensePhantomsCount: number
    samplePhantoms: Array<{ paymentId: string; incomeOrExpenseId: string; date: string; amount: number; source: 'income' | 'expense' }>
  }
  balanceFreshness: {
    accountsWithStaleBalances: Array<{ accountId: string; lastMaterializedAt: string; daysStale: number }>
  }
  unanchoredExpenses: {
    count: number
    sample: Array<{ expenseId: string; type: string; amount: number; paymentDate: string | null }>
  }
  /**
   * TASK-708 Slice 6 — phantom cohorts diferenciadas runtime vs historico.
   * `runtime` deberia ser 0 post-cutover (CHECK income/expense_payments_account_required_after_cutover).
   * `historical` solo baja cuando TASK-708b ejecuta la remediacion.
   */
  task708: {
    paymentsPendingAccountResolutionRuntime: number
    paymentsPendingAccountResolutionHistorical: number
    settlementLegsPrincipalWithoutInstrument: number
    reconciledRowsAgainstUnscopedTarget: number
    externalCashSignalsUnresolvedOverThreshold: number
    externalCashSignalsPromotedInvariantViolation: number
  }
  /**
   * TASK-708d — Cohort D: post-cutover payments adoptados por D5 rule
   * (account resolution `auto_exact_match`) sin evidencia de cartola bancaria.
   *
   * Steady state esperado: `count = 0`. Cualquier valor > 0 implica que la
   * regla D5 inferio una cuenta canonica para un payment que no aparece como
   * cash real en `bank_statement_rows`. Resolucion: usar `dismissIncomePhantom` /
   * `dismissExpensePhantom` (TASK-708b helpers) o adjudicar como cash real
   * importando la cartola y matcheando.
   */
  task708d: {
    postCutoverPhantomsWithoutBankEvidence: number
    samplePhantoms: Array<{
      paymentKind: 'income' | 'expense'
      paymentId: string
      documentId: string
      accountId: string
      paymentDate: string
      amount: number
      signalId: string
    }>
  }
  /**
   * TASK-714d — settlement_groups con leg_type='internal_transfer' que tienen
   * `out_count != in_count` (legs activos, sin contar superseded). Indica un
   * grupo bilateral incompleto, típicamente con la pata `incoming` faltante.
   *
   * Steady state esperado: `count = 0`. Cualquier valor > 0 implica que hay
   * settlement_groups con desbalance que distorsionan el ledger de la cuenta
   * receptora. Resolución: usar el helper canónico
   * `createInternalTransferSettlement` o el script de backfill TASK-714d.
   */
  task714d: {
    internalTransferGroupsWithMissingPair: number
    sampleImbalancedGroups: Array<{
      settlementGroupId: string
      outCount: number
      inCount: number
      instruments: string[]
    }>
  }
  /**
   * TASK-720 — Active accounts with `instrument_category` not present in
   * `instrument_category_kpi_rules`. Steady state expected: `count = 0`.
   * Cualquier valor > 0 implica que `getBankOverview` va a fail-fast con
   * `MissingKpiRuleError` cuando una cuenta de esa categoría sea consultada.
   * Resolución: `INSERT INTO greenhouse_finance.instrument_category_kpi_rules`
   * con la regla apropiada antes de activar cuentas en esa categoría.
   */
  task720: {
    instrumentCategoriesWithoutKpiRule: number
    sampleAccountsWithoutRule: Array<{
      accountId: string
      accountName: string
      instrumentCategory: string
      currency: string
    }>
  }
  /**
   * TASK-721 — Reconciliation snapshots with `evidence_asset_id` apuntando a
   * un asset que no existe o está marcado como `deleted`. Steady state
   * esperado: `count = 0`. Cualquier valor > 0 implica que un snapshot tiene
   * referencia rota a su evidencia — la auditoría futura no podrá reproducir.
   * Resolución: re-subir la cartola via el drawer de conciliación, o limpiar
   * el FK si la evidencia fue retirada intencionalmente.
   */
  task721: {
    reconciliationSnapshotsWithBrokenEvidence: number
    sampleBrokenSnapshots: Array<{
      snapshotId: string
      accountId: string
      snapshotAt: string
      evidenceAssetId: string
      assetStatus: string | null
    }>
  }
}

const STALE_THRESHOLD_DAYS = 2

// TASK-708 — boundary que distingue Cohorte A/B historica (pre-cutover) de
// runtime nuevo (post-cutover). Misma fecha que el CHECK SQL
// income/expense_payments_account_required_after_cutover.
const TASK_708_CUTOVER_TS = '2026-04-28 12:38:18.834+00'

// Threshold default para alertar senales sin resolver. Override por
// `EXTERNAL_CASH_SIGNALS_UNRESOLVED_THRESHOLD_DAYS` env si se necesita afinar.
const EXTERNAL_SIGNALS_UNRESOLVED_THRESHOLD_DAYS = (() => {
  const raw = process.env.EXTERNAL_CASH_SIGNALS_UNRESOLVED_THRESHOLD_DAYS
  const parsed = raw ? Number(raw) : 14

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 14
})()

const FRESHNESS_SQL = `
  SELECT
    a.account_id,
    MAX(ab.balance_date)::text AS last_materialized_at,
    EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(ab.balance_date)))::int / 86400 AS days_stale
  FROM greenhouse_finance.accounts a
  LEFT JOIN greenhouse_finance.account_balances ab ON ab.account_id = a.account_id
  WHERE a.is_active = TRUE
  GROUP BY a.account_id
  HAVING MAX(ab.balance_date) IS NULL OR MAX(ab.balance_date) < CURRENT_DATE - INTERVAL '2 days'
`

const SETTLEMENT_DRIFT_SQL = `
  SELECT income_id, total_amount::text, amount_paid::text, expected_settlement::text, drift::text
  FROM greenhouse_finance.income_settlement_reconciliation
  WHERE has_drift = TRUE
  ORDER BY ABS(drift) DESC
  LIMIT 20
`

// Excluye TODAS las cadenas de supersede (TASK-702 payment, TASK-703b OTB,
// TASK-708b superseded_at sin replacement). Coherente con triggers TASK-708b
// fn_sync_expense_amount_paid y fn_recompute_income_amount_paid.
const PHANTOMS_INCOME_SQL = `
  SELECT payment_id, income_id, payment_date::text, amount::text
  FROM greenhouse_finance.income_payments
  WHERE payment_account_id IS NULL
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL
    AND superseded_at IS NULL
    AND payment_source = 'nubox_bank_sync'
  ORDER BY payment_date DESC
  LIMIT 20
`

const PHANTOMS_EXPENSE_SQL = `
  SELECT payment_id, expense_id, payment_date::text, amount::text
  FROM greenhouse_finance.expense_payments
  WHERE payment_account_id IS NULL
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL
    AND superseded_at IS NULL
    AND payment_source IN ('nubox_sync', 'manual')
  ORDER BY payment_date DESC
  LIMIT 20
`

// ─── TASK-708 Slice 6 — 6 metricas diferenciadas ─────────────────────────────

const TASK708_PAYMENTS_PENDING_ACCOUNT_RUNTIME_SQL = `
  SELECT
    (
      SELECT COUNT(*) FROM greenhouse_finance.income_payments
      WHERE payment_account_id IS NULL
        AND superseded_by_payment_id IS NULL
        AND superseded_by_otb_id IS NULL
        AND superseded_at IS NULL
        AND created_at >= TIMESTAMPTZ '${TASK_708_CUTOVER_TS}'
    )
    +
    (
      SELECT COUNT(*) FROM greenhouse_finance.expense_payments
      WHERE payment_account_id IS NULL
        AND superseded_by_payment_id IS NULL
        AND superseded_by_otb_id IS NULL
        AND superseded_at IS NULL
        AND created_at >= TIMESTAMPTZ '${TASK_708_CUTOVER_TS}'
    ) AS total
`

const TASK708_PAYMENTS_PENDING_ACCOUNT_HISTORICAL_SQL = `
  SELECT
    (
      SELECT COUNT(*) FROM greenhouse_finance.income_payments
      WHERE payment_account_id IS NULL
        AND superseded_by_payment_id IS NULL
        AND superseded_by_otb_id IS NULL
        AND superseded_at IS NULL
        AND created_at < TIMESTAMPTZ '${TASK_708_CUTOVER_TS}'
    )
    +
    (
      SELECT COUNT(*) FROM greenhouse_finance.expense_payments
      WHERE payment_account_id IS NULL
        AND superseded_by_payment_id IS NULL
        AND superseded_by_otb_id IS NULL
        AND superseded_at IS NULL
        AND created_at < TIMESTAMPTZ '${TASK_708_CUTOVER_TS}'
    ) AS total
`

const TASK708_SETTLEMENT_LEGS_PRINCIPAL_WITHOUT_INSTRUMENT_SQL = `
  SELECT COUNT(*) AS total
  FROM greenhouse_finance.settlement_legs
  WHERE leg_type IN ('receipt', 'payout')
    AND instrument_id IS NULL
    AND superseded_at IS NULL
    AND superseded_by_otb_id IS NULL
`

const TASK708_RECONCILED_AGAINST_UNSCOPED_SQL = `
  SELECT (
    (
      SELECT COUNT(*)
      FROM greenhouse_finance.bank_statement_rows bsr
      JOIN greenhouse_finance.settlement_legs sl
        ON sl.settlement_leg_id = bsr.matched_settlement_leg_id
      WHERE sl.instrument_id IS NULL
        AND sl.superseded_at IS NULL
        AND sl.superseded_by_otb_id IS NULL
    )
    +
    (
      SELECT COUNT(*)
      FROM greenhouse_finance.bank_statement_rows bsr
      JOIN greenhouse_finance.reconciliation_periods rp ON rp.period_id = bsr.period_id
      JOIN greenhouse_finance.income_payments ip ON ip.payment_id = bsr.matched_payment_id
      WHERE bsr.matched_type IN ('income_payment', 'income')
        AND ip.payment_account_id IS NOT NULL
        AND rp.account_id IS DISTINCT FROM ip.payment_account_id
    )
    +
    (
      SELECT COUNT(*)
      FROM greenhouse_finance.bank_statement_rows bsr
      JOIN greenhouse_finance.reconciliation_periods rp ON rp.period_id = bsr.period_id
      JOIN greenhouse_finance.expense_payments ep ON ep.payment_id = bsr.matched_payment_id
      WHERE bsr.matched_type IN ('expense_payment', 'expense')
        AND ep.payment_account_id IS NOT NULL
        AND rp.account_id IS DISTINCT FROM ep.payment_account_id
    )
  ) AS total
`

const TASK708_EXTERNAL_SIGNALS_UNRESOLVED_OVER_THRESHOLD_SQL = `
  SELECT COUNT(*) AS total
  FROM greenhouse_finance.external_cash_signals
  WHERE account_resolution_status = 'unresolved'
    AND signal_date < (CURRENT_DATE - $1::int)
`

const TASK708_EXTERNAL_SIGNALS_PROMOTED_INVARIANT_VIOLATION_SQL = `
  SELECT COUNT(*) AS total
  FROM greenhouse_finance.external_cash_signals s
  WHERE s.promoted_payment_id IS NOT NULL
    AND (
      (s.promoted_payment_kind = 'income_payment' AND NOT EXISTS (
        SELECT 1 FROM greenhouse_finance.income_payments ip
        WHERE ip.payment_id = s.promoted_payment_id
          AND ip.payment_account_id IS NOT NULL
          AND ip.superseded_by_payment_id IS NULL
          AND ip.superseded_by_otb_id IS NULL
      ))
      OR
      (s.promoted_payment_kind = 'expense_payment' AND NOT EXISTS (
        SELECT 1 FROM greenhouse_finance.expense_payments ep
        WHERE ep.payment_id = s.promoted_payment_id
          AND ep.payment_account_id IS NOT NULL
          AND ep.superseded_by_payment_id IS NULL
          AND ep.superseded_by_otb_id IS NULL
      ))
    )
`

// ─── TASK-708d — Cohort D: post-cutover D5-adopted phantoms sin evidencia ────
//
// Definicion canonica: la regla D5 (`auto_exact_match` por source_system +
// payment_method + currency) resolvio una cuenta para un payment, pero no
// existe `bank_statement_rows` reconciliado/matcheado con ese payment ni con
// su settlement_leg. Cuenta inferida ≠ cash probado.
//
// Excluye explicitamente:
//   - Cadenas supersede en cualquier eje (TASK-702 / TASK-703b / TASK-708b).
//   - Signals dismissed (`account_resolution_status='dismissed'` o
//     `superseded_at NOT NULL`).
//   - Casos con bank_statement_rows matched al payment o a sus legs.
//   - Casos con settlement_legs reconciled (reconciliation_row_id NOT NULL).
//
// Salida: count agregado + sample (max 20) para ledger-health drill-down.

const TASK708D_COHORT_D_SAMPLE_SQL = `
  WITH d5_active_adoptions AS (
    SELECT
      'income'::text AS payment_kind,
      s.signal_id,
      s.document_id,
      ip.payment_id,
      ip.payment_account_id AS account_id,
      ip.payment_date::text AS payment_date,
      ip.amount::text AS amount
    FROM greenhouse_finance.external_cash_signals s
    JOIN greenhouse_finance.income_payments ip ON ip.payment_id = s.promoted_payment_id
    WHERE s.promoted_payment_kind = 'income_payment'
      AND s.resolution_method = 'auto_exact_match'
      AND s.account_resolution_status = 'adopted'
      AND s.superseded_at IS NULL
      AND ip.superseded_at IS NULL
      AND ip.superseded_by_payment_id IS NULL
      AND ip.superseded_by_otb_id IS NULL
      AND ip.created_at >= TIMESTAMPTZ '${TASK_708_CUTOVER_TS}'
    UNION ALL
    SELECT
      'expense'::text AS payment_kind,
      s.signal_id,
      s.document_id,
      ep.payment_id,
      ep.payment_account_id AS account_id,
      ep.payment_date::text AS payment_date,
      ep.amount::text AS amount
    FROM greenhouse_finance.external_cash_signals s
    JOIN greenhouse_finance.expense_payments ep ON ep.payment_id = s.promoted_payment_id
    WHERE s.promoted_payment_kind = 'expense_payment'
      AND s.resolution_method = 'auto_exact_match'
      AND s.account_resolution_status = 'adopted'
      AND s.superseded_at IS NULL
      AND ep.superseded_at IS NULL
      AND ep.superseded_by_payment_id IS NULL
      AND ep.superseded_by_otb_id IS NULL
      AND ep.created_at >= TIMESTAMPTZ '${TASK_708_CUTOVER_TS}'
  )
  SELECT
    a.payment_kind,
    a.payment_id,
    a.document_id,
    a.account_id,
    a.payment_date,
    a.amount,
    a.signal_id
  FROM d5_active_adoptions a
  WHERE NOT EXISTS (
    -- Direct match: bank_statement_row.matched_payment_id = payment_id
    SELECT 1 FROM greenhouse_finance.bank_statement_rows bsr
    WHERE bsr.matched_payment_id = a.payment_id
      AND bsr.match_status IN ('manual_matched', 'auto_matched')
  )
  AND NOT EXISTS (
    -- Indirect match: bank_statement_row matched to one of the payment's legs
    SELECT 1
    FROM greenhouse_finance.settlement_legs sl
    JOIN greenhouse_finance.bank_statement_rows bsr
      ON bsr.matched_settlement_leg_id = sl.settlement_leg_id
    WHERE sl.linked_payment_id = a.payment_id
      AND sl.superseded_at IS NULL
      AND sl.superseded_by_otb_id IS NULL
      AND bsr.match_status IN ('manual_matched', 'auto_matched')
  )
  AND NOT EXISTS (
    -- Settlement-side reconciled (some flows mark reconciliation_row_id directly)
    SELECT 1 FROM greenhouse_finance.settlement_legs sl
    WHERE sl.linked_payment_id = a.payment_id
      AND sl.reconciliation_row_id IS NOT NULL
      AND sl.superseded_at IS NULL
      AND sl.superseded_by_otb_id IS NULL
  )
  ORDER BY a.payment_date DESC, a.payment_id
  LIMIT 20
`

const TASK708D_COHORT_D_COUNT_SQL = `
  SELECT COUNT(*) AS total FROM (
    SELECT
      'income'::text AS payment_kind,
      s.signal_id,
      ip.payment_id
    FROM greenhouse_finance.external_cash_signals s
    JOIN greenhouse_finance.income_payments ip ON ip.payment_id = s.promoted_payment_id
    WHERE s.promoted_payment_kind = 'income_payment'
      AND s.resolution_method = 'auto_exact_match'
      AND s.account_resolution_status = 'adopted'
      AND s.superseded_at IS NULL
      AND ip.superseded_at IS NULL
      AND ip.superseded_by_payment_id IS NULL
      AND ip.superseded_by_otb_id IS NULL
      AND ip.created_at >= TIMESTAMPTZ '${TASK_708_CUTOVER_TS}'
      AND NOT EXISTS (
        SELECT 1 FROM greenhouse_finance.bank_statement_rows bsr
        WHERE bsr.matched_payment_id = ip.payment_id
          AND bsr.match_status IN ('manual_matched', 'auto_matched')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM greenhouse_finance.settlement_legs sl
        JOIN greenhouse_finance.bank_statement_rows bsr
          ON bsr.matched_settlement_leg_id = sl.settlement_leg_id
        WHERE sl.linked_payment_id = ip.payment_id
          AND sl.superseded_at IS NULL
          AND sl.superseded_by_otb_id IS NULL
          AND bsr.match_status IN ('manual_matched', 'auto_matched')
      )
      AND NOT EXISTS (
        SELECT 1 FROM greenhouse_finance.settlement_legs sl
        WHERE sl.linked_payment_id = ip.payment_id
          AND sl.reconciliation_row_id IS NOT NULL
          AND sl.superseded_at IS NULL
          AND sl.superseded_by_otb_id IS NULL
      )
    UNION ALL
    SELECT
      'expense'::text AS payment_kind,
      s.signal_id,
      ep.payment_id
    FROM greenhouse_finance.external_cash_signals s
    JOIN greenhouse_finance.expense_payments ep ON ep.payment_id = s.promoted_payment_id
    WHERE s.promoted_payment_kind = 'expense_payment'
      AND s.resolution_method = 'auto_exact_match'
      AND s.account_resolution_status = 'adopted'
      AND s.superseded_at IS NULL
      AND ep.superseded_at IS NULL
      AND ep.superseded_by_payment_id IS NULL
      AND ep.superseded_by_otb_id IS NULL
      AND ep.created_at >= TIMESTAMPTZ '${TASK_708_CUTOVER_TS}'
      AND NOT EXISTS (
        SELECT 1 FROM greenhouse_finance.bank_statement_rows bsr
        WHERE bsr.matched_payment_id = ep.payment_id
          AND bsr.match_status IN ('manual_matched', 'auto_matched')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM greenhouse_finance.settlement_legs sl
        JOIN greenhouse_finance.bank_statement_rows bsr
          ON bsr.matched_settlement_leg_id = sl.settlement_leg_id
        WHERE sl.linked_payment_id = ep.payment_id
          AND sl.superseded_at IS NULL
          AND sl.superseded_by_otb_id IS NULL
          AND bsr.match_status IN ('manual_matched', 'auto_matched')
      )
      AND NOT EXISTS (
        SELECT 1 FROM greenhouse_finance.settlement_legs sl
        WHERE sl.linked_payment_id = ep.payment_id
          AND sl.reconciliation_row_id IS NOT NULL
          AND sl.superseded_at IS NULL
          AND sl.superseded_by_otb_id IS NULL
      )
  ) cohort_d
`

// ─── TASK-714d — Internal transfer pair invariant ────────────────────────────
//
// settlement_groups con leg_type='internal_transfer' deben tener exactamente
// 1 leg `outgoing` + 1 leg `incoming` activas (no superseded). Cuando emerge
// un desbalance significa que el carril emisor de las legs no fue el helper
// canónico `createInternalTransferSettlement`. Síntoma visible: la cuenta
// receptora no muestra inflows aunque la emisora muestra outflows.
//
// Excluye explícitamente legs con superseded_at NOT NULL o
// superseded_by_otb_id NOT NULL — esas son audit chains, no movimientos
// activos.

const TASK714D_INTERNAL_TRANSFER_PAIR_IMBALANCE_COUNT_SQL = `
  SELECT COUNT(*) AS total FROM (
    SELECT settlement_group_id
    FROM greenhouse_finance.settlement_legs
    WHERE leg_type = 'internal_transfer'
      AND superseded_at IS NULL
      AND superseded_by_otb_id IS NULL
    GROUP BY settlement_group_id
    HAVING SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END)
        <> SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END)
  ) imbalanced
`

const TASK714D_INTERNAL_TRANSFER_PAIR_IMBALANCE_SAMPLE_SQL = `
  SELECT
    settlement_group_id,
    SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END)::int AS out_count,
    SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END)::int AS in_count,
    array_agg(DISTINCT instrument_id) AS instruments
  FROM greenhouse_finance.settlement_legs
  WHERE leg_type = 'internal_transfer'
    AND superseded_at IS NULL
    AND superseded_by_otb_id IS NULL
  GROUP BY settlement_group_id
  HAVING SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END)
      <> SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END)
  ORDER BY settlement_group_id
  LIMIT 20
`

// TASK-720 — accounts activas con instrument_category sin rule en
// `instrument_category_kpi_rules`. Steady state esperado: 0. Si > 0,
// `getBankOverview` fail-fast con MissingKpiRuleError cuando una cuenta de
// esa categoría sea consultada. Catch graceful (`.catch(() => [])`) cubre el
// caso donde la tabla no existe (pre-migration TASK-720).

const TASK720_ACCOUNTS_WITHOUT_KPI_RULE_COUNT_SQL = `
  SELECT COUNT(*)::text AS total
  FROM greenhouse_finance.accounts a
  WHERE a.is_active = TRUE
    AND a.instrument_category IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_finance.instrument_category_kpi_rules r
      WHERE r.instrument_category = a.instrument_category
    )
`

const TASK720_ACCOUNTS_WITHOUT_KPI_RULE_SAMPLE_SQL = `
  SELECT
    a.account_id,
    a.account_name,
    a.instrument_category,
    a.currency
  FROM greenhouse_finance.accounts a
  WHERE a.is_active = TRUE
    AND a.instrument_category IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_finance.instrument_category_kpi_rules r
      WHERE r.instrument_category = a.instrument_category
    )
  ORDER BY a.account_name
  LIMIT 20
`

// TASK-721 — reconciliation snapshots con evidence_asset_id roto.
// Roto = asset_id no existe O asset.status='deleted'. Con ON DELETE SET NULL
// el FK natural cubre el primer caso (la columna queda null cuando se borra
// el asset), pero el test directo cubre cualquier inconsistencia.

const TASK721_BROKEN_EVIDENCE_COUNT_SQL = `
  SELECT COUNT(*)::text AS total
  FROM greenhouse_finance.account_reconciliation_snapshots s
  WHERE s.evidence_asset_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_core.assets a
      WHERE a.asset_id = s.evidence_asset_id
        AND a.status <> 'deleted'
    )
`

const TASK721_BROKEN_EVIDENCE_SAMPLE_SQL = `
  SELECT
    s.snapshot_id,
    s.account_id,
    s.snapshot_at::text AS snapshot_at,
    s.evidence_asset_id,
    a.status AS asset_status
  FROM greenhouse_finance.account_reconciliation_snapshots s
  LEFT JOIN greenhouse_core.assets a ON a.asset_id = s.evidence_asset_id
  WHERE s.evidence_asset_id IS NOT NULL
    AND (a.asset_id IS NULL OR a.status = 'deleted')
  ORDER BY s.snapshot_at DESC
  LIMIT 20
`

const UNANCHORED_EXPENSES_SQL = `
  SELECT
    e.expense_id, e.expense_type, e.total_amount::text, e.payment_date::text
  FROM greenhouse_finance.expenses e
  WHERE e.payment_status = 'paid'
    AND e.payroll_entry_id IS NULL
    AND e.tool_catalog_id IS NULL
    AND e.supplier_id IS NULL
    AND e.tax_type IS NULL
    AND e.loan_account_id IS NULL
    AND e.linked_income_id IS NULL
    AND e.payment_date >= CURRENT_DATE - INTERVAL '60 days'
  ORDER BY e.payment_date DESC NULLS LAST
  LIMIT 20
`

const readCount = (rows: Array<{ total: string | number | null }>): number => {
  const raw = rows[0]?.total
  const n = typeof raw === 'number' ? raw : Number(raw ?? 0)

  return Number.isFinite(n) ? Math.trunc(n) : 0
}

export const getFinanceLedgerHealth = async (): Promise<LedgerHealthSnapshot> => {
  const [
    drifted,
    phantomsIncome,
    phantomsExpense,
    freshness,
    unanchored,
    pendingRuntimeRows,
    pendingHistoricalRows,
    legsWithoutInstrumentRows,
    reconciledUnscopedRows,
    signalsUnresolvedOverThresholdRows,
    signalsPromotedInvariantRows,
    itxImbalanceCountRows,
    itxImbalanceSampleRows,
    cohortDCountRows,
    cohortDSampleRows,
    task720CountRows,
    task720SampleRows,
    task721CountRows,
    task721SampleRows
  ] = await Promise.all([
    runGreenhousePostgresQuery<{ income_id: string; total_amount: string; amount_paid: string; expected_settlement: string; drift: string }>(SETTLEMENT_DRIFT_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ payment_id: string; income_id: string; payment_date: string; amount: string }>(PHANTOMS_INCOME_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ payment_id: string; expense_id: string; payment_date: string; amount: string }>(PHANTOMS_EXPENSE_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ account_id: string; last_materialized_at: string | null; days_stale: number | null }>(FRESHNESS_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ expense_id: string; expense_type: string; total_amount: string; payment_date: string | null }>(UNANCHORED_EXPENSES_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ total: string }>(TASK708_PAYMENTS_PENDING_ACCOUNT_RUNTIME_SQL).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{ total: string }>(TASK708_PAYMENTS_PENDING_ACCOUNT_HISTORICAL_SQL).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{ total: string }>(TASK708_SETTLEMENT_LEGS_PRINCIPAL_WITHOUT_INSTRUMENT_SQL).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{ total: string }>(TASK708_RECONCILED_AGAINST_UNSCOPED_SQL).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{ total: string }>(TASK708_EXTERNAL_SIGNALS_UNRESOLVED_OVER_THRESHOLD_SQL, [EXTERNAL_SIGNALS_UNRESOLVED_THRESHOLD_DAYS]).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{ total: string }>(TASK708_EXTERNAL_SIGNALS_PROMOTED_INVARIANT_VIOLATION_SQL).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{ total: string }>(TASK714D_INTERNAL_TRANSFER_PAIR_IMBALANCE_COUNT_SQL).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{
      settlement_group_id: string
      out_count: number
      in_count: number
      instruments: string[]
    }>(TASK714D_INTERNAL_TRANSFER_PAIR_IMBALANCE_SAMPLE_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ total: string }>(TASK708D_COHORT_D_COUNT_SQL).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{
      payment_kind: 'income' | 'expense'
      payment_id: string
      document_id: string
      account_id: string
      payment_date: string
      amount: string
      signal_id: string
    }>(TASK708D_COHORT_D_SAMPLE_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ total: string }>(TASK720_ACCOUNTS_WITHOUT_KPI_RULE_COUNT_SQL).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{
      account_id: string
      account_name: string
      instrument_category: string
      currency: string
    }>(TASK720_ACCOUNTS_WITHOUT_KPI_RULE_SAMPLE_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ total: string }>(TASK721_BROKEN_EVIDENCE_COUNT_SQL).catch(() => [{ total: '0' }]),
    runGreenhousePostgresQuery<{
      snapshot_id: string
      account_id: string
      snapshot_at: string
      evidence_asset_id: string
      asset_status: string | null
    }>(TASK721_BROKEN_EVIDENCE_SAMPLE_SQL).catch(() => [])
  ])

  const incomePhantoms = phantomsIncome.map(p => ({
    paymentId: p.payment_id,
    incomeOrExpenseId: p.income_id,
    date: p.payment_date,
    amount: Number(p.amount),
    source: 'income' as const
  }))

  const expensePhantoms = phantomsExpense.map(p => ({
    paymentId: p.payment_id,
    incomeOrExpenseId: p.expense_id,
    date: p.payment_date,
    amount: Number(p.amount),
    source: 'expense' as const
  }))

  const accountsWithStaleBalances = freshness.map(f => ({
    accountId: f.account_id,
    lastMaterializedAt: f.last_materialized_at ?? 'never',
    daysStale: f.days_stale ?? -1
  }))

  const settlementDrift = {
    driftedIncomesCount: drifted.length,
    sampleDrifted: drifted.slice(0, 10).map(d => ({
      incomeId: d.income_id,
      totalAmount: Number(d.total_amount),
      amountPaid: Number(d.amount_paid),
      expectedSettlement: Number(d.expected_settlement),
      drift: Number(d.drift)
    }))
  }

  const phantoms = {
    incomePhantomsCount: incomePhantoms.length,
    expensePhantomsCount: expensePhantoms.length,
    samplePhantoms: [...incomePhantoms, ...expensePhantoms].slice(0, 20)
  }

  const unanchoredExpenses = {
    count: unanchored.length,
    sample: unanchored.map(u => ({
      expenseId: u.expense_id,
      type: u.expense_type,
      amount: Number(u.total_amount),
      paymentDate: u.payment_date
    }))
  }

  const task708 = {
    paymentsPendingAccountResolutionRuntime: readCount(pendingRuntimeRows),
    paymentsPendingAccountResolutionHistorical: readCount(pendingHistoricalRows),
    settlementLegsPrincipalWithoutInstrument: readCount(legsWithoutInstrumentRows),
    reconciledRowsAgainstUnscopedTarget: readCount(reconciledUnscopedRows),
    externalCashSignalsUnresolvedOverThreshold: readCount(signalsUnresolvedOverThresholdRows),
    externalCashSignalsPromotedInvariantViolation: readCount(signalsPromotedInvariantRows)
  }

  const task708d = {
    postCutoverPhantomsWithoutBankEvidence: readCount(cohortDCountRows),
    samplePhantoms: cohortDSampleRows.map(row => ({
      paymentKind: row.payment_kind,
      paymentId: row.payment_id,
      documentId: row.document_id,
      accountId: row.account_id,
      paymentDate: row.payment_date,
      amount: Number(row.amount),
      signalId: row.signal_id
    }))
  }

  const task714d = {
    internalTransferGroupsWithMissingPair: readCount(itxImbalanceCountRows),
    sampleImbalancedGroups: itxImbalanceSampleRows.map(row => ({
      settlementGroupId: row.settlement_group_id,
      outCount: Number(row.out_count),
      inCount: Number(row.in_count),
      instruments: Array.isArray(row.instruments) ? row.instruments.filter(Boolean) : []
    }))
  }

  const task720 = {
    instrumentCategoriesWithoutKpiRule: readCount(task720CountRows),
    sampleAccountsWithoutRule: task720SampleRows.map(row => ({
      accountId: row.account_id,
      accountName: row.account_name,
      instrumentCategory: row.instrument_category,
      currency: row.currency
    }))
  }

  const task721 = {
    reconciliationSnapshotsWithBrokenEvidence: readCount(task721CountRows),
    sampleBrokenSnapshots: task721SampleRows.map(row => ({
      snapshotId: row.snapshot_id,
      accountId: row.account_id,
      snapshotAt: row.snapshot_at,
      evidenceAssetId: row.evidence_asset_id,
      assetStatus: row.asset_status
    }))
  }

  const healthy =
    settlementDrift.driftedIncomesCount === 0 &&
    phantoms.incomePhantomsCount === 0 &&
    phantoms.expensePhantomsCount === 0 &&
    accountsWithStaleBalances.filter(a => a.daysStale > STALE_THRESHOLD_DAYS).length === 0 &&
    unanchoredExpenses.count === 0 &&
    // TASK-708 Slice 6: runtime cohort + canary deben ser 0; historico no
    // cuenta para `healthy` porque solo baja con TASK-708b cleanup.
    task708.paymentsPendingAccountResolutionRuntime === 0 &&
    task708.externalCashSignalsPromotedInvariantViolation === 0 &&
    // TASK-708d: Cohort D debe ser 0; cualquier valor mayor implica payments
    // post-cutover con cuenta inferida pero sin evidencia de cartola.
    task708d.postCutoverPhantomsWithoutBankEvidence === 0 &&
    // TASK-714d: settlement_groups internal_transfer balanceados; cualquier
    // grupo con out_count != in_count distorsiona el ledger receptor.
    task714d.internalTransferGroupsWithMissingPair === 0 &&
    // TASK-720: cuentas activas con instrument_category sin rule causan
    // fail-fast en getBankOverview (MissingKpiRuleError).
    task720.instrumentCategoriesWithoutKpiRule === 0 &&
    // TASK-721: snapshots con evidence_asset_id roto degradan auditoría.
    task721.reconciliationSnapshotsWithBrokenEvidence === 0

  return {
    healthy,
    checkedAt: new Date().toISOString(),
    settlementDrift,
    phantoms,
    balanceFreshness: { accountsWithStaleBalances },
    unanchoredExpenses,
    task708,
    task708d,
    task714d,
    task720,
    task721
  }
}
