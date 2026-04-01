export type ContractType = 'indefinido' | 'plazo_fijo' | 'honorarios' | 'contractor' | 'eor'
export type PayRegime = 'chile' | 'international'
export type PayrollVia = 'internal' | 'deel'

export interface MemberContractInfo {
  contractType: ContractType
  payRegime: PayRegime
  payrollVia: PayrollVia
  scheduleRequired: boolean
  deelContractId: string | null
  contractEndDate: string | null
}

export const CONTRACT_DERIVATIONS: Record<ContractType, { payRegime: PayRegime; payrollVia: PayrollVia }> = {
  indefinido: { payRegime: 'chile', payrollVia: 'internal' },
  plazo_fijo: { payRegime: 'chile', payrollVia: 'internal' },
  honorarios: { payRegime: 'chile', payrollVia: 'internal' },
  contractor: { payRegime: 'international', payrollVia: 'deel' },
  eor: { payRegime: 'international', payrollVia: 'deel' }
}

export const CONTRACT_LABELS: Record<ContractType, { label: string; description: string }> = {
  indefinido: {
    label: 'Indefinido',
    description: 'Contrato laboral permanente'
  },
  plazo_fijo: {
    label: 'Plazo fijo',
    description: 'Contrato laboral con término definido'
  },
  honorarios: {
    label: 'Honorarios',
    description: 'Prestación de servicios civil'
  },
  contractor: {
    label: 'Contractor (Deel)',
    description: 'Contrato internacional gestionado por Deel'
  },
  eor: {
    label: 'EOR (Deel)',
    description: 'Deel actúa como empleador legal'
  }
}

export const SCHEDULE_DEFAULTS: Record<ContractType, { defaultValue: boolean; overridable: boolean }> = {
  indefinido: { defaultValue: true, overridable: false },
  plazo_fijo: { defaultValue: true, overridable: false },
  honorarios: { defaultValue: false, overridable: true },
  contractor: { defaultValue: false, overridable: true },
  eor: { defaultValue: false, overridable: true }
}

export const SII_RETENTION_RATES: Record<number, number> = {
  2024: 0.1375,
  2025: 0.145,
  2026: 0.145,
  2027: 0.1525,
  2028: 0.17
}

export const getSiiRetentionRate = (year: number) => SII_RETENTION_RATES[year] ?? SII_RETENTION_RATES[2028]

export const normalizeContractType = (value: string | null | undefined): ContractType => {
  if (
    value === 'indefinido' ||
    value === 'plazo_fijo' ||
    value === 'honorarios' ||
    value === 'contractor' ||
    value === 'eor'
  ) {
    return value
  }

  return 'indefinido'
}

export const normalizePayRegime = (value: string | null | undefined, contractType?: ContractType | null): PayRegime => {
  if (value === 'chile' || value === 'international') {
    return value
  }

  if (contractType) {
    return CONTRACT_DERIVATIONS[contractType].payRegime
  }

  return 'chile'
}

export const normalizePayrollVia = (value: string | null | undefined, contractType?: ContractType | null): PayrollVia => {
  if (value === 'internal' || value === 'deel') {
    return value
  }

  if (contractType) {
    return CONTRACT_DERIVATIONS[contractType].payrollVia
  }

  return 'internal'
}

export const resolveScheduleRequired = ({
  contractType,
  scheduleRequired
}: {
  contractType: ContractType
  scheduleRequired?: boolean | null
}) => {
  const config = SCHEDULE_DEFAULTS[contractType]

  if (!config.overridable) {
    return config.defaultValue
  }

  if (typeof scheduleRequired === 'boolean') {
    return scheduleRequired
  }

  return config.defaultValue
}
