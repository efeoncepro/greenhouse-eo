import { describe, expect, it } from 'vitest'

import { __reliabilityAiRunnerInternalsForTests as internals } from './runner'

describe('Reliability AI runner parser', () => {
  it('parses fenced JSON and coerces empty recommendedAction to null', () => {
    const parsed = internals.safeParseJson(
      '```json\n{"overviewSummary":"Finance warning","overviewSeverity":"warning","modules":[{"moduleKey":"finance","severity":"warning","summary":"Ledger drift sigue activo.","recommendedAction":""}]}\n```'
    )

    expect(parsed?.overviewSeverity).toBe('warning')
    expect(parsed?.modules[0].recommendedAction).toBeNull()
  })

  it('extracts a balanced JSON object from noisy model output', () => {
    const parsed = internals.safeParseJson(
      'Claro. {"overviewSummary":"Cloud OK","overviewSeverity":"ok","modules":[]} Fin.'
    )

    expect(parsed?.overviewSummary).toBe('Cloud OK')
    expect(parsed?.modules).toEqual([])
  })

  it('classifies truncated JSON without logging the raw response', () => {
    expect(internals.describeInvalidJsonResponse('{"overviewSummary":"x"')).toBe('unbalanced_or_truncated_json')
  })

  it('rejects invalid severities instead of persisting invented taxonomy', () => {
    const parsed = internals.safeParseJson(
      '{"overviewSummary":"x","overviewSeverity":"critical","modules":[]}'
    )

    expect(parsed).toBeNull()
  })
})
