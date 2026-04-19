import { NextResponse } from 'next/server'

import {
  getServiceByModuleId,
  replaceRoleRecipe,
  replaceToolRecipe,
  type ServiceRoleRecipeInput,
  type ServiceToolRecipeInput
} from '@/lib/commercial/service-catalog-store'
import {
  validateServiceRoleRecipeLine,
  validateServiceToolRecipeLine
} from '@/lib/commercial/service-catalog-constraints'
import {
  getBlockingConstraintIssues,
  type ConstraintIssue
} from '@/lib/commercial/pricing-catalog-constraints'
import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { requireIfMatch, withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

const resolveActorName = async (fallback: string): Promise<string> => {
  const session = await getServerAuthSession()
  const user = session?.user

  return user?.name || user?.email || fallback || 'unknown'
}

interface RoleRecipeLinePayload {
  roleId?: unknown
  hoursPerPeriod?: unknown
  quantity?: unknown
  isOptional?: unknown
  notes?: unknown
}

interface ToolRecipeLinePayload {
  toolId?: unknown
  toolSku?: unknown
  quantity?: unknown
  isOptional?: unknown
  passThrough?: unknown
  notes?: unknown
}

interface PutRecipeBody {
  roleRecipe?: unknown
  toolRecipe?: unknown
}

const pickOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const pickQuantity = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 1

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 1
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  let body: PutRecipeBody

  try {
    body = (await request.json()) as PutRecipeBody
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

  const roleRecipeRaw = Array.isArray(body.roleRecipe) ? (body.roleRecipe as RoleRecipeLinePayload[]) : []
  const toolRecipeRaw = Array.isArray(body.toolRecipe) ? (body.toolRecipe as ToolRecipeLinePayload[]) : []

  if (!Array.isArray(body.roleRecipe) && body.roleRecipe !== undefined) {
    return NextResponse.json({ error: 'roleRecipe must be an array.' }, { status: 400 })
  }

  if (!Array.isArray(body.toolRecipe) && body.toolRecipe !== undefined) {
    return NextResponse.json({ error: 'toolRecipe must be an array.' }, { status: 400 })
  }

  const issues: ConstraintIssue[] = []

  roleRecipeRaw.forEach((line, index) => {
    issues.push(...validateServiceRoleRecipeLine(line, index))
  })

  toolRecipeRaw.forEach((line, index) => {
    issues.push(...validateServiceToolRecipeLine(line, index))
  })

  if (getBlockingConstraintIssues(issues).length > 0) {
    return NextResponse.json({ issues }, { status: 422 })
  }

  const roleRecipe: ServiceRoleRecipeInput[] = roleRecipeRaw.map(line => ({
    roleId: String(line.roleId),
    hoursPerPeriod: Number(line.hoursPerPeriod),
    quantity: pickQuantity(line.quantity),
    isOptional: line.isOptional === true,
    notes: pickOptionalString(line.notes)
  }))

  const toolRecipe: ServiceToolRecipeInput[] = toolRecipeRaw.map(line => ({
    toolId: String(line.toolId),
    toolSku: String(line.toolSku),
    quantity: pickQuantity(line.quantity),
    isOptional: line.isOptional === true,
    passThrough: line.passThrough === true,
    notes: pickOptionalString(line.notes)
  }))

  try {
    await replaceRoleRecipe(id, roleRecipe)
    await replaceToolRecipe(id, toolRecipe)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    if (message.includes('violates foreign key')) {
      return NextResponse.json(
        { error: `Invalid reference in recipe payload: ${message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: `Failed to replace service recipe: ${message}` }, { status: 422 })
  }

  const updated = await getServiceByModuleId(id)

  if (!updated) {
    return NextResponse.json({ error: 'Failed to reload service after recipe update.' }, { status: 422 })
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'service_catalog',
    entityId: updated.moduleId,
    entitySku: updated.serviceSku,
    action: 'recipe_updated',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      previous_values: {
        roleRecipe: previous.roleRecipe,
        toolRecipe: previous.toolRecipe
      },
      new_values: {
        roleRecipe: updated.roleRecipe,
        toolRecipe: updated.toolRecipe
      },
      fields_changed: ['roleRecipe', 'toolRecipe']
    }
  })

  return withOptimisticLockHeaders(NextResponse.json(updated), updated.updatedAt, {
    missingIfMatch: optimisticLock.missingIfMatch
  })
}
