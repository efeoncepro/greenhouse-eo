import { describe, expect, it } from 'vitest'

import {
  BRIEF_CLARITY_PASSING_SCORE,
  resolveBriefClarityMetric
} from '@/lib/ico-engine/brief-clarity'

describe('resolveBriefClarityMetric', () => {
  it('returns available when the score passes and governance is ready', () => {
    const result = resolveBriefClarityMetric({
      score: {
        taskId: 'task-1',
        score: 92,
        passed: true,
        breakdown: '{"objective": 1}',
        reasoning: 'Auto-evaluated',
        model: 'gpt-5.4',
        promptVersion: 'bcs-v1',
        promptHash: 'hash',
        confidence: 0.93,
        inputSnapshotUrl: 'https://example.com/snapshot',
        processedAt: '2026-04-04T12:00:00Z'
      },
      governance: {
        readinessStatus: 'ready',
        blockingIssuesCount: 0,
        warningsCount: 0,
        persistedMappings: 8,
        mappedCoreFields: 8,
        missingCoreFields: 0,
        contractVersion: 'notion-kpi-v1'
      }
    })

    expect(result.value).toBe(92)
    expect(result.passed).toBe(true)
    expect(result.dataStatus).toBe('available')
    expect(result.confidenceLevel).toBe('high')
    expect(result.effectiveBriefAt).toBe('2026-04-04')
    expect(result.intakePolicyStatus).toBe('ready')
    expect(result.scoringMethod).toBe('automatic')
  })

  it('returns degraded when the score exists but governance is degraded', () => {
    const result = resolveBriefClarityMetric({
      score: {
        taskId: 'task-2',
        score: 84,
        passed: null,
        breakdown: null,
        reasoning: 'Auto-evaluated',
        model: 'gpt-5.4-mini',
        promptVersion: 'bcs-v1',
        promptHash: 'hash',
        confidence: 0.71,
        inputSnapshotUrl: null,
        processedAt: '2026-04-04T12:00:00Z'
      },
      governance: {
        readinessStatus: 'warning',
        blockingIssuesCount: 0,
        warningsCount: 2,
        persistedMappings: 6,
        mappedCoreFields: 6,
        missingCoreFields: 2,
        contractVersion: 'notion-kpi-v1'
      }
    })

    expect(result.value).toBe(84)
    expect(result.passed).toBe(true)
    expect(result.dataStatus).toBe('degraded')
    expect(result.intakePolicyStatus).toBe('degraded')
    expect(result.qualityGateReasons).toContain('El intake tiene warnings activos en governance de Notion.')
    expect(result.qualityGateReasons).toContain('Faltan 2 campos core del brief en el contrato de governance.')
  })

  it('returns degraded when the score is below threshold', () => {
    const result = resolveBriefClarityMetric({
      score: {
        taskId: 'task-3',
        score: BRIEF_CLARITY_PASSING_SCORE - 5,
        passed: false,
        breakdown: null,
        reasoning: 'Auto-evaluated',
        model: 'gpt-5.4-mini',
        promptVersion: 'bcs-v1',
        promptHash: 'hash',
        confidence: 0.62,
        inputSnapshotUrl: null,
        processedAt: '2026-04-04T12:00:00Z'
      },
      governance: {
        readinessStatus: 'ready',
        blockingIssuesCount: 0,
        warningsCount: 0,
        persistedMappings: 8,
        mappedCoreFields: 8,
        missingCoreFields: 0,
        contractVersion: 'notion-kpi-v1'
      }
    })

    expect(result.dataStatus).toBe('degraded')
    expect(result.effectiveBriefAt).toBeNull()
    expect(result.qualityGateReasons).toContain('El brief quedó bajo el umbral mínimo de 80 puntos.')
  })

  it('returns unavailable when there is no score yet', () => {
    const result = resolveBriefClarityMetric({
      score: null,
      governance: {
        readinessStatus: 'blocked',
        blockingIssuesCount: 3,
        warningsCount: 0,
        persistedMappings: 4,
        mappedCoreFields: 4,
        missingCoreFields: 4,
        contractVersion: 'notion-kpi-v1'
      }
    })

    expect(result.value).toBeNull()
    expect(result.dataStatus).toBe('unavailable')
    expect(result.intakePolicyStatus).toBe('blocked')
    expect(result.qualityGateReasons).toContain('El intake está bloqueado por governance de Notion.')
    expect(result.qualityGateReasons).toContain('No existe un score auditado de Brief Clarity Score para este proyecto.')
  })
})
