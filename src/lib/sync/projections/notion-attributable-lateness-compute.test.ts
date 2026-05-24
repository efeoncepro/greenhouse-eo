import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  isAttributableLatenessOtdEnabled: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

vi.mock('@/lib/notion-metrics/status-transitions-flags', () => ({
  isAttributableLatenessOtdEnabled: mocks.isAttributableLatenessOtdEnabled
}))

import {
  notionAttributableLatenessComputeProjection,
  __testing__
} from './notion-attributable-lateness-compute'

const { reconstructFreezeIntervals, isDemoModePayload } = __testing__

const scope = { entityType: 'notion_task', entityId: 'task-1' }
const signal = { schemaVersion: 1, taskSourceId: 'task-1', workspaceId: 'efeonce' }

const routePg = (opts: {
  task?: Record<string, unknown> | null
  transitions?: { to_status: string; transitioned_at: string }[]
  reschedules?: { days_delta: number | null; reason_code: string; reason_source: string }[]
}) => {
  mocks.runGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM greenhouse_delivery.tasks')) {
      return opts.task === null ? [] : [opts.task ?? defaultTask]
    }

    if (sql.includes('FROM greenhouse_delivery.task_status_transitions')) {
      return opts.transitions ?? []
    }

    if (sql.includes('FROM greenhouse_delivery.task_due_date_changes')) {
      return opts.reschedules ?? []
    }

    return [] // INSERT
  })
}

const defaultTask = {
  task_status: 'Aprobado',
  due_date: '2026-05-10',
  original_due_date: '2026-05-10',
  completed_at: '2026-05-20',
  performance_indicator_code: 'late_drop'
}

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.isAttributableLatenessOtdEnabled.mockReset()
  mocks.isAttributableLatenessOtdEnabled.mockReturnValue(true)
})

describe('reconstructFreezeIntervals (TASK-922)', () => {
  it('reconstruye intervalos: entrada a freeze dura hasta la siguiente transición', () => {
    const intervals = reconstructFreezeIntervals([
      { toStatus: 'En curso', transitionedAt: '2026-05-01T00:00:00Z' },
      { toStatus: 'Bloqueado', transitionedAt: '2026-05-05T00:00:00Z' },
      { toStatus: 'En curso', transitionedAt: '2026-05-08T00:00:00Z' }
    ])

    expect(intervals).toHaveLength(1)
    expect(intervals[0].entered.toISOString()).toBe('2026-05-05T00:00:00.000Z')
    expect(intervals[0].exited?.toISOString()).toBe('2026-05-08T00:00:00.000Z')
  })

  it('aún en freeze al final → exited null', () => {
    const intervals = reconstructFreezeIntervals([
      { toStatus: 'En curso', transitionedAt: '2026-05-01T00:00:00Z' },
      { toStatus: 'En pausa', transitionedAt: '2026-05-05T00:00:00Z' }
    ])

    expect(intervals).toHaveLength(1)
    expect(intervals[0].exited).toBeNull()
  })

  it('los 3 estados de freeze cuentan; otros no', () => {
    const intervals = reconstructFreezeIntervals([
      { toStatus: 'Listo para revisión', transitionedAt: '2026-05-01T00:00:00Z' },
      { toStatus: 'Cambios solicitados', transitionedAt: '2026-05-03T00:00:00Z' },
      { toStatus: 'Bloqueado', transitionedAt: '2026-05-05T00:00:00Z' },
      { toStatus: 'En pausa', transitionedAt: '2026-05-07T00:00:00Z' },
      { toStatus: 'Aprobado', transitionedAt: '2026-05-09T00:00:00Z' }
    ])

    // Listo para revisión + Bloqueado + En pausa = 3 intervalos; Cambios solicitados NO.
    expect(intervals).toHaveLength(3)
  })
})

describe('isDemoModePayload', () => {
  it('strict demo_mode === true', () => {
    expect(isDemoModePayload({ metadata: { demo_mode: true } })).toBe(true)
    expect(isDemoModePayload(signal)).toBe(false)
  })
})

describe('TASK-922 — notion-attributable-lateness-compute', () => {
  it('flag OFF → noop sin queries', async () => {
    mocks.isAttributableLatenessOtdEnabled.mockReturnValue(false)

    const result = await notionAttributableLatenessComputeProjection.refresh(scope, signal)

    expect(result).toBe('noop:flag_off')
    expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
  })

  it('payload demo → skip', async () => {
    const result = await notionAttributableLatenessComputeProjection.refresh(scope, {
      ...signal,
      metadata: { demo_mode: true }
    })

    expect(result).toBeNull()
  })

  it('workspace faltante → null', async () => {
    const result = await notionAttributableLatenessComputeProjection.refresh(scope, {
      ...signal,
      workspaceId: ''
    })

    expect(result).toBeNull()
  })

  it('task no encontrada → skip', async () => {
    routePg({ task: null })

    const result = await notionAttributableLatenessComputeProjection.refresh(scope, signal)

    expect(result).toContain('skip:task_not_found')
  })

  it('happy path: persiste bucket + freeze descontado', async () => {
    // late 10 días, freeze 4 (Bloqueado 05-12 → 05-16) → atraso 6, late_drop
    routePg({
      transitions: [
        { to_status: 'En curso', transitioned_at: '2026-05-08T00:00:00Z' },
        { to_status: 'Bloqueado', transitioned_at: '2026-05-12T00:00:00Z' },
        { to_status: 'En curso', transitioned_at: '2026-05-16T00:00:00Z' },
        { to_status: 'Aprobado', transitioned_at: '2026-05-20T00:00:00Z' }
      ]
    })

    const result = await notionAttributableLatenessComputeProjection.refresh(scope, signal)

    expect(result).toContain('task_attributable_lateness_shadow:efeonce:task-1:valid')
    const insert = mocks.runGreenhousePostgresQuery.mock.calls.find(c => String(c[0]).includes('INSERT'))
    const params = insert![1] as unknown[]

    expect(params[3]).toBe(6) // attributable_days_late
    expect(params[4]).toBe(4) // frozen_days_excluded
    expect(params[5]).toBe('late_drop') // bucket_attributable
    expect(params[6]).toBe('late_drop') // bucket_no_freeze (still late even sin freeze)
    expect(params[7]).toBe('late_drop') // bucket_legacy (performance_indicator_code)
    expect(params[8]).toBe('valid') // data_status
  })

  it('freeze cubre el slip → bucket_attributable on_time vs bucket_no_freeze late_drop (divergencia)', async () => {
    routePg({
      transitions: [
        { to_status: 'En curso', transitioned_at: '2026-05-08T00:00:00Z' },
        { to_status: 'Bloqueado', transitioned_at: '2026-05-10T00:00:00Z' },
        { to_status: 'Aprobado', transitioned_at: '2026-05-20T00:00:00Z' }
      ]
    })

    const result = await notionAttributableLatenessComputeProjection.refresh(scope, signal)

    expect(result).toContain(':valid')
    const insert = mocks.runGreenhousePostgresQuery.mock.calls.find(c => String(c[0]).includes('INSERT'))
    const params = insert![1] as unknown[]

    // freeze 05-10→05-20 (10 días) cubre todo el slip → on_time
    expect(params[5]).toBe('on_time') // bucket_attributable
    expect(params[6]).toBe('late_drop') // bucket_no_freeze → divergencia POR freeze
  })

  it('error en query → throw + captureWithDomain', async () => {
    mocks.runGreenhousePostgresQuery.mockRejectedValue(new Error('pg down'))

    await expect(notionAttributableLatenessComputeProjection.refresh(scope, signal)).rejects.toThrow('pg down')
    expect(mocks.captureWithDomain).toHaveBeenCalled()
  })
})
