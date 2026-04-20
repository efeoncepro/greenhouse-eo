import { NextResponse } from 'next/server'

import {
  createService,
  getServiceByModuleId,
  listServiceCatalog,
  type ServiceCommercialModel,
  type ServiceTier,
  type ServiceUnit
} from '@/lib/commercial/service-catalog-store'
import { validateServiceCatalog } from '@/lib/commercial/service-catalog-constraints'
import { getBlockingConstraintIssues } from '@/lib/commercial/pricing-catalog-constraints'
import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

const SERVICE_UNITS = ['project', 'monthly'] as const
const COMMERCIAL_MODELS = ['on_going', 'on_demand', 'hybrid', 'license_consulting'] as const
const TIERS = ['1', '2', '3', '4'] as const

const maxUpdatedAt = (values: Array<string | null | undefined>) =>
  values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null

const resolveActorName = async (fallback: string): Promise<string> => {
  const session = await getServerAuthSession()
  const user = session?.user

  return user?.name || user?.email || fallback || 'unknown'
}

interface CreateServiceBody {
  moduleCode?: unknown
  moduleName?: unknown
  serviceCategory?: unknown
  displayName?: unknown
  serviceUnit?: unknown
  serviceType?: unknown
  commercialModel?: unknown
  tier?: unknown
  defaultDurationMonths?: unknown
  defaultDescription?: unknown
  businessLineCode?: unknown
  active?: unknown
}

const pickOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const pickOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

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

  const items = await listServiceCatalog({ activeOnly: false })

  const updatedAt = maxUpdatedAt(items.map(item => item.updatedAt))

  return withOptimisticLockHeaders(NextResponse.json({ items, updatedAt }), updatedAt)
}

export async function POST(request: Request) {
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

  let body: CreateServiceBody

  try {
    body = (await request.json()) as CreateServiceBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const moduleName = typeof body.moduleName === 'string' ? body.moduleName.trim() : ''
  const moduleCode = pickOptionalString(body.moduleCode)
  const serviceCategory = pickOptionalString(body.serviceCategory)
  const displayName = pickOptionalString(body.displayName)
  const serviceUnitRaw = typeof body.serviceUnit === 'string' ? body.serviceUnit.trim() : ''
  const serviceType = pickOptionalString(body.serviceType)
  const commercialModelRaw = typeof body.commercialModel === 'string' ? body.commercialModel.trim() : ''
  const tierRaw = typeof body.tier === 'string' ? body.tier.trim() : ''
  const defaultDurationMonths = pickOptionalNumber(body.defaultDurationMonths)
  const defaultDescription = pickOptionalString(body.defaultDescription)
  const businessLineCode = pickOptionalString(body.businessLineCode)
  const active = body.active === undefined ? true : body.active === true

  if (!moduleName) {
    return NextResponse.json({ error: 'moduleName is required.' }, { status: 400 })
  }

  if (!SERVICE_UNITS.includes(serviceUnitRaw as (typeof SERVICE_UNITS)[number])) {
    return NextResponse.json(
      { error: `serviceUnit must be one of: ${SERVICE_UNITS.join(', ')}` },
      { status: 400 }
    )
  }

  if (!COMMERCIAL_MODELS.includes(commercialModelRaw as (typeof COMMERCIAL_MODELS)[number])) {
    return NextResponse.json(
      { error: `commercialModel must be one of: ${COMMERCIAL_MODELS.join(', ')}` },
      { status: 400 }
    )
  }

  if (!TIERS.includes(tierRaw as (typeof TIERS)[number])) {
    return NextResponse.json(
      { error: `tier must be one of: ${TIERS.join(', ')}` },
      { status: 400 }
    )
  }

  const issues = validateServiceCatalog({
    moduleName,
    serviceUnit: serviceUnitRaw,
    commercialModel: commercialModelRaw,
    tier: tierRaw,
    defaultDurationMonths,
    serviceCategory,
    businessLineCode
  })

  if (getBlockingConstraintIssues(issues).length > 0) {
    return NextResponse.json({ issues }, { status: 422 })
  }

  let moduleId: string
  let serviceSku: string

  try {
    const created = await createService({
      moduleCode,
      moduleName,
      serviceCategory,
      displayName,
      serviceUnit: serviceUnitRaw as ServiceUnit,
      serviceType,
      commercialModel: commercialModelRaw as ServiceCommercialModel,
      tier: tierRaw as ServiceTier,
      defaultDurationMonths,
      defaultDescription,
      businessLineCode,
      active,
      actorUserId: tenant.userId
    })

    moduleId = created.moduleId
    serviceSku = created.serviceSku
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined

    const message = error instanceof Error ? error.message : 'Unknown database error'

    if (code === 'SERVICE_PRICING_EXISTS') {
      return NextResponse.json(
        { error: `Service pricing already exists for this module. ${message}` },
        { status: 409 }
      )
    }

    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return NextResponse.json({ error: `A service already exists with the same code/SKU.` }, { status: 409 })
    }

    if (message.includes('violates foreign key')) {
      return NextResponse.json({ error: `Invalid reference in service payload: ${message}` }, { status: 400 })
    }

    return NextResponse.json({ error: `Failed to create service: ${message}` }, { status: 422 })
  }

  const detail = await getServiceByModuleId(moduleId)

  if (!detail) {
    return NextResponse.json({ error: 'Service created but could not be reloaded.' }, { status: 422 })
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'service_catalog',
    entityId: moduleId,
    entitySku: serviceSku,
    action: 'created',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      new_values: {
        moduleCode: detail.moduleCode,
        moduleName: detail.moduleName,
        serviceCategory,
        displayName,
        serviceUnit: serviceUnitRaw,
        serviceType,
        commercialModel: commercialModelRaw,
        tier: tierRaw,
        defaultDurationMonths,
        defaultDescription,
        businessLineCode,
        active
      }
    }
  })

  return withOptimisticLockHeaders(NextResponse.json(detail, { status: 201 }), detail.updatedAt)
}
