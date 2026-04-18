import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { approveHes } from '@/lib/finance/hes-store'
import { materializeInvoiceFromApprovedHes } from '@/lib/finance/quote-to-cash/materialize-invoice-from-hes'

export const dynamic = 'force-dynamic'

interface ApproveHesBody {
  approvedBy?: string
  amountAuthorizedClp?: number | null
  materializeInvoice?: boolean
  dueDate?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: ApproveHesBody = {}

  try {
    body = (await request.json()) as ApproveHesBody
  } catch {
    body = {}
  }

  if (!body.approvedBy) {
    return NextResponse.json({ error: 'approvedBy es obligatorio' }, { status: 400 })
  }

  const approved = await approveHes(id, {
    actorUserId: body.approvedBy,
    amountAuthorizedClp:
      body.amountAuthorizedClp === undefined || body.amountAuthorizedClp === null
        ? null
        : Number(body.amountAuthorizedClp)
  })

  if (!approved) {
    return NextResponse.json({ error: 'La HES no existe o ya no está en estado recibida.' }, { status: 404 })
  }

  // TASK-350: optionally chain the invoice materialization when the HES is
  // linked to a quotation and not already materialized.
  if (body.materializeInvoice && approved.quotationId && !approved.incomeId) {
    try {
      const invoice = await materializeInvoiceFromApprovedHes({
        hesId: id,
        actor: {
          userId: tenant.userId,
          name: tenant.clientName || tenant.userId
        },
        dueDate: body.dueDate ?? null
      })

      return NextResponse.json({
        ...approved,
        invoice: {
          incomeId: invoice.incomeId,
          quotationId: invoice.quotationId,
          sourceHesId: invoice.sourceHesId,
          totalAmountClp: invoice.totalAmountClp
        }
      })
    } catch (materializeError) {
      const message =
        materializeError instanceof Error
          ? materializeError.message
          : 'Error al materializar la factura desde la HES.'

      // HES is already approved; return the approval result plus the
      // materialization error so callers can surface it without reverting.
      return NextResponse.json(
        {
          ...approved,
          invoiceError: message
        },
        { status: 207 }
      )
    }
  }

  return NextResponse.json(approved)
}
