import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { resolveRemittanceAdvice } from '@/lib/contractor-engagements/remittance/remittance-resolver'
import { generateContractorRemittancePdf } from '@/lib/contractor-engagements/remittance/generate-contractor-remittance-pdf'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireHrTenantContext } from '@/lib/tenant/authorization'
import type { RemittanceLocale } from '@/lib/contractor-engagements/remittance/types'

export const dynamic = 'force-dynamic'

const parseLocale = (value: string | null): RemittanceLocale | undefined =>
  value === 'es-CL' || value === 'en-US' ? value : undefined

/**
 * TASK-960 — `/api/hr/contractors/remittance/[payableId]` (HR/Finance, tenant-scoped).
 *
 * GET → JSON `{ presentation }` for the in-app viewer, or `?format=pdf` for the PDF
 *       (attachment by default; `?disposition=inline`). `?locale=es-CL|en-US` toggles
 *       the language (the contractor's own locale is used when absent). No IDOR gate —
 *       HR/Finance can see all contractor documents. Reuses `hr.contractor_engagement:read:tenant`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ payableId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_engagement', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const { payableId } = await params

  try {
    const url = new URL(request.url)
    const resolution = await resolveRemittanceAdvice(payableId, { localeOverride: parseLocale(url.searchParams.get('locale')) })

    if (!resolution.ok) {
      return NextResponse.json(
        { error: 'No encontramos este comprobante.', code: 'not_found', actionable: false },
        { status: 404 }
      )
    }

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
      tags: { source: 'hr_contractor_remittance', stage: 'GET' },
      extra: { payableId }
    })

    return toContractorEngagementErrorResponse(error)
  }
}
