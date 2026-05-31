// TASK-968 — Contractor compensation display helpers (labels + per-payment unit).
// Single source of truth for the human labels of rate_type / payment_cadence and
// the "expected per payment" unit. Re-exports the canonical types from `types.ts`
// (extend, don't parallel). Pure (client + server safe).

import type { ContractorPaymentCadence, ContractorRateType } from './types'

export type { ContractorPaymentCadence, ContractorRateType } from './types'

export const RATE_TYPE_OPTIONS: { value: ContractorRateType; label: string }[] = [
  { value: 'fixed', label: 'Fija' },
  { value: 'hourly', label: 'Por hora' },
  { value: 'daily', label: 'Por día' },
  { value: 'milestone', label: 'Por hito' },
  { value: 'project', label: 'Por proyecto' },
  { value: 'retainer', label: 'Retainer' }
]

export const CADENCE_OPTIONS: { value: ContractorPaymentCadence; label: string }[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'semi_monthly', label: 'Bimensual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'milestone', label: 'Por hito' },
  { value: 'on_invoice', label: 'On invoice' },
  { value: 'off_cycle', label: 'Off-cycle' }
]

export const rateTypeLabel = (v: ContractorRateType): string =>
  RATE_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v

export const cadenceLabel = (v: ContractorPaymentCadence): string =>
  CADENCE_OPTIONS.find(o => o.value === v)?.label ?? v

/** Short unit shown after the "expected per payment" amount (e.g. "$600.000 / mes"). */
export const cadencePaymentUnitLabel = (v: ContractorPaymentCadence): string => {
  switch (v) {
    case 'monthly':
      return 'mes'
    case 'biweekly':
      return 'quincena'
    case 'semi_monthly':
      return 'período'
    case 'weekly':
      return 'semana'
    case 'milestone':
      return 'hito'
    default:
      return 'pago'
  }
}
