import { NextResponse } from 'next/server'

import {
  getMasterAgreementDetail,
  MasterAgreementValidationError,
  updateMasterAgreement
} from '@/lib/commercial/master-agreements-store'
import type { MasterAgreementStatus } from '@/lib/commercial/master-agreements-types'
import {
  canAdministerPricingCatalog,
  requireFinanceTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface UpdateMasterAgreementBody {
  msaNumber?: string | null
  title?: string
  clientId?: string | null
  counterpartyName?: string | null
  status?: MasterAgreementStatus
  effectiveDate?: string
  expirationDate?: string | null
  autoRenewal?: boolean
  renewalFrequencyMonths?: number | null
  renewalNoticeDays?: number | null
  governingLaw?: string | null
  jurisdiction?: string | null
  paymentTermsDays?: number | null
  currency?: string | null
  signedAt?: string | null
  signedByClient?: string | null
  signedByEfeonce?: string | null
  internalNotes?: string | null
  signedDocumentAssetId?: string | null
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

  return NextResponse.json(msa)
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
      { error: 'Solo Finance Admin o Efeonce Admin pueden editar MSAs.' },
      { status: 403 }
    )
  }

  const { id } = await params
  let body: UpdateMasterAgreementBody

  try {
    body = (await request.json()) as UpdateMasterAgreementBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  try {
    const msa = await updateMasterAgreement({
      tenant,
      msaId: id,
      actorUserId: tenant.userId,
      input: {
        msaNumber: body.msaNumber ?? undefined,
        title: body.title,
        clientId: body.clientId ?? undefined,
        counterpartyName: body.counterpartyName ?? undefined,
        status: body.status,
        effectiveDate: body.effectiveDate,
        expirationDate: body.expirationDate ?? undefined,
        autoRenewal: body.autoRenewal,
        renewalFrequencyMonths: body.renewalFrequencyMonths,
        renewalNoticeDays: body.renewalNoticeDays,
        governingLaw: body.governingLaw,
        jurisdiction: body.jurisdiction,
        paymentTermsDays: body.paymentTermsDays,
        currency: body.currency,
        signedAt: body.signedAt ?? undefined,
        signedByClient: body.signedByClient ?? undefined,
        signedByEfeonce: body.signedByEfeonce ?? undefined,
        internalNotes: body.internalNotes ?? undefined,
        signedDocumentAssetId: body.signedDocumentAssetId ?? undefined,
        clauses: body.clauses
          ? body.clauses.flatMap(item =>
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
          : undefined
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
