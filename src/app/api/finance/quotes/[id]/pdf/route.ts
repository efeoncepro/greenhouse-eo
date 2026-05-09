import { NextResponse } from 'next/server'

import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { getFinanceQuoteDetailFromCanonical } from '@/lib/finance/quotation-canonical-store'
import { getOrCreateQuotePdfBuffer } from '@/lib/finance/quote-share/quote-pdf-asset'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const sanitizeFileName = (value: string): string => value.replace(/[^A-Za-z0-9._-]+/g, '-')

/**
 * GET /api/finance/quotes/[id]/pdf
 *
 * Returns the PDF for a quotation. Refactored in TASK-631 Fase 4 follow-up
 * to use `getOrCreateQuotePdfBuffer` — first hit caches the PDF in GCS,
 * subsequent hits reuse the cached buffer. Cache invalidates when the
 * quote is updated or template_version is bumped.
 *
 * Cross-cutting benefit: the same cached PDF is reused by the email send
 * endpoint, so generating a PDF once serves both portal preview + email
 * attachment.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  // Tenant scope enforcement: canonical detail lookup applies space filter.
  const detail = await getFinanceQuoteDetailFromCanonical({ tenant, quoteId: id })

  if (!detail) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const versionNumber = (detail as unknown as { currentVersion?: number }).currentVersion ?? 1

  let result

  try {
    result = await getOrCreateQuotePdfBuffer({
      quotationId: identity.quotationId,
      versionNumber,
      generatedBy: tenant.userId
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'PDF generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }

  await recordAudit({
    quotationId: identity.quotationId,
    versionNumber,
    action: 'pdf_generated',
    actorUserId: tenant.userId,
    actorName: tenant.clientName || tenant.userId,
    details: {
      quotationNumber: (detail as unknown as { quoteNumber?: string }).quoteNumber || identity.quotationId,
      fileSizeBytes: result.fileSizeBytes,
      wasGenerated: result.wasGenerated,
      assetId: result.assetId
    }
  })

  const { searchParams } = new URL(request.url)
  const download = searchParams.get('download') === '1'
  const disposition = download ? 'attachment' : 'inline'
  const safeFileName = sanitizeFileName(result.fileName)

  const body = new Uint8Array(result.buffer)

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${safeFileName}"`,
      'Cache-Control': 'no-store'
    }
  })
}
