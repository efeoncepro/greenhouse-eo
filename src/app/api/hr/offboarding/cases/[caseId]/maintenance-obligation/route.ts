import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { declareMaintenanceObligation } from '@/lib/workforce/offboarding'

export const dynamic = 'force-dynamic'

/**
 * TASK-862 Slice C — POST /api/hr/offboarding/cases/[caseId]/maintenance-obligation
 *
 * Declare Ley 21.389 (Ley 14.908 mod. 2021) maintenance obligation status for the
 * worker before issuing the finiquito. Pre-requisito de readiness check
 * maintenance_obligation_declared en buildDocumentReadiness (TASK-862 Slice C).
 *
 * Alt A (variant=not_subject): trabajador NO afecto a retencion. amount/beneficiary
 * deben omitirse o ser null.
 * Alt B (variant=subject): trabajador SI afecto. amount > 0 + beneficiary non-empty
 * obligatorios. evidenceAssetId opcional (asset con certificado RNDA).
 *
 * Body: { variant: 'not_subject' | 'subject', amount?: number, beneficiary?: string,
 *         evidenceAssetId?: string }
 * Auth: requireHrCoreManageTenantContext + capability hr.offboarding_case:update:tenant.
 * Errors sanitizados via redactErrorForResponse + captureWithDomain('hr').
 */
export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({ tenant, capability: 'hr.offboarding_case', action: 'update', scope: 'tenant' })
    const { caseId } = await context.params

    const body = (await request.json().catch(() => ({}))) as {
      variant?: unknown
      amount?: unknown
      beneficiary?: unknown
      evidenceAssetId?: unknown
    }

    const variant = body.variant === 'not_subject' || body.variant === 'subject' ? body.variant : null

    if (!variant) {
      return NextResponse.json({ error: 'variant must be "not_subject" or "subject".' }, { status: 400 })
    }

    const amount = typeof body.amount === 'number' ? body.amount : null
    const beneficiary = typeof body.beneficiary === 'string' ? body.beneficiary : null
    const evidenceAssetId = typeof body.evidenceAssetId === 'string' ? body.evidenceAssetId.trim() : null

    const updated = await declareMaintenanceObligation({
      offboardingCaseId: caseId,
      variant,
      amount,
      beneficiary,
      evidenceAssetId,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ offboardingCase: updated })
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'OFFBOARDING_CASE_NOT_FOUND':
          return NextResponse.json({ error: 'Offboarding case not found.' }, { status: 404 })
        case 'INVALID_VARIANT':
          return NextResponse.json({ error: 'variant must be "not_subject" or "subject".' }, { status: 400 })
        case 'AMOUNT_REQUIRED_FOR_SUBJECT':
          return NextResponse.json({ error: 'amount > 0 is required when variant=subject.' }, { status: 400 })
        case 'BENEFICIARY_REQUIRED_FOR_SUBJECT':
          return NextResponse.json({ error: 'beneficiary is required when variant=subject.' }, { status: 400 })
        case 'EVIDENCE_ASSET_NOT_FOUND':
          return NextResponse.json({ error: 'evidenceAssetId does not exist.' }, { status: 404 })
      }
    }

    captureWithDomain(error, 'payroll', { tags: { route: 'offboarding-maintenance-obligation' } })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
