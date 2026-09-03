import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const sendManualTeamsAnnouncementMock = vi.fn()
const getSeoEtvMethodologyDriftSignalMock = vi.fn()
const captureWithDomainMock = vi.fn()

vi.mock('@/lib/communications/manual-teams-announcements', () => ({
  sendManualTeamsAnnouncement: sendManualTeamsAnnouncementMock
}))
vi.mock('@/lib/reliability/queries/seo-etv-methodology-drift', () => ({
  getSeoEtvMethodologyDriftSignal: getSeoEtvMethodologyDriftSignalMock
}))
vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: captureWithDomainMock
}))

const baseSignal = {
  signalId: 'seo.etv_methodology.drift',
  moduleKey: 'growth' as const,
  kind: 'drift' as const,
  source: 'getSeoEtvMethodologyDriftSignal',
  label: 'Metodología ETV configurada vs. solicitada',
  observedAt: '2026-09-03T12:00:00.000Z',
  evidence: [{ kind: 'metric' as const, label: 'divergences', value: '1' }]
}

describe('TASK-1806 — checkAndAlertSeoEtvMethodologyDrift', () => {
  beforeEach(() => {
    sendManualTeamsAnnouncementMock.mockReset()
    getSeoEtvMethodologyDriftSignalMock.mockReset()
    captureWithDomainMock.mockReset()
  })

  it('severity ok no alerta y no toca Teams', async () => {
    getSeoEtvMethodologyDriftSignalMock.mockResolvedValue({ ...baseSignal, severity: 'ok', summary: 'todo coherente' })

    const { checkAndAlertSeoEtvMethodologyDrift } = await import('../drift-alert')
    const result = await checkAndAlertSeoEtvMethodologyDrift()

    expect(result).toEqual({ severity: 'ok', summary: 'todo coherente', alerted: false, teamsError: null })
    expect(sendManualTeamsAnnouncementMock).not.toHaveBeenCalled()
  })

  it('severity warning no alerta (evidencia contractual reciente esperada, no es incidente)', async () => {
    getSeoEtvMethodologyDriftSignalMock.mockResolvedValue({ ...baseSignal, severity: 'warning', summary: 'runtime viejo' })

    const { checkAndAlertSeoEtvMethodologyDrift } = await import('../drift-alert')
    const result = await checkAndAlertSeoEtvMethodologyDrift()

    expect(result.alerted).toBe(false)
    expect(sendManualTeamsAnnouncementMock).not.toHaveBeenCalled()
  })

  it('severity awaiting_data no alerta (foundation sin rollout todavía, no es drift)', async () => {
    getSeoEtvMethodologyDriftSignalMock.mockResolvedValue({ ...baseSignal, severity: 'awaiting_data', summary: 'sin evidencia' })

    const { checkAndAlertSeoEtvMethodologyDrift } = await import('../drift-alert')
    const result = await checkAndAlertSeoEtvMethodologyDrift()

    expect(result.alerted).toBe(false)
    expect(sendManualTeamsAnnouncementMock).not.toHaveBeenCalled()
  })

  it('severity error envía a Teams con el destino canónico growth-seo-reliability-alerts', async () => {
    getSeoEtvMethodologyDriftSignalMock.mockResolvedValue({
      ...baseSignal,
      severity: 'error',
      summary: 'Drift de metodología ETV: ops-worker pidió legacy y este runtime configura improved.'
    })
    sendManualTeamsAnnouncementMock.mockResolvedValue({ ok: true, channelCode: 'growth-seo-reliability-watch', channelKind: 'channel', durationMs: 10, attempts: 1, fingerprint: 'x' })

    const { checkAndAlertSeoEtvMethodologyDrift } = await import('../drift-alert')
    const result = await checkAndAlertSeoEtvMethodologyDrift(new Date('2026-09-16T12:00:00.000Z'))

    expect(result.alerted).toBe(true)
    expect(result.teamsError).toBeNull()
    expect(sendManualTeamsAnnouncementMock).toHaveBeenCalledTimes(1)
    const call = sendManualTeamsAnnouncementMock.mock.calls[0][0]

    expect(call.destinationKey).toBe('growth-seo-reliability-alerts')
    expect(call.triggeredBy).toBe('cloud_scheduler')
    expect(call.paragraphs[0]).toContain('Drift de metodología ETV')
    expect(call.correlationId).toBe('seo-etv-methodology-drift-2026-09-16')
  })

  it('un envío fallido a Teams se degrada honesto: alerted=false + teamsError, sin lanzar', async () => {
    getSeoEtvMethodologyDriftSignalMock.mockResolvedValue({ ...baseSignal, severity: 'error', summary: 'drift real' })
    sendManualTeamsAnnouncementMock.mockResolvedValue({ ok: false, channelCode: 'growth-seo-reliability-watch', channelKind: 'channel', durationMs: 10, attempts: 3, reason: 'send_failed', detail: 'timeout' })

    const { checkAndAlertSeoEtvMethodologyDrift } = await import('../drift-alert')
    const result = await checkAndAlertSeoEtvMethodologyDrift()

    expect(result.alerted).toBe(false)
    expect(result.teamsError).toBe('send_failed: timeout')
    expect(captureWithDomainMock).toHaveBeenCalledTimes(1)
  })

  it('una excepción al enviar se captura y no se propaga', async () => {
    getSeoEtvMethodologyDriftSignalMock.mockResolvedValue({ ...baseSignal, severity: 'error', summary: 'drift real' })
    sendManualTeamsAnnouncementMock.mockRejectedValue(new Error('network down'))

    const { checkAndAlertSeoEtvMethodologyDrift } = await import('../drift-alert')
    const result = await checkAndAlertSeoEtvMethodologyDrift()

    expect(result.alerted).toBe(false)
    expect(result.teamsError).toBe('network down')
    expect(captureWithDomainMock).toHaveBeenCalledTimes(1)
  })
})
