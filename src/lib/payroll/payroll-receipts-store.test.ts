import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockIsGreenhousePostgresConfigured = vi.fn(() => true)

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  isGreenhousePostgresConfigured: () => mockIsGreenhousePostgresConfigured(),
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

const PAYROLL_REQUIRED_TABLES = [
  'greenhouse_core.members',
  'greenhouse_core.client_users',
  'greenhouse_payroll.compensation_versions',
  'greenhouse_payroll.payroll_periods',
  'greenhouse_payroll.payroll_entries',
  'greenhouse_payroll.payroll_bonus_config',
  'greenhouse_payroll.payroll_receipts'
] as const

const seedReadyAndCapabilityChecks = (hasAssetIdColumn: boolean) => {
  mockRunGreenhousePostgresQuery
    .mockResolvedValueOnce(PAYROLL_REQUIRED_TABLES.map(qualified_name => ({ qualified_name })))
    .mockResolvedValueOnce(hasAssetIdColumn ? [{ exists: true }] : [])
}

describe('payroll-receipts-store schema compatibility', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRunGreenhousePostgresQuery.mockReset()
    mockIsGreenhousePostgresConfigured.mockReset()
    mockIsGreenhousePostgresConfigured.mockReturnValue(true)
  })

  it('persists receipt rows without asset_id when the legacy schema lacks that column', async () => {
    seedReadyAndCapabilityChecks(false)

    const { savePayrollReceipt } = await import('./payroll-receipts-store')

    await savePayrollReceipt({
      receiptId: 'receipt-1',
      entryId: 'entry-1',
      periodId: '2026-03',
      memberId: 'member-1',
      payRegime: 'chile',
      revision: 1,
      sourceEventId: 'event-1',
      status: 'generated',
      assetId: 'asset-1',
      storageBucket: 'greenhouse-private-assets-dev',
      storagePath: 'payroll-receipts/2026-03/member-1-r1.pdf',
      fileSizeBytes: 321_000,
      generatedAt: '2026-03-31T12:00:00.000Z',
      generatedBy: 'system',
      templateVersion: '2026-03-28.v1'
    })

    const insertCall = mockRunGreenhousePostgresQuery.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO greenhouse_payroll.payroll_receipts')
    )

    expect(insertCall).toBeTruthy()
    expect(String(insertCall?.[0])).not.toContain('asset_id')

    // 19 base columns + 2 TASK-759 (delivery_trigger + payment_order_line_id) = 21
    expect(insertCall?.[1]).toHaveLength(21)
    expect(insertCall?.[1]).not.toContain('asset-1')
    expect(insertCall?.[1]).toContain('greenhouse-private-assets-dev')
  })

  it('includes asset_id when the schema has already been upgraded', async () => {
    seedReadyAndCapabilityChecks(true)

    const { savePayrollReceipt } = await import('./payroll-receipts-store')

    await savePayrollReceipt({
      receiptId: 'receipt-2',
      entryId: 'entry-2',
      periodId: '2026-03',
      memberId: 'member-2',
      payRegime: 'international',
      revision: 2,
      sourceEventId: 'event-2',
      status: 'generated',
      assetId: 'asset-2',
      storageBucket: 'greenhouse-private-assets-dev',
      storagePath: 'payroll-receipts/2026-03/member-2-r2.pdf',
      fileSizeBytes: 654_000,
      generatedAt: '2026-03-31T12:30:00.000Z',
      generatedBy: 'system',
      templateVersion: '2026-03-28.v1'
    })

    const insertCall = mockRunGreenhousePostgresQuery.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO greenhouse_payroll.payroll_receipts')
    )

    expect(insertCall).toBeTruthy()
    expect(String(insertCall?.[0])).toContain('asset_id')

    // 20 base columns + 2 TASK-759 (delivery_trigger + payment_order_line_id) = 22
    expect(insertCall?.[1]).toHaveLength(22)
    expect(insertCall?.[1]).toContain('asset-2')
  })

  it('updates regenerated receipts without asset_id when the legacy schema lacks that column', async () => {
    seedReadyAndCapabilityChecks(false)

    const { updateReceiptAfterRegeneration } = await import('./payroll-receipts-store')

    await updateReceiptAfterRegeneration({
      receiptId: 'receipt-3',
      assetId: 'asset-3',
      storagePath: 'payroll-receipts/2026-03/member-3-r3.pdf',
      storageBucket: 'greenhouse-private-assets-dev',
      fileSizeBytes: 777_000,
      templateVersion: '2026-03-28.v2'
    })

    const updateCall = mockRunGreenhousePostgresQuery.mock.calls.find(call =>
      String(call[0]).includes('UPDATE greenhouse_payroll.payroll_receipts')
    )

    expect(updateCall).toBeTruthy()
    expect(String(updateCall?.[0])).not.toContain('asset_id = COALESCE')
    expect(updateCall?.[1]).toEqual([
      'receipt-3',
      'payroll-receipts/2026-03/member-3-r3.pdf',
      'greenhouse-private-assets-dev',
      777_000,
      '2026-03-28.v2'
    ])
  })

  it('updates regenerated receipts with asset_id when the schema has the column', async () => {
    seedReadyAndCapabilityChecks(true)

    const { updateReceiptAfterRegeneration } = await import('./payroll-receipts-store')

    await updateReceiptAfterRegeneration({
      receiptId: 'receipt-4',
      assetId: 'asset-4',
      storagePath: 'payroll-receipts/2026-03/member-4-r4.pdf',
      storageBucket: 'greenhouse-private-assets-dev',
      fileSizeBytes: 888_000,
      templateVersion: '2026-03-28.v2'
    })

    const updateCall = mockRunGreenhousePostgresQuery.mock.calls.find(call =>
      String(call[0]).includes('UPDATE greenhouse_payroll.payroll_receipts')
    )

    expect(updateCall).toBeTruthy()
    expect(String(updateCall?.[0])).toContain('asset_id = COALESCE($2, asset_id)')
    expect(updateCall?.[1]).toEqual([
      'receipt-4',
      'asset-4',
      'payroll-receipts/2026-03/member-4-r4.pdf',
      'greenhouse-private-assets-dev',
      888_000,
      '2026-03-28.v2'
    ])
  })
})
