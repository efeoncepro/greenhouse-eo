import { describe, expect, it } from 'vitest'

import { resolveTimeToMarketMetric } from '@/lib/ico-engine/time-to-market'

describe('resolveTimeToMarketMetric', () => {
  it('returns degraded contract when start uses proxy evidence and activation is observed', () => {
    const result = resolveTimeToMarketMetric({
      startCandidates: [
        {
          date: '2026-04-01',
          label: 'Primera tarea en fase de briefing',
          source: 'greenhouse_conformed.delivery_tasks.created_at',
          mode: 'proxy'
        }
      ],
      activationCandidates: [
        {
          date: '2026-04-11',
          label: 'Fecha real de lanzamiento',
          source: 'greenhouse_core.campaigns.actual_launch_date',
          mode: 'observed'
        }
      ]
    })

    expect(result.valueDays).toBe(10)
    expect(result.dataStatus).toBe('degraded')
    expect(result.confidenceLevel).toBe('medium')
    expect(result.qualityGateReasons).toContain('inicio usando proxy operativo: Primera tarea en fase de briefing.')
  })

  it('returns available contract when both events are observed', () => {
    const result = resolveTimeToMarketMetric({
      startCandidates: [
        {
          date: '2026-03-01',
          label: 'Brief efectivo aprobado',
          source: 'greenhouse_core.brief_effective_at',
          mode: 'observed'
        }
      ],
      activationCandidates: [
        {
          date: '2026-03-08',
          label: 'Asset activado',
          source: 'greenhouse_core.activation_evidence',
          mode: 'observed'
        }
      ]
    })

    expect(result.valueDays).toBe(7)
    expect(result.dataStatus).toBe('available')
    expect(result.confidenceLevel).toBe('high')
    expect(result.qualityGateReasons).toEqual([])
  })

  it('returns unavailable when activation happens before start', () => {
    const result = resolveTimeToMarketMetric({
      startCandidates: [
        {
          date: '2026-04-15',
          label: 'Inicio proxy',
          source: 'greenhouse_conformed.delivery_projects.start_date',
          mode: 'proxy'
        }
      ],
      activationCandidates: [
        {
          date: '2026-04-10',
          label: 'Lanzamiento',
          source: 'greenhouse_core.campaigns.actual_launch_date',
          mode: 'observed'
        }
      ]
    })

    expect(result.valueDays).toBeNull()
    expect(result.dataStatus).toBe('unavailable')
    expect(result.confidenceLevel).toBeNull()
    expect(result.qualityGateReasons).toContain('La activación quedó antes del inicio seleccionado; revisar el mapeo de evidencia.')
  })

  it('returns unavailable when evidence is missing', () => {
    const result = resolveTimeToMarketMetric({
      startCandidates: [],
      activationCandidates: [
        {
          date: null,
          label: 'Fecha planificada de lanzamiento',
          source: 'greenhouse_core.campaigns.planned_launch_date',
          mode: 'planned'
        }
      ]
    })

    expect(result.valueDays).toBeNull()
    expect(result.dataStatus).toBe('unavailable')
    expect(result.confidenceLevel).toBeNull()
    expect(result.qualityGateReasons).toContain('Sin evidencia suficiente para fijar el inicio del TTM.')
    expect(result.qualityGateReasons).toContain('Sin evidencia suficiente para fijar la activación del TTM.')
  })
})
