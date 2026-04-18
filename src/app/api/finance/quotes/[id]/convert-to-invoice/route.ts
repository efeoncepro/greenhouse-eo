import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { materializeInvoiceFromApprovedQuotation } from '@/lib/finance/quote-to-cash/materialize-invoice-from-quotation'

export const dynamic = 'force-dynamic'

interface ConvertToInvoiceBody {
  dueDate?: string | null
}

/**
 * TASK-350 — Simple branch of quote-to-cash.
 *
 * POST /api/finance/quotes/[id]/convert-to-invoice
 * Body: { dueDate?: string (YYYY-MM-DD) }
 *
 * Materializes an income row directly from an approved (or sent) quotation
 * without requiring OC/HES. Rejected if the quotation has any PO or approved
 * HES linked (use the enterprise branch instead).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  let body: ConvertToInvoiceBody = {}

  try {
    body = (await request.json()) as ConvertToInvoiceBody
  } catch {
    body = {}
  }

  try {
    const result = await materializeInvoiceFromApprovedQuotation({
      quotationId: identity.quotationId,
      actor: {
        userId: tenant.userId,
        name: tenant.clientName || tenant.userId
      },
      dueDate: body.dueDate ?? null
    })

    return NextResponse.json(
      {
        incomeId: result.incomeId,
        quotationId: result.quotationId,
        quotationStatus: result.quotationStatus,
        totalAmountClp: result.totalAmountClp
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al materializar la factura.'

    const status = message.includes('already converted')
      ? 409
      : message.includes('not found')
        ? 404
        : message.includes('must be in status')
          ? 409
          : message.includes('enterprise branch')
            ? 409
            : 400

    return NextResponse.json({ error: message }, { status })
  }
}
