import 'server-only'

/**
 * Feature flag canonical: `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED`.
 *
 * TASK-957 Slice A (Contractor ↔ Legacy Payroll Double-Rail Exclusion).
 * Default `false` en V1.0 hasta staging shadow-compare verde.
 *
 * Cuando OFF: el roster legacy (`pgGetApplicableCompensationVersionsForPeriod`)
 * NO aplica la exclusión por engagement → parity bit-for-bit con el comportamiento
 * pre-TASK-957. Cuando ON: excluye del roster a quien tiene un `ContractorEngagement`
 * en estado "engaged" (rail contractor-payable vivo), para que no se le pague por
 * el riel legacy honorarios además del contractor payable (TASK-794) → evita
 * doble-pago + doble declaración F29.
 *
 * SSOT de "¿se paga por nómina interna?" = existencia de engagement activo, NO
 * `member.contract_type`. Por eso el gate keyea por engagement (los contractors
 * internacionales legacy modelados como `member.contract_type='contractor'` +
 * `payroll_via='deel'` SIN engagement NO son tocados — siguen su passthrough Deel).
 *
 * Spec: `docs/tasks/in-progress/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md`.
 */
export const isPayrollContractorEngagementExclusionEnabled = (): boolean =>
  process.env.PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED === 'true'
