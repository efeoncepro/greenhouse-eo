import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetPayrollPeriod = vi.fn()
const mockGetPayrollEntries = vi.fn()
const mockGetPayrollExportPackageByPeriodId = vi.fn()
const mockDownloadGreenhouseMediaAsset = vi.fn()
const mockGeneratePayrollPeriodPdf = vi.fn()
const mockGeneratePayrollCsv = vi.fn()
const mockUploadGreenhouseStorageObject = vi.fn()
const mockUpsertPayrollExportPackageArtifacts = vi.fn()
const mockRecordPayrollExportPackageDelivery = vi.fn()
const mockIsResendConfigured = vi.fn()
const mockGetEmailFromAddress = vi.fn()
const mockGetResendClient = vi.fn()

vi.mock('@/lib/payroll/get-payroll-periods', () => ({
  getPayrollPeriod: (...args: unknown[]) => mockGetPayrollPeriod(...args)
}))

vi.mock('@/lib/payroll/get-payroll-entries', () => ({
  getPayrollEntries: (...args: unknown[]) => mockGetPayrollEntries(...args)
}))

vi.mock('@/lib/payroll/payroll-export-packages-store', () => ({
  getPayrollExportPackageByPeriodId: (...args: unknown[]) => mockGetPayrollExportPackageByPeriodId(...args),
  upsertPayrollExportPackageArtifacts: (...args: unknown[]) => mockUpsertPayrollExportPackageArtifacts(...args),
  recordPayrollExportPackageDelivery: (...args: unknown[]) => mockRecordPayrollExportPackageDelivery(...args),
  buildPayrollExportPackageStoragePath: (periodId: string, kind: 'pdf' | 'csv') =>
    `payroll-export-packages/${periodId}/payroll-${periodId}.${kind}`,
  buildPayrollExportPackageDownloadFilename: (periodId: string, kind: 'pdf' | 'csv') =>
    `payroll-${periodId}.${kind}`,
  PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION: '2026-03-28.v1'
}))

vi.mock('@/lib/storage/greenhouse-media', () => ({
  downloadGreenhouseMediaAsset: (...args: unknown[]) => mockDownloadGreenhouseMediaAsset(...args),
  uploadGreenhouseStorageObject: (...args: unknown[]) => mockUploadGreenhouseStorageObject(...args),
  getGreenhouseMediaBucket: () => 'test-bucket'
}))

vi.mock('@/lib/payroll/generate-payroll-pdf', () => ({
  generatePayrollPeriodPdf: (...args: unknown[]) => mockGeneratePayrollPeriodPdf(...args)
}))

vi.mock('@/lib/payroll/export-payroll', () => ({
  generatePayrollCsv: (...args: unknown[]) => mockGeneratePayrollCsv(...args)
}))

vi.mock('@/lib/resend', () => ({
  isResendConfigured: () => mockIsResendConfigured(),
  getEmailFromAddress: () => mockGetEmailFromAddress(),
  getResendClient: () => mockGetResendClient()
}))

const {
  getOrCreatePayrollExportPackageAssets,
  sendPayrollExportReadyNotification
} = await import('./payroll-export-packages')

describe('payroll export packages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsResendConfigured.mockReturnValue(true)
    mockGetEmailFromAddress.mockReturnValue('no-reply@efeoncepro.com')
    mockGetResendClient.mockReturnValue({
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: 'email_123' } })
      }
    })
  })

  it('reuses stored artifacts when the package is already current', async () => {
    mockGetPayrollPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      year: 2026,
      month: 3,
      status: 'exported'
    } as any)
    mockGetPayrollEntries.mockResolvedValueOnce([
      { memberId: 'm1', grossTotal: 1000, netTotal: 800, currency: 'CLP' }
    ] as any)
    mockGetPayrollExportPackageByPeriodId.mockResolvedValueOnce({
      periodId: '2026-03',
      storageBucket: 'test-bucket',
      pdfStoragePath: 'gs://test-bucket/payroll-export-packages/2026-03/payroll-2026-03.pdf',
      csvStoragePath: 'gs://test-bucket/payroll-export-packages/2026-03/payroll-2026-03.csv',
      pdfTemplateVersion: '2026-03-28.v1',
      csvTemplateVersion: '2026-03-28.v1',
      pdfFileSizeBytes: 3,
      csvFileSizeBytes: 3,
      generatedAt: '2026-03-28T00:00:00.000Z',
      generatedBy: 'user-1',
      deliveryStatus: 'sent',
      deliveryAttempts: 1,
      lastSentAt: '2026-03-28T01:00:00.000Z',
      lastSentBy: 'user-1',
      lastEmailDeliveryId: 'email_123',
      lastSendError: null,
      createdAt: '2026-03-28T00:00:00.000Z',
      updatedAt: '2026-03-28T01:00:00.000Z'
    })
    mockDownloadGreenhouseMediaAsset.mockImplementation(async (assetPath: string) => ({
      arrayBuffer: new TextEncoder().encode(assetPath.endsWith('.pdf') ? 'pdf' : 'csv').buffer,
      contentType: assetPath.endsWith('.pdf') ? 'application/pdf' : 'text/csv; charset=utf-8',
      cacheControl: 'private, max-age=0, must-revalidate'
    }))

    const result = await getOrCreatePayrollExportPackageAssets('2026-03')

    expect(result.wasGenerated).toBe(false)
    expect(mockGeneratePayrollPeriodPdf).not.toHaveBeenCalled()
    expect(mockGeneratePayrollCsv).not.toHaveBeenCalled()
    expect(mockUploadGreenhouseStorageObject).not.toHaveBeenCalled()
    expect(result.pdfBuffer.toString()).toBe('pdf')
    expect(result.csvBuffer.toString()).toBe('csv')
  })

  it('generates, persists, and sends the export-ready email', async () => {
    mockGetPayrollPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      year: 2026,
      month: 3,
      status: 'exported'
    } as any)
    mockGetPayrollEntries.mockResolvedValueOnce([
      { memberId: 'm1', grossTotal: 1200, netTotal: 900, currency: 'CLP', memberName: 'Ada Lovelace' },
      { memberId: 'm2', grossTotal: 500, netTotal: 420, currency: 'USD', memberName: 'Grace Hopper' }
    ] as any)
    mockGetPayrollExportPackageByPeriodId.mockResolvedValueOnce(null)
    mockGeneratePayrollPeriodPdf.mockResolvedValueOnce(Buffer.from('pdf-binary'))
    mockGeneratePayrollCsv.mockResolvedValueOnce('a,b,c\n1,2,3')
    mockUploadGreenhouseStorageObject
      .mockResolvedValueOnce('gs://test-bucket/payroll-export-packages/2026-03/payroll-2026-03.pdf')
      .mockResolvedValueOnce('gs://test-bucket/payroll-export-packages/2026-03/payroll-2026-03.csv')
    mockUpsertPayrollExportPackageArtifacts.mockResolvedValueOnce({
      periodId: '2026-03',
      storageBucket: 'test-bucket',
      pdfStoragePath: 'gs://test-bucket/payroll-export-packages/2026-03/payroll-2026-03.pdf',
      csvStoragePath: 'gs://test-bucket/payroll-export-packages/2026-03/payroll-2026-03.csv',
      pdfTemplateVersion: '2026-03-28.v1',
      csvTemplateVersion: '2026-03-28.v1',
      pdfFileSizeBytes: 10,
      csvFileSizeBytes: 11,
      generatedAt: '2026-03-28T02:00:00.000Z',
      generatedBy: 'user-1',
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
      lastSentAt: null,
      lastSentBy: null,
      lastEmailDeliveryId: null,
      lastSendError: null,
      createdAt: '2026-03-28T02:00:00.000Z',
      updatedAt: '2026-03-28T02:00:00.000Z'
    })
    mockRecordPayrollExportPackageDelivery.mockResolvedValueOnce({
      periodId: '2026-03',
      storageBucket: 'test-bucket',
      pdfStoragePath: 'gs://test-bucket/payroll-export-packages/2026-03/payroll-2026-03.pdf',
      csvStoragePath: 'gs://test-bucket/payroll-export-packages/2026-03/payroll-2026-03.csv',
      pdfTemplateVersion: '2026-03-28.v1',
      csvTemplateVersion: '2026-03-28.v1',
      pdfFileSizeBytes: 10,
      csvFileSizeBytes: 11,
      generatedAt: '2026-03-28T02:00:00.000Z',
      generatedBy: 'user-1',
      deliveryStatus: 'sent',
      deliveryAttempts: 1,
      lastSentAt: '2026-03-28T02:01:00.000Z',
      lastSentBy: 'user-1',
      lastEmailDeliveryId: 'email_123',
      lastSendError: null,
      createdAt: '2026-03-28T02:00:00.000Z',
      updatedAt: '2026-03-28T02:01:00.000Z'
    })

    const deliveryId = await sendPayrollExportReadyNotification('2026-03', 'user-1')

    expect(deliveryId).toBe('email_123')
    expect(mockGeneratePayrollPeriodPdf).toHaveBeenCalledWith('2026-03')
    expect(mockGeneratePayrollCsv).toHaveBeenCalledWith('2026-03')
    expect(mockUploadGreenhouseStorageObject).toHaveBeenCalledTimes(2)
    expect(mockRecordPayrollExportPackageDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        periodId: '2026-03',
        deliveryStatus: 'sent',
        lastEmailDeliveryId: 'email_123'
      })
    )

    const resendClient = mockGetResendClient.mock.results[0]?.value as any

    expect(resendClient.emails.send).toHaveBeenCalledTimes(1)

    const call = resendClient.emails.send.mock.calls[0]?.[0]

    expect(call.subject).toContain('Payroll exportado — Marzo 2026')
    expect(call.attachments).toHaveLength(2)
  })
})
