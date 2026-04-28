import 'server-only'

/**
 * TASK-708 Slice 2 — Reconciliation matchability policy (single source of truth).
 *
 * Estado canonico de "que tan reconciliable es un objeto" (income_payment,
 * expense_payment, settlement_leg). NO hay logica de matchability dispersa
 * en SQL ni en route handlers — todo consumer (resolver, route, UI, health)
 * consulta este modulo.
 *
 * Discriminated union exhaustiva (4 estados):
 *   - `recorded` — cash registrado, listo para conciliacion bancaria.
 *   - `reconciliable` — explicitamente apto para entrar al pool de candidatos
 *     (subset de `recorded` con todas las invariantes cumplidas).
 *   - `pending_account_resolution` — el cash existe pero no tiene cuenta
 *     resuelta (legacy phantoms o señal Nubox sin cuenta). NO entra al pool.
 *   - `needs_repair` — la fila viola una invariante critica (e.g. settlement
 *     leg principal sin instrument_id). Bloqueada hasta TASK-708b cleanup.
 *
 * Invariantes consultadas:
 *   - superseded_by_payment_id IS NULL → si esta superseded por payment chain,
 *     no participa en conciliacion.
 *   - superseded_by_otb_id IS NULL → si esta superseded por OTB chain, idem.
 *   - payment_account_id IS NOT NULL para income_payments / expense_payments.
 *   - instrument_id IS NOT NULL para settlement_legs principales (receipt/payout).
 *
 * El resultado es input critico para:
 *   - listReconciliationCandidatesByAccount (Slice 3)
 *   - settlement-orchestration (Slice 4)
 *   - ledger-health metrics (Slice 6)
 *   - UI cola admin /finance/external-signals (Slice 6)
 */

export type MatchabilityState =
  | { kind: 'recorded' }
  | { kind: 'reconciliable' }
  | { kind: 'pending_account_resolution'; reason: 'no_payment_account_id' | 'no_instrument_id' }
  | { kind: 'needs_repair'; reason: 'principal_leg_without_instrument' | 'superseded_orphan' }

export interface IncomePaymentMatchabilityInput {
  paymentId: string
  paymentAccountId: string | null
  supersededByPaymentId: string | null
  supersededByOtbId: string | null
}

export interface ExpensePaymentMatchabilityInput {
  paymentId: string
  paymentAccountId: string | null
  supersededByPaymentId: string | null
  supersededByOtbId: string | null
}

export interface SettlementLegMatchabilityInput {
  settlementLegId: string
  legType: 'receipt' | 'payout' | 'internal_transfer' | 'funding' | 'fx_conversion' | 'fee'
  instrumentId: string | null
  supersededAt: Date | string | null
  supersededByOtbId: string | null
}

const isPrincipalLegType = (legType: SettlementLegMatchabilityInput['legType']): boolean =>
  legType === 'receipt' || legType === 'payout'

/**
 * Estado de matchability para un income_payment / expense_payment.
 *
 * Reglas:
 *   - cualquier supersede activa (payment chain o OTB chain) → `recorded`
 *     "histórico, no participa". El resolver NO debe ofrecerlo como candidato,
 *     pero el row sigue existiendo para audit.
 *   - payment_account_id IS NULL → `pending_account_resolution`. La invariante
 *     post-cutover (CHECK) impide rows nuevos en este estado, pero los phantoms
 *     historicos viven aca hasta TASK-708b cleanup.
 *   - todo lo demás → `reconciliable` (entra al pool de candidatos).
 */
export const getPaymentMatchability = (
  input: IncomePaymentMatchabilityInput | ExpensePaymentMatchabilityInput
): MatchabilityState => {
  if (input.supersededByPaymentId !== null || input.supersededByOtbId !== null) {
    return { kind: 'recorded' }
  }

  if (!input.paymentAccountId) {
    return { kind: 'pending_account_resolution', reason: 'no_payment_account_id' }
  }

  return { kind: 'reconciliable' }
}

/**
 * Estado de matchability para un settlement_leg.
 *
 * Reglas:
 *   - supersedida (OTB chain) → `recorded` historico, no participa.
 *   - leg principal (receipt/payout) sin instrument_id → `needs_repair` con
 *     razon `principal_leg_without_instrument`. La invariante CHECK SQL
 *     `settlement_legs_principal_requires_instrument` (NOT VALID hoy, VALIDATE
 *     post-TASK-708b) impide nuevas filas en este estado. Los 4 phantoms
 *     historicos viven aca hasta cleanup.
 *   - leg auxiliar (funding/fx_conversion/internal_transfer/fee) sin
 *     instrument_id → `pending_account_resolution`. Es legitimo no tener
 *     cuenta para legs auxiliares en algunos flujos, pero no entran al pool.
 *   - leg con instrument_id → `reconciliable`.
 */
export const getSettlementLegMatchability = (
  input: SettlementLegMatchabilityInput
): MatchabilityState => {
  if (input.supersededAt !== null || input.supersededByOtbId !== null) {
    return { kind: 'recorded' }
  }

  if (!input.instrumentId) {
    if (isPrincipalLegType(input.legType)) {
      return { kind: 'needs_repair', reason: 'principal_leg_without_instrument' }
    }

    return { kind: 'pending_account_resolution', reason: 'no_instrument_id' }
  }

  return { kind: 'reconciliable' }
}

/**
 * Helper booleano: ¿este objeto puede entrar al pool de candidatos hoy?
 * Cualquier consumer (resolver, settlement match, UI candidate filter) debe
 * usar SOLO este predicado, nunca lógica ad-hoc.
 */
export const isReconciliable = (state: MatchabilityState): boolean => state.kind === 'reconciliable'
