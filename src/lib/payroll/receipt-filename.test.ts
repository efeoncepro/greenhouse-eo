import { describe, expect, it } from 'vitest'

import { buildPayrollReceiptDownloadFilename } from './receipt-filename'

describe('buildPayrollReceiptDownloadFilename', () => {
  it('builds a human readable filename for Chile payroll receipts', () => {
    expect(
      buildPayrollReceiptDownloadFilename({
        entryId: 'entry-1',
        periodId: '2026-03',
        memberName: 'Andres Carlosama',
        payRegime: 'chile'
      })
    ).toBe('recibo-marzo-2026-andres-carlosama.pdf')
  })

  it('falls back to entry id when there is no human name', () => {
    expect(
      buildPayrollReceiptDownloadFilename({
        entryId: 'entry-1',
        periodId: '2026-03',
        memberId: 'member-99',
        currency: 'CLP'
      })
    ).toBe('recibo-marzo-2026-member-99.pdf')
  })

  it('uses the international prefix for USD payroll receipts', () => {
    expect(
      buildPayrollReceiptDownloadFilename({
        entryId: 'entry-1',
        periodId: '2026-03',
        memberName: 'Andres Carlosama',
        payRegime: 'international'
      })
    ).toBe('payment-statement-marzo-2026-andres-carlosama.pdf')
  })
})
