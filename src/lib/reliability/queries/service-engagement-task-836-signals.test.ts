import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const captureMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

import { getServiceEngagementEngagementKindUnmappedSignal } from './service-engagement-engagement-kind-unmapped'
import { getServiceEngagementLifecycleStageUnknownSignal } from './service-engagement-lifecycle-stage-unknown'
import { getServiceEngagementLineageOrphanSignal } from './service-engagement-lineage-orphan'
import { getServiceEngagementRenewedStuckSignal } from './service-engagement-renewed-stuck'

beforeEach(() => {
  queryMock.mockReset()
  captureMock.mockReset()
})

describe('TASK-836 Slice 7 — 4 reliability signals', () => {
  describe('lifecycle_stage_unknown', () => {
    it('severity ok cuando count=0', async () => {
      queryMock.mockResolvedValue([{ n: 0 }])

      const signal = await getServiceEngagementLifecycleStageUnknownSignal()

      expect(signal.signalId).toBe('commercial.service_engagement.lifecycle_stage_unknown')
      expect(signal.kind).toBe('drift')
      expect(signal.moduleKey).toBe('commercial')
      expect(signal.severity).toBe('ok')
      expect(signal.summary).toContain('canónico')
    })

    it('severity error cuando count > 0', async () => {
      queryMock.mockResolvedValue([{ n: 3 }])

      const signal = await getServiceEngagementLifecycleStageUnknownSignal()

      expect(signal.severity).toBe('error')
      expect(signal.summary).toContain('3')
      expect(signal.summary).toContain('servicios quedaron')
    })

    it('singularización cuando count=1', async () => {
      queryMock.mockResolvedValue([{ n: 1 }])

      const signal = await getServiceEngagementLifecycleStageUnknownSignal()

      expect(signal.summary).toContain('servicio quedó')
    })

    it('severity unknown cuando query falla', async () => {
      queryMock.mockRejectedValue(new Error('PG down'))

      const signal = await getServiceEngagementLifecycleStageUnknownSignal()

      expect(signal.severity).toBe('unknown')
      expect(captureMock).toHaveBeenCalled()
    })

    it('SQL filtra por unmapped_reason=unknown_pipeline_stage', async () => {
      queryMock.mockResolvedValue([{ n: 0 }])

      await getServiceEngagementLifecycleStageUnknownSignal()

      const sql = queryMock.mock.calls[0]![0]

      expect(sql).toContain("unmapped_reason = 'unknown_pipeline_stage'")
      expect(sql).toContain("status != 'legacy_seed_archived'")
    })
  })

  describe('engagement_kind_unmapped', () => {
    it('severity ok cuando count=0', async () => {
      queryMock.mockResolvedValue([{ n: 0 }])

      const signal = await getServiceEngagementEngagementKindUnmappedSignal()

      expect(signal.signalId).toBe('commercial.service_engagement.engagement_kind_unmapped')
      expect(signal.severity).toBe('ok')
    })

    it('severity warning cuando count > 0', async () => {
      queryMock.mockResolvedValue([{ n: 5 }])

      const signal = await getServiceEngagementEngagementKindUnmappedSignal()

      expect(signal.severity).toBe('warning')
      expect(signal.summary).toContain('5')
      expect(signal.summary).toContain('clasificación')
    })

    it('SQL filtra por unmapped_reason + pipeline_stage validation', async () => {
      queryMock.mockResolvedValue([{ n: 0 }])

      await getServiceEngagementEngagementKindUnmappedSignal()

      const sql = queryMock.mock.calls[0]![0]

      expect(sql).toContain("unmapped_reason = 'missing_classification'")
      expect(sql).toContain("pipeline_stage = 'validation'")
    })
  })

  describe('renewed_stuck', () => {
    it('severity ok cuando count=0', async () => {
      queryMock.mockResolvedValue([{ n: 0 }])

      const signal = await getServiceEngagementRenewedStuckSignal()

      expect(signal.signalId).toBe('commercial.service_engagement.renewed_stuck')
      expect(signal.severity).toBe('ok')
    })

    it('severity warning cuando count > 0', async () => {
      queryMock.mockResolvedValue([{ n: 2 }])

      const signal = await getServiceEngagementRenewedStuckSignal()

      expect(signal.severity).toBe('warning')
      expect(signal.summary).toContain('60 días')
    })

    it('SQL aplica threshold 60 días', async () => {
      queryMock.mockResolvedValue([{ n: 0 }])

      await getServiceEngagementRenewedStuckSignal()

      const sql = queryMock.mock.calls[0]![0]

      expect(sql).toContain("pipeline_stage = 'renewed'")
      expect(sql).toContain('60 days')
      expect(sql).toContain('updated_at')
    })

    it('expone threshold_days en evidence', async () => {
      queryMock.mockResolvedValue([{ n: 0 }])

      const signal = await getServiceEngagementRenewedStuckSignal()

      expect(signal.evidence.find(e => e.label === 'threshold_days')?.value).toBe('60')
    })
  })

  describe('lineage_orphan', () => {
    it('severity ok cuando count=0 (steady state esperado)', async () => {
      queryMock.mockResolvedValue([{ n: 0 }])

      const signal = await getServiceEngagementLineageOrphanSignal()

      expect(signal.signalId).toBe('commercial.service_engagement.lineage_orphan')
      expect(signal.kind).toBe('data_quality')
      expect(signal.severity).toBe('ok')
    })

    it('severity error cuando count > 0 (defense-in-depth alert)', async () => {
      queryMock.mockResolvedValue([{ n: 1 }])

      const signal = await getServiceEngagementLineageOrphanSignal()

      expect(signal.severity).toBe('error')
      expect(signal.summary).toContain('lineage inválida')
    })

    it('SQL valida los 4 casos patológicos (self, missing, regular->regular, legacy)', async () => {
      queryMock.mockResolvedValue([{ n: 0 }])

      await getServiceEngagementLineageOrphanSignal()

      const sql = queryMock.mock.calls[0]![0]

      // Caso 1: self-reference
      expect(sql).toContain('s.parent_service_id = s.service_id')
      // Caso 2: parent missing
      expect(sql).toContain('NOT EXISTS')
      // Caso 3: regular -> regular
      expect(sql).toContain("p.engagement_kind = 'regular'")
      expect(sql).toContain("s.engagement_kind = 'regular'")
      // Caso 4: legacy
      expect(sql).toContain("p.status = 'legacy_seed_archived'")
    })
  })
})
