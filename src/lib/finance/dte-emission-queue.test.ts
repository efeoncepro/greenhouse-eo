import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { enqueueDteEmission, getDteEmissionQueueStats, markDteEmitted, markDteEmissionFailed } from './dte-emission-queue'

describe('dte-emission-queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Schema check passes
    mockRunGreenhousePostgresQuery.mockResolvedValue([])
  })

  it('enqueues a DTE emission with correct params', async () => {
    const queueId = await enqueueDteEmission('INC-2026-001', 'admin@efeoncepro.com')

    expect(queueId).toMatch(/^dte-q-/)
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO greenhouse_finance.dte_emission_queue'),
      expect.arrayContaining(['INC-2026-001', 'admin@efeoncepro.com'])
    )
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
