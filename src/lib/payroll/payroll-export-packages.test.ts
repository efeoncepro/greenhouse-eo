import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret'

const mockGetPayrollPeriod = vi.fn()
const mockGetPayrollEntries = vi.fn()
const mockGetPayrollExportPackageByPeriodId = vi.fn()
const mockDownloadGreenhouseMediaAsset = vi.fn()
const mockGeneratePayrollPeriodPdf = vi.fn()
const mockGeneratePayrollCsv = vi.fn()
const mockUploadGreenhouseStorageObject = vi.fn()
const mockUpsertPayrollExportPackageArtifacts = vi.fn()
const mockRecordPayrollExportPackageDelivery = vi.fn()
const mockSendEmail = vi.fn()
const mockGetGreenhousePrivateAssetsBucket = vi.fn()
const mockUpsertSystemGeneratedAsset = vi.fn()

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

vi.mock('@/lib/storage/greenhouse-assets', () => ({
  getGreenhousePrivateAssetsBucket: (...args: unknown[]) => mockGetGreenhousePrivateAssetsBucket(...args),
  upsertSystemGeneratedAsset: (...args: unknown[]) => mockUpsertSystemGeneratedAsset(...args)
}))

vi.mock('@/lib/payroll/generate-payroll-pdf', () => ({
  generatePayrollPeriodPdf: (...args: unknown[]) => mockGeneratePayrollPeriodPdf(...args)
}))

vi.mock('@/lib/payroll/export-payroll', () => ({
  generatePayrollCsv: (...args: unknown[]) => mockGeneratePayrollCsv(...args)
}))

vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}))

// TASK-409 hotfix 2026-04-15 — the content-freshness check reads
// MAX(updated_at) from payroll_entries via `@/lib/db`. Mock it so the
// existing tests that don't care about freshness still pass, and the
// freshness-specific tests can override the response per-case.
const mockDbQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockDbQuery(...args)
}))

const {
  canReuseStoredPackage,
  getOrCreatePayrollExportPackageAssets,
  sendPayrollExportReadyNotification
} = await import('./payroll-export-packages')

describe('payroll export packages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGreenhousePrivateAssetsBucket.mockReturnValue('test-bucket')
    mockUpsertSystemGeneratedAsset
      .mockResolvedValueOnce({ assetId: 'asset-pdf-1' })
      .mockResolvedValueOnce({ assetId: 'asset-csv-1' })
    mockSendEmail.mockResolvedValue({
      deliveryId: 'delivery_123',
      resendId: 'email_123',
      status: 'sent'
    })

    // Default: no entries (or the freshness check is not the focus of
    // this particular test). Each test that cares about freshness can
    // override the mock.
    mockDbQuery.mockResolvedValue([{ latest: null }])
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

    // Freshness check: the latest active entry is older than the
    // package — reuse is valid.
    mockDbQuery.mockResolvedValueOnce([{ latest: '2026-03-27T12:00:00.000Z' }])
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

  it('regenerates the package when entries are newer than the cached generatedAt (reliquidation)', async () => {
    // Marzo 2026 reproduction: a cached package exists with
    // generatedAt = 2026-03-28 and matching template version + storage
    // paths. After reliquidación, a v2 entry is superseded with
    // updated_at = 2026-04-15. The pre-hotfix `canReuseStoredPackage`
    // returned true here and the email sent the stale v1 PDF/CSV. The
    // fixed version must fall through to regeneration.
    mockGetPayrollPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      year: 2026,
      month: 3,
      status: 'exported'
    } as any)
    mockGetPayrollEntries.mockResolvedValueOnce([
      { memberId: 'm1', grossTotal: 1500, netTotal: 1100, currency: 'CLP', payRegime: 'chile', memberName: 'Post Reliq Member' }
    ] as any)

    // Entry is newer → reuse is invalid.
    mockDbQuery.mockResolvedValueOnce([{ latest: '2026-04-15T21:40:00.000Z' }])
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
    mockGeneratePayrollPeriodPdf.mockResolvedValueOnce(Buffer.from('pdf-v2-reliquidated'))
    mockGeneratePayrollCsv.mockResolvedValueOnce('member,gross,net\nPost Reliq Member,1500,1100')
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
      pdfFileSizeBytes: 20,
      csvFileSizeBytes: 36,
      generatedAt: '2026-04-15T22:00:00.000Z',
      generatedBy: null,
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
      lastSentAt: null,
      lastSentBy: null,
      lastEmailDeliveryId: null,
      lastSendError: null,
      createdAt: '2026-03-28T00:00:00.000Z',
      updatedAt: '2026-04-15T22:00:00.000Z'
    })

    const result = await getOrCreatePayrollExportPackageAssets('2026-03')

    // Must regenerate — not reuse the stale v1 buffers.
    expect(result.wasGenerated).toBe(true)
    expect(mockGeneratePayrollPeriodPdf).toHaveBeenCalled()
    expect(mockGeneratePayrollCsv).toHaveBeenCalled()
    expect(mockDownloadGreenhouseMediaAsset).not.toHaveBeenCalled()
    expect(result.pdfBuffer.toString()).toBe('pdf-v2-reliquidated')
    expect(result.csvBuffer.toString()).toContain('Post Reliq Member')
  })

  it('generates, persists, and sends the export-ready email', async () => {
    mockGetPayrollPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      year: 2026,
      month: 3,
      status: 'exported'
    } as any)
    mockGetPayrollEntries.mockResolvedValueOnce([
      { memberId: 'm1', grossTotal: 1200, netTotal: 900, currency: 'CLP', payRegime: 'chile', memberName: 'Ada Lovelace' },
      { memberId: 'm2', grossTotal: 500, netTotal: 420, currency: 'USD', payRegime: 'international', memberName: 'Grace Hopper' }
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
    expect(mockSendEmail).toHaveBeenCalledTimes(1)

    const call = mockSendEmail.mock.calls[0]?.[0]

    expect(call.emailType).toBe('payroll_export')
    expect(call.context.periodLabel).toBe('Marzo 2026')
    expect(call.context.entryCount).toBe(2)
    expect(call.attachments).toHaveLength(2)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// TASK-409 hotfix 2026-04-15 — content-freshness cache invariant.
//
// Reproduces the Marzo 2026 reliquidación bug where the email carried
// the v1 PDF/CSV because `canReuseStoredPackage` only validated template
// version + storage paths, ignoring whether the underlying payroll
// entries had been touched since the package was generated.
// ────────────────────────────────────────────────────────────────────────────

const buildFreshnessRecord = () => ({
  periodId: '2026-03',
  storageBucket: 'test-bucket',
  pdfAssetId: 'asset-pdf',
  csvAssetId: 'asset-csv',
  pdfStoragePath: 'payroll-export-packages/2026-03/payroll-2026-03.pdf',
  csvStoragePath: 'payroll-export-packages/2026-03/payroll-2026-03.csv',
  pdfFileSizeBytes: 4096,
  csvFileSizeBytes: 1024,
  pdfTemplateVersion: '2026-03-28.v1',
  csvTemplateVersion: '2026-03-28.v1',
  generatedAt: '2026-03-28T10:00:00.000Z',
  generatedBy: 'ops@example.com',
  deliveryStatus: 'sent' as const,
  deliveryAttempts: 1,
  lastSentAt: '2026-03-28T10:05:00.000Z',
  lastSentBy: 'ops@example.com',
  lastEmailDeliveryId: 'resend-123',
  lastSendError: null,
  createdAt: '2026-03-28T10:00:00.000Z',
  updatedAt: '2026-03-28T10:05:00.000Z'
})

describe('canReuseStoredPackage — content freshness invariant', () => {
  it('reuses when the latest active entry is older than the package', () => {
    const record = buildFreshnessRecord()

    expect(canReuseStoredPackage(record, '2026-03-27T15:00:00.000Z')).toBe(true)
  })

  it('reuses at the boundary when entry timestamp equals package generatedAt', () => {
    const record = buildFreshnessRecord()

    expect(canReuseStoredPackage(record, '2026-03-28T10:00:00.000Z')).toBe(true)
  })

  it('rejects when the latest active entry is newer than the package (reliquidation scenario)', () => {
    // Exact reproduction of the Marzo 2026 post-reliquidación state:
    // the original package was generated on 2026-03-28 but v2 entries
    // were superseded on 2026-04-15 via the supersede flow. The reuse
    // predicate must detect the newer entry and force regeneration.
    const record = buildFreshnessRecord()

    expect(canReuseStoredPackage(record, '2026-04-15T21:40:00.000Z')).toBe(false)
  })

  it('rejects when template version differs (pre-existing contract)', () => {
    const record = { ...buildFreshnessRecord(), pdfTemplateVersion: 'stale-v0' }

    expect(canReuseStoredPackage(record, '2026-03-27T15:00:00.000Z')).toBe(false)
  })

  it('rejects when csv storage path is missing (pre-existing contract)', () => {
    const record = { ...buildFreshnessRecord(), csvStoragePath: null }

    expect(canReuseStoredPackage(record, '2026-03-27T15:00:00.000Z')).toBe(false)
  })

  it('rejects when package has no generatedAt timestamp', () => {
    const record = { ...buildFreshnessRecord(), generatedAt: null }

    expect(canReuseStoredPackage(record, '2026-03-27T15:00:00.000Z')).toBe(false)
  })

  it('fail-safe: rejects when freshness query returned no data', () => {
    // If the freshness query fails to return a usable timestamp (e.g.
    // the period has no active entries at all), reject reuse rather
    // than serving a possibly-stale package.
    const record = buildFreshnessRecord()

    expect(canReuseStoredPackage(record, null)).toBe(false)
  })

  it('fail-safe: rejects on malformed timestamps', () => {
    const record = { ...buildFreshnessRecord(), generatedAt: 'not-a-date' }

    expect(canReuseStoredPackage(record, '2026-03-27T15:00:00.000Z')).toBe(false)
  })
})
