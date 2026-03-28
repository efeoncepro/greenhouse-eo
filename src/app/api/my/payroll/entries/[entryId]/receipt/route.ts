import { NextResponse } from 'next/server'

import { generatePayrollReceiptPdf } from '@/lib/payroll/generate-payroll-pdf'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollReceiptByEntryId } from '@/lib/payroll/payroll-receipts-store'
import { buildPayrollReceiptDownloadFilename } from '@/lib/payroll/receipt-filename'
import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { downloadGreenhouseMediaAsset } from '@/lib/storage/greenhouse-media'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { entryId } = await params
    const entry = await getPayrollEntryById(entryId)

    if (!entry || entry.memberId !== memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let storedReceipt = null

    try {
      storedReceipt = await getPayrollReceiptByEntryId(entryId)
    } catch {
      storedReceipt = null
    }

    let buffer: Buffer

    if (storedReceipt?.storagePath) {
      try {
        buffer = Buffer.from((await downloadGreenhouseMediaAsset(storedReceipt.storagePath)).arrayBuffer)
      } catch {
        buffer = await generatePayrollReceiptPdf(entryId)
      }
    } else {
      buffer = await generatePayrollReceiptPdf(entryId)
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${
          storedReceipt
            ? buildPayrollReceiptDownloadFilename({
                entryId,
                periodId: storedReceipt.periodId,
                memberId: storedReceipt.memberId,
                payRegime: storedReceipt.payRegime
              })
            : `receipt-${entryId}.pdf`
        }"`
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to generate payroll receipt.')
  }
}
