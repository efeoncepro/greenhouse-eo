import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const {
  buildSignalPrompt,
  enrichSignalPayload,
  sanitizeAiSignalEnrichmentOutput
} = await import('./llm-provider')

const { buildScopedEntityKey } = await import('./entity-display-resolution')

const baseSignal = {
  signalId: 'EO-AIS-1',
  signalType: 'root_cause' as const,
  spaceId: 'space-1',
  memberId: 'member-1',
  projectId: 'notion-project-1',
  metricName: 'ftr_pct' as const,
  periodYear: 2026,
  periodMonth: 4,
  severity: 'warning' as const,
  currentValue: 61.2,
  expectedValue: 80,
  zScore: 1.8,
  predictedValue: null,
  confidence: 0.88,
  predictionHorizon: null,
  contributionPct: 53.4,
  dimension: 'project' as const,
  dimensionId: 'notion-project-1',
  actionType: null,
  actionSummary: 'Priorizar el proyecto notion-project-1.',
  actionTargetId: 'notion-project-1',
  modelVersion: 'ico-ai-core-v1.0.0',
  generatedAt: '2026-04-17T12:00:00.000Z',
  aiEligible: true,
  payloadJson: {
    dimensionLabel: 'notion-project-1'
  }
}

describe('llm-provider hardening', () => {
  it('passes only human project names into the prompt payload', () => {
    const context = {
      spaces: new Map([['space-1', 'Sky Airlines']]),
      members: new Map([['member-1', 'Andres Carlosama']]),
      projectResolutions: new Map([
        [
          buildScopedEntityKey('space-1', 'notion-project-1'),
          {
            entityId: 'notion-project-1',
            displayLabel: 'Campana Q1 Digital',
            matchedBy: 'notion_project_id' as const,
            spaceId: 'space-1',
            canonicalProjectId: 'project-notion-project-1',
            sourceProjectId: 'notion-project-1',
            aliases: ['project-notion-project-1', 'notion-project-1']
          }
        ],
        [
          buildScopedEntityKey('space-1', 'project-notion-project-1'),
          {
            entityId: 'project-notion-project-1',
            displayLabel: 'Campana Q1 Digital',
            matchedBy: 'project_record_id' as const,
            spaceId: 'space-1',
            canonicalProjectId: 'project-notion-project-1',
            sourceProjectId: 'notion-project-1',
            aliases: ['project-notion-project-1', 'notion-project-1']
          }
        ]
      ])
    }

    const payload = enrichSignalPayload(baseSignal, context)
    const prompt = buildSignalPrompt(baseSignal, context)

    expect(payload.projectName).toBe('Campana Q1 Digital')
    expect(payload.projectId).toBe('notion-project-1')
    expect(payload.payloadJson.dimensionLabel).toBe('Campana Q1 Digital')
    expect(prompt).toContain('"projectName": "Campana Q1 Digital"')
    expect(prompt).not.toContain('"projectName": "notion-project-1"')
  })

  it('sanitizes technical project ids out of model output when a label is resolvable', () => {
    const context = {
      spaces: new Map<string, string>(),
      members: new Map<string, string>(),
      projectResolutions: new Map([
        [
          buildScopedEntityKey('space-1', 'notion-project-1'),
          {
            entityId: 'notion-project-1',
            displayLabel: 'Campana Q1 Digital',
            matchedBy: 'notion_project_id' as const,
            spaceId: 'space-1',
            canonicalProjectId: 'project-notion-project-1',
            sourceProjectId: 'notion-project-1',
            aliases: ['project-notion-project-1', 'notion-project-1']
          }
        ]
      ])
    }

    const output = sanitizeAiSignalEnrichmentOutput(
      baseSignal,
      {
        qualityScore: 91,
        explanationSummary: '@[notion-project-1](project:notion-project-1) esta frenando el FTR%.',
        rootCauseNarrative: 'El proyecto notion-project-1 esta consumiendo retrabajo.',
        recommendedAction: 'Priorizar el proyecto notion-project-1.',
        confidence: 0.84
      },
      context
    )

    expect(output.explanationSummary).toBe('@[Campana Q1 Digital](project:notion-project-1) esta frenando el FTR%.')
    expect(output.rootCauseNarrative).toContain('Campana Q1 Digital')
    expect(output.rootCauseNarrative).not.toContain('notion-project-1')
    expect(output.recommendedAction).toContain('Campana Q1 Digital')
  })

  it('degrades to a human generic reference when no project label can be resolved', () => {
    const context = {
      spaces: new Map<string, string>(),
      members: new Map<string, string>(),
      projectResolutions: new Map()
    }

    const output = sanitizeAiSignalEnrichmentOutput(
      baseSignal,
      {
        qualityScore: 84,
        explanationSummary: '@[notion-project-1](project:notion-project-1) sigue retrasado.',
        rootCauseNarrative: 'El proyecto notion-project-1 concentra el desvio.',
        recommendedAction: 'Priorizar el proyecto notion-project-1.',
        confidence: 0.71
      },
      context
    )

    expect(output.explanationSummary).toBe('este proyecto sigue retrasado.')
    expect(output.rootCauseNarrative).toBe('este proyecto concentra el desvio.')
    expect(output.recommendedAction).toBe('Priorizar este proyecto.')
  })
})
