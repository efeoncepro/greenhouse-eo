/**
 * TASK-1171 Slice 5 — getClientIcoSyncStatus (verify-ICO preflight).
 * Fija la escalera connected/enabled/calculating ("configurado != fluyendo").
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getClientIcoSyncStatus } from './get-client-ico-sync-status'

const canMock = vi.fn()
const runQueryMock = vi.fn()
const bqQueryMock = vi.fn()
const captureMock = vi.fn()

vi.mock('@/lib/entitlements/runtime', () => ({ can: (...args: unknown[]) => canMock(...args) }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: () => ({ userId: 'u-1', routeGroups: ['internal'] })
}))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))
vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({ query: (...args: unknown[]) => bqQueryMock(...args) }),
  getBigQueryProjectId: () => 'efeonce-group'
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: (...args: unknown[]) => captureMock(...args) }))

const tenant = { userId: 'u-1' } as never
const spaceRow = [{ space_id: 'sp-1', space_name: 'Cliente X', client_id: 'cli-1' }]

beforeEach(() => {
  vi.clearAllMocks()
  canMock.mockReturnValue(true)
})

describe('getClientIcoSyncStatus', () => {
  it('forbidden sin capability', async () => {
    canMock.mockReturnValue(false)
    const out = await getClientIcoSyncStatus({ tenant, clientId: 'cli-1' })

    expect(out).toEqual({ ok: false, errorCode: 'forbidden' })
  })

  it('client_not_found cuando no hay space', async () => {
    runQueryMock.mockResolvedValueOnce([])
    const out = await getClientIcoSyncStatus({ tenant, clientId: 'cli-x' })

    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.errorCode).toBe('ico_sync_client_not_found')
  })

  it('not_connected cuando el space no tiene source', async () => {
    runQueryMock.mockResolvedValueOnce(spaceRow).mockResolvedValueOnce([]) // space, source vacío
    const out = await getClientIcoSyncStatus({ tenant, clientId: 'cli-1' })

    expect(out.ok).toBe(true)

    if (out.ok) {
      expect(out.stage).toBe('not_connected')
      expect(out.connected).toBe(false)
    }

    expect(bqQueryMock).not.toHaveBeenCalled()
  })

  it('connected_not_enabled cuando source existe pero sync_enabled=false', async () => {
    runQueryMock.mockResolvedValueOnce(spaceRow).mockResolvedValueOnce([{ sync_enabled: false, last_synced_at: null }])
    const out = await getClientIcoSyncStatus({ tenant, clientId: 'cli-1' })

    expect(out.ok).toBe(true)

    if (out.ok) {
      expect(out.stage).toBe('connected_not_enabled')
      expect(out.enabled).toBe(false)
    }
  })

  it('enabled_not_calculating cuando está activo pero sin métricas del período', async () => {
    runQueryMock.mockResolvedValueOnce(spaceRow).mockResolvedValueOnce([{ sync_enabled: true, last_synced_at: null }])
    bqQueryMock.mockResolvedValueOnce([[{ current_rows: 0, current_tasks: null, current_otd: null, last_period_key: null }]])
    const out = await getClientIcoSyncStatus({ tenant, clientId: 'cli-1' })

    expect(out.ok).toBe(true)

    if (out.ok) {
      expect(out.stage).toBe('enabled_not_calculating')
      expect(out.calculating).toBe(false)
    }
  })

  it('calculating cuando hay métricas del período vigente', async () => {
    runQueryMock.mockResolvedValueOnce(spaceRow).mockResolvedValueOnce([{ sync_enabled: true, last_synced_at: '2026-06-19T00:00:00Z' }])
    bqQueryMock.mockResolvedValueOnce([[{ current_rows: 1, current_tasks: 84, current_otd: 77.3, last_period_key: 202606 }]])
    const out = await getClientIcoSyncStatus({ tenant, clientId: 'cli-1' })

    expect(out.ok).toBe(true)

    if (out.ok) {
      expect(out.stage).toBe('calculating')
      expect(out.calculating).toBe(true)
      expect(out.currentTotalTasks).toBe(84)
      expect(out.currentOtdPct).toBe(77.3)
    }
  })

  it('calculating=null (honest degradation) cuando BQ falla', async () => {
    runQueryMock.mockResolvedValueOnce(spaceRow).mockResolvedValueOnce([{ sync_enabled: true, last_synced_at: null }])
    bqQueryMock.mockRejectedValueOnce(new Error('bq down'))
    const out = await getClientIcoSyncStatus({ tenant, clientId: 'cli-1' })

    expect(out.ok).toBe(true)

    if (out.ok) {
      expect(out.calculating).toBeNull()
      expect(out.stage).toBe('enabled_not_calculating')
    }

    expect(captureMock).toHaveBeenCalled()
  })
})
