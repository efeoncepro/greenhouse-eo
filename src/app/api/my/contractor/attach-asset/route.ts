import { NextResponse } from 'next/server'

import { ContractorEngagementValidationError } from '@/lib/contractor-engagements'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'
import { attachContractorInvoiceAsset } from '@/lib/contractor-engagements/invoice-assets'
import type {
  ContractorInvoiceArtifactKind,
  ContractorInvoiceAssetRole
} from '@/lib/contractor-engagements/invoice-asset-contracts'
import {
  clearContractorSelfServiceCacheForProfile,
  getActiveContractorEngagementForProfile
} from '@/lib/contractor-engagements/self-service-projection'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-796 — `/api/my/contractor/attach-asset` (self-service, member-scoped).
 *
 * POST → attach a previously-uploaded private asset (invoice/boleta or work
 *        evidence) to the member's OWN active engagement, optionally linked to a
 *        work submission. Reuses TASK-791 `attachContractorInvoiceAsset`.
 *
 * Hard rule: the contractor may ONLY attach contractor-facing roles. Provider
 * statements / payout receipts / FX receipts are Finance-only and rejected here.
 */

// Contractor-facing roles only (excludes provider_statement/payout_receipt/fx_receipt).
const SELF_SERVICE_ROLES = new Set<ContractorInvoiceAssetRole>([
  'invoice_pdf',
  'tax_xml',
  'tax_certificate',
  'work_evidence',
  'other_supporting_doc'
])

const DEFAULT_ARTIFACT_KIND: Record<ContractorInvoiceAssetRole, ContractorInvoiceArtifactKind> = {
  invoice_pdf: 'human_readable',
  tax_xml: 'tax_structured',
  tax_certificate: 'tax_structured',
  work_evidence: 'evidence',
  other_supporting_doc: 'human_readable',
  provider_statement: 'provider_report',
  payout_receipt: 'payment_proof',
  fx_receipt: 'payment_proof'
}

export async function POST(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'personal_workspace.contractor.submit_self', 'create', 'own')) {
    return NextResponse.json(
      { error: 'No tienes acceso para adjuntar soporte como contractor.', code: 'forbidden', actionable: false },
      { status: 403 }
    )
  }

  const identityProfileId = tenant.identityProfileId

  if (!identityProfileId) {
    return NextResponse.json(
      {
        error: 'Tu cuenta aún no está enlazada a un perfil canónico.',
        code: 'identity_profile_missing',
        actionable: false
      },
      { status: 422 }
    )
  }

  let body: Record<string, unknown> = {}

  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>
  } catch {
    body = {}
  }

  try {
    const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : ''
    const assetRole = body.assetRole

    if (!assetId) {
      throw new ContractorEngagementValidationError('El assetId es obligatorio.', 'missing_asset_id')
    }

    if (typeof assetRole !== 'string' || !SELF_SERVICE_ROLES.has(assetRole as ContractorInvoiceAssetRole)) {
      throw new ContractorEngagementValidationError(
        'Solo puedes adjuntar boleta/invoice, documentos tributarios o evidencia del servicio.',
        'invalid_self_service_asset_role'
      )
    }

    const role = assetRole as ContractorInvoiceAssetRole

    const engagement = await getActiveContractorEngagementForProfile(identityProfileId)

    if (!engagement) {
      throw new ContractorEngagementValidationError(
        'No tienes un engagement contractor activo para adjuntar soporte.',
        'no_active_engagement',
        422
      )
    }

    const asset = await attachContractorInvoiceAsset({
      contractorEngagementId: engagement.contractorEngagementId,
      contractorWorkSubmissionId:
        typeof body.contractorWorkSubmissionId === 'string' ? body.contractorWorkSubmissionId : null,
      assetId,
      assetRole: role,
      artifactKind: DEFAULT_ARTIFACT_KIND[role],
      source: 'contractor_upload',
      countryCode: engagement.countryCode,
      actorUserId: tenant.userId
    })

    clearContractorSelfServiceCacheForProfile(identityProfileId)

    return NextResponse.json({ asset, attached: true }, { status: 201 })
  } catch (error) {
    if (!(error instanceof ContractorEngagementValidationError)) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'my_contractor_attach_asset', stage: 'POST' },
        extra: { memberId }
      })
    }

    return toContractorEngagementErrorResponse(error)
  }
}
