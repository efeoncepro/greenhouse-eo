import { NextResponse } from 'next/server'

import { loadBusinessLineMetadata } from '@/lib/business-line/metadata'
import { listOverheadAddons } from '@/lib/commercial/overhead-addons-store'
import {
  listCommercialModelMultipliers,
  listCountryPricingFactors,
  listFteHoursGuide,
  listRoleTierMargins,
  listServiceTierMargins
} from '@/lib/commercial/pricing-governance-store'
import { listEmploymentTypes, listSellableRoles } from '@/lib/commercial/sellable-roles-store'
import { listToolCatalog } from '@/lib/commercial/tool-catalog-store'
import {
  listMarginTargets,
  listRevenueMetricConfigs,
  listRoleRateCards,
  upsertMarginTarget,
  upsertRevenueMetricConfig,
  upsertRoleRateCard,
  type MarginMetricKey,
  type QuotationPricingCurrency,
  type RoleRateSeniorityLevel
} from '@/lib/finance/pricing'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'
import { can } from '@/lib/entitlements/runtime'

export const dynamic = 'force-dynamic'

// TASK-1202 — antes era un check de rol inline (FINANCE_ADMIN_ROLES.some(hasRoleCode)),
// anti-patrón. Ahora capability-based: la usan el flag canEdit del GET y el gate del PUT,
// así ruta y UI quedan alineadas. Capability admin-only commercial.quotation.pricing_config.
const canEditPricingConfig = (tenant: Parameters<typeof can>[0]) =>
  can(tenant, 'commercial.quotation.pricing_config', 'update', 'tenant')

export async function GET() {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [
    marginTargets,
    roleRateCards,
    revenueMetricConfigs,
    sellableRoles,
    employmentTypes,
    roleTierMargins,
    serviceTierMargins,
    commercialModelMultipliers,
    countryPricingFactors,
    fteHoursGuide,
    toolCatalog,
    overheadAddons,
    businessLines
  ] = await Promise.all([
    listMarginTargets(),
    listRoleRateCards(),
    listRevenueMetricConfigs(),
    listSellableRoles({ activeOnly: true }),
    listEmploymentTypes({ activeOnly: true }),
    listRoleTierMargins(),
    listServiceTierMargins(),
    listCommercialModelMultipliers(),
    listCountryPricingFactors(),
    listFteHoursGuide(),
    listToolCatalog({ active: true }),
    listOverheadAddons({ active: true }),
    loadBusinessLineMetadata()
  ])

  return NextResponse.json({
    marginTargets,
    roleRateCards,
    revenueMetricConfigs,
    catalog: {
      sellableRoles,
      employmentTypes,
      roleTierMargins,
      serviceTierMargins,
      commercialModelMultipliers,
      countryPricingFactors,
      fteHoursGuide,
      toolCatalog,
      overheadAddons,
      businessLines
    },
    canEdit: canEditPricingConfig(tenant)
  })
}

interface UpsertPricingConfigPayload {
  marginTargets?: Array<{
    businessLineCode: string | null
    targetMarginPct: number
    floorMarginPct: number
    effectiveFrom: string
    effectiveUntil?: string | null
    notes?: string | null
  }>
  roleRateCards?: Array<{
    businessLineCode: string | null
    roleCode: string
    seniorityLevel: RoleRateSeniorityLevel
    hourlyRateCost: number
    currency: QuotationPricingCurrency
    effectiveFrom: string
    effectiveUntil?: string | null
    notes?: string | null
  }>
  revenueMetricConfigs?: Array<{
    businessLineCode: string | null
    hubspotAmountMetric: MarginMetricKey
    pipelineDefaultMetric: MarginMetricKey
    active?: boolean
    notes?: string | null
  }>
}

export async function PUT(request: Request) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canEditPricingConfig(tenant)) {
    return NextResponse.json(
      { error: 'No tienes permiso para configurar el pricing del cotizador.', code: 'forbidden' },
      { status: 403 }
    )
  }

  let body: UpsertPricingConfigPayload

  try {
    body = (await request.json()) as UpsertPricingConfigPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const createdBy = tenant.userId

  const savedMarginTargets = []
  const savedRoleRateCards = []
  const savedRevenueMetricConfigs = []

  if (Array.isArray(body.marginTargets)) {
    for (const entry of body.marginTargets) {
      savedMarginTargets.push(
        await upsertMarginTarget({
          businessLineCode: entry.businessLineCode,
          targetMarginPct: entry.targetMarginPct,
          floorMarginPct: entry.floorMarginPct,
          effectiveFrom: entry.effectiveFrom,
          effectiveUntil: entry.effectiveUntil ?? null,
          notes: entry.notes ?? null,
          createdBy
        })
      )
    }
  }

  if (Array.isArray(body.roleRateCards)) {
    for (const entry of body.roleRateCards) {
      savedRoleRateCards.push(
        await upsertRoleRateCard({
          businessLineCode: entry.businessLineCode,
          roleCode: entry.roleCode,
          seniorityLevel: entry.seniorityLevel,
          hourlyRateCost: entry.hourlyRateCost,
          currency: entry.currency,
          effectiveFrom: entry.effectiveFrom,
          effectiveUntil: entry.effectiveUntil ?? null,
          notes: entry.notes ?? null,
          createdBy
        })
      )
    }
  }

  if (Array.isArray(body.revenueMetricConfigs)) {
    for (const entry of body.revenueMetricConfigs) {
      savedRevenueMetricConfigs.push(
        await upsertRevenueMetricConfig({
          businessLineCode: entry.businessLineCode,
          hubspotAmountMetric: entry.hubspotAmountMetric,
          pipelineDefaultMetric: entry.pipelineDefaultMetric,
          active: entry.active,
          notes: entry.notes ?? null,
          createdBy
        })
      )
    }
  }

  return NextResponse.json({
    marginTargets: savedMarginTargets,
    roleRateCards: savedRoleRateCards,
    revenueMetricConfigs: savedRevenueMetricConfigs
  })
}
