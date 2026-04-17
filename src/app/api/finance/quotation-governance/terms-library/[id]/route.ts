import { NextResponse } from 'next/server'

import {
  deactivateTerm,
  updateTerm,
  TermValidationError
} from '@/lib/commercial/governance/terms-store'
import type {
  QuotationPricingModel,
  TermCategory
} from '@/lib/commercial/governance/contracts'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'

export const dynamic = 'force-dynamic'

const requireAdmin = (roleCodes: string[]) =>
  roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN) || roleCodes.includes(ROLE_CODES.FINANCE_ADMIN)

interface UpdateTermBody {
  title?: string
  bodyTemplate?: string
  category?: TermCategory
  appliesToModel?: QuotationPricingModel | null
  defaultForBl?: string[]
  required?: boolean
  sortOrder?: number
  active?: boolean
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!requireAdmin(tenant.roleCodes)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden editar términos.' },
      { status: 403 }
    )
  }

  const { id } = await params

  let body: UpdateTermBody

  try {
    body = (await request.json()) as UpdateTermBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  try {
    const updated = await updateTerm(id, body)

    if (!updated) {
      return NextResponse.json({ error: 'Term not found or no fields to update.' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof TermValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!requireAdmin(tenant.roleCodes)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden desactivar términos.' },
      { status: 403 }
    )
  }

  const { id } = await params
  const ok = await deactivateTerm(id)

  if (!ok) {
    return NextResponse.json({ error: 'Term not found.' }, { status: 404 })
  }

  return NextResponse.json({ termId: id, deactivated: true })
}
