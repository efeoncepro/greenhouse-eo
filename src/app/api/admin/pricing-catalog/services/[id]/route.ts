import { NextResponse } from 'next/server'

import {
  getServiceByModuleId,
  softDeleteService,
  updateService,
  type ServiceCommercialModel,
  type ServiceTier,
  type ServiceUnit
} from '@/lib/commercial/service-catalog-store'
import { validateServiceCatalog } from '@/lib/commercial/service-catalog-constraints'
import { getBlockingConstraintIssues } from '@/lib/commercial/pricing-catalog-constraints'
import {
  recordPricingCatalogAudit,
  type PricingCatalogAction
} from '@/lib/commercial/pricing-catalog-audit-store'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { requireIfMatch, withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

const SERVICE_UNITS = ['project', 'monthly'] as const
const COMMERCIAL_MODELS = ['on_going', 'on_demand', 'hybrid', 'license_consulting'] as const
const TIERS = ['1', '2', '3', '4'] as const

const resolveActorName = async (fallback: string): Promise<string> => {
  const session = await getServerAuthSession()
  const user = session?.user

  return user?.name || user?.email || fallback || 'unknown'
}

interface PatchServiceBody {
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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params

  const detail = await getServiceByModuleId(id)

  if (!detail) {
    return NextResponse.json({ error: 'Service catalog entry not found.' }, { status: 404 })
  }

  return withOptimisticLockHeaders(NextResponse.json(detail), detail.updatedAt)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params

  let body: PatchServiceBody

  try {
    body = (await request.json()) as PatchServiceBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const previous = await getServiceByModuleId(id)

  if (!previous) {
    return NextResponse.json({ error: 'Service catalog entry not found.' }, { status: 404 })
  }

  const optimisticLock = requireIfMatch(request, previous.updatedAt)

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  const updates: {
    moduleName?: string | null
    serviceCategory?: string | null
    displayName?: string | null
    serviceUnit?: ServiceUnit
    serviceType?: string | null
    commercialModel?: ServiceCommercialModel
    tier?: ServiceTier
    defaultDurationMonths?: number | null
    defaultDescription?: string | null
    businessLineCode?: string | null
    active?: boolean
  } = {}

  const newValues: Record<string, unknown> = {}
  const previousValues: Record<string, unknown> = {}
  const fieldsChanged: string[] = []

  if (body.moduleName !== undefined) {
    if (typeof body.moduleName !== 'string' || !body.moduleName.trim()) {
      return NextResponse.json({ error: 'moduleName must be a non-empty string.' }, { status: 400 })
    }

    const value = body.moduleName.trim()

    updates.moduleName = value
    newValues.moduleName = value
    previousValues.moduleName = previous.moduleName

    if (previous.moduleName !== value) fieldsChanged.push('moduleName')
  }

  if (body.serviceCategory !== undefined) {
    const value = pickOptionalString(body.serviceCategory)

    updates.serviceCategory = value
    newValues.serviceCategory = value
    previousValues.serviceCategory = previous.serviceCategory

    if ((previous.serviceCategory ?? null) !== value) fieldsChanged.push('serviceCategory')
  }

  if (body.displayName !== undefined) {
    const value = pickOptionalString(body.displayName)

    updates.displayName = value
    newValues.displayName = value
    previousValues.displayName = previous.displayName

    if ((previous.displayName ?? null) !== value) fieldsChanged.push('displayName')
  }

  if (body.serviceUnit !== undefined) {
    if (
      typeof body.serviceUnit !== 'string' ||
      !SERVICE_UNITS.includes(body.serviceUnit as (typeof SERVICE_UNITS)[number])
    ) {
      return NextResponse.json(
        { error: `serviceUnit must be one of: ${SERVICE_UNITS.join(', ')}` },
        { status: 400 }
      )
    }

    updates.serviceUnit = body.serviceUnit as ServiceUnit
    newValues.serviceUnit = body.serviceUnit
    previousValues.serviceUnit = previous.serviceUnit

    if (previous.serviceUnit !== body.serviceUnit) fieldsChanged.push('serviceUnit')
  }

  if (body.serviceType !== undefined) {
    const value = pickOptionalString(body.serviceType)

    updates.serviceType = value
    newValues.serviceType = value
    previousValues.serviceType = previous.serviceType

    if ((previous.serviceType ?? null) !== value) fieldsChanged.push('serviceType')
  }

  if (body.commercialModel !== undefined) {
    if (
      typeof body.commercialModel !== 'string' ||
      !COMMERCIAL_MODELS.includes(body.commercialModel as (typeof COMMERCIAL_MODELS)[number])
    ) {
      return NextResponse.json(
        { error: `commercialModel must be one of: ${COMMERCIAL_MODELS.join(', ')}` },
        { status: 400 }
      )
    }

    updates.commercialModel = body.commercialModel as ServiceCommercialModel
    newValues.commercialModel = body.commercialModel
    previousValues.commercialModel = previous.commercialModel

    if (previous.commercialModel !== body.commercialModel) fieldsChanged.push('commercialModel')
  }

  if (body.tier !== undefined) {
    if (typeof body.tier !== 'string' || !TIERS.includes(body.tier as (typeof TIERS)[number])) {
      return NextResponse.json(
        { error: `tier must be one of: ${TIERS.join(', ')}` },
        { status: 400 }
      )
    }

    updates.tier = body.tier as ServiceTier
    newValues.tier = body.tier
    previousValues.tier = previous.tier

    if (previous.tier !== body.tier) fieldsChanged.push('tier')
  }

  if (body.defaultDurationMonths !== undefined) {
    const value = pickOptionalNumber(body.defaultDurationMonths)

    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      return NextResponse.json({ error: 'defaultDurationMonths must be >= 0.' }, { status: 400 })
    }

    updates.defaultDurationMonths = value
    newValues.defaultDurationMonths = value
    previousValues.defaultDurationMonths = previous.defaultDurationMonths

    if ((previous.defaultDurationMonths ?? null) !== value) fieldsChanged.push('defaultDurationMonths')
  }

  if (body.defaultDescription !== undefined) {
    const value = pickOptionalString(body.defaultDescription)

    updates.defaultDescription = value
    newValues.defaultDescription = value
    previousValues.defaultDescription = previous.defaultDescription

    if ((previous.defaultDescription ?? null) !== value) fieldsChanged.push('defaultDescription')
  }

  if (body.businessLineCode !== undefined) {
    const value = pickOptionalString(body.businessLineCode)

    updates.businessLineCode = value
    newValues.businessLineCode = value
    previousValues.businessLineCode = previous.businessLineCode

    if ((previous.businessLineCode ?? null) !== value) fieldsChanged.push('businessLineCode')
  }

  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'active must be a boolean.' }, { status: 400 })
    }

    updates.active = body.active
    newValues.active = body.active
    previousValues.active = previous.active

    if (previous.active !== body.active) fieldsChanged.push('active')
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const issues = validateServiceCatalog({
    moduleName: updates.moduleName ?? previous.moduleName,
    serviceUnit: updates.serviceUnit ?? previous.serviceUnit,
    commercialModel: updates.commercialModel ?? previous.commercialModel,
    tier: updates.tier ?? previous.tier,
    defaultDurationMonths:
      updates.defaultDurationMonths !== undefined
        ? updates.defaultDurationMonths
        : previous.defaultDurationMonths,
    serviceCategory:
      updates.serviceCategory !== undefined ? updates.serviceCategory : previous.serviceCategory,
    businessLineCode:
      updates.businessLineCode !== undefined ? updates.businessLineCode : previous.businessLineCode
  })

  if (getBlockingConstraintIssues(issues).length > 0) {
    return NextResponse.json({ issues }, { status: 422 })
  }

  try {
    await updateService(id, { ...updates, actorUserId: tenant.userId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    if (message.includes('violates foreign key')) {
      return NextResponse.json({ error: `Invalid reference in service payload: ${message}` }, { status: 400 })
    }

    return NextResponse.json({ error: `Failed to update service: ${message}` }, { status: 422 })
  }

  const updated = await getServiceByModuleId(id)

  if (!updated) {
    return NextResponse.json({ error: 'Failed to reload service after update.' }, { status: 422 })
  }

  let action: PricingCatalogAction = 'updated'

  if (updates.active !== undefined && previous.active !== updated.active) {
    action = updated.active ? 'reactivated' : 'deactivated'
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'service_catalog',
    entityId: updated.moduleId,
    entitySku: updated.serviceSku,
    action,
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      previous_values: previousValues,
      new_values: newValues,
      fields_changed: fieldsChanged
    }
  })

  return withOptimisticLockHeaders(NextResponse.json(updated), updated.updatedAt, {
    missingIfMatch: optimisticLock.missingIfMatch
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params

  const previous = await getServiceByModuleId(id)

  if (!previous) {
    return NextResponse.json({ error: 'Service catalog entry not found.' }, { status: 404 })
  }

  const optimisticLock = requireIfMatch(request, previous.updatedAt)

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  if (!previous.active) {
    return withOptimisticLockHeaders(new NextResponse(null, { status: 204 }), previous.updatedAt, {
      missingIfMatch: optimisticLock.missingIfMatch
    })
  }

  try {
    await softDeleteService(id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    return NextResponse.json({ error: `Failed to deactivate service: ${message}` }, { status: 422 })
  }

  const updated = await getServiceByModuleId(id)

  if (!updated) {
    return NextResponse.json({ error: 'Failed to reload service after soft delete.' }, { status: 422 })
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'service_catalog',
    entityId: updated.moduleId,
    entitySku: updated.serviceSku,
    action: 'deleted',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      previous_values: { active: true },
      new_values: { active: false },
      fields_changed: ['active']
    }
  })

  return withOptimisticLockHeaders(new NextResponse(null, { status: 204 }), updated.updatedAt, {
    missingIfMatch: optimisticLock.missingIfMatch
  })
}
