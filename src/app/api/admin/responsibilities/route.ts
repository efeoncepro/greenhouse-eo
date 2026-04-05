import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { listResponsibilities } from '@/lib/operational-responsibility/readers'
import {
  createResponsibility,
  ResponsibilityValidationError
} from '@/lib/operational-responsibility/store'

import type { ScopeType, ResponsibilityType } from '@/config/responsibility-codes'
import { SCOPE_TYPES, RESPONSIBILITY_TYPES } from '@/config/responsibility-codes'

export const dynamic = 'force-dynamic'

// GET /api/admin/responsibilities — list with optional filters
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const scopeType = searchParams.get('scopeType') as ScopeType | null
    const scopeId = searchParams.get('scopeId')
    const memberId = searchParams.get('memberId')
    const responsibilityType = searchParams.get('responsibilityType') as ResponsibilityType | null

    const items = await listResponsibilities({
      scopeType: scopeType && SCOPE_TYPES.includes(scopeType) ? scopeType : undefined,
      scopeId: scopeId || undefined,
      memberId: memberId || undefined,
      responsibilityType:
        responsibilityType && RESPONSIBILITY_TYPES.includes(responsibilityType) ? responsibilityType : undefined,
      activeOnly: searchParams.get('includeInactive') !== 'true'
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    console.error('Failed to list responsibilities:', error)

    return NextResponse.json({ error: 'Error al obtener responsabilidades.' }, { status: 500 })
  }
}

// POST /api/admin/responsibilities — create a new responsibility
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const responsibilityId = await createResponsibility({
      memberId: body.memberId,
      scopeType: body.scopeType,
      scopeId: body.scopeId,
      responsibilityType: body.responsibilityType,
      isPrimary: body.isPrimary,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo
    })

    return NextResponse.json({ responsibilityId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof ResponsibilityValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('Failed to create responsibility:', error)

    return NextResponse.json({ error: 'Error al crear responsabilidad.' }, { status: 500 })
  }
}
