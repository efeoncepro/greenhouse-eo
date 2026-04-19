import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { recordPricingCatalogAudit } from '@/lib/commercial/pricing-catalog-audit-store'
import { listCompatibleEmploymentTypes } from '@/lib/commercial/sellable-roles-store'
import { query, withTransaction } from '@/lib/db'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { requireIfMatch, withOptimisticLockHeaders } from '@/lib/tenant/optimistic-locking'

export const dynamic = 'force-dynamic'

interface RoleSkuRow extends Record<string, unknown> {
  role_sku: string
  updated_at: string | Date
}

interface EmploymentTypeCodeRow extends Record<string, unknown> {
  employment_type_code: string
}

interface CompatibilityInputItem {
  employmentTypeCode?: unknown
  allowed?: unknown
  isDefault?: unknown
  notes?: unknown
}

interface PutCompatibilityBody {
  compatibility?: unknown
}

interface NormalizedCompatibilityRow {
  employmentTypeCode: string
  allowed: boolean
  isDefault: boolean
  notes: string | null
}

const resolveActorName = async (fallback: string): Promise<string> => {
  const session = await getServerAuthSession()
  const user = session?.user

  return user?.name || user?.email || fallback || 'unknown'
}

const assertString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`)
  }

  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`${fieldName} is required.`)
  }

  return trimmed
}

const assertBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean.`)
  }

  return value
}

const normalizeCompatibilityRows = (raw: unknown): NormalizedCompatibilityRow[] => {
  if (!Array.isArray(raw)) {
    throw new Error('compatibility must be an array.')
  }

  const rows: NormalizedCompatibilityRow[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Each compatibility entry must be an object.')
    }

    const item = entry as CompatibilityInputItem
    const employmentTypeCode = assertString(item.employmentTypeCode, 'employmentTypeCode')
    const allowed = assertBoolean(item.allowed, 'allowed')
    const isDefault = assertBoolean(item.isDefault, 'isDefault')
    const notes = typeof item.notes === 'string' ? item.notes.trim() || null : null

    rows.push({ employmentTypeCode, allowed, isDefault, notes })
  }

  return rows
}

const getRoleLockRow = async (roleId: string) => {
  const rows = await query<RoleSkuRow>(
    `SELECT role_sku, updated_at
       FROM greenhouse_commercial.sellable_roles
       WHERE role_id = $1
       LIMIT 1`,
    [roleId]
  )

  return rows[0] ?? null
}

const touchRoleUpdatedAt = async (roleId: string) => {
  const rows = await query<{ updated_at: string | Date }>(
    `UPDATE greenhouse_commercial.sellable_roles
        SET updated_at = CURRENT_TIMESTAMP
      WHERE role_id = $1
      RETURNING updated_at`,
    [roleId]
  )

  return rows[0]?.updated_at ?? null
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
  const role = await getRoleLockRow(id)

  if (!role) {
    return NextResponse.json({ error: 'Sellable role not found.' }, { status: 404 })
  }

  const items = await listCompatibleEmploymentTypes(id)

  return withOptimisticLockHeaders(NextResponse.json({ items, updatedAt: role.updated_at }), role.updated_at)
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

  let body: PutCompatibilityBody

  try {
    body = (await request.json()) as PutCompatibilityBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  let compatibility: NormalizedCompatibilityRow[]

  try {
    compatibility = normalizeCompatibilityRows(body.compatibility)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid compatibility payload.'

    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Duplicate employment_type_code is not allowed — PK violation otherwise
  const seenCodes = new Set<string>()

  for (const row of compatibility) {
    if (seenCodes.has(row.employmentTypeCode)) {
      return NextResponse.json(
        { error: `No repitas la misma modalidad (${row.employmentTypeCode}) en la lista.` },
        { status: 422 }
      )
    }

    seenCodes.add(row.employmentTypeCode)
  }

  // Validation: exactly one isDefault=true when list is non-empty (zero if empty)
  const defaultRows = compatibility.filter(row => row.isDefault)

  if (compatibility.length > 0 && defaultRows.length !== 1) {
    return NextResponse.json(
      {
        error: 'Debe haber exactamente una modalidad marcada como default cuando la lista no está vacía.'
      },
      { status: 422 }
    )
  }

  // Default row must also be allowed=true
  if (defaultRows.length === 1 && !defaultRows[0].allowed) {
    return NextResponse.json(
      { error: 'La modalidad marcada como default debe estar permitida (allowed=true).' },
      { status: 422 }
    )
  }

  // Validate role exists + fetch role_sku
  const role = await getRoleLockRow(id)

  if (!role) {
    return NextResponse.json({ error: 'Sellable role not found.' }, { status: 404 })
  }

  const optimisticLock = requireIfMatch(request, role.updated_at)

  if (!optimisticLock.ok) {
    return optimisticLock.response
  }

  const roleSku = role.role_sku

  // Validate all employment_type_codes exist and are active
  if (compatibility.length > 0) {
    const codes = compatibility.map(row => row.employmentTypeCode)
    const placeholders = codes.map((_, idx) => `$${idx + 1}`).join(', ')

    const existingRows = await query<EmploymentTypeCodeRow>(
      `SELECT employment_type_code
         FROM greenhouse_commercial.employment_types
         WHERE employment_type_code IN (${placeholders})
           AND active = TRUE`,
      codes
    )

    const existingCodes = new Set(existingRows.map(row => row.employment_type_code))
    const missing = codes.filter(code => !existingCodes.has(code))

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Modalidades inexistentes o inactivas: ${missing.join(', ')}.`
        },
        { status: 422 }
      )
    }
  }

  // Atomic replace: DELETE all rows for role_id, then INSERT new batch
  try {
    await withTransaction(async client => {
      await client.query(
        `DELETE FROM greenhouse_commercial.role_employment_compatibility
           WHERE role_id = $1`,
        [id]
      )

      for (const row of compatibility) {
        await client.query(
          `INSERT INTO greenhouse_commercial.role_employment_compatibility (
             role_id, employment_type_code, is_default, allowed, notes
           ) VALUES ($1, $2, $3, $4, $5)`,
          [id, row.employmentTypeCode, row.isDefault, row.allowed, row.notes]
        )
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { error: `Failed to update compatibility: ${message}` },
      { status: 422 }
    )
  }

  // Audit
  const actorName = await resolveActorName(tenant.clientName || tenant.userId)

  await recordPricingCatalogAudit({
    entityType: 'sellable_role',
    entityId: id,
    entitySku: roleSku,
    action: 'updated',
    actorUserId: tenant.userId,
    actorName,
    changeSummary: {
      compatibility_updated: true,
      employment_types_allowed: compatibility.filter(row => row.allowed).map(row => row.employmentTypeCode),
      default_employment_type: compatibility.find(row => row.isDefault)?.employmentTypeCode ?? null,
      total_entries: compatibility.length
    }
  })

  // Return fresh rows
  const items = await listCompatibleEmploymentTypes(id)

  const updatedAt = await touchRoleUpdatedAt(id)

  return withOptimisticLockHeaders(NextResponse.json({ items }), updatedAt, {
    missingIfMatch: optimisticLock.missingIfMatch
  })
}
