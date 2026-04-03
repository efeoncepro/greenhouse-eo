import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockAssertPayrollReceiptsReady = vi.fn()
const mockGetPayrollPeriod = vi.fn()
const mockGetPayrollEntries = vi.fn()
const mockGeneratePayrollReceiptPdf = vi.fn()
const mockGetLatestPayrollReceiptRevision = vi.fn()
const mockGetPayrollReceiptRowsBySourceEvent = vi.fn()
const mockSavePayrollReceipt = vi.fn()
const mockUploadGreenhouseStorageObject = vi.fn()
const mockDownloadGreenhouseMediaAsset = vi.fn()
const mockSendEmail = vi.fn()
const mockGetGreenhousePrivateAssetsBucket = vi.fn()
const mockUpsertSystemGeneratedAsset = vi.fn()

vi.mock('@/lib/payroll/postgres-store', () => ({
  assertPayrollReceiptsReady: (...args: unknown[]) => mockAssertPayrollReceiptsReady(...args)
}))

vi.mock('@/lib/payroll/get-payroll-periods', () => ({
  getPayrollPeriod: (...args: unknown[]) => mockGetPayrollPeriod(...args)
}))

vi.mock('@/lib/payroll/get-payroll-entries', () => ({
  getPayrollEntries: (...args: unknown[]) => mockGetPayrollEntries(...args)
}))

vi.mock('@/lib/payroll/generate-payroll-pdf', () => ({
  generatePayrollReceiptPdf: (...args: unknown[]) => mockGeneratePayrollReceiptPdf(...args),
  RECEIPT_TEMPLATE_VERSION: '2026-03-28.v1'
}))

vi.mock('@/lib/payroll/payroll-receipts-store', () => ({
  buildPayrollReceiptId: (entryId: string, revision: number) => `receipt_${entryId}_r${revision}`,
  buildPayrollReceiptStoragePath: (periodId: string, memberId: string, revision: number) =>
    `payroll-receipts/${periodId}/${memberId}-r${revision}.pdf`,
  getLatestPayrollReceiptRevision: (...args: unknown[]) => mockGetLatestPayrollReceiptRevision(...args),
  getPayrollReceiptRowsBySourceEvent: (...args: unknown[]) => mockGetPayrollReceiptRowsBySourceEvent(...args),
  savePayrollReceipt: (...args: unknown[]) => mockSavePayrollReceipt(...args)
}))

vi.mock('@/lib/storage/greenhouse-media', () => ({
  uploadGreenhouseStorageObject: (...args: unknown[]) => mockUploadGreenhouseStorageObject(...args),
  downloadGreenhouseMediaAsset: (...args: unknown[]) => mockDownloadGreenhouseMediaAsset(...args)
}))

vi.mock('@/lib/storage/greenhouse-assets', () => ({
  getGreenhousePrivateAssetsBucket: (...args: unknown[]) => mockGetGreenhousePrivateAssetsBucket(...args),
  upsertSystemGeneratedAsset: (...args: unknown[]) => mockUpsertSystemGeneratedAsset(...args)
}))

vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}))

const { generatePayrollReceiptsForPeriod } = await import('./generate-payroll-receipts')

describe('generate payroll receipts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetPayrollPeriod.mockResolvedValue({
      periodId: '2026-03',
      year: 2026,
      month: 3,
      status: 'exported'
    })
    mockGetPayrollEntries.mockResolvedValue([
      {
        entryId: 'entry-1',
        memberId: 'member-1',
        memberName: 'Ada Lovelace',
        memberEmail: 'ada@example.com',
        payRegime: 'chile',
        currency: 'CLP',
        grossTotal: 1000,
        chileTotalDeductions: 200,
        netTotal: 800
      }
    ])
    mockGetLatestPayrollReceiptRevision.mockResolvedValue(1)
    mockGetPayrollReceiptRowsBySourceEvent.mockResolvedValue([])
    mockGeneratePayrollReceiptPdf.mockResolvedValue(Buffer.from('pdf'))
    mockGetGreenhousePrivateAssetsBucket.mockReturnValue('test-private-assets')
    mockUploadGreenhouseStorageObject.mockResolvedValue('gs://bucket/payroll-receipts/2026-03/member-1-r1.pdf')
    mockUpsertSystemGeneratedAsset.mockResolvedValue({ assetId: 'asset-1' })
    mockSendEmail.mockResolvedValue({ deliveryId: 'delivery-123', resendId: 'resend-123', status: 'sent' })
    mockSavePayrollReceipt.mockResolvedValue(undefined)
    mockAssertPayrollReceiptsReady.mockResolvedValue(undefined)
  })

  it('sends receipt emails through the centralized delivery layer', async () => {
    const result = await generatePayrollReceiptsForPeriod({
      periodId: '2026-03',
      sourceEventId: 'payroll_period.exported-1',
      actorEmail: 'hr@example.com',
      sendEmails: true
    })

    expect(result.emailed).toBe(1)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      emailType: 'payroll_receipt',
      domain: 'payroll',
      recipients: [{ userId: 'member-1', email: 'ada@example.com', name: 'Ada Lovelace' }]
    }))
    expect(mockSavePayrollReceipt.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      status: 'email_sent',
      emailDeliveryId: 'resend-123'
    }))
  })
})
