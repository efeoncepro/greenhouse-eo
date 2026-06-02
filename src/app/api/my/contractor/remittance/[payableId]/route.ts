import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { resolveRemittanceAdvice } from '@/lib/contractor-engagements/remittance/remittance-resolver'
import { generateContractorRemittancePdf } from '@/lib/contractor-engagements/remittance/generate-contractor-remittance-pdf'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const notFound = () =>
  NextResponse.json(
    { error: 'No encontramos este comprobante.', code: 'not_found', actionable: false },
    { status: 404 }
  )

/**
 * TASK-960 — `/api/my/contractor/remittance/[payableId]` (self-service, member-scoped).
 *
 * GET → JSON `{ presentation }` for the in-app viewer, or `?format=pdf` for the PDF
 *       (attachment by default; `?disposition=inline` for "Ver PDF").
 *
 * Anti-IDOR: the payable is resolved server-side and the document is served ONLY if
 * the engagement's profile matches the session's identityProfileId. We return 404
 * (not 403) for any mismatch / unpaid / missing — never leak existence.
 */
export async function GET(request: Request, { params }: { params: Promise<{ payableId: string }> }) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'personal_workspace.contractor.read_self', 'read', 'own')) {
    return NextResponse.json(
      { error: 'No tienes acceso a este comprobante.', code: 'forbidden', actionable: false },
      { status: 403 }
    )
  }

  const { payableId } = await params

  try {
    const resolution = await resolveRemittanceAdvice(payableId)

    if (!resolution.ok) return notFound()

    // IDOR — the contractor can only see their own engagement's documents.
    if (!tenant.identityProfileId || resolution.engagementProfileId !== tenant.identityProfileId) {
      return notFound()
    }

    const url = new URL(request.url)

    if (url.searchParams.get('format') === 'pdf') {
      const buffer = await generateContractorRemittancePdf(resolution.presentation)
      const disposition = url.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment'

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${disposition}; filename="comprobante-${resolution.remittanceNumber}.pdf"`
        }
      })
    }

    return NextResponse.json({ presentation: resolution.presentation, number: resolution.remittanceNumber })
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'my_contractor_remittance', stage: 'GET' },
      extra: { memberId, payableId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error', actionable: true },
      { status: 500 }
    )
  }
}
