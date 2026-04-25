import { NextResponse } from 'next/server'

import { errorResponse } from '@/lib/email/error-envelope'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { getQuotePdfAssetRecord } from '@/lib/finance/quote-share/quote-pdf-asset'
import { resolveQuoteShortLink } from '@/lib/finance/quote-share/short-link'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/quotes/[id]/share/[shortCode]/pdf-size
 *
 * Returns the cached PDF size for the quote+version pointed to by the
 * short link. If no PDF cached yet, returns null + estimated range.
 *
 * Used by the share drawer to display "~127 KB" (real) or "~80–150 KB"
 * (estimate) next to the "Include PDF" toggle.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; shortCode: string }> }
) {
  const { tenant, errorResponse: authError } = await requireFinanceTenantContext()

  if (!tenant) {
    return authError || errorResponse({ code: 'unauthorized', message: 'Unauthorized' })
  }

  const { id, shortCode } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return errorResponse({ code: 'not_found', message: 'Quotation not found' })
  }

  const linkResult = await resolveQuoteShortLink(shortCode)

  if (!linkResult || linkResult.link.quotationId !== identity.quotationId) {
    return errorResponse({ code: 'not_found', message: 'Short link not found or mismatch' })
  }

  const cached = await getQuotePdfAssetRecord(
    identity.quotationId,
    linkResult.link.versionNumber
  )

  if (!cached) {
    return NextResponse.json({
      sizeBytes: null,
      isEstimate: true,
      estimatedRangeBytes: { min: 80_000, max: 150_000 }
    })
  }

  return NextResponse.json({
    sizeBytes: cached.fileSizeBytes,
    isEstimate: false,
    fileName: cached.fileName,
    generatedAt: cached.generatedAt
  })
}
