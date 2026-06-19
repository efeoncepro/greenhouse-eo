/**
 * TASK-1171 Slice 3 — enableClientIcoSync (command gobernado).
 *
 * Fija el contrato: capability gate, resolución, idempotencia y outbox-on-transition.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { enableClientIcoSync } from './enable-client-ico-sync'

const canMock = vi.fn()
const runQueryMock = vi.fn()
const txMock = vi.fn()
const publishOutboxMock = vi.fn()
const bqQueryMock = vi.fn()
const captureMock = vi.fn()
const refreshGovernanceMock = vi.fn()

vi.mock('@/lib/entitlements/runtime', () => ({ can: (...args: unknown[]) => canMock(...args) }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: () => ({ userId: 'u-1', roleCodes: ['efeonce_admin'] })
}))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
  withGreenhousePostgresTransaction: (cb: (client: unknown) => unknown) => txMock(cb)
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: (...args: unknown[]) => publishOutboxMock(...args) }))
vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({ query: (...args: unknown[]) => bqQueryMock(...args) }),
  getBigQueryProjectId: () => 'efeonce-group'
}))
vi.mock('@/lib/space-notion/notion-governance', () => ({
  refreshSpaceNotionGovernance: (...args: unknown[]) => refreshGovernanceMock(...args)
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: (...args: unknown[]) => captureMock(...args) }))

const tenant = { userId: 'u-1' } as never

beforeEach(() => {
  vi.clearAllMocks()
  canMock.mockReturnValue(true)
  publishOutboxMock.mockResolvedValue('evt-1')
  bqQueryMock.mockResolvedValue([])
  refreshGovernanceMock.mockResolvedValue(undefined)
})

describe('enableClientIcoSync — capability gate', () => {
  it('forbidden cuando la capability no está concedida', async () => {
    canMock.mockReturnValue(false)
    const out = await enableClientIcoSync({ tenant, clientId: 'cli-1' })

    expect(out).toEqual({ ok: false, errorCode: 'forbidden' })
    expect(runQueryMock).not.toHaveBeenCalled()
  })
})

describe('enableClientIcoSync — resolución', () => {
  it('client_not_found cuando no hay clientId ni spaceId', async () => {
    const out = await enableClientIcoSync({ tenant })

    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.errorCode).toBe('ico_sync_client_not_found')
  })

  it('client_not_found cuando el cliente no tiene space activo', async () => {
    runQueryMock.mockResolvedValueOnce([]) // spaces
    const out = await enableClientIcoSync({ tenant, clientId: 'cli-x' })

    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.errorCode).toBe('ico_sync_client_not_found')
  })

  it('source_not_connected cuando el space no tiene Notion conectado', async () => {
    runQueryMock
      .mockResolvedValueOnce([{ space_id: 'sp-1', client_id: 'cli-1' }]) // spaces
      .mockResolvedValueOnce([]) // sources
    const out = await enableClientIcoSync({ tenant, clientId: 'cli-1' })

    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.errorCode).toBe('ico_sync_source_not_connected')
  })
})

describe('enableClientIcoSync — flip + idempotencia', () => {
  const wireSourceFound = (lockedSyncEnabled: boolean) => {
    runQueryMock
      .mockResolvedValueOnce([{ space_id: 'sp-1', client_id: 'cli-1' }]) // spaces
      .mockResolvedValueOnce([
        {
          source_id: 'sns-1',
          sync_enabled: lockedSyncEnabled,
          notion_db_proyectos: 'a'.repeat(32),
          notion_db_tareas: 'b'.repeat(32),
          notion_db_sprints: null,
          notion_db_revisiones: null
        }
      ]) // sources
    txMock.mockImplementation(async (cb: (client: unknown) => unknown) => {
      const client = {
        query: vi.fn().mockResolvedValue({ rows: [{ source_id: 'sns-1', sync_enabled: lockedSyncEnabled }] })
      }

      
return cb(client)
    })
  }

  it('flip FALSE→TRUE: alreadyEnabled=false, emite outbox, replica BQ', async () => {
    wireSourceFound(false)
    const out = await enableClientIcoSync({ tenant, clientId: 'cli-1', reason: 'onboarding Berel' })

    expect(out.ok).toBe(true)

    if (out.ok) {
      expect(out.alreadyEnabled).toBe(false)
      expect(out.bigQueryReplicated).toBe(true)
      expect(out.sourceId).toBe('sns-1')
    }

    expect(publishOutboxMock).toHaveBeenCalledTimes(1)
    expect(bqQueryMock).toHaveBeenCalledTimes(1)
  })

  it('ya activo: alreadyEnabled=true, NO emite outbox (no-op idempotente)', async () => {
    wireSourceFound(true)
    const out = await enableClientIcoSync({ tenant, clientId: 'cli-1' })

    expect(out.ok).toBe(true)
    if (out.ok) expect(out.alreadyEnabled).toBe(true)
    expect(publishOutboxMock).not.toHaveBeenCalled()
  })

  it('fallo de BigQuery NO tumba el command: bigQueryReplicated=false + capture', async () => {
    wireSourceFound(false)
    bqQueryMock.mockRejectedValueOnce(new Error('bq down'))
    const out = await enableClientIcoSync({ tenant, clientId: 'cli-1' })

    expect(out.ok).toBe(true)
    if (out.ok) expect(out.bigQueryReplicated).toBe(false)
    expect(captureMock).toHaveBeenCalled()
  })
})
