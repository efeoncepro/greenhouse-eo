// TASK-968 mockup — Contractor Engagement Compensation Setup + Agreed-Amount Guardrail.
// Typed mock data for the 3 showcase surfaces (admin editor · contractor read-only ·
// payable guardrail) across 3 states (sin definir / definido / excede acuerdo).
// The shape mirrors the real ContractorEngagement compensation fields (TASK-790) so
// the runtime editor wires with minimal change.

export type CompensationState = 'undefined' | 'defined' | 'exceeds'

export type RateType = 'fixed' | 'hourly' | 'daily' | 'milestone' | 'project' | 'retainer'
export type PaymentCadence = 'monthly' | 'biweekly' | 'semi_monthly' | 'weekly' | 'milestone' | 'on_invoice' | 'off_cycle'

export interface CompensationFormValue {
  rateType: RateType
  rateAmount: number | null
  currency: string
  paymentCadence: PaymentCadence
}

export const RATE_TYPE_OPTIONS: { value: RateType; label: string }[] = [
  { value: 'fixed', label: 'Fija' },
  { value: 'hourly', label: 'Por hora' },
  { value: 'daily', label: 'Por día' },
  { value: 'milestone', label: 'Por hito' },
  { value: 'project', label: 'Por proyecto' },
  { value: 'retainer', label: 'Retainer' }
]

export const CADENCE_OPTIONS: { value: PaymentCadence; label: string }[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'semi_monthly', label: 'Bimensual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'milestone', label: 'Por hito' },
  { value: 'on_invoice', label: 'On invoice' },
  { value: 'off_cycle', label: 'Off-cycle' }
]

export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'CLP', label: 'CLP · Peso chileno' },
  { value: 'USD', label: 'USD · Dólar' }
]

export const rateTypeLabel = (v: RateType) => RATE_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v
export const cadenceLabel = (v: PaymentCadence) => CADENCE_OPTIONS.find(o => o.value === v)?.label ?? v

/** "Per-payment expected" preview shown in the editor (drives the guardrail too). */
export const cadenceUnitLabel = (v: PaymentCadence): string => {
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

export interface CompensationMock {
  engagementPublicId: string
  contractorName: string
  relationshipSubtype: string
  legalEntityLabel: string
  /** null = sin monto acordado (empty state). */
  compensation: CompensationFormValue
  /** Contractor work-submission derived block (read-only). */
  submission: {
    type: 'fixed' | 'timesheet'
    period: string
    quantity: number | null
    unit: string | null
    /** Derived gross — NEVER typed by the contractor. */
    derivedGross: number | null
  }
  /** Payable guardrail snapshot. */
  guardrail: {
    breached: boolean
    paymentAmount: number
    agreedAmount: number
  }
}

const ENGAGEMENT = {
  engagementPublicId: 'EO-CENG-0001',
  contractorName: 'Valentina Hoyos',
  relationshipSubtype: 'Honorarios Chile',
  legalEntityLabel: 'Efeonce Group SpA'
}

export const buildCompensationMock = (state: CompensationState): CompensationMock => {
  if (state === 'undefined') {
    return {
      ...ENGAGEMENT,
      compensation: { rateType: 'fixed', rateAmount: null, currency: 'CLP', paymentCadence: 'monthly' },
      submission: { type: 'fixed', period: '01–31 may 2026', quantity: null, unit: null, derivedGross: null },
      guardrail: { breached: false, paymentAmount: 0, agreedAmount: 0 }
    }
  }

  if (state === 'exceeds') {
    return {
      ...ENGAGEMENT,
      compensation: { rateType: 'fixed', rateAmount: 600_000, currency: 'CLP', paymentCadence: 'monthly' },
      submission: { type: 'fixed', period: '01–31 may 2026', quantity: null, unit: null, derivedGross: 600_000 },
      guardrail: { breached: true, paymentAmount: 720_000, agreedAmount: 600_000 }
    }
  }

  // defined
  return {
    ...ENGAGEMENT,
    compensation: { rateType: 'fixed', rateAmount: 600_000, currency: 'CLP', paymentCadence: 'monthly' },
    submission: { type: 'fixed', period: '01–31 may 2026', quantity: null, unit: null, derivedGross: 600_000 },
    guardrail: { breached: false, paymentAmount: 600_000, agreedAmount: 600_000 }
  }
}
