// TASK-990 — MXN multi-currency finance core feature flags. ALL default OFF.
// Expand-and-contract: code + schema ship behind these; production write paths
// only activate MXN once the operator flips the flag per the rollout sequence.
// Pattern mirrors src/lib/finance/payment-orders/contractor-settlement-flag.ts.

/** Gate for MXN as a finance_core currency on income/expense/obligation/order
 *  write paths. Default OFF → CLP/USD behavior is bit-for-bit unchanged. */
export const isFinanceCoreMxnEnabled = (): boolean => process.env.FINANCE_CORE_MXN_ENABLED === 'true'

/** Gate for projecting Nubox export (DTE 110) foreign-currency detail into the
 *  conformed/income model. Default OFF. */
export const isNuboxExportForeignCurrencyEnabled = (): boolean =>
  process.env.NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED === 'true'

/** Gate for creating MXN payment obligations/orders/profiles. Default OFF. */
export const isFinanceMxnPaymentOrdersEnabled = (): boolean =>
  process.env.FINANCE_MXN_PAYMENT_ORDERS_ENABLED === 'true'

/** Gate for exposing the USD reporting plane in multi-currency readers. Default
 *  OFF → readers fall back to the legacy CLP-consolidated shape. */
export const isFinanceMultiCurrencyReportingEnabled = (): boolean =>
  process.env.FINANCE_MULTI_CURRENCY_REPORTING_ENABLED === 'true'

/** Gate for APPLYING the Berel allowlist backfill (dry-run never needs it).
 *  Default OFF — the backfill script refuses --apply unless this is true. */
export const isFinanceMxnBerelBackfillApplyEnabled = (): boolean =>
  process.env.FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED === 'true'

// ── TASK-995: CLF/UF indexed finance core feature flags. ALL default OFF. ──────
// ADR GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1. Mirror the TASK-990 expand-and-
// contract pattern: code + schema ship behind these; CLF write paths only
// activate once the operator flips the flag per the rollout sequence. With every
// flag OFF, CLP/USD/MXN behavior is bit-for-bit unchanged.

/** Master gate for CLF as a native/indexed unit on finance-core facts. Default
 *  OFF → CLF stays pricing/quote-only. */
export const isFinanceCoreClfIndexedEnabled = (): boolean =>
  process.env.FINANCE_CORE_CLF_INDEXED_ENABLED === 'true'

/** Gate for projecting a CLF quote/contract into a CLF-native income (functional
 *  CLP + locked CLF→CLP snapshot). Default OFF. */
export const isFinanceClfIncomeProjectionEnabled = (): boolean =>
  process.env.FINANCE_CLF_INCOME_PROJECTION_ENABLED === 'true'

/** Gate for creating CLF-native payment obligations (settle as CLP orders).
 *  Default OFF. */
export const isFinanceClfObligationsEnabled = (): boolean =>
  process.env.FINANCE_CLF_OBLIGATIONS_ENABLED === 'true'

/** Gate for exposing the CLF native / indexed-unit planes in readers. Default
 *  OFF → readers fall back to the legacy CLP shape. */
export const isFinanceClfReportingEnabled = (): boolean =>
  process.env.FINANCE_CLF_REPORTING_ENABLED === 'true'

/** Gate for APPLYING any CLF allowlist backfill. Default OFF. */
export const isFinanceClfBackfillApplyEnabled = (): boolean =>
  process.env.FINANCE_CLF_BACKFILL_APPLY_ENABLED === 'true'
