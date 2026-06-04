// TASK-990 Slice 7 — Native-plane settlement math (pure, deterministic).
//
// A foreign-currency invoice/expense (Berel DTE 110) is stored CLP-functional
// per the plane contract, but in substance is a foreign-currency monetary item
// (IAS 21 §16): it settles in its NATIVE currency and the CLP delta vs the
// booked rate is REALIZED FX. These pure helpers encode the three decisions the
// payment ledgers make so they can be unit-tested without a DB. The DB function
// `fn_recompute_income_amount_paid` / `fn_sync_expense_amount_paid` mirror the
// completion semantics on the persistence side (TASK-990 Slice 7 migration).

export interface NativeSettlementContext {
  /** True when the row carries a native (foreign) plane → settles natively. */
  isNative: boolean
  nativeCurrency: string | null
  nativeAmount: number | null
  /**
   * The obligation total in the SETTLEMENT plane: native units for a native
   * invoice/expense, functional total otherwise. Used for the overflow guard
   * and the pending balance.
   */
  settlementTotal: number
}

/** Resolve the settlement-plane context from a row's native columns. */
export const resolveNativeSettlementContext = (input: {
  nativeCurrency: string | null | undefined
  nativeAmount: number | null | undefined
  /** Functional total (total_amount) used when the row has no native plane. */
  fallbackTotal: number
}): NativeSettlementContext => {
  const nativeCurrency = input.nativeCurrency ? String(input.nativeCurrency) : null
  const nativeAmount = input.nativeAmount != null ? Number(input.nativeAmount) : null
  const isNative = Boolean(nativeCurrency) && nativeAmount != null && Number.isFinite(nativeAmount)

  return {
    isNative,
    nativeCurrency,
    nativeAmount: isNative ? (nativeAmount as number) : null,
    settlementTotal: isNative ? (nativeAmount as number) : input.fallbackTotal
  }
}

/**
 * Fail-closed corridor: a native invoice/expense settles ONLY in its native
 * currency in V1. A legacy (non-native) row accepts any payment currency.
 */
export const isSettlementCorridorSupported = (input: {
  isNative: boolean
  nativeCurrency: string | null
  paymentCurrency: string
}): boolean => !input.isNative || input.paymentCurrency === input.nativeCurrency

/**
 * Booked (document) functional rate for the FX result. For a native row it is
 * the native→functional rate locked at issuance (`total_amount_clp /
 * native_amount`, equal to the linked fx_snapshot rate by construction); for a
 * legacy same-currency foreign row it is `exchange_rate_to_clp`.
 */
export const deriveBookedFunctionalRate = (input: {
  isNative: boolean
  totalAmountClp: number
  nativeAmount: number | null
  legacyDocumentRate: number
}): number => {
  if (input.isNative && input.nativeAmount != null && input.nativeAmount > 0) {
    return input.totalAmountClp / input.nativeAmount
  }

  return input.legacyDocumentRate
}

/**
 * Realized FX in CLP = settlement CLP − booked CLP. Returns null when there is
 * no booked rate (e.g. a non-native foreign doc without exchange_rate_to_clp),
 * which the reliability signal `finance.fx_gain_loss.unclassified` then flags.
 *
 * `settlementClp` MUST already be `round(paymentAmount * rateAtSettlement)` so
 * the result matches the persisted `fx_gain_loss_clp` bit-for-bit.
 */
export const computeRealizedFxClp = (input: {
  paymentAmount: number
  settlementClp: number
  bookedRate: number
  round: (value: number) => number
}): number | null => {
  if (!(input.bookedRate > 0)) {
    return null
  }

  return input.round(input.settlementClp - input.round(input.paymentAmount * input.bookedRate))
}
