import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { reconcileZapSignSignatureRequest } from '@/lib/integrations/zapsign/apply-state'
import { captureWithDomain } from '@/lib/observability/capture'
import { SignatureValidationError } from '@/lib/signatures/types'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-491 Slice 3 — Signature request reconciliation (recovery / safety-net for a ZapSign webhook
 * that failed or never arrived).
 *
 * `POST /api/admin/documents/signature-requests/[id]/reconcile`
 *
 * Re-reads authoritative ZapSign state via the adapter, downloads the signed PDF into the vault when
 * present, and applies the status monotonically (idempotent). All logic lives in the canonical
 * helper `reconcileZapSignSignatureRequest`; this handler does auth + sanitized error boundary.
 *
 * Auth (defense in depth dual-gate):
 * - `requireAdminTenantContext` (route_group=admin + role=EFEONCE_ADMIN)
 * - `can(tenant, 'documents.signature_request', 'manage', 'tenant')`
 */

export const dynamic = 'force-dynamic'

export const POST = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'documents.signature_request', 'manage', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'documents.signature_request' }
    })
  }

  const { id } = await params
  const signatureRequestId = typeof id === 'string' ? id.trim() : ''

  if (!signatureRequestId) {
    return NextResponse.json(
      { error: 'El id de la solicitud de firma es requerido.', code: 'invalid_signature_request_id', actionable: false },
      { status: 400 }
    )
  }

  try {
    const request = await reconcileZapSignSignatureRequest(signatureRequestId)

    return NextResponse.json(
      {
        signatureRequestId: request.signatureRequestId,
        status: request.status,
        signedDocumentAssetId: request.signedDocumentAssetId,
        lastSyncedAt: request.lastSyncedAt
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof SignatureValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, actionable: error.statusCode < 500 },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'documents', {
      tags: { source: 'admin_signature_request_reconcile', stage: 'route_handler' },
      extra: { signatureRequestId, actorUserId: tenant.userId }
    })

    return NextResponse.json(
      {
        error: 'No se pudo reconciliar la solicitud de firma. Reintenta o pide soporte al equipo de plataforma.',
        code: 'reconciliation_failed',
        actionable: false
      },
      { status: 500 }
    )
  }
}
