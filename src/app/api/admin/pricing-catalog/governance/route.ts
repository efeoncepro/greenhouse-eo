import { NextResponse } from 'next/server'

import {
  listCommercialModelMultipliers,
  listCountryPricingFactors,
  listFteHoursGuide,
  listRoleTierMargins,
  listServiceTierMargins,
  upsertCommercialModelMultiplier,
  upsertCountryPricingFactor,
  upsertFteHoursGuide,
  upsertRoleTierMargin,
  upsertServiceTierMargin
} from '@/lib/commercial/pricing-governance-store'
import {
  getBlockingConstraintIssues,
  validateCommercialModelMultiplier,
  validateCountryPricingFactor,
  validateEmploymentType,
  validateFteHoursGuide,
  validateRoleTierMargin
} from '@/lib/commercial/pricing-catalog-constraints'
import type {
  CommercialModelMultiplierSeedRow,
  CountryPricingFactorSeedRow,
  FteHoursGuideSeedRow,
  RoleTierMarginSeedRow,
  ServiceTierMarginSeedRow
} from '@/lib/commercial/pricing-governance-seed'
import type {
  CommercialModelCode,
  CountryPricingFactorCode,
  PricingTierCode
} from '@/lib/commercial/pricing-governance-types'
import {
  COMMERCIAL_MODEL_CODES,
  COUNTRY_PRICING_FACTOR_CODES,
  PRICING_TIER_CODES
} from '@/lib/commercial/pricing-governance-types'
import type { EmploymentTypeSeedRow } from '@/lib/commercial/sellable-roles-seed'
import { listEmploymentTypes, upsertEmploymentType } from '@/lib/commercial/sellable-roles-store'
import {
  recordPricingCatalogAudit,
  type PricingCatalogEntityType
} from '@/lib/commercial/pricing-catalog-audit-store'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { requireIfMatch, withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

type GovernanceType =
  | 'role_tier_margin'
  | 'service_tier_margin'
  | 'commercial_model_multiplier'
  | 'country_pricing_factor'
  | 'fte_hours_guide'
  | 'employment_type'

const TYPE_TO_ENTITY: Record<GovernanceType, PricingCatalogEntityType> = {
  role_tier_margin: 'role_tier_margin',
  service_tier_margin: 'service_tier_margin',
  commercial_model_multiplier: 'commercial_model_multiplier',
  country_pricing_factor: 'country_pricing_factor',
  fte_hours_guide: 'fte_hours_guide',
  employment_type: 'employment_type'
}

const resolveActorName = async (fallback: string): Promise<string> => {
  const session = await getServerAuthSession()
  const user = session?.user

  return user?.name || user?.email || fallback || 'unknown'
}

const pickNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const pickString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

interface GovernancePatchBody {
  type?: unknown
  payload?: unknown
  effectiveFrom?: unknown
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const maxTimestamp = (values: Array<string | null | undefined>) =>
  values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Forbidden — requires efeonce_admin or finance_admin' },
      { status: 403 }
    )
  }

  const [
    roleTierMargins,
    serviceTierMargins,
    commercialModelMultipliers,
    countryPricingFactors,
    fteHoursGuide,
    employmentTypes
  ] = await Promise.all([
    listRoleTierMargins(),
    listServiceTierMargins(),
    listCommercialModelMultipliers(),
    listCountryPricingFactors(),
    listFteHoursGuide(),
    listEmploymentTypes({ activeOnly: false })
  ])

  const updatedAt = maxTimestamp([
    ...roleTierMargins.map(entry => entry.updatedAt),
    ...serviceTierMargins.map(entry => entry.updatedAt),
    ...commercialModelMultipliers.map(entry => entry.updatedAt),
    ...countryPricingFactors.map(entry => entry.updatedAt),
    ...fteHoursGuide.map(entry => entry.updatedAt),
    ...employmentTypes.map(entry => entry.updatedAt)
  ])

  return withOptimisticLockHeaders(
    NextResponse.json({
      roleTierMargins,
      serviceTierMargins,
      commercialModelMultipliers,
      countryPricingFactors,
      fteHoursGuide,
      employmentTypes,
      updatedAt
    }),
    updatedAt
  )
}

export async function PATCH(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Forbidden — requires efeonce_admin or finance_admin' },
      { status: 403 }
    )
  }

  let body: GovernancePatchBody

  try {
    body = (await request.json()) as GovernancePatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const type = pickString(body.type) as GovernanceType | null
  const payload = body.payload as Record<string, unknown> | undefined
  const effectiveFrom = pickString(body.effectiveFrom) ?? todayIso()

  if (!type || !(type in TYPE_TO_ENTITY)) {
    return NextResponse.json(
      { error: `type must be one of: ${Object.keys(TYPE_TO_ENTITY).join(', ')}` },
      { status: 400 }
    )
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'payload is required.' }, { status: 400 })
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)
  const entityType = TYPE_TO_ENTITY[type]

  const resolveCurrentUpdatedAt = async (): Promise<string | null> => {
    if (type === 'role_tier_margin') {
      const tier = pickString(payload.tier) as PricingTierCode | null

      if (!tier) return null

      return (await listRoleTierMargins()).find(entry => entry.tier === tier)?.updatedAt ?? null
    }

    if (type === 'service_tier_margin') {
      const tier = pickString(payload.tier) as PricingTierCode | null

      if (!tier) return null

      return (await listServiceTierMargins()).find(entry => entry.tier === tier)?.updatedAt ?? null
    }

    if (type === 'commercial_model_multiplier') {
      const modelCode = pickString(payload.modelCode) as CommercialModelCode | null

      if (!modelCode) return null

      return (await listCommercialModelMultipliers()).find(entry => entry.modelCode === modelCode)?.updatedAt ?? null
    }

    if (type === 'country_pricing_factor') {
      const factorCode = pickString(payload.factorCode) as CountryPricingFactorCode | null

      if (!factorCode) return null

      return (await listCountryPricingFactors()).find(entry => entry.factorCode === factorCode)?.updatedAt ?? null
    }

    if (type === 'fte_hours_guide') {
      const fteFraction = pickNumber(payload.fteFraction)

      if (fteFraction === null) return null

      return (await listFteHoursGuide()).find(entry => entry.fteFraction === fteFraction)?.updatedAt ?? null
    }

    const employmentTypeCode = pickString(payload.employmentTypeCode)

    if (!employmentTypeCode) return null

    return (await listEmploymentTypes({ activeOnly: false })).find(entry => entry.employmentTypeCode === employmentTypeCode)?.updatedAt ?? null
  }

  const optimisticLock = requireIfMatch(request, await resolveCurrentUpdatedAt())

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  try {
    if (type === 'role_tier_margin') {
      const tier = pickString(payload.tier) as PricingTierCode | null
      const tierLabel = pickString(payload.tierLabel)
      const marginMin = pickNumber(payload.marginMin)
      const marginOpt = pickNumber(payload.marginOpt)
      const marginMax = pickNumber(payload.marginMax)

      if (!tier || !PRICING_TIER_CODES.includes(tier)) {
        return NextResponse.json(
          { error: `tier must be one of: ${PRICING_TIER_CODES.join(', ')}` },
          { status: 400 }
        )
      }

      if (!tierLabel || marginMin === null || marginOpt === null || marginMax === null) {
        return NextResponse.json(
          { error: 'tierLabel, marginMin, marginOpt, marginMax are required.' },
          { status: 400 }
        )
      }

      const input: RoleTierMarginSeedRow = {
        tier,
        tierLabel,
        marginMin,
        marginOpt,
        marginMax,
        notes: pickString(payload.notes)
      }

      const issues = validateRoleTierMargin(input as unknown as Record<string, unknown>)

      if (getBlockingConstraintIssues(issues).length > 0) {
        return NextResponse.json({ issues }, { status: 422 })
      }

      const result = await upsertRoleTierMargin(input, effectiveFrom)

      if (result.action !== 'unchanged') {
        await recordPricingCatalogAudit({
          entityType,
          entityId: `${tier}:${effectiveFrom}`,
          entitySku: null,
          action: result.action === 'inserted' ? 'created' : 'updated',
          actorUserId: tenant.userId,
          actorName,
          changeSummary: { new_values: { ...input, effectiveFrom } },
          effectiveFrom
        })
      }

      return withOptimisticLockHeaders(
        NextResponse.json({ action: result.action, entry: result.entry }),
        result.entry.updatedAt,
        { missingIfMatch: optimisticLock.missingIfMatch }
      )
    }

    if (type === 'service_tier_margin') {
      const tier = pickString(payload.tier) as PricingTierCode | null
      const tierLabel = pickString(payload.tierLabel)
      const marginBase = pickNumber(payload.marginBase)

      if (!tier || !PRICING_TIER_CODES.includes(tier)) {
        return NextResponse.json(
          { error: `tier must be one of: ${PRICING_TIER_CODES.join(', ')}` },
          { status: 400 }
        )
      }

      if (!tierLabel || marginBase === null) {
        return NextResponse.json({ error: 'tierLabel and marginBase are required.' }, { status: 400 })
      }

      const input: ServiceTierMarginSeedRow = {
        tier,
        tierLabel,
        marginBase,
        description: pickString(payload.description)
      }

      const result = await upsertServiceTierMargin(input, effectiveFrom)

      if (result.action !== 'unchanged') {
        await recordPricingCatalogAudit({
          entityType,
          entityId: `${tier}:${effectiveFrom}`,
          entitySku: null,
          action: result.action === 'inserted' ? 'created' : 'updated',
          actorUserId: tenant.userId,
          actorName,
          changeSummary: { new_values: { ...input, effectiveFrom } },
          effectiveFrom
        })
      }

      return NextResponse.json({ action: result.action, entry: result.entry })
    }

    if (type === 'commercial_model_multiplier') {
      const modelCode = pickString(payload.modelCode) as CommercialModelCode | null
      const modelLabel = pickString(payload.modelLabel)
      const multiplierPct = pickNumber(payload.multiplierPct)

      if (!modelCode || !COMMERCIAL_MODEL_CODES.includes(modelCode)) {
        return NextResponse.json(
          { error: `modelCode must be one of: ${COMMERCIAL_MODEL_CODES.join(', ')}` },
          { status: 400 }
        )
      }

      if (!modelLabel || multiplierPct === null) {
        return NextResponse.json({ error: 'modelLabel and multiplierPct are required.' }, { status: 400 })
      }

      const input: CommercialModelMultiplierSeedRow = {
        modelCode,
        modelLabel,
        multiplierPct,
        description: pickString(payload.description)
      }

      const issues = validateCommercialModelMultiplier(input as unknown as Record<string, unknown>)

      if (getBlockingConstraintIssues(issues).length > 0) {
        return NextResponse.json({ issues }, { status: 422 })
      }

      const result = await upsertCommercialModelMultiplier(input, effectiveFrom)

      if (result.action !== 'unchanged') {
        await recordPricingCatalogAudit({
          entityType,
          entityId: `${modelCode}:${effectiveFrom}`,
          entitySku: null,
          action: result.action === 'inserted' ? 'created' : 'updated',
          actorUserId: tenant.userId,
          actorName,
          changeSummary: { new_values: { ...input, effectiveFrom } },
          effectiveFrom
        })
      }

      return withOptimisticLockHeaders(
        NextResponse.json({ action: result.action, entry: result.entry }),
        result.entry.updatedAt,
        { missingIfMatch: optimisticLock.missingIfMatch }
      )
    }

    if (type === 'country_pricing_factor') {
      const factorCode = pickString(payload.factorCode) as CountryPricingFactorCode | null
      const factorLabel = pickString(payload.factorLabel)
      const factorMin = pickNumber(payload.factorMin)
      const factorOpt = pickNumber(payload.factorOpt)
      const factorMax = pickNumber(payload.factorMax)

      if (!factorCode || !COUNTRY_PRICING_FACTOR_CODES.includes(factorCode)) {
        return NextResponse.json(
          { error: `factorCode must be one of: ${COUNTRY_PRICING_FACTOR_CODES.join(', ')}` },
          { status: 400 }
        )
      }

      if (!factorLabel || factorMin === null || factorOpt === null || factorMax === null) {
        return NextResponse.json(
          { error: 'factorLabel, factorMin, factorOpt, factorMax are required.' },
          { status: 400 }
        )
      }

      const input: CountryPricingFactorSeedRow = {
        factorCode,
        factorLabel,
        factorMin,
        factorOpt,
        factorMax,
        appliesWhen: pickString(payload.appliesWhen)
      }

      const issues = validateCountryPricingFactor(input as unknown as Record<string, unknown>)

      if (getBlockingConstraintIssues(issues).length > 0) {
        return NextResponse.json({ issues }, { status: 422 })
      }

      const result = await upsertCountryPricingFactor(input, effectiveFrom)

      if (result.action !== 'unchanged') {
        await recordPricingCatalogAudit({
          entityType,
          entityId: `${factorCode}:${effectiveFrom}`,
          entitySku: null,
          action: result.action === 'inserted' ? 'created' : 'updated',
          actorUserId: tenant.userId,
          actorName,
          changeSummary: { new_values: { ...input, effectiveFrom } },
          effectiveFrom
        })
      }

      return withOptimisticLockHeaders(
        NextResponse.json({ action: result.action, entry: result.entry }),
        result.entry.updatedAt,
        { missingIfMatch: optimisticLock.missingIfMatch }
      )
    }

    if (type === 'fte_hours_guide') {
      const fteFraction = pickNumber(payload.fteFraction)
      const fteLabel = pickString(payload.fteLabel)
      const monthlyHours = pickNumber(payload.monthlyHours)

      if (fteFraction === null || !fteLabel || monthlyHours === null) {
        return NextResponse.json(
          { error: 'fteFraction, fteLabel, monthlyHours are required.' },
          { status: 400 }
        )
      }

      const input: FteHoursGuideSeedRow = {
        fteFraction,
        fteLabel,
        monthlyHours: Math.round(monthlyHours),
        recommendedDescription: pickString(payload.recommendedDescription)
      }

      const issues = validateFteHoursGuide({
        fteFraction: input.fteFraction,
        hoursPerMonth: input.monthlyHours
      })

      if (getBlockingConstraintIssues(issues).length > 0) {
        return NextResponse.json({ issues }, { status: 422 })
      }

      const result = await upsertFteHoursGuide(input, effectiveFrom)

      if (result.action !== 'unchanged') {
        await recordPricingCatalogAudit({
          entityType,
          entityId: `${fteFraction}:${effectiveFrom}`,
          entitySku: null,
          action: result.action === 'inserted' ? 'created' : 'updated',
          actorUserId: tenant.userId,
          actorName,
          changeSummary: { new_values: { ...input, effectiveFrom } },
          effectiveFrom
        })
      }

      return withOptimisticLockHeaders(
        NextResponse.json({ action: result.action, entry: result.entry }),
        result.entry.updatedAt,
        { missingIfMatch: optimisticLock.missingIfMatch }
      )
    }

    if (type === 'employment_type') {
      const employmentTypeCode = pickString(payload.employmentTypeCode)
      const labelEs = pickString(payload.labelEs)
      const labelEn = pickString(payload.labelEn)
      const paymentCurrency = pickString(payload.paymentCurrency)
      const countryCode = pickString(payload.countryCode)
      const appliesPrevisional = payload.appliesPrevisional === true
      const previsionalPctDefault = pickNumber(payload.previsionalPctDefault)
      const feeMonthlyUsdDefault = pickNumber(payload.feeMonthlyUsdDefault) ?? 0
      const feePctDefault = pickNumber(payload.feePctDefault)
      const appliesBonuses = payload.appliesBonuses === true
      const sourceOfTruth = pickString(payload.sourceOfTruth)
      const notes = pickString(payload.notes)

      if (!employmentTypeCode || !labelEs || !paymentCurrency || !countryCode || !sourceOfTruth) {
        return NextResponse.json(
          {
            error:
              'employmentTypeCode, labelEs, paymentCurrency, countryCode, sourceOfTruth are required.'
          },
          { status: 400 }
        )
      }

      const input = {
        employmentTypeCode,
        labelEs,
        labelEn,
        paymentCurrency,
        countryCode,
        appliesPrevisional,
        previsionalPctDefault,
        feeMonthlyUsdDefault,
        feePctDefault,
        appliesBonuses,
        sourceOfTruth,
        notes
      } as unknown as EmploymentTypeSeedRow

      const issues = validateEmploymentType({
        previsionalPctDefault,
        feeMonthlyUsdDefault,
        feePctDefault
      })

      if (getBlockingConstraintIssues(issues).length > 0) {
        return NextResponse.json({ issues }, { status: 422 })
      }

      const result = await upsertEmploymentType(input)

      await recordPricingCatalogAudit({
        entityType,
        entityId: employmentTypeCode,
        entitySku: employmentTypeCode,
        action: result.created ? 'created' : 'updated',
        actorUserId: tenant.userId,
        actorName,
        changeSummary: { new_values: { ...input, effectiveFrom } },
        effectiveFrom
      })

      const updatedAt = await resolveCurrentUpdatedAt()

      return withOptimisticLockHeaders(
        NextResponse.json({ action: result.created ? 'inserted' : 'updated', entry: result }),
        updatedAt,
        { missingIfMatch: optimisticLock.missingIfMatch }
      )
    }

    return NextResponse.json({ error: `Unsupported governance type: ${type}` }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: `Failed to upsert governance entry: ${message}` }, { status: 422 })
  }
}
