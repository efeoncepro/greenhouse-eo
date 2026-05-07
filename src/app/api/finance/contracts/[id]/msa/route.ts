import { NextResponse } from 'next/server'

import { getFinanceContractDetail } from '@/lib/commercial/contracts-store'
import {
  assignMasterAgreementToContract,
  getMasterAgreementDetail,
  MasterAgreementValidationError,
  resolveContractClauses
} from '@/lib/commercial/master-agreements-store'
import {
  canAdministerPricingCatalog,
  requireCommercialTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface AssignMasterAgreementBody {
  msaId?: string | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const contract = await getFinanceContractDetail({ tenant, contractId: id })

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
  }

  const clauses = await resolveContractClauses({ tenant, contractId: id })

  const msa = contract.msaId
    ? await getMasterAgreementDetail({ tenant, msaId: contract.msaId })
    : null

  return NextResponse.json({ msa, clauses, count: clauses.length })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden vincular un MSA a un contrato.' },
      { status: 403 }
    )
  }

  const { id } = await params
  let body: AssignMasterAgreementBody

  try {
    body = (await request.json()) as AssignMasterAgreementBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  try {
    const result = await assignMasterAgreementToContract({
      tenant,
      contractId: id,
      msaId: body.msaId ?? null,
      actorUserId: tenant.userId
    })

    const clauses = await resolveContractClauses({ tenant, contractId: id })

    return NextResponse.json({
      contractId: id,
      msa: result.msa,
      clauses,
      count: clauses.length
    })
  } catch (error) {
    if (error instanceof MasterAgreementValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
