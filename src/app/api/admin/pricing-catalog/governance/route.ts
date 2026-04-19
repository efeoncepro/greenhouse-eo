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
import {
  recordPricingCatalogAudit,
  type PricingCatalogEntityType
} from '@/lib/commercial/pricing-catalog-audit-store'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type GovernanceType =
  | 'role_tier_margin'
  | 'service_tier_margin'
  | 'commercial_model_multiplier'
  | 'country_pricing_factor'
  | 'fte_hours_guide'

const TYPE_TO_ENTITY: Record<GovernanceType, PricingCatalogEntityType> = {
  role_tier_margin: 'role_tier_margin',
  service_tier_margin: 'service_tier_margin',
  commercial_model_multiplier: 'commercial_model_multiplier',
  country_pricing_factor: 'country_pricing_factor',
  fte_hours_guide: 'fte_hours_guide'
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
    fteHoursGuide
  ] = await Promise.all([
    listRoleTierMargins(),
    listServiceTierMargins(),
    listCommercialModelMultipliers(),
    listCountryPricingFactors(),
    listFteHoursGuide()
  ])

  return NextResponse.json({
    roleTierMargins,
    serviceTierMargins,
    commercialModelMultipliers,
    countryPricingFactors,
    fteHoursGuide
  })
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

      return NextResponse.json({ action: result.action, entry: result.entry })
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

      return NextResponse.json({ action: result.action, entry: result.entry })
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

      return NextResponse.json({ action: result.action, entry: result.entry })
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

      return NextResponse.json({ action: result.action, entry: result.entry })
    }

    return NextResponse.json({ error: `Unsupported governance type: ${type}` }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: `Failed to upsert governance entry: ${message}` }, { status: 422 })
  }
}
