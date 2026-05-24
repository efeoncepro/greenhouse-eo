import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PRODUCTIVE_TAREAS_DATA_SOURCE_IDS } from '@/lib/notion-metrics/notion-productive-workspaces'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  fetchPageDueDate: vi.fn(),
  isNotionDueDateCaptureEnabled: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

vi.mock('@/lib/space-notion/notion-client', () => ({
  fetchPageDueDate: mocks.fetchPageDueDate
}))

vi.mock('@/lib/notion-metrics/status-transitions-flags', () => ({
  isNotionDueDateCaptureEnabled: mocks.isNotionDueDateCaptureEnabled
}))

import {
  notionDueDateChangeCaptureProjection,
  computeDaysDelta,
  isDemoModePayload
} from './notion-due-date-change-capture'

const EFEONCE_DS = PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.efeonce

const scope = { entityType: 'notion_task', entityId: 'task-1' }

const signal = {
  schemaVersion: 1,
  taskSourceId: 'task-1',
  changedPropertyIds: ['dueId'],
  parentId: EFEONCE_DS,
  sourceEventId: 'evt-1',
  occurredAt: '2026-05-24T10:00:00Z'
}

// Helper: route the PG mock per query kind.
const routePgMock = (opts: {
  prior?: { change_id: string; new_due_date: string | null; reason_code: string; reason_source: string } | null
  recentTransitions?: { to_status: string; transitioned_at: string }[]
}) => {
  mocks.runGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM greenhouse_delivery.task_due_date_changes')) {
      return opts.prior ? [opts.prior] : []
    }

    if (sql.includes('FROM greenhouse_delivery.task_status_transitions')) {
      return opts.recentTransitions ?? []
    }

    // INSERT / UPDATE
    return []
  })
}

const page = (overrides: Partial<{
  dueDate: string | null
  originalDueDate: string | null
  statusName: string | null
  rescheduleReasonLabel: string | null
  parentDataSourceId: string | null
}> = {}) => ({
  dueDate: '2026-05-30',
  originalDueDate: null,
  statusName: 'En curso',
  rescheduleReasonLabel: null,
  lastEditedTime: '2026-05-24T10:00:00Z',
  lastEditedBy: 'user-1',
  parentDataSourceId: EFEONCE_DS,
  ...overrides
})

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.fetchPageDueDate.mockReset()
  mocks.isNotionDueDateCaptureEnabled.mockReset()
  mocks.isNotionDueDateCaptureEnabled.mockReturnValue(true)
})

describe('computeDaysDelta', () => {
  it('diff en días entre dos fechas', () => {
    expect(computeDaysDelta('2026-05-20', '2026-05-30')).toBe(10)
    expect(computeDaysDelta('2026-05-30', '2026-05-20')).toBe(-10)
    expect(computeDaysDelta('2026-05-30', '2026-05-30')).toBe(0)
  })

  it('null si alguna fecha es null o inválida', () => {
    expect(computeDaysDelta(null, '2026-05-30')).toBeNull()
    expect(computeDaysDelta('2026-05-30', null)).toBeNull()
    expect(computeDaysDelta('not-a-date', '2026-05-30')).toBeNull()
  })
})

describe('isDemoModePayload', () => {
  it('strict demo_mode === true', () => {
    expect(isDemoModePayload({ metadata: { demo_mode: true } })).toBe(true)
    expect(isDemoModePayload({ metadata: { demo_mode: 'true' } })).toBe(false)
    expect(isDemoModePayload(signal)).toBe(false)
  })
})

describe('TASK-921 — notion-due-date-change-capture', () => {
  it('flag OFF → noop sin re-fetch', async () => {
    mocks.isNotionDueDateCaptureEnabled.mockReturnValue(false)

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toBe('noop:flag_off')
    expect(mocks.fetchPageDueDate).not.toHaveBeenCalled()
  })

  it('payload demo → skip (defense in depth)', async () => {
    const result = await notionDueDateChangeCaptureProjection.refresh(scope, {
      ...signal,
      metadata: { demo_mode: true }
    })

    expect(result).toBeNull()
    expect(mocks.fetchPageDueDate).not.toHaveBeenCalled()
  })

  it('campos faltantes → null + captureWithDomain', async () => {
    const result = await notionDueDateChangeCaptureProjection.refresh(scope, {
      ...signal,
      sourceEventId: ''
    })

    expect(result).toBeNull()
    expect(mocks.captureWithDomain).toHaveBeenCalled()
  })

  it('página borrada (null) → skip:page_deleted', async () => {
    mocks.fetchPageDueDate.mockResolvedValue(null)

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toContain('skip:page_deleted')
  })

  it('workspace no productivo → skip:not_productive_workspace', async () => {
    mocks.fetchPageDueDate.mockResolvedValue(page({ parentDataSourceId: 'some-other-ds' }))
    routePgMock({})

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toContain('skip:not_productive_workspace')
  })

  it('primera observación con Fecha límite original distinta → baseline backfilled + inferencia', async () => {
    mocks.fetchPageDueDate.mockResolvedValue(
      page({ dueDate: '2026-05-30', originalDueDate: '2026-05-20', statusName: 'En pausa' })
    )
    routePgMock({ prior: null, recentTransitions: [] })

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toContain('task_due_date_changes:baseline')
    const insert = mocks.runGreenhousePostgresQuery.mock.calls.find(c => String(c[0]).includes('INSERT'))

    expect(insert).toBeDefined()
    const params = insert![1] as unknown[]

    // previous=original, new=current, status, reason inferido (En pausa → internal_not_prioritized), source backfilled
    expect(params[2]).toBe('2026-05-20') // previous_due_date
    expect(params[3]).toBe('2026-05-30') // new_due_date
    expect(params[4]).toBe(10) // days_delta
    expect(params[6]).toBe('internal_not_prioritized') // reason_code
    expect(params[7]).toBe('inferred') // reason_source
    expect(params[12]).toBe('backfilled') // source_quality
  })

  it('primera observación sin fecha ni original → noop:no_due_date_yet', async () => {
    mocks.fetchPageDueDate.mockResolvedValue(page({ dueDate: null, originalDueDate: null }))
    routePgMock({ prior: null })

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toContain('noop:no_due_date_yet')
  })

  it('reprogramación real observada → persist canonical + inferencia', async () => {
    mocks.fetchPageDueDate.mockResolvedValue(
      page({ dueDate: '2026-06-05', statusName: 'En curso' })
    )
    routePgMock({
      prior: { change_id: 'c1', new_due_date: '2026-05-30', reason_code: 'unspecified', reason_source: 'inferred' },
      recentTransitions: [{ to_status: 'Cambios solicitados', transitioned_at: '2026-05-24T09:00:00Z' }]
    })

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toContain('task_due_date_changes:efeonce:task-1')
    const insert = mocks.runGreenhousePostgresQuery.mock.calls.find(c => String(c[0]).includes('INSERT'))
    const params = insert![1] as unknown[]

    expect(params[2]).toBe('2026-05-30') // previous = last new
    expect(params[3]).toBe('2026-06-05') // new = current
    expect(params[6]).toBe('client_requested') // inferido por transición a Cambios solicitados
    expect(params[7]).toBe('inferred')
    expect(params[12]).toBe('canonical')
  })

  it('reprogramación con motivo confirmado por operador → operator_confirmed (sin inferencia)', async () => {
    mocks.fetchPageDueDate.mockResolvedValue(
      page({ dueDate: '2026-06-05', rescheduleReasonLabel: 'Cambio de alcance' })
    )
    routePgMock({
      prior: { change_id: 'c1', new_due_date: '2026-05-30', reason_code: 'unspecified', reason_source: 'inferred' }
    })

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toContain('task_due_date_changes:efeonce:task-1')
    const insert = mocks.runGreenhousePostgresQuery.mock.calls.find(c => String(c[0]).includes('INSERT'))
    const params = insert![1] as unknown[]

    expect(params[6]).toBe('scope_change') // operator label → code
    expect(params[7]).toBe('operator_confirmed')
    expect(params[8]).toBeNull() // confidence null cuando confirmado

    // NO debió consultar transiciones recientes (sin inferencia)
    const transitionsCall = mocks.runGreenhousePostgresQuery.mock.calls.find(c =>
      String(c[0]).includes('FROM greenhouse_delivery.task_status_transitions')
    )

    expect(transitionsCall).toBeUndefined()
  })

  it('fecha sin cambio + motivo confirmado → UPDATE reason_confirmed', async () => {
    mocks.fetchPageDueDate.mockResolvedValue(
      page({ dueDate: '2026-05-30', rescheduleReasonLabel: 'Solicitud del cliente' })
    )
    routePgMock({
      prior: { change_id: 'c9', new_due_date: '2026-05-30', reason_code: 'unspecified', reason_source: 'inferred' }
    })

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toContain('task_due_date_changes:reason_confirmed:task-1:c9')
    const update = mocks.runGreenhousePostgresQuery.mock.calls.find(c => String(c[0]).includes('UPDATE'))

    expect(update).toBeDefined()
    expect((update![1] as unknown[])[0]).toBe('client_requested')
  })

  it('fecha sin cambio + sin motivo nuevo → noop:unchanged', async () => {
    mocks.fetchPageDueDate.mockResolvedValue(page({ dueDate: '2026-05-30' }))
    routePgMock({
      prior: { change_id: 'c1', new_due_date: '2026-05-30', reason_code: 'unspecified', reason_source: 'inferred' }
    })

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toContain('noop:unchanged')
  })

  it('fecha sin cambio + motivo ya confirmado idéntico → noop:unchanged', async () => {
    mocks.fetchPageDueDate.mockResolvedValue(
      page({ dueDate: '2026-05-30', rescheduleReasonLabel: 'Solicitud del cliente' })
    )
    routePgMock({
      prior: { change_id: 'c1', new_due_date: '2026-05-30', reason_code: 'client_requested', reason_source: 'operator_confirmed' }
    })

    const result = await notionDueDateChangeCaptureProjection.refresh(scope, signal)

    expect(result).toContain('noop:unchanged')
  })

  it('re-fetch error → throw + captureWithDomain', async () => {
    mocks.fetchPageDueDate.mockRejectedValue(new Error('429'))

    await expect(notionDueDateChangeCaptureProjection.refresh(scope, signal)).rejects.toThrow('429')
    expect(mocks.captureWithDomain).toHaveBeenCalled()
  })
})
