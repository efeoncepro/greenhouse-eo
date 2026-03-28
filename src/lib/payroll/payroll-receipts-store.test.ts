import { describe, expect, it } from 'vitest'

import {
  buildPayrollReceiptId,
  buildPayrollReceiptStoragePath
} from './payroll-receipts-store'

describe('payroll-receipts-store helpers', () => {
  it('builds stable receipt ids', () => {
    expect(buildPayrollReceiptId('entry-123', 4)).toBe('receipt_entry-123_r4')
  })

  it('builds stable GCS receipt paths', () => {
    expect(buildPayrollReceiptStoragePath('2026-03', 'member-abc', 2)).toBe(
      'payroll-receipts/2026-03/member-abc-r2.pdf'
    )
  })
})
