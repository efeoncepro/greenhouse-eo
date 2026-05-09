import { NextResponse } from 'next/server'

import {
  deactivateClause,
  MasterAgreementClauseValidationError,
  updateClause
} from '@/lib/commercial/master-agreement-clauses-store'
import type { MasterAgreementClauseCategory } from '@/lib/commercial/master-agreements-types'
import {
  canAdministerPricingCatalog,
  requireCommercialTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface UpdateClauseBody {
  category?: MasterAgreementClauseCategory
  title?: string
  summary?: string | null
  bodyTemplate?: string
  defaultVariables?: Record<string, unknown>
  required?: boolean
  active?: boolean
  sortOrder?: number
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ clauseId: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden editar cláusulas.' },
      { status: 403 }
    )
  }

  const { clauseId } = await params
  let body: UpdateClauseBody

  try {
    body = (await request.json()) as UpdateClauseBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  try {
    const clause = await updateClause(
      clauseId,
      {
        category: body.category,
        title: body.title,
        summary: body.summary,
        bodyTemplate: body.bodyTemplate,
        defaultVariables: body.defaultVariables,
        required: body.required,
        active: body.active,
        sortOrder: body.sortOrder,
        actorUserId: tenant.userId
      }
    )

    if (!clause) {
      return NextResponse.json({ error: 'Clause not found.' }, { status: 404 })
    }

    return NextResponse.json(clause)
  } catch (error) {
    if (error instanceof MasterAgreementClauseValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clauseId: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden desactivar cláusulas.' },
      { status: 403 }
    )
  }

  const { clauseId } = await params
  const clause = await deactivateClause(clauseId, tenant.userId)

  if (!clause) {
    return NextResponse.json({ error: 'Clause not found.' }, { status: 404 })
  }

  return NextResponse.json({ clauseId, deactivated: true })
}
