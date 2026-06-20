import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import {
  enqueueDteEmission,
  enqueueDteEmissionWithType,
  getDteEmissionQueueStats,
  markDteEmitted,
  markDteEmissionFailed,
  resetDteEmissionQueueSchemaForTests
} from './dte-emission-queue'

const DTE_QUEUE_COLUMNS = [
  'queue_id',
  'income_id',
  'requested_by',
  'dte_type_code',
  'status',
  'attempt_count',
  'max_attempts',
  'last_error',
  'next_retry_at',
  'created_at',
  'updated_at'
].map(column_name => ({ column_name }))

describe('dte-emission-queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetDteEmissionQueueSchemaForTests()

    // Governed schema validation passes by default.
    mockRunGreenhousePostgresQuery.mockResolvedValue(DTE_QUEUE_COLUMNS)
  })

  it('enqueues a DTE emission with correct params', async () => {
    const queueId = await enqueueDteEmission('INC-2026-001', 'admin@efeoncepro.com')

    expect(queueId).toMatch(/^dte-q-/)
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO greenhouse_finance.dte_emission_queue'),
      expect.arrayContaining(['INC-2026-001', 'admin@efeoncepro.com', '33'])
    )
    expect(mockRunGreenhousePostgresQuery.mock.calls.map(([sql]) => String(sql)).join('\n')).not.toMatch(
      /\b(CREATE|ALTER|DROP)\b/i
    )
  })

  it('enqueues a DTE emission with explicit type code when provided', async () => {
    const queueId = await enqueueDteEmissionWithType('INC-2026-002', 'admin@efeoncepro.com', '61')

    expect(queueId).toMatch(/^dte-q-/)
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO greenhouse_finance.dte_emission_queue'),
      expect.arrayContaining(['INC-2026-002', 'admin@efeoncepro.com', '61'])
    )
  })

  it('fails honestly when the governed DTE queue migration is missing', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce(
      DTE_QUEUE_COLUMNS.filter(row => row.column_name !== 'dte_type_code')
    )

    await expect(enqueueDteEmission('INC-2026-003', 'admin@efeoncepro.com')).rejects.toThrow(
      'dte_emission_queue is not provisioned'
    )
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
  })

  it('marks emission as emitted', async () => {
    await markDteEmitted('dte-q-123')

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'emitted'"),
      ['dte-q-123']
    )
  })

  it('marks emission as retry_scheduled when under max attempts', async () => {
    await markDteEmissionFailed('dte-q-123', 'Nubox API timeout', 1, 3)

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('status = $1'),
      expect.arrayContaining(['retry_scheduled', 'Nubox API timeout'])
    )
  })

  it('marks emission as dead_letter when at max attempts', async () => {
    await markDteEmissionFailed('dte-q-123', 'Permanent failure', 3, 3)

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('status = $1'),
      expect.arrayContaining(['dead_letter', 'Permanent failure'])
    )
  })

  it('returns queue stats grouped by status', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce(DTE_QUEUE_COLUMNS)
      .mockResolvedValueOnce([
        { status: 'pending', count: '3' },
        { status: 'emitted', count: '10' },
        { status: 'dead_letter', count: '1' }
      ])

    const stats = await getDteEmissionQueueStats()

    expect(stats.pending).toBe(3)
    expect(stats.emitted).toBe(10)
    expect(stats.deadLetter).toBe(1)
    expect(stats.retryScheduled).toBe(0)
  })
})
