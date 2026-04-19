import { NextResponse } from 'next/server'

import {
  getMasterAgreementDetail,
  MasterAgreementValidationError,
  updateMasterAgreement
} from '@/lib/commercial/master-agreements-store'
import {
  canAdministerPricingCatalog,
  requireFinanceTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface ReplaceClausesBody {
  clauses?: Array<{
    clauseId?: string
    bodyOverride?: string | null
    variables?: Record<string, unknown>
    included?: boolean
    sortOrder?: number
    effectiveFrom?: string | null
    effectiveTo?: string | null
    notes?: string | null
  }>
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const msa = await getMasterAgreementDetail({ tenant, msaId: id })

  if (!msa) {
    return NextResponse.json({ error: 'MSA not found.' }, { status: 404 })
  }

  return NextResponse.json({ items: msa.clauses, count: msa.clauses.length })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden editar cláusulas de un MSA.' },
      { status: 403 }
    )
  }

  const { id } = await params
  let body: ReplaceClausesBody

  try {
    body = (await request.json()) as ReplaceClausesBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!Array.isArray(body.clauses) || body.clauses.length === 0) {
    return NextResponse.json(
      { error: 'Debes enviar al menos una cláusula para el MSA.' },
      { status: 400 }
    )
  }

  try {
    const msa = await updateMasterAgreement({
      tenant,
      msaId: id,
      actorUserId: tenant.userId,
      input: {
        clauses: body.clauses.flatMap(item =>
          item.clauseId
            ? [
                {
                  clauseId: item.clauseId,
                  bodyOverride: item.bodyOverride ?? null,
                  variables: item.variables ?? {},
                  included: item.included ?? true,
                  sortOrder: item.sortOrder,
                  effectiveFrom: item.effectiveFrom ?? null,
                  effectiveTo: item.effectiveTo ?? null,
                  notes: item.notes ?? null
                }
              ]
            : []
        )
      }
    })

    if (!msa) {
      return NextResponse.json({ error: 'MSA not found.' }, { status: 404 })
    }

    return NextResponse.json(msa)
  } catch (error) {
    if (error instanceof MasterAgreementValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
