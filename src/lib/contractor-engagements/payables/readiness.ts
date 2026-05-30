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
 *
 * TASK-794 — Chile honorarios compliance gates (fail-closed):
 *   - classification risk not blocking (universal — all lanes)
 *   - verified CL_RUT present when honorarios_cl (`rut_unverified`)
 *   - honorarios withholding is SII-only and reconciles vs the snapshot rate
 *     (`honorarios_withholding_mismatch` — catches any dependent deduction /
 *      wrong rate slipping into an honorarios payable)
 *
 * TASK-795 Fase A — International contractor / provider boundary (fail-closed):
 *   - tax owner not pending human review / a missing country engine
 *     (`tax_owner_review_required`). The contractor domain NEVER computes a
 *     Chile→non-resident withholding rate itself — it blocks and escalates to the
 *     `international_internal` withholding engine (TASK-905/906/907). See D-795-4.
 *   - explicit FX policy declared when cross-currency (`fx_policy_unresolved`).
 *     A cross-currency payout must declare WHICH FX policy governs the conversion
 *     (`engagement.fx_policy_code`), not just that a rate happens to exist. D-795-1.
 */

export const PAYABLE_READINESS_BLOCKER_CODES = [
  'source_not_approved',
  'invoice_asset_missing',
  'net_mismatch',
  'currency_unsupported',
  'fx_unresolved',
  'payment_profile_unresolved',
  'provider_split_missing',
  // TASK-794 — Chile honorarios compliance
  'classification_risk_blocking',
  'rut_unverified',
  'honorarios_withholding_mismatch',
  // TASK-795 Fase A — international contractor / provider boundary
  'tax_owner_review_required',
  'fx_policy_unresolved'
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
  // ── TASK-794 — Chile honorarios compliance ──────────────────────────────────
  /** engagement.classificationRiskStatus ∈ {legal_review_required, blocked}. Universal gate. */
  classificationRiskBlocking: boolean
  /** engagement.relationshipSubtype === 'honorarios_cl'. Gates the honorarios-only checks below. */
  isHonorarios: boolean
  /** Profile has a CL_RUT with verification_status='verified' (only enforced when isHonorarios). */
  rutVerified: boolean
  /** Optional person-legal-profile blocker code (e.g. cl_rut_missing) surfaced in the message. */
  rutBlockerDetail?: string | null
  /**
   * Persisted withholding/net equals the recomputed SII-only honorarios payout
   * (only enforced when isHonorarios). False ⇒ a dependent deduction / wrong rate
   * is embedded in the payable.
   */
  honorariosWithholdingConsistent: boolean
  // ── TASK-795 Fase A — international contractor / provider boundary ───────────
  /**
   * The engagement's tax treatment needs human review or a withholding engine
   * that is not yet available (`tax_compliance_owner ∈ {manual_review_required,
   * country_engine_owned}`). Fail-closed: the payable cannot reach Finance until
   * a human reviews it or the `international_internal` engine (TASK-905) resolves
   * the withholding. The contractor domain NEVER applies a rate itself (D-795-4).
   */
  taxOwnerReviewRequired: boolean
  /** Surfaced detail (the actual tax_compliance_owner value) for the message. */
  taxOwnerDetail?: string | null
  /**
   * An explicit FX policy (`engagement.fx_policy_code`) is declared. Only enforced
   * when `fxNeeded` (cross-currency). A reliable rate existing (`fxSupported`) is
   * NOT enough — the governance policy (source/date convention/spread owner) must
   * be declared so the conversion is auditable, not incidental. D-795-1.
   */
  fxPolicyDeclared: boolean
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

  // TASK-795 Fase A — cross-currency requires an EXPLICIT FX policy, not just a rate.
  if (inputs.fxNeeded && !inputs.fxPolicyDeclared) {
    blockers.push({
      code: 'fx_policy_unresolved',
      message:
        'Falta declarar una política FX explícita (fx_policy_code) para el pago cross-currency; el cambio debe ser auditable, no incidental.'
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

  // ── TASK-794 — Chile honorarios compliance gates ────────────────────────────
  // Universal: classification risk blocks approval/payment of any lane.
  if (inputs.classificationRiskBlocking) {
    blockers.push({
      code: 'classification_risk_blocking',
      message:
        'El engagement tiene riesgo de clasificación laboral bloqueante; requiere revisión legal antes de pagar.'
    })
  }

  if (inputs.isHonorarios) {
    if (!inputs.rutVerified) {
      const detail = inputs.rutBlockerDetail ? ` (${inputs.rutBlockerDetail})` : ''

      blockers.push({
        code: 'rut_unverified',
        message: `Falta el RUT chileno verificado del prestador para emitir honorarios${detail}.`
      })
    }

    if (!inputs.honorariosWithholdingConsistent) {
      blockers.push({
        code: 'honorarios_withholding_mismatch',
        message:
          'La retención del honorarios no coincide con la retención SII versionada (solo se permite retención SII, sin deducciones dependientes).'
      })
    }
  }

  // ── TASK-795 Fase A — international contractor / provider boundary ───────────
  // Tax treatment pending human review or a country withholding engine that is
  // not yet available. Fail-closed: escalate to TASK-905 / human, never apply a
  // rate here (D-795-4).
  if (inputs.taxOwnerReviewRequired) {
    const detail = inputs.taxOwnerDetail ? ` (${inputs.taxOwnerDetail})` : ''

    blockers.push({
      code: 'tax_owner_review_required',
      message: `El tratamiento tributario requiere revisión humana o un motor de retención aún no disponible${detail}; escala a revisión/withholding engine antes de pagar.`
    })
  }

  return {
    ready: blockers.length === 0,
    blockers,
    evaluatedAt: now
  }
}
