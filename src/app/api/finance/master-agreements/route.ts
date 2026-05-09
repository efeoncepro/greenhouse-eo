import { NextResponse } from 'next/server'

import {
  createMasterAgreement,
  listMasterAgreements,
  MasterAgreementValidationError
} from '@/lib/commercial/master-agreements-store'
import type { MasterAgreementStatus } from '@/lib/commercial/master-agreements-types'
import {
  canAdministerPricingCatalog,
  requireCommercialTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES: ReadonlySet<MasterAgreementStatus> = new Set([
  'draft',
  'active',
  'expired',
  'terminated',
  'superseded'
])

interface CreateMasterAgreementBody {
  msaNumber?: string | null
  title?: string
  organizationId?: string
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

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')

  const status =
    statusParam && ALLOWED_STATUSES.has(statusParam as MasterAgreementStatus)
      ? (statusParam as MasterAgreementStatus)
      : null

  const items = await listMasterAgreements({ tenant, status })

  return NextResponse.json({ items, count: items.length })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden crear MSAs.' },
      { status: 403 }
    )
  }

  let body: CreateMasterAgreementBody

  try {
    body = (await request.json()) as CreateMasterAgreementBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title es requerido.' }, { status: 400 })
  }

  if (!body.organizationId?.trim()) {
    return NextResponse.json({ error: 'organizationId es requerido.' }, { status: 400 })
  }

  if (!body.effectiveDate?.trim()) {
    return NextResponse.json({ error: 'effectiveDate es requerido.' }, { status: 400 })
  }

  try {
    const msa = await createMasterAgreement({
      tenant,
      actorUserId: tenant.userId,
      input: {
        msaNumber: body.msaNumber ?? null,
        title: body.title,
        organizationId: body.organizationId,
        clientId: body.clientId ?? null,
        counterpartyName: body.counterpartyName ?? null,
        status: body.status,
        effectiveDate: body.effectiveDate,
        expirationDate: body.expirationDate ?? null,
        autoRenewal: body.autoRenewal ?? false,
        renewalFrequencyMonths: body.renewalFrequencyMonths ?? null,
        renewalNoticeDays: body.renewalNoticeDays ?? null,
        governingLaw: body.governingLaw ?? null,
        jurisdiction: body.jurisdiction ?? null,
        paymentTermsDays: body.paymentTermsDays ?? null,
        currency: body.currency ?? null,
        signedAt: body.signedAt ?? null,
        signedByClient: body.signedByClient ?? null,
        signedByEfeonce: body.signedByEfeonce ?? null,
        internalNotes: body.internalNotes ?? null,
        signedDocumentAssetId: body.signedDocumentAssetId ?? null,
        clauses:
          body.clauses?.flatMap(item =>
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
          ) ?? []
      }
    })

    return NextResponse.json(msa, { status: 201 })
  } catch (error) {
    if (error instanceof MasterAgreementValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
