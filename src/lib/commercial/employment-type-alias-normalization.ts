export const EMPLOYMENT_TYPE_ALIAS_SOURCE_SYSTEMS = [
  'greenhouse_payroll.contract_type',
  'legacy_pricing_seed',
  'manual_admin'
] as const

export type EmploymentTypeAliasSourceSystem = (typeof EMPLOYMENT_TYPE_ALIAS_SOURCE_SYSTEMS)[number]

export const PAYROLL_CONTRACT_TYPE_SOURCE_SYSTEM: EmploymentTypeAliasSourceSystem =
  'greenhouse_payroll.contract_type'

export const LEGACY_PRICING_SEED_SOURCE_SYSTEM: EmploymentTypeAliasSourceSystem = 'legacy_pricing_seed'

export const normalizeEmploymentTypeAliasValue = (value: string | null | undefined) => {
  if (!value) return ''

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
