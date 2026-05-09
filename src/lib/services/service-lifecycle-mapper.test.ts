import { describe, expect, it } from 'vitest'

import {
  KNOWN_HUBSPOT_STAGE_IDS,
  mapHubSpotStageToLifecycle
} from './service-lifecycle-mapper'

describe('mapHubSpotStageToLifecycle (TASK-836 Slice 3)', () => {
  describe('stage ID known mappings', () => {
    it('maps Onboarding stage ID', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageId: '8e2b21d0-7a90-4968-8f8c-a8525cc49c70'
      })

      expect(result).toEqual({
        resolved: true,
        pipelineStage: 'onboarding',
        status: 'active',
        active: true
      })
    })

    it('maps Activo stage ID -> active', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageId: '600b692d-a3fe-4052-9cd7-278b134d7941'
      })

      expect(result).toEqual({
        resolved: true,
        pipelineStage: 'active',
        status: 'active',
        active: true
      })
    })

    it('maps En renovacion stage ID -> renewal_pending', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageId: 'de53e7d9-6b57-4701-b576-92de01c9ed65'
      })

      expect(result).toEqual({
        resolved: true,
        pipelineStage: 'renewal_pending',
        status: 'active',
        active: true
      })
    })

    it('maps Renovado stage ID -> renewed transitorio (active=TRUE)', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageId: '1324827222'
      })

      expect(result).toEqual({
        resolved: true,
        pipelineStage: 'renewed',
        status: 'active',
        active: true
      })
    })

    it('maps Closed stage ID -> active=FALSE (no contamina P&L)', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageId: '1324827223'
      })

      expect(result).toEqual({
        resolved: true,
        pipelineStage: 'closed',
        status: 'closed',
        active: false
      })
    })

    it('maps Pausado stage ID -> active=FALSE (decision canonica TASK-836)', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageId: '1324827224'
      })

      expect(result).toEqual({
        resolved: true,
        pipelineStage: 'paused',
        status: 'paused',
        active: false
      })
    })
  })

  describe('stage label fallback', () => {
    it('maps Onboarding label cuando ID falta', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageLabel: 'Onboarding'
      })

      expect(result).toEqual({
        resolved: true,
        pipelineStage: 'onboarding',
        status: 'active',
        active: true
      })
    })

    it('maps Validacion / Sample Sprint label (con tilde) -> validation', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageLabel: 'Validación / Sample Sprint'
      })

      expect(result).toEqual({
        resolved: true,
        pipelineStage: 'validation',
        status: 'active',
        active: true
      })
    })

    it('maps En renovación con tilde', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageLabel: 'En renovación'
      })

      expect(result.resolved).toBe(true)

      if (result.resolved) {
        expect(result.pipelineStage).toBe('renewal_pending')
      }
    })
  })

  describe('unknown stage degraded honest', () => {
    it('returns unknown_pipeline_stage cuando ID desconocido', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageId: 'unknown-uuid-not-in-mapping'
      })

      expect(result).toEqual({
        resolved: false,
        reason: 'unknown_pipeline_stage',
        detail: 'unknown HubSpot stage ID: unknown-uuid-not-in-mapping',
        fallbackPipelineStage: 'paused',
        fallbackStatus: 'paused',
        fallbackActive: false
      })
    })

    it('returns unknown_pipeline_stage cuando solo viene label desconocido', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageLabel: 'Nueva Etapa Magica'
      })

      expect(result.resolved).toBe(false)

      if (!result.resolved) {
        expect(result.reason).toBe('unknown_pipeline_stage')
        expect(result.detail).toContain('Nueva Etapa Magica')
        expect(result.fallbackActive).toBe(false)
      }
    })

    it('returns unknown_pipeline_stage cuando NO viene ni ID ni label', () => {
      const result = mapHubSpotStageToLifecycle({})

      expect(result.resolved).toBe(false)

      if (!result.resolved) {
        expect(result.reason).toBe('unknown_pipeline_stage')
        expect(result.fallbackActive).toBe(false)
      }
    })

    it('returns unknown_pipeline_stage para strings vacios o solo whitespace', () => {
      const result1 = mapHubSpotStageToLifecycle({ hsPipelineStageId: '   ' })
      const result2 = mapHubSpotStageToLifecycle({ hsPipelineStageLabel: '' })

      expect(result1.resolved).toBe(false)
      expect(result2.resolved).toBe(false)
    })
  })

  describe('priority: stage ID gana sobre label', () => {
    it('cuando ambos vienen y ID es conocido, usa ID', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageId: '1324827223', // Closed
        hsPipelineStageLabel: 'Onboarding' // intencional discordancia
      })

      expect(result.resolved).toBe(true)

      if (result.resolved) {
        expect(result.pipelineStage).toBe('closed') // ID wins
      }
    })

    it('cuando ID es desconocido y label es conocido, usa label como fallback', () => {
      const result = mapHubSpotStageToLifecycle({
        hsPipelineStageId: 'unknown-id',
        hsPipelineStageLabel: 'Activo'
      })

      expect(result.resolved).toBe(true)

      if (result.resolved) {
        expect(result.pipelineStage).toBe('active')
      }
    })
  })

  describe('contract invariants', () => {
    it('expone los 6 stage IDs canonicos verificados pre-TASK-836', () => {
      // TASK-836 entrega los 6 IDs verificados 2026-05-08. La stage `validation`
      // se agrega cuando el operador ejecute el runbook.
      expect(KNOWN_HUBSPOT_STAGE_IDS).toHaveLength(6)
      expect(KNOWN_HUBSPOT_STAGE_IDS).toContain('8e2b21d0-7a90-4968-8f8c-a8525cc49c70')
      expect(KNOWN_HUBSPOT_STAGE_IDS).toContain('600b692d-a3fe-4052-9cd7-278b134d7941')
      expect(KNOWN_HUBSPOT_STAGE_IDS).toContain('de53e7d9-6b57-4701-b576-92de01c9ed65')
      expect(KNOWN_HUBSPOT_STAGE_IDS).toContain('1324827222')
      expect(KNOWN_HUBSPOT_STAGE_IDS).toContain('1324827223')
      expect(KNOWN_HUBSPOT_STAGE_IDS).toContain('1324827224')
    })

    it('NUNCA defaultea silenciosamente a active=TRUE', () => {
      // 100 random IDs unknown
      for (let i = 0; i < 50; i++) {
        const result = mapHubSpotStageToLifecycle({
          hsPipelineStageId: `random-${Math.random().toString(36).slice(2)}`
        })

        if (!result.resolved) {
          expect(result.fallbackActive).toBe(false)
        }
      }
    })
  })
})
