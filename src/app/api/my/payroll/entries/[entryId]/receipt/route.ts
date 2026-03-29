import { NextResponse } from 'next/server'

import { generatePayrollReceiptPdf, RECEIPT_TEMPLATE_VERSION } from '@/lib/payroll/generate-payroll-pdf'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollReceiptByEntryId, updateReceiptAfterRegeneration } from '@/lib/payroll/payroll-receipts-store'
import { buildPayrollReceiptDownloadFilename } from '@/lib/payroll/receipt-filename'
import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { downloadGreenhouseMediaAsset, uploadGreenhouseStorageObject, getGreenhouseMediaBucket } from '@/lib/storage/greenhouse-media'

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
    const isStaleTemplate = storedReceipt?.templateVersion !== RECEIPT_TEMPLATE_VERSION

    if (storedReceipt?.storagePath && !isStaleTemplate) {
      try {
        buffer = Buffer.from((await downloadGreenhouseMediaAsset(storedReceipt.storagePath)).arrayBuffer)
      } catch {
        buffer = await generatePayrollReceiptPdf(entryId)
      }
    } else {
      buffer = await generatePayrollReceiptPdf(entryId)

      if (storedReceipt) {
        try {
          const storagePath = `payroll-receipts/${storedReceipt.periodId}/${storedReceipt.memberId}-r${storedReceipt.revision}.pdf`

          await uploadGreenhouseStorageObject({
            objectName: storagePath,
            contentType: 'application/pdf',
            bytes: buffer
          })

          await updateReceiptAfterRegeneration({
            receiptId: storedReceipt.receiptId,
            storagePath: `gs://${getGreenhouseMediaBucket()}/${storagePath}`,
            storageBucket: getGreenhouseMediaBucket(),
            fileSizeBytes: buffer.length,
            templateVersion: RECEIPT_TEMPLATE_VERSION
          })
        } catch {
          // Non-fatal — PDF was regenerated and will be served, cache update failed silently
        }
      }
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
