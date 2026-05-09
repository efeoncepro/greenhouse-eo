import { beforeEach, describe, expect, it, vi } from 'vitest'

const checkIntegrationReadinessMock = vi.fn()
const syncNuboxToRawMock = vi.fn()
const syncNuboxToConformedMock = vi.fn()
const syncNuboxToPostgresMock = vi.fn()
const syncNuboxQuotesHotMock = vi.fn()
const alertCronFailureMock = vi.fn()

vi.mock('@/lib/integrations/readiness', () => ({
  checkIntegrationReadiness: (...args: unknown[]) => checkIntegrationReadinessMock(...args)
}))

vi.mock('@/lib/alerts/slack-notify', () => ({
  alertCronFailure: (...args: unknown[]) => alertCronFailureMock(...args)
}))

vi.mock('./sync-nubox-raw', () => ({
  syncNuboxToRaw: (...args: unknown[]) => syncNuboxToRawMock(...args)
}))

vi.mock('./sync-nubox-conformed', () => ({
  syncNuboxToConformed: (...args: unknown[]) => syncNuboxToConformedMock(...args)
}))

vi.mock('./sync-nubox-to-postgres', () => ({
  syncNuboxToPostgres: (...args: unknown[]) => syncNuboxToPostgresMock(...args)
}))

vi.mock('./sync-nubox-quotes-hot', () => ({
  syncNuboxQuotesHot: (...args: unknown[]) => syncNuboxQuotesHotMock(...args)
}))

import { runNuboxSyncOrchestration } from './sync-nubox-orchestrator'

beforeEach(() => {
  vi.clearAllMocks()
  checkIntegrationReadinessMock.mockResolvedValue({ ready: true })
})

describe('runNuboxSyncOrchestration', () => {
  it('returns succeeded when all phases are healthy', async () => {
    syncNuboxToRawMock.mockResolvedValueOnce({ status: 'succeeded', errors: [] })
    syncNuboxToConformedMock.mockResolvedValueOnce({ salesConformed: 1 })
    syncNuboxToPostgresMock.mockResolvedValueOnce({ incomeCreated: 1 })

    const result = await runNuboxSyncOrchestration()

    expect(result.status).toBe('succeeded')
    expect(result.phaseStatuses).toEqual({
      raw: 'succeeded',
      conformed: 'succeeded',
      postgres: 'succeeded'
    })
  })

  it('returns partial when raw fails but downstream best-effort phases succeed', async () => {
    syncNuboxToRawMock.mockResolvedValueOnce({
      status: 'failed',
      errors: ['sales: NUBOX_API_BASE_URL is not configured']
    })
    syncNuboxToConformedMock.mockResolvedValueOnce({ salesConformed: 72 })
    syncNuboxToPostgresMock.mockResolvedValueOnce({ incomeUpdated: 72 })

    const result = await runNuboxSyncOrchestration()

    expect(result.status).toBe('partial')
    expect(result.phaseStatuses?.raw).toBe('failed')
    expect(result.phaseStatuses?.conformed).toBe('succeeded')
    expect(result.phaseStatuses?.postgres).toBe('succeeded')
  })

  it('returns skipped when integration readiness is blocked', async () => {
    checkIntegrationReadinessMock.mockResolvedValueOnce({ ready: false, reason: 'disabled' })

    const result = await runNuboxSyncOrchestration()

    expect(result.status).toBe('skipped')
    expect(result.skipped).toBe(true)
    expect(syncNuboxToRawMock).not.toHaveBeenCalled()
  })
})
