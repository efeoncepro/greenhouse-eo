import 'server-only'

import type { ConstraintIssue } from './pricing-catalog-constraints'

const issue = (
  field: string,
  rule: string,
  message: string,
  severity: ConstraintIssue['severity'] = 'error'
): ConstraintIssue => ({ field, rule, message, severity })

const SERVICE_UNITS = ['project', 'monthly'] as const
const COMMERCIAL_MODELS = ['on_going', 'on_demand', 'hybrid', 'license_consulting'] as const
const TIERS = ['1', '2', '3', '4'] as const

export type ServiceCatalogInput = {
  moduleName?: unknown
  serviceUnit?: unknown
  commercialModel?: unknown
  tier?: unknown
  defaultDurationMonths?: unknown
  serviceCategory?: unknown
  businessLineCode?: unknown
}

export const validateServiceCatalog = (input: ServiceCatalogInput): ConstraintIssue[] => {
  const issues: ConstraintIssue[] = []

  const moduleName = typeof input.moduleName === 'string' ? input.moduleName.trim() : ''

  if (!moduleName) issues.push(issue('moduleName', 'required', 'moduleName is required.'))

  const serviceUnit = typeof input.serviceUnit === 'string' ? input.serviceUnit.trim() : ''

  if (!SERVICE_UNITS.includes(serviceUnit as (typeof SERVICE_UNITS)[number])) {
    issues.push(issue('serviceUnit', 'enum', `serviceUnit must be one of: ${SERVICE_UNITS.join(', ')}.`))
  }

  const commercialModel = typeof input.commercialModel === 'string' ? input.commercialModel.trim() : ''

  if (!COMMERCIAL_MODELS.includes(commercialModel as (typeof COMMERCIAL_MODELS)[number])) {
    issues.push(issue('commercialModel', 'enum', `commercialModel must be one of: ${COMMERCIAL_MODELS.join(', ')}.`))
  }

  const tier = typeof input.tier === 'string' ? input.tier.trim() : ''

  if (!TIERS.includes(tier as (typeof TIERS)[number])) {
    issues.push(issue('tier', 'enum', `tier must be one of: ${TIERS.join(', ')}.`))
  }

  if (input.defaultDurationMonths !== undefined && input.defaultDurationMonths !== null) {
    const duration = Number(input.defaultDurationMonths)

    if (!Number.isFinite(duration) || duration < 0) {
      issues.push(issue('defaultDurationMonths', 'non_negative', 'defaultDurationMonths must be >= 0.'))
    }
  }

  return issues
}

export type ServiceRoleRecipeLineInput = {
  roleId?: unknown
  hoursPerPeriod?: unknown
  quantity?: unknown
}

export const validateServiceRoleRecipeLine = (line: ServiceRoleRecipeLineInput, index: number): ConstraintIssue[] => {
  const issues: ConstraintIssue[] = []

  if (typeof line.roleId !== 'string' || !line.roleId.trim()) {
    issues.push(issue(`roleRecipe[${index}].roleId`, 'required', 'roleId is required.'))
  }

  const hours = Number(line.hoursPerPeriod)

  if (!Number.isFinite(hours) || hours <= 0) {
    issues.push(issue(`roleRecipe[${index}].hoursPerPeriod`, 'positive', 'hoursPerPeriod must be > 0.'))
  }

  const quantity = line.quantity === undefined ? 1 : Number(line.quantity)

  if (!Number.isInteger(quantity) || quantity <= 0) {
    issues.push(issue(`roleRecipe[${index}].quantity`, 'positive_integer', 'quantity must be a positive integer.'))
  }

  return issues
}

export type ServiceToolRecipeLineInput = {
  toolId?: unknown
  toolSku?: unknown
  quantity?: unknown
}

export const validateServiceToolRecipeLine = (
  line: ServiceToolRecipeLineInput,
  index: number
): ConstraintIssue[] => {
  const issues: ConstraintIssue[] = []

  if (typeof line.toolId !== 'string' || !line.toolId.trim()) {
    issues.push(issue(`toolRecipe[${index}].toolId`, 'required', 'toolId is required.'))
  }

  if (typeof line.toolSku !== 'string' || !line.toolSku.trim()) {
    issues.push(issue(`toolRecipe[${index}].toolSku`, 'required', 'toolSku is required.'))
  }

  const quantity = line.quantity === undefined ? 1 : Number(line.quantity)

  if (!Number.isInteger(quantity) || quantity <= 0) {
    issues.push(issue(`toolRecipe[${index}].quantity`, 'positive_integer', 'quantity must be a positive integer.'))
  }

  return issues
}
