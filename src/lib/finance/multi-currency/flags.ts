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
