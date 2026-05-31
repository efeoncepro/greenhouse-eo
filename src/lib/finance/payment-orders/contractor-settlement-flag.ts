import 'server-only'

/**
 * Feature flag canonical: `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED`.
 *
 * TASK-977 Slice 3 — Contractor payable bank settlement.
 * Default `false` en V1.0 hasta staging shadow + finance sign-off.
 *
 * Cuando OFF: el motor de liquidación (`recordPaymentForOrder` / `markPaymentOrderPaidAtomic`)
 * sigue lanzando `out_of_scope_v1` para líneas que no sean `payroll`/`employee_net_pay` →
 * parity bit-for-bit con el comportamiento pre-TASK-977 (el contractor NO se liquida al banco).
 * Cuando ON: una línea `source_kind='contractor_payable'`/`obligation_kind='provider_payroll'`
 * resuelve su expense por `contractor_payable_id` (materializado por la proyección reactiva
 * TASK-977 Slice 2) y registra el expense_payment (net) + settlement_leg (bank debit).
 *
 * Boundary EPIC-013/TASK-957: el path de nómina (`payroll`/`employee_net_pay`) NO cambia —
 * la rama contractor es 100% aditiva.
 *
 * Spec: `docs/tasks/in-progress/TASK-977-contractor-payable-bank-settlement.md`.
 */
export const isContractorPayableSettlementEnabled = (): boolean =>
  process.env.CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED === 'true'
