import 'server-only'

/**
 * Feature flag canonical: `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED`.
 *
 * TASK-968 Slice 3 — Agreed-amount guardrail.
 * Default `false` en V1.0 hasta staging shadow-compare verde + sign-off Finance.
 *
 * Cuando OFF: `assessPayableReadiness` NO evalúa el gate `payment_exceeds_agreed_amount`
 * → parity bit-for-bit con el comportamiento pre-TASK-968 (ningún payable se bloquea
 * por exceder el monto acordado). Cuando ON: un payable cuyo bruto supere el monto
 * acordado del engagement (fijado por HR) se bloquea fail-closed salvo override
 * gobernado (capability `finance.contractor_payable.override_agreed_amount`, admin-only).
 *
 * SoD canónico (TASK-968): HR FIJA el monto (`hr.contractor_engagement:update`) ≠
 * contractor COBRA (nunca lo tipea) ≠ Finance PAGA (gated). El guardrail es la tercera
 * defensa que evita que un payable supere silenciosamente lo acordado.
 *
 * Spec: `docs/tasks/in-progress/TASK-968-contractor-engagement-compensation-setup-agreed-amount-guardrail.md`.
 */
export const isContractorAgreedAmountGuardrailEnabled = (): boolean =>
  process.env.CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED === 'true'
