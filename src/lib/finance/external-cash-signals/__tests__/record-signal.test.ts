import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { recordSignal } from '@/lib/finance/external-cash-signals'
import type { RecordSignalInput } from '@/lib/finance/external-cash-signals'

const baseInput = (): RecordSignalInput => ({
  sourceSystem: 'nubox',
  sourceEventId: 'nubox-mvmt-3968935',
  sourcePayload: { foo: 'bar' },
  sourceObservedAt: new Date('2026-04-13T04:00:00Z'),
  documentKind: 'income',
  documentId: 'INC-NB-26639047',
  signalDate: '2026-04-13',
  amount: 6_902_000,
  currency: 'CLP',
  spaceId: 'space-1'
})

describe('TASK-708 D1 — recordSignal', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
  })

  it('throws when amount <= 0', async () => {
    const input = { ...baseInput(), amount: 0 }

    await expect(recordSignal(input)).rejects.toThrow(/amount must be > 0/)
  })

  it('throws when sourceSystem or sourceEventId is empty', async () => {
    await expect(recordSignal({ ...baseInput(), sourceSystem: '' })).rejects.toThrow(/sourceSystem/)
    await expect(recordSignal({ ...baseInput(), sourceEventId: '' })).rejects.toThrow(/sourceEventId/)
  })

  it('inserts and returns the new signal when no conflict', async () => {
    const insertedSignalId = 'signal-fresh'

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ signal_id: insertedSignalId }])
      .mockResolvedValueOnce([
        {
          signal_id: insertedSignalId,
          source_system: 'nubox',
          source_event_id: 'nubox-mvmt-3968935',
          source_payload_json: { foo: 'bar' },
          source_observed_at: new Date('2026-04-13T04:00:00Z'),
          document_kind: 'income',
          document_id: 'INC-NB-26639047',
          signal_date: '2026-04-13',
          amount: '6902000.00',
          currency: 'CLP',
          account_resolution_status: 'unresolved',
          resolved_account_id: null,
          resolved_at: null,
          resolved_by_user_id: null,
          resolution_method: null,
          promoted_payment_kind: null,
          promoted_payment_id: null,
          superseded_at: null,
          superseded_reason: null,
          space_id: 'space-1',
          observed_at: new Date('2026-04-13T04:00:00Z'),
          created_at: new Date('2026-04-13T04:00:00Z'),
          updated_at: new Date('2026-04-13T04:00:00Z')
        }
      ])

    const signal = await recordSignal(baseInput())

    expect(signal.signalId).toBe(insertedSignalId)
    expect(signal.amount).toBe(6_902_000)
    expect(signal.accountResolutionStatus).toBe('unresolved')
    expect(signal.documentId).toBe('INC-NB-26639047')
  })

  it('returns existing signal on idempotent re-run (conflict)', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          signal_id: 'signal-existing',
          source_system: 'nubox',
          source_event_id: 'nubox-mvmt-3968935',
          source_payload_json: { foo: 'bar' },
          source_observed_at: new Date('2026-04-13T04:00:00Z'),
          document_kind: 'income',
          document_id: 'INC-NB-26639047',
          signal_date: '2026-04-13',
          amount: '6902000.00',
          currency: 'CLP',
          account_resolution_status: 'unresolved',
          resolved_account_id: null,
          resolved_at: null,
          resolved_by_user_id: null,
          resolution_method: null,
          promoted_payment_kind: null,
          promoted_payment_id: null,
          superseded_at: null,
          superseded_reason: null,
          space_id: 'space-1',
          observed_at: new Date('2026-04-13T04:00:00Z'),
          created_at: new Date('2026-04-13T04:00:00Z'),
          updated_at: new Date('2026-04-13T04:00:00Z')
        }
      ])

    const signal = await recordSignal(baseInput())

    expect(signal.signalId).toBe('signal-existing')
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
    const lookupCall = mockRunGreenhousePostgresQuery.mock.calls[1]!

    expect(lookupCall[0]).toMatch(/WHERE source_system = \$1 AND source_event_id = \$2/)
    expect(lookupCall[1]).toEqual(['nubox', 'nubox-mvmt-3968935'])
  })
})
