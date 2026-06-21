import 'server-only'

import { resolveIndexedUnitSnapshotEvidence, type FxSnapshotEvidence } from './fx-snapshot'

// TASK-995 — el plano funcional de una factura CLF es CLP, y en Chile las
// facturas en CLP son ENTERAS (sin centavos). Por eso el CLP derivado de
// native_UF × valor_UF se redondea a entero (no a 2 decimales). El monto nativo
// UF conserva sus decimales en el plano native.
const roundClp = (value: number): number => Math.round(value)

// TASK-995 Slice 3 (ADR GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1) — project a
// CLF/UF-denominated commercial fact (a CLF quote/contract) into the CLP
// functional plane of a finance income, preserving the native CLF amount and a
// locked CLF→CLP snapshot. The legal/cash currency of the income is CLP; the UF
// amount lives on the native plane (income.native_amount / native_currency).
//
// Policy (ADR §6): recognition uses the UF at the legal-event date. The CLP
// functional amounts are native_CLF × UF; they are NEVER recomputed on read once
// the snapshot is locked. Fail-closed: if no UF value exists for the date, this
// returns null and the caller blocks the write (no silent CLP-flattening).

export interface ClfIncomeProjectionInput {
  /** Net (afecto) amount in CLF. */
  subtotalClf: number
  /** IVA amount in CLF (0 for exempt). */
  taxAmountClf: number
  /** Total document amount in CLF (= subtotal + tax + exempt). */
  totalClf: number
  /** Legal-event date (invoice emission) — the UF date per ADR §6. */
  rateDate: string
}

export interface ClfIncomeProjection {
  /** Locked CLF→CLP evidence to persist + link (native_to_functional). */
  fxSnapshotEvidence: FxSnapshotEvidence
  /** UF rate used (CLP per CLF). */
  ufRate: number
  /** CLP functional plane (native CLF × UF). */
  functionalSubtotalClp: number
  functionalTaxAmountClp: number
  functionalTotalClp: number
  /** Native indexed plane carried on the income. */
  nativeAmountClf: number
}

/**
 * Resolve the CLF→CLP projection for a CLF commercial fact. Returns null when
 * the UF value is unavailable for the date (fail-closed — caller blocks).
 * `deps.resolveSnapshot` is injectable for tests.
 */
export const buildClfIncomeProjection = async (
  input: ClfIncomeProjectionInput,
  deps: { resolveSnapshot?: typeof resolveIndexedUnitSnapshotEvidence } = {}
): Promise<ClfIncomeProjection | null> => {
  const resolve = deps.resolveSnapshot ?? resolveIndexedUnitSnapshotEvidence

  const evidence = await resolve({ unit: 'CLF', rateDate: input.rateDate, policy: 'rate_at_event' })

  if (!evidence) return null

  const ufRate = Number(evidence.rate)

  if (!(ufRate > 0)) return null

  return {
    fxSnapshotEvidence: evidence,
    ufRate,
    functionalSubtotalClp: roundClp(Math.abs(input.subtotalClf) * ufRate),
    functionalTaxAmountClp: roundClp(Math.abs(input.taxAmountClf) * ufRate),
    functionalTotalClp: roundClp(Math.abs(input.totalClf) * ufRate),
    nativeAmountClf: Math.abs(input.totalClf)
  }
}
