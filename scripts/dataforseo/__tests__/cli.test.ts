import { describe, expect, it } from 'vitest'

import { findDataForSeoEndpoint } from '@/lib/ai/dataforseo-catalog'

import { classifyDataForSeoOutcome, CLI_EXIT, validateAiOptimizationSafety } from '../cli'

describe('DataForSEO CLI task outcomes', () => {
  it('does not equate HTTP success with provider task success', () => {
    expect(
      classifyDataForSeoOutcome({
        httpOk: true,
        taskCodes: [
          { id: 'x', statusCode: 40501, statusMessage: 'Invalid Field', resultCount: 0, cost: 0, hasResult: false }
        ]
      })
    ).toEqual({ kind: 'provider_task_error', exitCode: CLI_EXIT.providerError })
  })

  it('keeps async queue states distinct from failures and never requests resubmission', () => {
    expect(
      classifyDataForSeoOutcome({
        httpOk: true,
        taskCodes: [
          { id: 'x', statusCode: 40602, statusMessage: 'Task In Queue', resultCount: 0, cost: 0, hasResult: false }
        ]
      })
    ).toEqual({ kind: 'pending', exitCode: CLI_EXIT.pending })
  })

  it('keeps successful empty results distinct from failures', () => {
    expect(
      classifyDataForSeoOutcome({
        httpOk: true,
        taskCodes: [{ id: 'x', statusCode: 20000, statusMessage: 'Ok', resultCount: 0, cost: 0, hasResult: false }]
      })
    ).toEqual({ kind: 'no_data', exitCode: CLI_EXIT.noData })
  })
})

describe('DataForSEO CLI AI Optimization guards', () => {
  it('requires explicit platform for LLM Mentions', () => {
    const endpoint = findDataForSeoEndpoint('/v3/ai_optimization/llm_mentions/target_metrics/live')

    expect(endpoint).not.toBeNull()
    expect(() => validateAiOptimizationSafety(endpoint!, [{ target: [{ domain: 'example.com' }] }])).toThrow(
      'platform explícita'
    )
  })

  it('requires an output-token bound for LLM Responses', () => {
    const endpoint = findDataForSeoEndpoint('/v3/ai_optimization/claude/llm_responses/live')

    expect(endpoint).not.toBeNull()
    expect(() =>
      validateAiOptimizationSafety(endpoint!, [{ user_prompt: 'x', model_name: 'live-model' }])
    ).toThrow('max_output_tokens')
  })
})
