import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { readQuotationDocumentChain } from '@/lib/finance/quote-to-cash/document-chain-reader'

export const dynamic = 'force-dynamic'

/**
 * TASK-350 — Read-only endpoint for the document chain anchored on a quotation.
 *
 * GET /api/finance/quotes/[id]/document-chain
 *
 * Returns the full chain: quotation header + POs + HES + incomes + totals
 * (quoted, authorized, invoiced, and deltas). Drives timeline UIs and audit
 * surfaces for the quotation-to-cash bridge.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const chain = await readQuotationDocumentChain({ quotationId: identity.quotationId })

  return NextResponse.json(chain)
}
