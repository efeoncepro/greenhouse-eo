'use client'

import { buildPayrollReceiptDownloadFilename } from './receipt-filename'

type DownloadPayrollReceiptPdfInput = {
  route: string
  entryId: string
  periodId?: string | null
  memberId?: string | null
  memberName?: string | null
  payRegime?: 'chile' | 'international' | null
  currency?: 'CLP' | 'USD' | null
}

export const downloadPayrollReceiptPdf = async (input: DownloadPayrollReceiptPdfInput) => {
  const response = await fetch(input.route, {
    method: 'GET',
    credentials: 'same-origin'
  })

  if (!response.ok) {
    throw new Error('Unable to download payroll receipt.')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const filename = buildPayrollReceiptDownloadFilename(input)

  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener noreferrer'
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
