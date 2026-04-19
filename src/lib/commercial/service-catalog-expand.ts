import 'server-only'

import { buildPricingEngineOutputV2 } from '@/lib/finance/pricing/pricing-engine-v2'
import type {
  PricingEngineInputV2,
  PricingEngineOutputV2,
  PricingLineInputV2,
  PricingOutputCurrency
} from '@/lib/finance/pricing/contracts'

import { getServiceBySku, type ServiceCatalogDetail } from './service-catalog-store'

export type ServiceLineOverride = {
  lineOrder: number
  hoursPerPeriod?: number | null
  quantity?: number | null
  excluded?: boolean
}

export type ExpandServiceInput = {
  serviceSku: string
  overrides?: {
    roles?: ServiceLineOverride[]
    tools?: ServiceLineOverride[]
  }
  outputCurrency?: PricingOutputCurrency
  countryFactorCode?: string
  quoteDate?: string
  commercialModelOverride?: PricingEngineInputV2['commercialModel'] | null
}

export type ExpandedServiceLine = {
  lineOrder: number
  lineType: 'role' | 'tool'
  label: string
  serviceSku: string
  pricingV2Line: PricingLineInputV2
  referenceId: string
}

export type ExpandServiceResult = {
  service: ServiceCatalogDetail
  lines: ExpandedServiceLine[]
  pricing: PricingEngineOutputV2
}

const nonNegative = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null

  return Number.isFinite(value) && value >= 0 ? value : null
}

export const expandServiceIntoQuoteLines = async (
  input: ExpandServiceInput
): Promise<ExpandServiceResult> => {
  const service = await getServiceBySku(input.serviceSku)

  if (!service) {
    throw Object.assign(new Error(`Service not found: ${input.serviceSku}`), {
      status: 404,
      code: 'SERVICE_NOT_FOUND'
    })
  }

  if (!service.active) {
    throw Object.assign(new Error(`Service is inactive: ${input.serviceSku}`), {
      status: 409,
      code: 'SERVICE_INACTIVE'
    })
  }

  const roleOverrides = new Map<number, ServiceLineOverride>(
    (input.overrides?.roles ?? []).map(override => [override.lineOrder, override])
  )

  const toolOverrides = new Map<number, ServiceLineOverride>(
    (input.overrides?.tools ?? []).map(override => [override.lineOrder, override])
  )

  const expandedLines: ExpandedServiceLine[] = []
  const pricingLines: PricingLineInputV2[] = []

  const periodsForUnit = service.serviceUnit === 'monthly' ? (service.defaultDurationMonths ?? 1) : 1

  for (const role of service.roleRecipe) {
    const override = roleOverrides.get(role.lineOrder)

    if (override?.excluded) continue

    const hours = nonNegative(override?.hoursPerPeriod ?? role.hoursPerPeriod) ?? role.hoursPerPeriod
    const quantity = override?.quantity ?? role.quantity

    const pricingLine: PricingLineInputV2 = {
      lineType: 'role',
      roleSku: role.roleSku,
      hours,
      quantity,
      periods: service.serviceUnit === 'monthly' ? periodsForUnit : 1
    }

    pricingLines.push(pricingLine)
    expandedLines.push({
      lineOrder: role.lineOrder,
      lineType: 'role',
      label: role.roleLabelEs || `Rol ${role.roleSku}`,
      serviceSku: service.serviceSku,
      pricingV2Line: pricingLine,
      referenceId: role.roleId
    })
  }

  for (const tool of service.toolRecipe) {
    const override = toolOverrides.get(tool.lineOrder)

    if (override?.excluded) continue

    const quantity = override?.quantity ?? tool.quantity

    const pricingLine: PricingLineInputV2 = {
      lineType: 'tool',
      toolSku: tool.toolSku,
      quantity,
      periods: service.serviceUnit === 'monthly' ? periodsForUnit : 1
    }

    pricingLines.push(pricingLine)
    expandedLines.push({
      lineOrder: service.roleRecipe.length + tool.lineOrder,
      lineType: 'tool',
      label: tool.toolName || `Herramienta ${tool.toolSku}`,
      serviceSku: service.serviceSku,
      pricingV2Line: pricingLine,
      referenceId: tool.toolId
    })
  }

  const engineInput: PricingEngineInputV2 = {
    businessLineCode: service.businessLineCode ?? null,
    commercialModel: input.commercialModelOverride ?? service.commercialModel,
    countryFactorCode: input.countryFactorCode ?? 'CL',
    outputCurrency: input.outputCurrency ?? 'USD',
    quoteDate: input.quoteDate ?? new Date().toISOString().slice(0, 10),
    lines: pricingLines,
    autoResolveAddons: false
  }

  const pricing = await buildPricingEngineOutputV2(engineInput)

  return { service, lines: expandedLines, pricing }
}
