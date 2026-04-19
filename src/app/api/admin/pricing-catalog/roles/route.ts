import { NextResponse } from 'next/server'

import { listSellableRoles, type SellableRoleEntry } from '@/lib/commercial/sellable-roles-store'
import {
  getBlockingConstraintIssues,
  validateSellableRole
} from '@/lib/commercial/pricing-catalog-constraints'
import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'
import { query } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

const ALLOWED_CATEGORIES = ['creativo', 'pr', 'performance', 'consultoria', 'tech'] as const
const ALLOWED_TIERS = ['1', '2', '3', '4'] as const

const maxUpdatedAt = (values: Array<string | null | undefined>) =>
  values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

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

interface CreateRoleBody {
  roleLabelEs?: unknown
  roleLabelEn?: unknown
  category?: unknown
  tier?: unknown
  tierLabel?: unknown
  canSellAsStaff?: unknown
  canSellAsServiceComponent?: unknown
  notes?: unknown
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

  const items = await listSellableRoles({ activeOnly: false })

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

  let body: CreateRoleBody

  try {
    body = (await request.json()) as CreateRoleBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const roleLabelEs = typeof body.roleLabelEs === 'string' ? body.roleLabelEs.trim() : ''
  const roleLabelEn = typeof body.roleLabelEn === 'string' ? body.roleLabelEn.trim() || null : null
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const tier = typeof body.tier === 'string' ? body.tier.trim() : ''
  const tierLabel = typeof body.tierLabel === 'string' ? body.tierLabel.trim() : ''
  const canSellAsStaff = body.canSellAsStaff === true
  const canSellAsServiceComponent = body.canSellAsServiceComponent !== false
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  if (!roleLabelEs) {
    return NextResponse.json({ error: 'roleLabelEs is required.' }, { status: 400 })
  }

  if (!ALLOWED_CATEGORIES.includes(category as (typeof ALLOWED_CATEGORIES)[number])) {
    return NextResponse.json(
      { error: `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` },
      { status: 400 }
    )
  }

  if (!ALLOWED_TIERS.includes(tier as (typeof ALLOWED_TIERS)[number])) {
    return NextResponse.json(
      { error: `tier must be one of: ${ALLOWED_TIERS.join(', ')}` },
      { status: 400 }
    )
  }

  if (!tierLabel) {
    return NextResponse.json({ error: 'tierLabel is required.' }, { status: 400 })
  }

  const issues = validateSellableRole({
    roleLabelEs,
    roleLabelEn,
    category,
    tier,
    tierLabel
  })

  if (getBlockingConstraintIssues(issues).length > 0) {
    return NextResponse.json({ issues }, { status: 422 })
  }

  const roleCode = slugify(roleLabelEs)

  if (!roleCode) {
    return NextResponse.json({ error: 'roleLabelEs could not be slugified to a role_code.' }, { status: 400 })
  }

  let inserted: SellableRoleRow

  try {
    const rows = await query<SellableRoleRow>(
      `INSERT INTO greenhouse_commercial.sellable_roles (
         role_code, role_label_es, role_label_en, category, tier, tier_label,
         can_sell_as_staff, can_sell_as_service_component, active, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
       RETURNING role_id, role_sku, role_code, role_label_es, role_label_en, category, tier,
                 tier_label, can_sell_as_staff, can_sell_as_service_component, active, notes,
                 created_at, updated_at`,
      [roleCode, roleLabelEs, roleLabelEn, category, tier, tierLabel, canSellAsStaff, canSellAsServiceComponent, notes]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Failed to insert sellable role.' }, { status: 422 })
    }

    inserted = rows[0]
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return NextResponse.json({ error: `A sellable role already exists with role_code '${roleCode}'.` }, { status: 409 })
    }

    return NextResponse.json({ error: `Failed to create sellable role: ${message}` }, { status: 422 })
  }

  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'sellable_role',
    entityId: inserted.role_id,
    entitySku: inserted.role_sku,
    action: 'created',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      new_values: {
        roleLabelEs,
        roleLabelEn,
        category,
        tier,
        tierLabel,
        canSellAsStaff,
        canSellAsServiceComponent,
        notes
      }
    }
  })

  return withOptimisticLockHeaders(NextResponse.json(mapRow(inserted), { status: 201 }), inserted.updated_at)
}
