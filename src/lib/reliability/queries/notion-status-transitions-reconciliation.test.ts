import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/db', () => ({ query: mocks.query }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.captureWithDomain }))
// normalizeTaskStatus is a pure canonical helper — NOT mocked (real behavior).

import {
  getNotionStatusTransitionsReconciliationSignal,
  RECORDED_VS_CURRENT_DRIFT_SIGNAL_ID
} from './notion-status-transitions-reconciliation'

beforeEach(() => {
  mocks.query.mockReset()
  mocks.captureWithDomain.mockReset()
})

const row = (current: string | null, last: string, ws = 'efeonce', id = 'task-uuid-aaaa') => ({
  task_source_id: id,
  workspace_id: ws,
  current_status: current,
  last_recorded: last
})

describe('TASK-919 #3 — reconciliation signal (recorded vs current drift)', () => {
  it('signalId + moduleKey canonical', async () => {
    mocks.query.mockResolvedValueOnce([])
    const s = await getNotionStatusTransitionsReconciliationSignal()

    expect(s.signalId).toBe(RECORDED_VS_CURRENT_DRIFT_SIGNAL_ID)
    expect(s.moduleKey).toBe('delivery')
    expect(s.kind).toBe('drift')
  })

  it('ok (steady) cuando no hay candidatos', async () => {
    mocks.query.mockResolvedValueOnce([])
    const s = await getNotionStatusTransitionsReconciliationSignal()

    expect(s.severity).toBe('ok')
    expect(s.evidence.find(e => e.label === 'drift_count')?.value).toBe('0')
  })

  it('ok cuando el current normaliza al mismo canonical que el last (sin drift real)', async () => {
    // current 'Cambios Solicitados' (capital S, alias) normaliza a 'Cambios solicitados'
    mocks.query.mockResolvedValueOnce([row('Cambios Solicitados', 'Cambios solicitados')])
    const s = await getNotionStatusTransitionsReconciliationSignal()

    expect(s.severity).toBe('ok')
    expect(s.evidence.find(e => e.label === 'drift_count')?.value).toBe('0')
    expect(s.evidence.find(e => e.label === 'candidates_evaluated')?.value).toBe('1')
  })

  it('warning cuando 1-5 tareas tienen drift real (status canonical difiere)', async () => {
    mocks.query.mockResolvedValueOnce([
      row('Cambios solicitados', 'Listo para revisión', 'efeonce', 'task-uuid-1111'),
      row('Aprobado', 'En curso', 'sky', 'task-uuid-2222')
    ])
    const s = await getNotionStatusTransitionsReconciliationSignal()

    expect(s.severity).toBe('warning')
    expect(s.evidence.find(e => e.label === 'drift_count')?.value).toBe('2')
    expect(s.evidence.find(e => e.label === 'samples')?.value).toContain('→')
  })

  it('error cuando > 5 tareas con drift', async () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      row('Cambios solicitados', 'Listo para revisión', 'efeonce', `task-uuid-${i}`)
    )

    mocks.query.mockResolvedValueOnce(rows)
    const s = await getNotionStatusTransitionsReconciliationSignal()

    expect(s.severity).toBe('error')
    expect(s.evidence.find(e => e.label === 'drift_count')?.value).toBe('6')
  })

  it('ignora current no canonical (no cuenta como drift de RpA)', async () => {
    mocks.query.mockResolvedValueOnce([row('Estado Inventado XYZ', 'Listo para revisión')])
    const s = await getNotionStatusTransitionsReconciliationSignal()

    expect(s.severity).toBe('ok')
    expect(s.evidence.find(e => e.label === 'drift_count')?.value).toBe('0')
  })

  it('unknown + captura cuando la query falla', async () => {
    mocks.query.mockRejectedValueOnce(new Error('PG down'))
    const s = await getNotionStatusTransitionsReconciliationSignal()

    expect(s.severity).toBe('unknown')
    expect(mocks.captureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'integrations.notion',
      expect.objectContaining({ tags: { source: 'reliability_signal_status_transitions_reconciliation' } })
    )
  })
})
