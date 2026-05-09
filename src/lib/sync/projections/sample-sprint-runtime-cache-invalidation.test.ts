import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/commercial/sample-sprints/projection-cache', () => ({
  clearProjectionCacheForService: vi.fn(() => 0)
}))

import { clearProjectionCacheForService } from '@/lib/commercial/sample-sprints/projection-cache'

import { sampleSprintRuntimeCacheInvalidationProjection } from './sample-sprint-runtime-cache-invalidation'

const mockedClear = clearProjectionCacheForService as unknown as ReturnType<typeof vi.fn>

describe('sampleSprintRuntimeCacheInvalidationProjection (TASK-835 Slice 6)', () => {
  beforeEach(() => {
    mockedClear.mockReset()
    mockedClear.mockReturnValue(0)
  })

  it('declara los 6 outbox events service.engagement.* como triggers', () => {
    expect(sampleSprintRuntimeCacheInvalidationProjection.triggerEvents).toEqual([
      'service.engagement.declared',
      'service.engagement.approved',
      'service.engagement.rejected',
      'service.engagement.capacity_overridden',
      'service.engagement.progress_snapshot_recorded',
      'service.engagement.outcome_recorded'
    ])
  })

  it('extractScope busca serviceId en payload con varias claves canónicas', () => {
    const def = sampleSprintRuntimeCacheInvalidationProjection

    expect(def.extractScope({ serviceId: 'svc-A' })).toEqual({ entityType: 'sample_sprint_runtime', entityId: 'svc-A' })
    expect(def.extractScope({ service_id: 'svc-B' })).toEqual({ entityType: 'sample_sprint_runtime', entityId: 'svc-B' })
    expect(def.extractScope({ aggregateId: 'svc-C' })).toEqual({ entityType: 'sample_sprint_runtime', entityId: 'svc-C' })
    expect(def.extractScope({ aggregate_id: 'svc-D' })).toEqual({ entityType: 'sample_sprint_runtime', entityId: 'svc-D' })
  })

  it('extractScope retorna null cuando payload no tiene serviceId (skip idempotente)', () => {
    const def = sampleSprintRuntimeCacheInvalidationProjection

    expect(def.extractScope({})).toBeNull()
    expect(def.extractScope({ otherField: 'x' })).toBeNull()
    expect(def.extractScope({ serviceId: '' })).toBeNull()
    expect(def.extractScope({ serviceId: '  ' })).toBeNull()
  })

  it('refresh invoca clearProjectionCacheForService con el serviceId', async () => {
    mockedClear.mockReturnValue(2)

    const result = await sampleSprintRuntimeCacheInvalidationProjection.refresh(
      { entityType: 'sample_sprint_runtime', entityId: 'svc-X' },
      {}
    )

    expect(mockedClear).toHaveBeenCalledWith('svc-X')
    expect(result).toContain('cleared 2')
    expect(result).toContain('svc-X')
  })

  it('refresh es idempotente cuando no hay entries en cache', async () => {
    mockedClear.mockReturnValue(0)

    const result = await sampleSprintRuntimeCacheInvalidationProjection.refresh(
      { entityType: 'sample_sprint_runtime', entityId: 'svc-Y' },
      {}
    )

    expect(result).toContain('cleared 0')
  })
})
