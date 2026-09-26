import { describe, expect, it, vi } from 'vitest'

import type { ReliabilitySignal } from '@/types/reliability'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/communications/manual-teams-announcements', () => ({ sendManualTeamsAnnouncement: vi.fn() }))
vi.mock('@/lib/reliability/queries/marketing-studio-health', () => ({ getMarketingStudioHealthSignal: vi.fn() }))

const signal = (severity: ReliabilitySignal['severity']): ReliabilitySignal => ({
  signalId: 'platform.marketing_studio.health',
  moduleKey: 'platform',
  kind: 'runtime',
  source: 'test',
  label: 'Efeonce Marketing Studio — salud',
  severity,
  summary: `estado ${severity}`,
  observedAt: '2026-09-26T12:00:00.000Z',
  evidence: [
    { kind: 'metric', label: 'restore_rehearsal', value: 'restore_rehearsal=down(last_rehearsal_failed)' },
    { kind: 'doc', label: 'Spec', value: 'docs/x.md' }
  ]
})

const run = async (severity: ReliabilitySignal['severity'], sendResult: unknown = { ok: true }) => {
  const { checkAndAlertMarketingStudioHealth } = await import('./health-alert')
  const send = vi.fn(async () => sendResult)
  const result = await checkAndAlertMarketingStudioHealth(new Date('2026-09-26T15:00:00Z'), { getSignal: async () => signal(severity), send: send as never })

  return { result, send }
}

describe('checkAndAlertMarketingStudioHealth', () => {
  it('avisa a Teams sólo en error, al destino de Studio en «EO - Admin»', async () => {
    const { result, send } = await run('error')

    expect(result.alerted).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationKey: 'marketing-studio-reliability-alerts',
        triggeredBy: 'cloud_scheduler',
        correlationId: 'marketing-studio-health-2026-09-26',
        paragraphs: expect.arrayContaining(['restore_rehearsal: restore_rehearsal=down(last_rehearsal_failed)'])
      })
    )
  })

  it.each(['ok', 'warning', 'unknown'] as const)('no envía nada en %s', async severity => {
    const { result, send } = await run(severity)

    expect(result.alerted).toBe(false)
    expect(send).not.toHaveBeenCalled()
  })

  it('un fallo de Teams no revienta: alerted=false con el motivo', async () => {
    const { result } = await run('error', { ok: false, reason: 'http_error', detail: '403' })

    expect(result).toMatchObject({ alerted: false, teamsError: 'http_error: 403' })
  })
})
