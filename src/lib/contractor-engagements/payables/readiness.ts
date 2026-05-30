/**
 * TASK-793 — Contractor payable readiness evaluation (pure). Slice 2.
 *
 * FAIL-CLOSED: a payable only becomes `ready_for_finance` when every gate
 * passes. The server (`assessPayableReadiness`) resolves the inputs (invoice
 * assets, payment route, FX readiness) and feeds this pure evaluator so it stays
 * unit-testable.
 *
 * Gates (arch GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1 §Payable readiness):
 *   - source approved (work submission approved / off-cycle operator-approved)
 *   - invoice asset attached when engagement.requiresInvoice
 *   - net reconciles (net = gross − withholding)
 *   - obligation currency supported ({CLP,USD} — payment_obligations CHECK)
 *   - FX resolved when contract currency ≠ payment currency
 *   - payment profile resolved OR governed waiver present
 *   - provider split present when provider-owned (deel/remote/oyster)
 */

export const PAYABLE_READINESS_BLOCKER_CODES = [
  'source_not_approved',
  'invoice_asset_missing',
  'net_mismatch',
  'currency_unsupported',
  'fx_unresolved',
  'payment_profile_unresolved',
  'provider_split_missing'
] as const
export type PayableReadinessBlockerCode = (typeof PAYABLE_READINESS_BLOCKER_CODES)[number]

export interface PayableReadinessBlocker {
  code: PayableReadinessBlockerCode
  message: string
}

export interface PayableReadinessInputs {
  sourceApproved: boolean
  requiresInvoice: boolean
  hasRequiredInvoiceAsset: boolean
  grossAmount: number
  withholdingAmount: number
  netPayable: number
  /** payment_currency ?? currency — the currency the obligation will be created in. */
  obligationCurrency: string
  /** true when contract currency differs from payment currency → FX needed. */
  fxNeeded: boolean
  fxSupported: boolean
  paymentProfileResolved: boolean
  paymentProfileWaived: boolean
  /** engagement.payrollVia ∈ {deel,remote,oyster}. */
  providerOwned: boolean
  hasProviderRef: boolean
}

export interface PayableReadinessResult {
  ready: boolean
  blockers: PayableReadinessBlocker[]
  evaluatedAt: string
}

const SUPPORTED_OBLIGATION_CURRENCIES = new Set(['CLP', 'USD'])

export const evaluatePayableReadiness = (
  inputs: PayableReadinessInputs,
  now: string = new Date().toISOString()
): PayableReadinessResult => {
  const blockers: PayableReadinessBlocker[] = []

  if (!inputs.sourceApproved) {
    blockers.push({
      code: 'source_not_approved',
      message: 'La evidencia/submission de origen no está aprobada.'
    })
  }

  if (inputs.requiresInvoice && !inputs.hasRequiredInvoiceAsset) {
    blockers.push({
      code: 'invoice_asset_missing',
      message: 'Falta el documento de invoice/boleta requerido por el engagement.'
    })
  }

  const reconciles =
    Math.round((inputs.grossAmount - inputs.withholdingAmount) * 100) / 100 ===
    Math.round(inputs.netPayable * 100) / 100

  if (!reconciles) {
    blockers.push({
      code: 'net_mismatch',
      message: 'El neto no cuadra (neto ≠ bruto − retención).'
    })
  }

  if (!SUPPORTED_OBLIGATION_CURRENCIES.has(inputs.obligationCurrency)) {
    blockers.push({
      code: 'currency_unsupported',
      message: `La moneda de pago (${inputs.obligationCurrency}) no está soportada por Finance (solo CLP/USD).`
    })
  }

  if (inputs.fxNeeded && !inputs.fxSupported) {
    blockers.push({
      code: 'fx_unresolved',
      message: 'No hay tasa FX confiable entre la moneda contractual y la de pago.'
    })
  }

  if (!inputs.paymentProfileResolved && !inputs.paymentProfileWaived) {
    blockers.push({
      code: 'payment_profile_unresolved',
      message: 'No hay perfil de pago aprobado para el beneficiario (ni waiver gobernado).'
    })
  }

  if (inputs.providerOwned && !inputs.hasProviderRef) {
    blockers.push({
      code: 'provider_split_missing',
      message: 'Falta la referencia del proveedor (contrato/worker) para un payable provider-owned.'
    })
  }

  return {
    ready: blockers.length === 0,
    blockers,
    evaluatedAt: now
  }
}
