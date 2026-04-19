import 'server-only'

import {
  getCommercialModelMultiplier,
  getCountryPricingFactor,
  getRoleTierMargins,
  convertFteToHours
} from '@/lib/commercial/pricing-governance-store'
import {
  getCurrentPricing,
  getSellableRoleBySku,
  listCompatibleEmploymentTypes
} from '@/lib/commercial/sellable-roles-store'
import { getToolBySku } from '@/lib/commercial/tool-catalog-store'
import {
  getOverheadAddonBySku,
  listOverheadAddons
} from '@/lib/commercial/overhead-addons-store'
import {
  getPreferredMemberActualCostBasis,
  getPreferredRoleBlendedCostBasisByRoleId
} from '@/lib/commercial-cost-basis/people-role-cost-basis'
import { getPreferredToolProviderCostBasisByToolSku } from '@/lib/commercial-cost-basis/tool-provider-cost-basis-reader'
import { getPreferredRoleModeledCostBasisByRoleId as getPreferredRoleModeledCostBasisByRoleIdFromModeled } from '@/lib/commercial-cost-basis/role-modeled-cost-basis'

import { computeAddonChargeUsd, resolvePricingAddons } from './addon-resolver'
import { classifyTierComplianceFromEntry } from './tier-compliance'
import {
  convertCurrencyAmount,
  convertUsdToPricingCurrency,
  resolvePricingOutputExchangeRate,
  resolvePricingOutputFxReadiness
} from './currency-converter'
import type {
  DirectCostPricingLineInputV2,
  OverheadAddonPricingLineInputV2,
  PricingEngineInputV2,
  PricingEngineOutputV2,
  PricingLineInputV2,
  PricingLineOutputV2,
  PricingOutputCurrency,
  PricingWarning,
  RolePricingLineInputV2,
  ToolPricingLineInputV2
} from './contracts'

const round2 = (value: number) => Math.round(value * 100) / 100

const normalizePositiveNumber = (value: number | null | undefined, fallback = 1) =>
  value != null && Number.isFinite(value) && value > 0 ? value : fallback

const deriveMarginPct = ({
  totalBillUsd,
  totalCostUsd
}: {
  totalBillUsd: number
  totalCostUsd: number
}) => {
  if (!Number.isFinite(totalBillUsd) || totalBillUsd <= 0) {
    return 0
  }

  return round2((1 - totalCostUsd / totalBillUsd) * 10_000) / 10_000
}

const normalizeMarginPct = (value: number | null | undefined, fallback: number) => {
  if (value == null || !Number.isFinite(value)) return fallback
  if (value >= 1) return round2(value / 100)
  if (value < 0) return 0

  return value
}

const applyMarginFormula = ({
  costUsd,
  marginPct
}: {
  costUsd: number
  marginPct: number
}) => {
  if (!Number.isFinite(costUsd) || costUsd < 0) {
    return 0
  }

  const safeMarginPct = Math.min(0.95, Math.max(0, marginPct))

  if (safeMarginPct === 0) {
    return round2(costUsd)
  }

  return round2(costUsd / (1 - safeMarginPct))
}

const sum = (values: number[]) => round2(values.reduce((acc, value) => acc + value, 0))

const extractQuotePeriod = (quoteDate: string) => {
  const parsed = new Date(`${quoteDate}T12:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1
  }
}

const convertUsdWithFallback = async ({
  amountUsd,
  outputCurrency,
  quoteDate,
  notes,
  precomputed,
  convertUsdToPricingCurrencyFn = convertUsdToPricingCurrency
}: {
  amountUsd: number
  outputCurrency: PricingOutputCurrency
  quoteDate: string
  notes: string[]
  precomputed?: number | null
  convertUsdToPricingCurrencyFn?: typeof convertUsdToPricingCurrency
}) => {
  if (outputCurrency === 'USD') {
    return round2(amountUsd)
  }

  if (precomputed != null && Number.isFinite(precomputed)) {
    return round2(precomputed)
  }

  const converted = await convertUsdToPricingCurrencyFn({
    amountUsd,
    currency: outputCurrency,
    rateDate: quoteDate
  })

  if (converted == null) {
    notes.push(`No exchange rate available for USD→${outputCurrency}; se conserva monto en USD.`)

    return round2(amountUsd)
  }

  return converted
}

const defaultPricingEngineV2Dependencies = {
  getSellableRoleBySku,
  listCompatibleEmploymentTypes,
  getCurrentPricing,
  getRoleTierMargins,
  getCommercialModelMultiplier,
  getCountryPricingFactor,
  convertFteToHours,
  getToolBySku,
  getOverheadAddonBySku,
  listOverheadAddons,
  getPreferredMemberActualCostBasis,
  getPreferredRoleBlendedCostBasisByRoleId,
  getPreferredRoleModeledCostBasisByRoleId: getPreferredRoleModeledCostBasisByRoleIdFromModeled,
  getPreferredToolProviderCostBasisByToolSku,
  convertUsdToPricingCurrency,
  convertCurrencyAmount,
  resolvePricingAddons,
  resolvePricingOutputExchangeRate,
  resolvePricingOutputFxReadiness
}

export interface PricingEngineV2Dependencies {
  getSellableRoleBySku: typeof getSellableRoleBySku
  listCompatibleEmploymentTypes: typeof listCompatibleEmploymentTypes
  getCurrentPricing: typeof getCurrentPricing
  getRoleTierMargins: typeof getRoleTierMargins
  getCommercialModelMultiplier: typeof getCommercialModelMultiplier
  getCountryPricingFactor: typeof getCountryPricingFactor
  convertFteToHours: typeof convertFteToHours
  getToolBySku: typeof getToolBySku
  getOverheadAddonBySku: typeof getOverheadAddonBySku
  listOverheadAddons: typeof listOverheadAddons
  getPreferredMemberActualCostBasis: typeof getPreferredMemberActualCostBasis
  getPreferredRoleBlendedCostBasisByRoleId: typeof getPreferredRoleBlendedCostBasisByRoleId
  getPreferredRoleModeledCostBasisByRoleId: typeof getPreferredRoleModeledCostBasisByRoleIdFromModeled
  getPreferredToolProviderCostBasisByToolSku: typeof getPreferredToolProviderCostBasisByToolSku
  convertUsdToPricingCurrency: typeof convertUsdToPricingCurrency
  convertCurrencyAmount: typeof convertCurrencyAmount
  resolvePricingAddons: typeof resolvePricingAddons
  resolvePricingOutputExchangeRate: typeof resolvePricingOutputExchangeRate
  resolvePricingOutputFxReadiness: typeof resolvePricingOutputFxReadiness
}

interface ResolvedLineAccumulator {
  originalIndex: number
  line: PricingLineOutputV2
  totalCostUsd: number
  totalBillUsd: number
  totalBillOutputCurrency: number
  monthlyResourceCostUsd: number
  roleCanSellAsStaff: boolean

  /** Structured warnings produced by this line's resolver (e.g. missing tier
   *  margin, tool price falling back to cost×1.15). The orchestrator merges
   *  these into the engine output with `lineIndex = originalIndex`. */
  structuredWarnings?: PricingWarning[]
}

const resolveRoleLine = async ({
  input,
  quoteDate,
  outputCurrency,
  commercialMultiplierFactor,
  countryFactorApplied,
  deps
}: {
  input: RolePricingLineInputV2
  quoteDate: string
  outputCurrency: PricingOutputCurrency
  commercialMultiplierFactor: number
  countryFactorApplied: number
  deps: PricingEngineV2Dependencies
}): Promise<Omit<ResolvedLineAccumulator, 'originalIndex'>> => {
  const notes: string[] = []
  const role = await deps.getSellableRoleBySku(input.roleSku)

  if (!role) {
    throw new Error(`Unknown sellable role SKU: ${input.roleSku}`)
  }

  const compatibilities = await deps.listCompatibleEmploymentTypes(role.roleId)
  const allowedCompatibilities = compatibilities.filter(entry => entry.allowed)
  const quotePeriod = extractQuotePeriod(quoteDate)

  const resolvedEmploymentType =
    (input.employmentTypeCode
      ? allowedCompatibilities.find(entry => entry.employmentTypeCode === input.employmentTypeCode)
      : null) ??
    allowedCompatibilities.find(entry => entry.isDefault) ??
    allowedCompatibilities[0] ??
    null

  if (input.employmentTypeCode && !resolvedEmploymentType) {
    throw new Error(`Employment type ${input.employmentTypeCode} is not allowed for role ${input.roleSku}`)
  }

  const blendedCostBasis = await deps.getPreferredRoleBlendedCostBasisByRoleId(
    role.roleId,
    resolvedEmploymentType?.employmentTypeCode ?? null,
    {
      year: quotePeriod?.year ?? null,
      month: quotePeriod?.month ?? null
    }
  )

  const modeledCostBasis = blendedCostBasis
    ? null
    : await deps.getPreferredRoleModeledCostBasisByRoleId(
        role.roleId,
        resolvedEmploymentType?.employmentTypeCode ?? null,
        {
          year: quotePeriod?.year ?? null,
          month: quotePeriod?.month ?? null,
          asOfDate: quoteDate
        }
      )

  if (!blendedCostBasis && !modeledCostBasis) {
    throw new Error(`Missing cost components for role ${input.roleSku}`)
  }

  const periods = normalizePositiveNumber(input.periods, 1)
  const quantity = normalizePositiveNumber(input.quantity, 1)
  const resolvedFteFraction = normalizePositiveNumber(input.fteFraction, 1)
  const explicitHours = input.hours != null && Number.isFinite(input.hours) && input.hours > 0

  let hourlyCostUsd: number | null = null
  let monthlyCostUsd: number | null = null
  let roleCostBreakdown: Record<string, number> = {}
  let costBasisKind: 'role_blended' | 'role_modeled' = 'role_modeled'
  let costBasisSourceRef: string | null = null
  let costBasisSnapshotDate: string | null = null
  let costBasisConfidenceScore: number | null = null
  let costBasisConfidenceLabel: 'high' | 'medium' | 'low' | null = null

  if (blendedCostBasis && blendedCostBasis.blendedLoadedCostAmount > 0) {
    monthlyCostUsd =
      blendedCostBasis.resolvedCurrency === 'USD'
        ? blendedCostBasis.blendedLoadedCostAmount
        : await deps.convertCurrencyAmount({
            amount: blendedCostBasis.blendedLoadedCostAmount,
            fromCurrency: blendedCostBasis.resolvedCurrency,
            toCurrency: 'USD',
            rateDate: blendedCostBasis.snapshotDate
          })

    hourlyCostUsd =
      blendedCostBasis.blendedCostPerHourAmount != null
        ? blendedCostBasis.resolvedCurrency === 'USD'
          ? blendedCostBasis.blendedCostPerHourAmount
          : await deps.convertCurrencyAmount({
              amount: blendedCostBasis.blendedCostPerHourAmount,
              fromCurrency: blendedCostBasis.resolvedCurrency,
              toCurrency: 'USD',
              rateDate: blendedCostBasis.snapshotDate
            })
        : null

    if (monthlyCostUsd == null && hourlyCostUsd == null) {
      throw new Error(`Could not normalize blended role snapshot for ${input.roleSku} to USD`)
    }

    notes.push(
      `Costo base desde role_blended ${blendedCostBasis.periodId} (${blendedCostBasis.employmentTypeCode}, confianza ${blendedCostBasis.confidenceLabel}).`
    )

    if (
      quotePeriod &&
      (blendedCostBasis.periodYear !== quotePeriod.year || blendedCostBasis.periodMonth !== quotePeriod.month)
    ) {
      notes.push(
        `No existía snapshot blended exacto para ${quotePeriod.year}-${String(quotePeriod.month).padStart(2, '0')}; se reutilizó ${blendedCostBasis.periodId}.`
      )
    }

    roleCostBreakdown = {
      blendedLaborCost: blendedCostBasis.blendedTotalLaborCostAmount ?? 0,
      blendedDirectOverhead: blendedCostBasis.blendedDirectOverheadAmount,
      blendedSharedOverhead: blendedCostBasis.blendedSharedOverheadAmount,
      blendedSampleSize: blendedCostBasis.sampleSize
    }
    costBasisKind = 'role_blended'
    costBasisSourceRef = blendedCostBasis.sourceRef
    costBasisSnapshotDate = blendedCostBasis.snapshotDate
    costBasisConfidenceScore = blendedCostBasis.confidenceScore
    costBasisConfidenceLabel = blendedCostBasis.confidenceLabel
  } else {
    const resolvedModeledCost = modeledCostBasis!

    hourlyCostUsd =
      resolvedModeledCost.costPerHourAmount ??
      round2(resolvedModeledCost.loadedCostAmount / Math.max(resolvedModeledCost.hoursPerFteMonth, 1))
    monthlyCostUsd =
      resolvedModeledCost.loadedCostAmount ?? round2(hourlyCostUsd * resolvedModeledCost.hoursPerFteMonth)
    roleCostBreakdown = {
      baseLaborCost: resolvedModeledCost.baseLaborCostAmount,
      directOverhead: resolvedModeledCost.directOverheadAmount,
      sharedOverhead: resolvedModeledCost.sharedOverheadAmount
    }
    notes.push(
      `Costo base desde role_modeled (${resolvedModeledCost.employmentTypeCode}, fuente ${resolvedModeledCost.sourceKind}, confianza ${resolvedModeledCost.confidenceLabel}).`
    )
    costBasisSourceRef = resolvedModeledCost.sourceRef
    costBasisSnapshotDate = resolvedModeledCost.snapshotDate
    costBasisConfidenceScore = resolvedModeledCost.confidenceScore
    costBasisConfidenceLabel = resolvedModeledCost.confidenceLabel
  }

  const hoursPerPeriod = explicitHours
    ? input.hours!
    : (await deps.convertFteToHours(resolvedFteFraction, quoteDate))?.monthlyHours ??
      (modeledCostBasis?.hoursPerFteMonth ??
        (blendedCostBasis && blendedCostBasis.sampleSize > 0
          ? blendedCostBasis.weightedHours / blendedCostBasis.sampleSize
          : 160))

  const tierMargins = await deps.getRoleTierMargins(role.tier as never, quoteDate)
  const marginPct = normalizeMarginPct(input.overrideMarginPct, tierMargins?.marginOpt ?? 0.35)
  const lineWarnings: PricingWarning[] = []

  if (!tierMargins) {
    lineWarnings.push({
      code: 'missing_tier_margin',
      severity: 'warning',
      message: `Rol ${input.roleSku} tiene tier "${role.tier ?? 'sin definir'}" pero no hay margin policy cargada. Se aplicó margen default 35%.`,
      context: { roleSku: input.roleSku, tier: role.tier, fallbackMarginPct: 0.35 }
    })
  }

  const pricingBasis: 'hour' | 'month' = explicitHours ? 'hour' : 'month'

  const baseUnitCostUsd =
    pricingBasis === 'hour'
      ? hourlyCostUsd ?? round2((monthlyCostUsd ?? 0) / Math.max(hoursPerPeriod || 1, 1))
      : round2((monthlyCostUsd ?? round2((hourlyCostUsd ?? 0) * hoursPerPeriod)) * resolvedFteFraction)

  const baseUnitBillUsd = applyMarginFormula({
    costUsd: baseUnitCostUsd,
    marginPct
  })

  const unitPriceUsd = round2(baseUnitBillUsd * commercialMultiplierFactor * countryFactorApplied)
  const totalUnits = pricingBasis === 'hour' ? hoursPerPeriod * periods * quantity : periods * quantity
  const totalCostUsd = round2(baseUnitCostUsd * totalUnits)
  const totalBillUsd = round2(unitPriceUsd * totalUnits)

  const unitCostOutputCurrency = await convertUsdWithFallback({
    amountUsd: baseUnitCostUsd,
    outputCurrency,
    quoteDate,
    notes,
    convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
  })

  const rolePricingForOutput =
    outputCurrency !== 'USD'
      ? await deps.getCurrentPricing(role.roleId, outputCurrency as never, quoteDate)
      : null

  let unitPriceOutputCurrency = unitPriceUsd

  if (outputCurrency !== 'USD') {
    if (rolePricingForOutput) {
      const rolePricingBase =
        pricingBasis === 'hour'
          ? rolePricingForOutput.hourlyPrice
          : round2(rolePricingForOutput.fteMonthlyPrice * resolvedFteFraction)

      unitPriceOutputCurrency = round2(rolePricingBase * commercialMultiplierFactor * countryFactorApplied)
    } else {
      unitPriceOutputCurrency = await convertUsdWithFallback({
        amountUsd: unitPriceUsd,
        outputCurrency,
        quoteDate,
        notes,
        convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
      })
    }
  }

  const totalBillOutputCurrency = round2(unitPriceOutputCurrency * totalUnits)

  const effectiveMarginPct = deriveMarginPct({
    totalBillUsd,
    totalCostUsd
  })

  const tierCompliance = classifyTierComplianceFromEntry({
    effectiveMarginPct,
    tier: role.tier,
    tierMargins
  })

  if (!rolePricingForOutput && outputCurrency !== 'USD') {
    notes.push(`Role pricing fallback via FX para ${input.roleSku} en ${outputCurrency}.`)
  }

  return {
    line: {
      lineInput: input,
      costStack: {
        unitCostUsd: baseUnitCostUsd,
        unitCostOutputCurrency,
        totalCostUsd,
        totalCostOutputCurrency: round2(unitCostOutputCurrency * totalUnits),
        breakdown: roleCostBreakdown,
        employmentTypeCode: resolvedEmploymentType?.employmentTypeCode ?? null,
        employmentTypeSource: input.employmentTypeCode ? 'explicit_input' : 'role_default',
        costBasisKind,
        costBasisSourceRef,
        costBasisSnapshotDate,
        costBasisConfidenceScore,
        costBasisConfidenceLabel
      },
      suggestedBillRate: {
        pricingBasis,
        unitPriceUsd,
        unitPriceOutputCurrency,
        totalBillUsd,
        totalBillOutputCurrency
      },
      effectiveMarginPct,
      tierCompliance,
      resolutionNotes: notes
    },
    totalCostUsd,
    totalBillUsd,
    totalBillOutputCurrency,
    monthlyResourceCostUsd: round2((monthlyCostUsd ?? 0) * resolvedFteFraction * quantity),
    roleCanSellAsStaff: role.canSellAsStaff,
    structuredWarnings: lineWarnings.length > 0 ? lineWarnings : undefined
  }
}

const resolvePersonLine = async ({
  input,
  quoteDate,
  outputCurrency,
  commercialMultiplierFactor,
  countryFactorApplied,
  deps
}: {
  input: Extract<PricingLineInputV2, { lineType: 'person' }>
  quoteDate: string
  outputCurrency: PricingOutputCurrency
  commercialMultiplierFactor: number
  countryFactorApplied: number
  deps: PricingEngineV2Dependencies
}): Promise<Omit<ResolvedLineAccumulator, 'originalIndex'>> => {
  const notes: string[] = []
  const period = extractQuotePeriod(quoteDate)

  const snapshot = await deps.getPreferredMemberActualCostBasis(input.memberId, {
    year: period?.year ?? null,
    month: period?.month ?? null
  })

  if (!snapshot) {
    throw new Error(`Missing member capacity snapshot for ${input.memberId}`)
  }

  if (period && (snapshot.periodYear !== period.year || snapshot.periodMonth !== period.month)) {
    notes.push(`Capacity snapshot fallback al periodo ${snapshot.periodId}.`)
  }

  notes.push(`Costo base desde ${snapshot.sourceKind} ${snapshot.periodId} (confianza ${snapshot.confidenceLabel}).`)

  const periods = normalizePositiveNumber(input.periods, 1)
  const quantity = normalizePositiveNumber(input.quantity, 1)
  const resolvedFteFraction = normalizePositiveNumber(input.fteFraction, 1)
  const explicitHours = input.hours != null && Number.isFinite(input.hours) && input.hours > 0

  const hoursPerPeriod = explicitHours
    ? input.hours!
    : (await deps.convertFteToHours(resolvedFteFraction, quoteDate))?.monthlyHours ??
      snapshot.commercialAvailabilityHours ??
      snapshot.contractedHours

  const hourlyCostUsd =
    snapshot.currency.toUpperCase() === 'USD'
      ? snapshot.costPerHourAmount
      : snapshot.costPerHourAmount != null
        ? await deps.convertCurrencyAmount({
            amount: snapshot.costPerHourAmount,
            fromCurrency: snapshot.currency,
            toCurrency: 'USD',
            rateDate: quoteDate
          })
        : null

  const monthlyCostUsd =
    snapshot.currency.toUpperCase() === 'USD'
      ? snapshot.loadedCostAmount
      : snapshot.loadedCostAmount != null
        ? await deps.convertCurrencyAmount({
            amount: snapshot.loadedCostAmount,
            fromCurrency: snapshot.currency,
            toCurrency: 'USD',
            rateDate: quoteDate
          })
        : null

  if (hourlyCostUsd == null && monthlyCostUsd == null) {
    throw new Error(`Could not normalize member capacity snapshot for ${input.memberId} to USD`)
  }

  const pricingBasis: 'hour' | 'month' = explicitHours ? 'hour' : 'month'

  const baseUnitCostUsd =
    pricingBasis === 'hour'
      ? hourlyCostUsd ?? round2((monthlyCostUsd ?? 0) / Math.max(snapshot.commercialAvailabilityHours || snapshot.contractedHours || 1, 1))
      : round2((monthlyCostUsd ?? round2((hourlyCostUsd ?? 0) * hoursPerPeriod)) * resolvedFteFraction)

  const marginPct = normalizeMarginPct(input.overrideMarginPct, 0.35)

  const unitPriceUsd = round2(
    applyMarginFormula({
      costUsd: baseUnitCostUsd,
      marginPct
    }) * commercialMultiplierFactor * countryFactorApplied
  )

  const totalUnits = pricingBasis === 'hour' ? hoursPerPeriod * periods * quantity : periods * quantity
  const totalCostUsd = round2(baseUnitCostUsd * totalUnits)
  const totalBillUsd = round2(unitPriceUsd * totalUnits)

  const unitCostOutputCurrency = await convertUsdWithFallback({
    amountUsd: baseUnitCostUsd,
    outputCurrency,
    quoteDate,
    notes,
    convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
  })

  const unitPriceOutputCurrency = await convertUsdWithFallback({
    amountUsd: unitPriceUsd,
    outputCurrency,
    quoteDate,
    notes,
    convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
  })

  const totalBillOutputCurrency = round2(unitPriceOutputCurrency * totalUnits)

  return {
    line: {
      lineInput: input,
      costStack: {
        unitCostUsd: baseUnitCostUsd,
        unitCostOutputCurrency,
        totalCostUsd,
        totalCostOutputCurrency: round2(unitCostOutputCurrency * totalUnits),
        breakdown: {
          totalLaborCostTarget: snapshot.totalLaborCostAmount ?? 0,
          directOverheadTarget: snapshot.directOverheadAmount ?? 0,
          sharedOverheadTarget: snapshot.sharedOverheadAmount ?? 0,
          loadedCostTarget: snapshot.loadedCostAmount ?? 0
        },
        employmentTypeCode: snapshot.employmentTypeCode,
        employmentTypeSource: 'payroll_compensation_version',
        costBasisKind: 'member_actual',
        costBasisSourceRef: snapshot.sourceRef,
        costBasisSnapshotDate: snapshot.snapshotDate,
        costBasisConfidenceScore: snapshot.confidenceScore,
        costBasisConfidenceLabel: snapshot.confidenceLabel
      },
      suggestedBillRate: {
        pricingBasis,
        unitPriceUsd,
        unitPriceOutputCurrency,
        totalBillUsd,
        totalBillOutputCurrency
      },
      effectiveMarginPct: deriveMarginPct({
        totalBillUsd,
        totalCostUsd
      }),
      tierCompliance: {
        status: 'unknown',
        tier: null,
        marginMin: null,
        marginOpt: null,
        marginMax: null
      },
      resolutionNotes: notes
    },
    totalCostUsd,
    totalBillUsd,
    totalBillOutputCurrency,
    monthlyResourceCostUsd: round2((monthlyCostUsd ?? 0) * resolvedFteFraction * quantity),
    roleCanSellAsStaff: false
  }
}

const resolveToolLine = async ({
  input,
  quoteDate,
  outputCurrency,
  countryFactorApplied,
  deps
}: {
  input: ToolPricingLineInputV2
  quoteDate: string
  outputCurrency: PricingOutputCurrency
  countryFactorApplied: number
  deps: PricingEngineV2Dependencies
}): Promise<Omit<ResolvedLineAccumulator, 'originalIndex'>> => {
  const notes: string[] = []
  const tool = await deps.getToolBySku(input.toolSku)
  const quotePeriod = extractQuotePeriod(quoteDate)

  if (!tool) {
    throw new Error(`Unknown tool SKU: ${input.toolSku}`)
  }

  const quantity = normalizePositiveNumber(input.quantity, 1)
  const periods = normalizePositiveNumber(input.periods, 1)

  const costBasisSnapshot = await deps.getPreferredToolProviderCostBasisByToolSku(input.toolSku, {
    year: quotePeriod?.year ?? null,
    month: quotePeriod?.month ?? null
  })

  let unitCostUsd: number | null = null

  if (costBasisSnapshot && costBasisSnapshot.resolvedAmountClp > 0) {
    unitCostUsd =
      costBasisSnapshot.resolvedCurrency === 'USD'
        ? costBasisSnapshot.resolvedAmount
        : await deps.convertCurrencyAmount({
            amount: costBasisSnapshot.resolvedAmount,
            fromCurrency: costBasisSnapshot.resolvedCurrency,
            toCurrency: 'USD',
            rateDate: costBasisSnapshot.snapshotDate
          })

    if (unitCostUsd != null) {
      notes.push(
        `Costo base desde snapshot ${costBasisSnapshot.periodId} (${costBasisSnapshot.sourceKind}, confianza ${costBasisSnapshot.confidenceLabel}).`
      )

      if (
        quotePeriod &&
        (costBasisSnapshot.periodYear !== quotePeriod.year || costBasisSnapshot.periodMonth !== quotePeriod.month)
      ) {
        notes.push(
          `No existía snapshot exacto para ${quotePeriod.year}-${String(quotePeriod.month).padStart(2, '0')}; se reutilizó ${costBasisSnapshot.periodId}.`
        )
      }
    }
  }

  if (unitCostUsd == null) {
    unitCostUsd =
      tool.proratedCostUsd ??
      (tool.subscriptionAmount != null && tool.subscriptionCurrency
        ? await deps.convertCurrencyAmount({
            amount: tool.subscriptionAmount,
            fromCurrency: tool.subscriptionCurrency,
            toCurrency: 'USD',
            rateDate: quoteDate
          })
        : null)
  }

  if (unitCostUsd == null) {
    throw new Error(`Missing tool cost for ${input.toolSku}`)
  }

  const lineWarnings: PricingWarning[] = []
  const hasExplicitPrice = tool.proratedPriceUsd != null
  const baseUnitPriceUsd = tool.proratedPriceUsd ?? round2(unitCostUsd * 1.15)

  if (!hasExplicitPrice) {
    lineWarnings.push({
      code: 'tool_price_default_margin',
      severity: 'info',
      message: `Herramienta ${input.toolSku} no tiene precio explícito en el catálogo. Se aplicó margen default 15% sobre costo.`,
      context: { toolSku: input.toolSku, unitCostUsd, fallbackMarkupPct: 0.15 }
    })
  }

  const unitPriceUsd = round2(baseUnitPriceUsd * countryFactorApplied)
  const totalUnits = quantity * periods
  const totalCostUsd = round2(unitCostUsd * totalUnits)
  const totalBillUsd = round2(unitPriceUsd * totalUnits)

  const unitCostOutputCurrency = await convertUsdWithFallback({
    amountUsd: unitCostUsd,
    outputCurrency,
    quoteDate,
    notes,
    convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
  })

  const unitPriceOutputCurrency = await convertUsdWithFallback({
    amountUsd: unitPriceUsd,
    outputCurrency,
    quoteDate,
    notes,
    convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
  })

  return {
    line: {
      lineInput: input,
      costStack: {
        unitCostUsd,
        unitCostOutputCurrency,
        totalCostUsd,
        totalCostOutputCurrency: round2(unitCostOutputCurrency * totalUnits),
        breakdown: {
          proratedCostUsd: tool.proratedCostUsd ?? 0,
          subscriptionAmount: tool.subscriptionAmount ?? 0,
          snapshotResolvedAmountClp: costBasisSnapshot?.resolvedAmountClp ?? 0
        },
        costBasisKind: costBasisSnapshot ? 'tool_snapshot' : undefined,
        costBasisSourceRef: costBasisSnapshot?.sourceRef ?? null,
        costBasisSnapshotDate: costBasisSnapshot?.snapshotDate ?? null,
        costBasisConfidenceScore: costBasisSnapshot?.confidenceScore ?? null,
        costBasisConfidenceLabel: costBasisSnapshot?.confidenceLabel ?? null
      },
      suggestedBillRate: {
        pricingBasis: 'unit',
        unitPriceUsd,
        unitPriceOutputCurrency,
        totalBillUsd,
        totalBillOutputCurrency: round2(unitPriceOutputCurrency * totalUnits)
      },
      effectiveMarginPct: deriveMarginPct({
        totalBillUsd,
        totalCostUsd
      }),
      tierCompliance: {
        status: 'unknown',
        tier: null,
        marginMin: null,
        marginOpt: null,
        marginMax: null
      },
      resolutionNotes: notes
    },
    totalCostUsd,
    totalBillUsd,
    totalBillOutputCurrency: round2(unitPriceOutputCurrency * totalUnits),
    monthlyResourceCostUsd: 0,
    roleCanSellAsStaff: false,
    structuredWarnings: lineWarnings.length > 0 ? lineWarnings : undefined
  }
}

const resolveDirectCostLine = async ({
  input,
  quoteDate,
  outputCurrency,
  deps
}: {
  input: DirectCostPricingLineInputV2
  quoteDate: string
  outputCurrency: PricingOutputCurrency
  deps: PricingEngineV2Dependencies
}): Promise<Omit<ResolvedLineAccumulator, 'originalIndex'>> => {
  const notes: string[] = []
  const quantity = normalizePositiveNumber(input.quantity, 1)
  const normalizedCurrency = input.currency.trim().toUpperCase()

  const normalizedAmount =
    normalizedCurrency === 'USD'
      ? round2(input.amount)
      : await deps.convertCurrencyAmount({
          amount: input.amount,
          fromCurrency: normalizedCurrency,
          toCurrency: 'USD',
          rateDate: quoteDate
        })

  if (normalizedAmount == null) {
    throw new Error(`Missing exchange rate for direct cost currency ${normalizedCurrency}`)
  }

  const totalCostUsd = round2(normalizedAmount * quantity)
  const unitPriceUsd = round2(normalizedAmount)

  const unitCostOutputCurrency = await convertUsdWithFallback({
    amountUsd: normalizedAmount,
    outputCurrency,
    quoteDate,
    notes,
    convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
  })

  const unitPriceOutputCurrency = await convertUsdWithFallback({
    amountUsd: unitPriceUsd,
    outputCurrency,
    quoteDate,
    notes,
    convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
  })

  return {
    line: {
      lineInput: input,
      costStack: {
        unitCostUsd: normalizedAmount,
        unitCostOutputCurrency,
        totalCostUsd,
        totalCostOutputCurrency: round2(unitCostOutputCurrency * quantity),
        breakdown: {
          directCostUsd: normalizedAmount
        }
      },
      suggestedBillRate: {
        pricingBasis: 'unit',
        unitPriceUsd,
        unitPriceOutputCurrency,
        totalBillUsd: totalCostUsd,
        totalBillOutputCurrency: round2(unitPriceOutputCurrency * quantity)
      },
      effectiveMarginPct: 0,
      tierCompliance: {
        status: 'unknown',
        tier: null,
        marginMin: null,
        marginOpt: null,
        marginMax: null
      },
      resolutionNotes: notes
    },
    totalCostUsd,
    totalBillUsd: totalCostUsd,
    totalBillOutputCurrency: round2(unitPriceOutputCurrency * quantity),
    monthlyResourceCostUsd: 0,
    roleCanSellAsStaff: false
  }
}

const resolveExplicitAddonLine = async ({
  input,
  quoteDate,
  outputCurrency,
  basisSubtotalUsd,
  resourceMonthlyCostUsd,
  deps
}: {
  input: OverheadAddonPricingLineInputV2
  quoteDate: string
  outputCurrency: PricingOutputCurrency
  basisSubtotalUsd: number
  resourceMonthlyCostUsd: number
  deps: PricingEngineV2Dependencies
}): Promise<Omit<ResolvedLineAccumulator, 'originalIndex'>> => {
  const notes: string[] = []
  const addon = await deps.getOverheadAddonBySku(input.addonSku)

  if (!addon) {
    throw new Error(`Unknown overhead addon SKU: ${input.addonSku}`)
  }

  const quantity = normalizePositiveNumber(input.quantity, 1)

  const charge = computeAddonChargeUsd({
    addon,
    basisSubtotalUsd: input.basisSubtotal ?? basisSubtotalUsd,
    resourceMonthlyCostUsd
  })

  const unitCostUsd = round2(charge.costUsd)
  const unitBillUsd = round2(charge.amountUsd)
  const totalBillUsd = round2(unitBillUsd * quantity)
  const totalCostUsd = round2(unitCostUsd * quantity)

  const unitCostOutputCurrency = await convertUsdWithFallback({
    amountUsd: unitCostUsd,
    outputCurrency,
    quoteDate,
    notes,
    convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
  })

  const unitPriceOutputCurrency = await convertUsdWithFallback({
    amountUsd: unitBillUsd,
    outputCurrency,
    quoteDate,
    notes,
    convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
  })

  return {
    line: {
      lineInput: input,
      costStack: {
        unitCostUsd,
        unitCostOutputCurrency,
        totalCostUsd,
        totalCostOutputCurrency: round2(unitCostOutputCurrency * quantity),
        breakdown: {
          addonInternalCostUsd: unitCostUsd
        }
      },
      suggestedBillRate: {
        pricingBasis: 'unit',
        unitPriceUsd: unitBillUsd,
        unitPriceOutputCurrency,
        totalBillUsd,
        totalBillOutputCurrency: round2(unitPriceOutputCurrency * quantity)
      },
      effectiveMarginPct: deriveMarginPct({
        totalBillUsd,
        totalCostUsd
      }),
      tierCompliance: {
        status: 'unknown',
        tier: null,
        marginMin: null,
        marginOpt: null,
        marginMax: null
      },
      resolutionNotes: notes
    },
    totalCostUsd,
    totalBillUsd,
    totalBillOutputCurrency: round2(unitPriceOutputCurrency * quantity),
    monthlyResourceCostUsd: 0,
    roleCanSellAsStaff: false
  }
}

export const buildPricingEngineOutputV2 = async (
  input: PricingEngineInputV2,
  dependencies: Partial<PricingEngineV2Dependencies> = {}
): Promise<PricingEngineOutputV2> => {
  const deps: PricingEngineV2Dependencies = {
    ...defaultPricingEngineV2Dependencies,
    ...dependencies
  }

  const warnings = new Set<string>()
  const structuredWarnings: PricingWarning[] = []

  const pushWarning = (warning: PricingWarning) => {
    structuredWarnings.push(warning)
    warnings.add(warning.message)
  }

  const commercialModel = await deps.getCommercialModelMultiplier(input.commercialModel as never, input.quoteDate)
  const countryFactor = await deps.getCountryPricingFactor(input.countryFactorCode as never, input.quoteDate)

  if (!commercialModel) {
    pushWarning({
      code: 'unknown_commercial_model',
      severity: 'critical',
      message: `Modelo comercial "${input.commercialModel}" no está en el catálogo. Se aplicó multiplicador neutral (1.00).`,
      context: { attempted: input.commercialModel, fallback: 1 }
    })
  }

  if (!countryFactor) {
    pushWarning({
      code: 'unknown_country_factor',
      severity: 'critical',
      message: `Factor país "${input.countryFactorCode}" no está en el catálogo. Se aplicó factor neutral (1.00).`,
      context: { attempted: input.countryFactorCode, fallback: 1 }
    })
  }

  // FX readiness gate for the output currency (pricing_output domain).
  // This is the canonical call — do not reimplement the USD→target lookup
  // inline. If the readiness layer declares the pair unsupported, stale, or
  // temporarily unavailable, emit a structured warning so the UI can decide
  // whether to block the send.
  const fxReadiness = await deps.resolvePricingOutputFxReadiness({
    currency: input.outputCurrency,
    rateDate: input.quoteDate
  })

  if (fxReadiness.state !== 'supported') {
    const severity =
      fxReadiness.state === 'unsupported' || fxReadiness.state === 'temporarily_unavailable'
        ? 'critical'
        : 'warning'

    pushWarning({
      code: 'fx_fallback',
      severity,
      message: fxReadiness.message,
      context: {
        fromCurrency: fxReadiness.fromCurrency,
        toCurrency: fxReadiness.toCurrency,
        state: fxReadiness.state,
        ageDays: fxReadiness.ageDays,
        stalenessThresholdDays: fxReadiness.stalenessThresholdDays,
        rateDateResolved: fxReadiness.rateDateResolved,
        source: fxReadiness.source,
        composedViaUsd: fxReadiness.composedViaUsd
      }
    })
  } else if (fxReadiness.composedViaUsd) {
    // Even when supported, surface composition as an `info` note so the user
    // can verify the inferred rate against their expectation.
    pushWarning({
      code: 'fx_fallback',
      severity: 'info',
      message: fxReadiness.message,
      context: {
        fromCurrency: fxReadiness.fromCurrency,
        toCurrency: fxReadiness.toCurrency,
        composedViaUsd: true,
        rateDateResolved: fxReadiness.rateDateResolved
      }
    })
  }

  const commercialMultiplierFactor = 1 + (commercialModel?.multiplierPct ?? 0)
  const countryFactorApplied = countryFactor?.factorOpt ?? 1

  const baseLines = input.lines
    .map((line, originalIndex) => ({ line, originalIndex }))
    .filter(
      (
        entry
      ): entry is {
        line: Exclude<PricingLineInputV2, OverheadAddonPricingLineInputV2>
        originalIndex: number
      } => entry.line.lineType !== 'overhead_addon'
    )

  const explicitAddonLines = input.lines
    .map((line, originalIndex) => ({ line, originalIndex }))
    .filter(
      (entry): entry is { line: OverheadAddonPricingLineInputV2; originalIndex: number } =>
        entry.line.lineType === 'overhead_addon'
    )

  const resolvedLineAccumulators: ResolvedLineAccumulator[] = []

  for (const entry of baseLines) {
    let resolved: Omit<ResolvedLineAccumulator, 'originalIndex'>

    if (entry.line.lineType === 'role') {
      resolved = await resolveRoleLine({
        input: entry.line,
        quoteDate: input.quoteDate,
        outputCurrency: input.outputCurrency,
        commercialMultiplierFactor,
        countryFactorApplied,
        deps
      })
    } else if (entry.line.lineType === 'person') {
      resolved = await resolvePersonLine({
        input: entry.line,
        quoteDate: input.quoteDate,
        outputCurrency: input.outputCurrency,
        commercialMultiplierFactor,
        countryFactorApplied,
        deps
      })
    } else if (entry.line.lineType === 'tool') {
      resolved = await resolveToolLine({
        input: entry.line,
        quoteDate: input.quoteDate,
        outputCurrency: input.outputCurrency,
        countryFactorApplied,
        deps
      })
    } else {
      resolved = await resolveDirectCostLine({
        input: entry.line,
        quoteDate: input.quoteDate,
        outputCurrency: input.outputCurrency,
        deps
      })
    }

    resolved.line.resolutionNotes.forEach(note => warnings.add(note))

    if (resolved.structuredWarnings) {
      for (const w of resolved.structuredWarnings) {
        pushWarning({ ...w, lineIndex: entry.originalIndex })
      }
    }

    resolvedLineAccumulators.push({
      originalIndex: entry.originalIndex,
      ...resolved
    })
  }

  const baseSubtotalUsd = sum(resolvedLineAccumulators.map(line => line.totalBillUsd))
  const resourceMonthlyCostUsd = sum(resolvedLineAccumulators.map(line => line.monthlyResourceCostUsd))

  for (const entry of explicitAddonLines) {
    const resolved = await resolveExplicitAddonLine({
      input: entry.line,
      quoteDate: input.quoteDate,
      outputCurrency: input.outputCurrency,
      basisSubtotalUsd: baseSubtotalUsd,
      resourceMonthlyCostUsd,
      deps
    })

    resolved.line.resolutionNotes.forEach(note => warnings.add(note))

    if (resolved.structuredWarnings) {
      for (const w of resolved.structuredWarnings) {
        pushWarning({ ...w, lineIndex: entry.originalIndex })
      }
    }

    resolvedLineAccumulators.push({
      originalIndex: entry.originalIndex,
      ...resolved
    })
  }

  const explicitAddonSkus = new Set(explicitAddonLines.map(line => line.line.addonSku))

  const autoResolvedAddons =
    input.autoResolveAddons === false
      ? []
      : await deps.resolvePricingAddons({
          commercialModel: input.commercialModel,
          businessLineCode: input.businessLineCode,
          outputCurrency: input.outputCurrency,
          lines: resolvedLineAccumulators.map(entry => ({
            lineType: entry.line.lineInput.lineType,
            roleCanSellAsStaff: entry.roleCanSellAsStaff
          }))
        })

  const autoAddonOutputs = []

  for (const resolvedAddon of autoResolvedAddons) {
    if (explicitAddonSkus.has(resolvedAddon.addon.addonSku)) continue

    const charge = computeAddonChargeUsd({
      addon: resolvedAddon.addon,
      basisSubtotalUsd: baseSubtotalUsd,
      resourceMonthlyCostUsd
    })

    const amountOutputCurrency = await convertUsdWithFallback({
      amountUsd: charge.amountUsd,
      outputCurrency: input.outputCurrency,
      quoteDate: input.quoteDate,
      notes: [],
      convertUsdToPricingCurrencyFn: deps.convertUsdToPricingCurrency
    })

    autoAddonOutputs.push({
      sku: resolvedAddon.addon.addonSku,
      addonName: resolvedAddon.addon.addonName,
      appliedReason: resolvedAddon.appliedReason,
      amountUsd: charge.amountUsd,
      amountOutputCurrency,
      visibleToClient: resolvedAddon.addon.visibleToClient,
      costUsd: charge.costUsd
    })
  }

  const lineOutputs = resolvedLineAccumulators
    .sort((left, right) => left.originalIndex - right.originalIndex)
    .map(entry => entry.line)

  const explicitOverheadUsd = sum(
    resolvedLineAccumulators
      .filter(entry => entry.line.lineInput.lineType === 'overhead_addon')
      .map(entry => entry.totalBillUsd)
  )

  const autoOverheadUsd = sum(autoAddonOutputs.map(addon => addon.amountUsd))

  const subtotalUsd = sum(
    resolvedLineAccumulators
      .filter(entry => entry.line.lineInput.lineType !== 'overhead_addon')
      .map(entry => entry.totalBillUsd)
  )

  const overheadUsd = round2(explicitOverheadUsd + autoOverheadUsd)
  const totalUsd = round2(subtotalUsd + overheadUsd)

  const totalOutputCurrency = round2(
    sum(resolvedLineAccumulators.map(entry => entry.totalBillOutputCurrency)) +
      sum(autoAddonOutputs.map(addon => addon.amountOutputCurrency))
  )

  const totalCostUsd = round2(
    sum(resolvedLineAccumulators.map(entry => entry.totalCostUsd)) +
      sum(autoAddonOutputs.map(addon => addon.costUsd))
  )

  const aggregateMarginPct = deriveMarginPct({
    totalBillUsd: totalUsd,
    totalCostUsd
  })

  const lineComplianceStatuses = lineOutputs.map(line => line.tierCompliance.status)

  const classification =
    aggregateMarginPct < 0 || lineComplianceStatuses.includes('below_min')
      ? 'critical'
      : aggregateMarginPct < 0.25 || lineComplianceStatuses.includes('unknown')
        ? 'warning'
        : 'healthy'

  if (lineComplianceStatuses.includes('below_min')) {
    const affectedIndexes = lineOutputs
      .map((line, idx) => (line.tierCompliance.status === 'below_min' ? idx : -1))
      .filter(idx => idx >= 0)

    pushWarning({
      code: 'tier_below_min',
      severity: 'critical',
      message: `Una o más líneas están bajo el margen mínimo del tier (líneas ${affectedIndexes.map(i => i + 1).join(', ')}).`,
      context: { lineIndexes: affectedIndexes }
    })
  }

  return {
    lines: lineOutputs,
    addons: autoAddonOutputs.map(addon => ({
      sku: addon.sku,
      addonName: addon.addonName,
      appliedReason: addon.appliedReason,
      amountUsd: addon.amountUsd,
      amountOutputCurrency: addon.amountOutputCurrency,
      visibleToClient: addon.visibleToClient
    })),
    totals: {
      subtotalUsd,
      overheadUsd,
      totalUsd,
      totalOutputCurrency,
      commercialMultiplierApplied: round2(commercialMultiplierFactor),
      countryFactorApplied: round2(countryFactorApplied),
      exchangeRateUsed: await deps.resolvePricingOutputExchangeRate({
        currency: input.outputCurrency,
        rateDate: input.quoteDate
      })
    },
    aggregateMargin: {
      marginPct: aggregateMarginPct,
      classification
    },
    warnings: Array.from(warnings),
    structuredWarnings
  }
}
