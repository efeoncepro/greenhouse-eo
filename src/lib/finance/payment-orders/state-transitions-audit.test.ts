import { describe, expect, it, vi } from 'vitest'

import { recordPaymentOrderStateTransition } from './state-transitions-audit'

// TASK-765 Slice 6 unit tests. La funcion es un thin wrapper sobre INSERT
// + RETURNING — el comportamiento real (append-only, FK, indices, trigger
// del invariant matrix) lo enforce el schema PG y se cubre con tests
// integration en slice 8 + smoke staging.

describe('recordPaymentOrderStateTransition', () => {
  it('inserta una fila con campos canonicos y retorna el shape esperado', async () => {
    const fakeRow = {
      transition_id: 'pst-1234567890-por-abc-123',
      order_id: 'por-test-001',
      from_state: 'submitted',
      to_state: 'paid',
      occurred_at: '2026-05-02T18:00:00.000Z'
    }

    const client = {
      query: vi.fn().mockResolvedValue({ rows: [fakeRow] })
    } as unknown as Parameters<typeof recordPaymentOrderStateTransition>[1]

    const result = await recordPaymentOrderStateTransition(
      {
        orderId: 'por-test-001',
        fromState: 'submitted',
        toState: 'paid',
        actorUserId: 'user-julio-reyes',
        reason: 'mark_paid',
        metadata: { externalReference: 'EXT-123' }
      },
      client
    )

    expect(result.transitionId).toBe('pst-1234567890-por-abc-123')
    expect(result.orderId).toBe('por-test-001')
    expect(result.fromState).toBe('submitted')
    expect(result.toState).toBe('paid')
    expect(result.occurredAt).toBe('2026-05-02T18:00:00.000Z')

    expect(client.query).toHaveBeenCalledOnce()

    // Validar shape del INSERT statement: 7 placeholders + RETURNING.
    const [sql, params] = (client.query as ReturnType<typeof vi.fn>).mock.calls[0]

    expect(sql).toContain('INSERT INTO greenhouse_finance.payment_order_state_transitions')
    expect(sql).toContain('RETURNING')
    expect(params).toHaveLength(7)
    expect(params[1]).toBe('por-test-001')
    expect(params[2]).toBe('submitted')
    expect(params[3]).toBe('paid')
    expect(params[4]).toBe('user-julio-reyes')
    expect(params[5]).toBe('mark_paid')
    expect(JSON.parse(params[6] as string)).toEqual({ externalReference: 'EXT-123' })
  })

  it('soporta from_state="unknown_legacy" para backfill o recovery', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            transition_id: 'pst-test',
            order_id: 'por-zombie',
            from_state: 'unknown_legacy',
            to_state: 'paid',
            occurred_at: '2026-05-02T00:00:00Z'
          }
        ]
      })
    } as unknown as Parameters<typeof recordPaymentOrderStateTransition>[1]

    const result = await recordPaymentOrderStateTransition(
      {
        orderId: 'por-zombie',
        fromState: 'unknown_legacy',
        toState: 'paid',
        actorUserId: 'system:recovery_TASK-765',
        reason: 'recovery_TASK-765'
      },
      client
    )

    expect(result.fromState).toBe('unknown_legacy')
  })

  it('default metadata={} si no se provee', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            transition_id: 'pst-x',
            order_id: 'por-x',
            from_state: 'approved',
            to_state: 'submitted',
            occurred_at: '2026-05-02T00:00:00Z'
          }
        ]
      })
    } as unknown as Parameters<typeof recordPaymentOrderStateTransition>[1]

    await recordPaymentOrderStateTransition(
      {
        orderId: 'por-x',
        fromState: 'approved',
        toState: 'submitted',
        actorUserId: null,
        reason: 'submit'
      },
      client
    )

    const [, params] = (client.query as ReturnType<typeof vi.fn>).mock.calls[0]

    expect(JSON.parse(params[6] as string)).toEqual({})
  })
})
