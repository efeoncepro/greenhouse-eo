import { NextResponse } from 'next/server'

import type { SellableRoleEntry } from '@/lib/commercial/sellable-roles-store'
import {
  getBlockingConstraintIssues,
  validateSellableRole
} from '@/lib/commercial/pricing-catalog-constraints'
import { recordPricingCatalogAudit, type PricingCatalogAction } from '@/lib/commercial/pricing-catalog-audit-store'
import {
  publishSellableRoleDeactivated,
  publishSellableRoleReactivated,
  publishSellableRoleUpdated
} from '@/lib/commercial/sellable-role-events'
import { query } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { requireIfMatch, withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

const ALLOWED_CATEGORIES = ['creativo', 'pr', 'performance', 'consultoria', 'tech'] as const
const ALLOWED_TIERS = ['1', '2', '3', '4'] as const

interface SellableRoleRow extends Record<string, unknown> {
  role_id: string
  role_sku: string
  role_code: string
  role_label_es: string
  role_label_en: string | null
  category: string
  tier: string
  tier_label: string
  can_sell_as_staff: boolean
  can_sell_as_service_component: boolean
  active: boolean
  notes: string | null
  created_at: string | Date
  updated_at: string | Date
}

const toTimestamp = (value: string | Date | null): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return value
}

const mapRow = (row: SellableRoleRow): SellableRoleEntry => ({
  roleId: row.role_id,
  roleSku: row.role_sku,
  roleCode: row.role_code,
  roleLabelEs: row.role_label_es,
  roleLabelEn: row.role_label_en,
  category: row.category,
  tier: row.tier,
  tierLabel: row.tier_label,
  canSellAsStaff: row.can_sell_as_staff,
  canSellAsServiceComponent: row.can_sell_as_service_component,
  active: row.active,
  notes: row.notes,
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at)
})

const resolveActorName = async (fallback: string): Promise<string> => {
  const session = await getServerAuthSession()
  const user = session?.user

  return user?.name || user?.email || fallback || 'unknown'
}

interface PatchRoleBody {
  active?: unknown
  roleLabelEs?: unknown
  roleLabelEn?: unknown
  category?: unknown
  tier?: unknown
  tierLabel?: unknown
  notes?: unknown
}

const publishRoleChangeEvent = async (
  previous: SellableRoleRow,
  updated: SellableRoleRow,
  fieldsChanged: string[]
) => {
  if (previous.active !== updated.active) {
    if (updated.active) {
      await publishSellableRoleReactivated({
        roleId: updated.role_id,
        roleSku: updated.role_sku,
        reactivatedAt: toTimestamp(updated.updated_at)
      })
    } else {
      await publishSellableRoleDeactivated({
        roleId: updated.role_id,
        roleSku: updated.role_sku,
        deactivatedAt: toTimestamp(updated.updated_at)
      })
    }

    return
  }

  if (fieldsChanged.length === 0) {
    return
  }

  await publishSellableRoleUpdated({
    roleId: updated.role_id,
    roleSku: updated.role_sku,
    roleCode: updated.role_code,
    roleLabelEs: updated.role_label_es,
    category: updated.category,
    tier: updated.tier,
    active: updated.active
  })
}

const getRoleById = async (roleId: string): Promise<SellableRoleRow | null> => {
  const rows = await query<SellableRoleRow>(
    `SELECT role_id, role_sku, role_code, role_label_es, role_label_en, category, tier,
            tier_label, can_sell_as_staff, can_sell_as_service_component, active, notes,
            created_at, updated_at
       FROM greenhouse_commercial.sellable_roles
       WHERE role_id = $1
       LIMIT 1`,
    [roleId]
  )

  return rows[0] ?? null
}

const applyUpdate = async (
  roleId: string,
  updates: {
    active?: boolean
    roleLabelEs?: string
    roleLabelEn?: string | null
    category?: string
    tier?: string
    tierLabel?: string
    notes?: string | null
  }
): Promise<SellableRoleRow | null> => {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 0

  if (updates.active !== undefined) {
    idx += 1
    fields.push(`active = $${idx}`)
    values.push(updates.active)
  }

  if (updates.roleLabelEs !== undefined) {
    idx += 1
    fields.push(`role_label_es = $${idx}`)
    values.push(updates.roleLabelEs)
  }

  if (updates.roleLabelEn !== undefined) {
    idx += 1
    fields.push(`role_label_en = $${idx}`)
    values.push(updates.roleLabelEn)
  }

  if (updates.category !== undefined) {
    idx += 1
    fields.push(`category = $${idx}`)
    values.push(updates.category)
  }

  if (updates.tier !== undefined) {
    idx += 1
    fields.push(`tier = $${idx}`)
    values.push(updates.tier)
  }

  if (updates.tierLabel !== undefined) {
    idx += 1
    fields.push(`tier_label = $${idx}`)
    values.push(updates.tierLabel)
  }

  if (updates.notes !== undefined) {
    idx += 1
    fields.push(`notes = $${idx}`)
    values.push(updates.notes)
  }

  if (fields.length === 0) {
    return null
  }

  fields.push('updated_at = CURRENT_TIMESTAMP')
  idx += 1
  values.push(roleId)

  const rows = await query<SellableRoleRow>(
    `UPDATE greenhouse_commercial.sellable_roles
       SET ${fields.join(', ')}
     WHERE role_id = $${idx}
     RETURNING role_id, role_sku, role_code, role_label_es, role_label_en, category, tier,
               tier_label, can_sell_as_staff, can_sell_as_service_component, active, notes,
               created_at, updated_at`,
    values
  )

  return rows[0] ?? null
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

  let body: PatchRoleBody

  try {
    body = (await request.json()) as PatchRoleBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const previous = await getRoleById(id)

  if (!previous) {
    return NextResponse.json({ error: 'Sellable role not found.' }, { status: 404 })
  }

  const optimisticLock = requireIfMatch(request, previous.updated_at)

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  const updates: Parameters<typeof applyUpdate>[1] = {}
  const newValues: Record<string, unknown> = {}
  const fieldsChanged: string[] = []
  const previousValues: Record<string, unknown> = {}

  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'active must be a boolean.' }, { status: 400 })
    }

    updates.active = body.active
    newValues.active = body.active
    previousValues.active = previous.active

    if (previous.active !== body.active) {
      fieldsChanged.push('active')
    }
  }

  if (body.roleLabelEs !== undefined) {
    if (typeof body.roleLabelEs !== 'string' || !body.roleLabelEs.trim()) {
      return NextResponse.json({ error: 'roleLabelEs must be a non-empty string.' }, { status: 400 })
    }

    updates.roleLabelEs = body.roleLabelEs.trim()
    newValues.roleLabelEs = updates.roleLabelEs
    previousValues.roleLabelEs = previous.role_label_es

    if (previous.role_label_es !== updates.roleLabelEs) fieldsChanged.push('roleLabelEs')
  }

  if (body.roleLabelEn !== undefined) {
    const value = typeof body.roleLabelEn === 'string' ? body.roleLabelEn.trim() || null : null

    updates.roleLabelEn = value
    newValues.roleLabelEn = value
    previousValues.roleLabelEn = previous.role_label_en

    if ((previous.role_label_en ?? null) !== value) fieldsChanged.push('roleLabelEn')
  }

  if (body.category !== undefined) {
    if (
      typeof body.category !== 'string' ||
      !ALLOWED_CATEGORIES.includes(body.category as (typeof ALLOWED_CATEGORIES)[number])
    ) {
      return NextResponse.json(
        { error: `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    updates.category = body.category
    newValues.category = body.category
    previousValues.category = previous.category

    if (previous.category !== body.category) fieldsChanged.push('category')
  }

  if (body.tier !== undefined) {
    if (
      typeof body.tier !== 'string' ||
      !ALLOWED_TIERS.includes(body.tier as (typeof ALLOWED_TIERS)[number])
    ) {
      return NextResponse.json(
        { error: `tier must be one of: ${ALLOWED_TIERS.join(', ')}` },
        { status: 400 }
      )
    }

    updates.tier = body.tier
    newValues.tier = body.tier
    previousValues.tier = previous.tier

    if (previous.tier !== body.tier) fieldsChanged.push('tier')
  }

  if (body.tierLabel !== undefined) {
    if (typeof body.tierLabel !== 'string' || !body.tierLabel.trim()) {
      return NextResponse.json({ error: 'tierLabel must be a non-empty string.' }, { status: 400 })
    }

    updates.tierLabel = body.tierLabel.trim()
    newValues.tierLabel = updates.tierLabel
    previousValues.tierLabel = previous.tier_label

    if (previous.tier_label !== updates.tierLabel) fieldsChanged.push('tierLabel')
  }

  if (body.notes !== undefined) {
    const value = typeof body.notes === 'string' ? body.notes.trim() || null : null

    updates.notes = value
    newValues.notes = value
    previousValues.notes = previous.notes

    if ((previous.notes ?? null) !== value) fieldsChanged.push('notes')
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const issues = validateSellableRole({
    roleLabelEs: updates.roleLabelEs ?? previous.role_label_es,
    roleLabelEn: updates.roleLabelEn ?? previous.role_label_en,
    category: updates.category ?? previous.category,
    tier: updates.tier ?? previous.tier,
    tierLabel: updates.tierLabel ?? previous.tier_label
  })

  if (getBlockingConstraintIssues(issues).length > 0) {
    return NextResponse.json({ issues }, { status: 422 })
  }

  const updated = await applyUpdate(id, updates)

  if (!updated) {
    return NextResponse.json({ error: 'Failed to update sellable role.' }, { status: 422 })
  }

  let action: PricingCatalogAction = 'updated'

  if (updates.active !== undefined && previous.active !== updates.active) {
    action = updates.active ? 'reactivated' : 'deactivated'
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'sellable_role',
    entityId: updated.role_id,
    entitySku: updated.role_sku,
    action,
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      previous_values: previousValues,
      new_values: newValues,
      fields_changed: fieldsChanged
    }
  })

  await publishRoleChangeEvent(previous, updated, fieldsChanged)

  return withOptimisticLockHeaders(
    NextResponse.json(mapRow(updated)),
    updated.updated_at,
    { missingIfMatch: optimisticLock.missingIfMatch }
  )
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

  const previous = await getRoleById(id)

  if (!previous) {
    return NextResponse.json({ error: 'Sellable role not found.' }, { status: 404 })
  }

  const optimisticLock = requireIfMatch(request, previous.updated_at)

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  if (!previous.active) {
    // Already deactivated — return 204 without audit (no-op).
    return withOptimisticLockHeaders(new NextResponse(null, { status: 204 }), previous.updated_at, {
      missingIfMatch: optimisticLock.missingIfMatch
    })
  }

  const updated = await applyUpdate(id, { active: false })

  if (!updated) {
    return NextResponse.json({ error: 'Failed to deactivate sellable role.' }, { status: 422 })
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'sellable_role',
    entityId: updated.role_id,
    entitySku: updated.role_sku,
    action: 'deactivated',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      previous_values: { active: true },
      new_values: { active: false },
      fields_changed: ['active']
    }
  })

  await publishSellableRoleDeactivated({
    roleId: updated.role_id,
    roleSku: updated.role_sku,
    deactivatedAt: toTimestamp(updated.updated_at)
  })

  return withOptimisticLockHeaders(new NextResponse(null, { status: 204 }), updated.updated_at, {
    missingIfMatch: optimisticLock.missingIfMatch
  })
}
