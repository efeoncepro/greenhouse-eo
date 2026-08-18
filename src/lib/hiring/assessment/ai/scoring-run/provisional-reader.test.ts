import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const listRunsMock = vi.fn()
const modeMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => queryMock(...args),
}))

vi.mock('./store', () => ({
  listScoringRunsForAssessment: (...args: unknown[]) => listRunsMock(...args),
}))

vi.mock('./config', () => ({
  getEffectiveHiringAssessmentAiRunMode: (...args: unknown[]) => modeMock(...args),
}))

const { readProvisionalAssessmentAiProjection } = await import('./provisional-reader')

const run = {
  runId: 'run-1', assessmentId: 'asmt-1', applicationId: 'happ-1', status: 'awaiting_review',
  model: 'claude-test', promptVersion: 'prompt.v2',
  policyVersion: 'policy.v2:global_provisional', inputDigest: 'digest-1',
}

describe('readProvisionalAssessmentAiProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    modeMock.mockReturnValue('global_provisional')
    listRunsMock.mockResolvedValue([run])
  })

  it('combina scores efectivos y propuestas solo en una proyección no autoritativa', async () => {
    queryMock.mockResolvedValue([
      { application_id: 'happ-1', response_id: 'resp-1', competency_id: 'comp-1', competency_key: 'client', competency_name: 'Cliente', target_level: 'senior', competency_weight: 60, auto_score: null, human_score: null, run_item_id: 'item-1', item_status: 'proposed', risk_class: 'mandatory_review', reason_code: null, routing_reasons: [], proposed_json: { score: 80 } },
      { application_id: 'happ-1', response_id: 'resp-2', competency_id: 'comp-2', competency_key: 'seo', competency_name: 'SEO', target_level: 'mid', competency_weight: 40, auto_score: 100, human_score: null, run_item_id: null, item_status: null, risk_class: null, reason_code: null, routing_reasons: [], proposed_json: null },
    ])

    const result = await readProvisionalAssessmentAiProjection('asmt-1')

    expect(result.status).toBe('complete')
    expect(result.overallScore).toBe(88)
    expect(result.coverage).toEqual(expect.objectContaining({ totalResponses: 2, effectiveResponses: 1, provisionalResponses: 1, pendingResponses: 0 }))
    expect(result.incorporatedIntoEffectiveScore).toBe(false)
  })

  it('expone abstenciones y señales de routing sin inventar score', async () => {
    queryMock.mockResolvedValue([{ application_id: 'happ-1', response_id: 'resp-1', competency_id: 'comp-1', competency_key: 'client', competency_name: 'Cliente', target_level: 'senior', competency_weight: 100, auto_score: null, human_score: null, run_item_id: 'item-1', item_status: 'abstained', risk_class: 'mandatory_review', reason_code: 'input_safety_blocked', routing_reasons: ['prompt_injection_detected'], proposed_json: null }])

    const result = await readProvisionalAssessmentAiProjection('asmt-1')

    expect(result.status).toBe('partial')
    expect(result.overallScore).toBeNull()
    expect(result.coverage.abstainedResponses).toBe(1)
    expect(result.coverage.pendingResponses).toBe(0)
    expect(result.exceptions[0]).toEqual(expect.objectContaining({ reasonCode: 'input_safety_blocked', routingReasons: ['prompt_injection_detected'] }))
  })

  it('no conserva como excepción un ítem que el operador ya resolvió', async () => {
    queryMock.mockResolvedValue([{
      application_id: 'happ-1', response_id: 'resp-1', competency_id: 'comp-1',
      competency_key: 'client', competency_name: 'Cliente', target_level: 'senior',
      competency_weight: 100, auto_score: null, human_score: 70, run_item_id: 'item-1',
      item_status: 'confirmed', risk_class: 'mandatory_review', reason_code: null,
      routing_reasons: ['per_criterion_contradictory'], resolution: 'confirmed',
      proposed_json: { score: 70 },
    }])

    const result = await readProvisionalAssessmentAiProjection('asmt-1')

    expect(result.coverage).toEqual(expect.objectContaining({ effectiveResponses: 1, provisionalResponses: 0 }))
    expect(result.exceptions).toEqual([])
  })

  it('marca stale cuando el modo del run no coincide con el runtime efectivo', async () => {
    listRunsMock.mockResolvedValue([{ ...run, policyVersion: 'policy.v2:synthetic_shadow' }])
    queryMock.mockResolvedValue([{ application_id: 'happ-1', response_id: 'resp-1', competency_id: 'comp-1', competency_key: 'client', competency_name: 'Cliente', target_level: 'senior', competency_weight: 100, auto_score: null, human_score: null, run_item_id: 'item-1', item_status: 'proposed', risk_class: 'mandatory_review', reason_code: null, routing_reasons: [], proposed_json: { score: 70 } }])

    expect((await readProvisionalAssessmentAiProjection('asmt-1')).status).toBe('stale')
  })
})
