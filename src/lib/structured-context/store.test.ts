import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockWithTransaction = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args)
}))

describe('structured context store', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockWithTransaction.mockReset()
  })

  it('creates a structured context document and its initial version', async () => {
    const createdRow = {
      context_id: 'ctx-1',
      public_id: 'EO-CTX-000001',
      owner_aggregate_type: 'source_sync_run',
      owner_aggregate_id: 'reactive-1',
      context_kind: 'event.replay_context',
      schema_version: 'v1',
      source_system: 'reactive_worker',
      producer_type: 'worker',
      producer_id: 'reactive-run-tracker',
      organization_id: null,
      client_id: null,
      space_id: null,
      data_classification: 'internal',
      access_scope: 'restricted_ops',
      retention_policy_code: 'ops_replay_90d',
      redaction_status: 'not_needed',
      contains_pii: false,
      contains_financial_context: false,
      content_hash: 'abc',
      idempotency_key: 'reactive-run:reactive-1:succeeded',
      current_version_number: 1,
      document_bytes: 120,
      expires_at: null,
      archived_at: null,
      created_at: new Date('2026-04-13T12:00:00Z'),
      updated_at: new Date('2026-04-13T12:00:00Z'),
      document_jsonb: {
        runId: 'reactive-1',
        status: 'succeeded',
        sourceSystem: 'reactive_worker'
      }
    }

    mockWithTransaction.mockImplementation(async (callback: (client: { query: typeof mockQuery }) => Promise<unknown>) =>
      callback({
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [createdRow] })
          .mockResolvedValueOnce({ rows: [] })
      })
    )

    const { createStructuredContext } = await import('./store')

    const result = await createStructuredContext({
      ownerAggregateType: 'source_sync_run',
      ownerAggregateId: 'reactive-1',
      contextKind: 'event.replay_context',
      sourceSystem: 'reactive_worker',
      producerType: 'worker',
      producerId: 'reactive-run-tracker',
      idempotencyKey: 'reactive-run:reactive-1:succeeded',
      document: {
        runId: 'reactive-1',
        status: 'succeeded',
        sourceSystem: 'reactive_worker'
      }
    })

    expect(result.contextId).toBe('ctx-1')
    expect(result.contextKind).toBe('event.replay_context')
    expect(mockWithTransaction).toHaveBeenCalledTimes(1)
  })

  it('loads the latest document by owner', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        context_id: 'ctx-1',
        public_id: 'EO-CTX-000001',
        owner_aggregate_type: 'source_sync_run',
        owner_aggregate_id: 'reactive-1',
        context_kind: 'event.replay_context',
        schema_version: 'v1',
        source_system: 'reactive_worker',
        producer_type: 'worker',
        producer_id: 'reactive-run-tracker',
        organization_id: null,
        client_id: null,
        space_id: null,
        data_classification: 'internal',
        access_scope: 'restricted_ops',
        retention_policy_code: 'ops_replay_90d',
        redaction_status: 'not_needed',
        contains_pii: false,
        contains_financial_context: false,
        content_hash: 'abc',
        idempotency_key: null,
        current_version_number: 1,
        document_bytes: 120,
        expires_at: null,
        archived_at: null,
        created_at: new Date('2026-04-13T12:00:00Z'),
        updated_at: new Date('2026-04-13T12:00:00Z'),
        document_jsonb: {
          runId: 'reactive-1',
          status: 'succeeded',
          sourceSystem: 'reactive_worker'
        }
      }
    ])

    const { getLatestStructuredContextByOwner } = await import('./store')

    const result = await getLatestStructuredContextByOwner({
      ownerAggregateType: 'source_sync_run',
      ownerAggregateId: 'reactive-1',
      contextKind: 'event.replay_context'
    })

    expect(result?.document.runId).toBe('reactive-1')
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('quarantines invalid documents before throwing', async () => {
    mockQuery.mockResolvedValueOnce([])

    const { createStructuredContext } = await import('./store')

    await expect(
      createStructuredContext({
        ownerAggregateType: 'source_sync_run',
        ownerAggregateId: 'reactive-1',
        contextKind: 'event.replay_context',
        sourceSystem: 'reactive_worker',
        producerType: 'worker',
        document: {
          runId: '',
          status: 'broken',
          sourceSystem: ''
        } as never
      })
    ).rejects.toThrow()

    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(String(mockQuery.mock.calls[0]?.[0])).toContain('context_document_quarantine')
  })
})
