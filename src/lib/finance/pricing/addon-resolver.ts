import 'server-only'

import {
  listOverheadAddons,
  type OverheadAddonEntry
} from '@/lib/commercial/overhead-addons-store'

import type { PricingLineInputV2, PricingOutputCurrency } from './contracts'

const round2 = (value: number) => Math.round(value * 100) / 100

const pickAddonPct = (addon: OverheadAddonEntry) =>
  addon.finalPricePct ?? addon.pctMin ?? addon.pctMax ?? 0

const normalizeBusinessLine = (value?: string | null) => value?.trim().toLowerCase() ?? null

export interface PricingAddonLineContext {
  lineType: PricingLineInputV2['lineType']
  roleCanSellAsStaff?: boolean
}

export interface ResolvePricingAddonsInput {
  commercialModel: string
  businessLineCode?: string | null
  outputCurrency: PricingOutputCurrency
  lines: PricingAddonLineContext[]
}

export interface ResolvedPricingAddon {
  addon: OverheadAddonEntry
  appliedReason: string
}

export interface PricingAddonChargeInput {
  addon: OverheadAddonEntry
  basisSubtotalUsd: number
  resourceMonthlyCostUsd: number
}

export interface PricingAddonCharge {
  amountUsd: number
  costUsd: number
}

const ruleMatchers: Array<{
  sku: string
  reason: (input: ResolvePricingAddonsInput) => string | null
}> = [
  {
    sku: 'EFO-003',
    reason: input =>
      input.commercialModel === 'on_demand' ? 'commercial_model=on_demand' : null
  },
  {
    sku: 'EFO-004',
    reason: input =>
      input.lines.some(line => line.lineType === 'role' && line.roleCanSellAsStaff)
        ? 'staffing_model=named_resources'
        : null
  },
  {
    sku: 'EFO-005',
    reason: input =>
      input.lines.some(line => line.lineType === 'role' && line.roleCanSellAsStaff)
        ? 'staffing_model=named_resources'
        : null
  },
  {
    sku: 'EFO-006',
    reason: input =>
      input.outputCurrency !== 'CLP' ? `output_currency=${input.outputCurrency}` : null
  },
  {
    sku: 'EFO-007',
    reason: input => {
      const businessLine = normalizeBusinessLine(input.businessLineCode)

      if (businessLine === 'wave' || businessLine === 'efeonce' || businessLine === 'efeonce_digital') {
        return `business_line=${businessLine}`
      }

      return null
    }
  }
]

export const resolvePricingAddonsFromCatalog = (
  input: ResolvePricingAddonsInput,
  catalog: OverheadAddonEntry[]
): ResolvedPricingAddon[] => {
  const bySku = new Map(
    catalog
      .filter(addon => addon.active)
      .map(addon => [addon.addonSku, addon] as const)
  )

  const resolved = new Map<string, ResolvedPricingAddon>()

  for (const rule of ruleMatchers) {
    const addon = bySku.get(rule.sku)

    if (!addon) continue

    const appliedReason = rule.reason(input)

    if (!appliedReason) continue

    resolved.set(addon.addonSku, {
      addon,
      appliedReason
    })
  }

  return Array.from(resolved.values()).sort((left, right) =>
    left.addon.addonSku.localeCompare(right.addon.addonSku)
  )
}

export const resolvePricingAddons = async (
  input: ResolvePricingAddonsInput
): Promise<ResolvedPricingAddon[]> => {
  const catalog = await listOverheadAddons({ active: true })

  return resolvePricingAddonsFromCatalog(input, catalog)
}

export const computeAddonChargeUsd = ({
  addon,
  basisSubtotalUsd,
  resourceMonthlyCostUsd
}: PricingAddonChargeInput): PricingAddonCharge => {
  let amountUsd = 0

  if (addon.addonType === 'overhead_fixed' || addon.addonType === 'fee_fixed') {
    amountUsd = addon.finalPriceUsd ?? addon.costInternalUsd
  } else if (addon.addonType === 'resource_month') {
    amountUsd = resourceMonthlyCostUsd
  } else if (addon.addonType === 'fee_percentage' || addon.addonType === 'adjustment_pct') {
    amountUsd = basisSubtotalUsd * pickAddonPct(addon)

    if (addon.minimumAmountUsd != null) {
      amountUsd = Math.max(addon.minimumAmountUsd, amountUsd)
    }
  }

  const roundedAmountUsd = round2(amountUsd)

  const costUsd =
    addon.costInternalUsd > 0
      ? round2(addon.costInternalUsd)
      : addon.addonType === 'resource_month'
        ? round2(resourceMonthlyCostUsd)
        : 0

  return {
    amountUsd: roundedAmountUsd,
    costUsd
  }
}
