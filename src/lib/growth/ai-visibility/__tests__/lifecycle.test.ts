import { describe, expect, it } from 'vitest'

import {
  GROWTH_AI_VISIBILITY_PROVIDER_ERROR_CODES,
  isGrowthAiVisibilityExecutionMode,
  isGrowthAiVisibilityProviderId,
  isGrowthAiVisibilityRunKind,
  isGrowthAiVisibilitySkipErrorCode
} from '../contracts'
import {
  GrowthAiVisibilityError,
  assertRunStatusTransition,
  canTransitionRunStatus,
  isTerminalRunStatus,
  resolveRunStatusFromObservations
} from '../lifecycle'

describe('growth/ai-visibility — contract guards', () => {
  it('reconoce provider ids válidos (incluido anthropic del ADR delta)', () => {
    expect(isGrowthAiVisibilityProviderId('openai')).toBe(true)
    expect(isGrowthAiVisibilityProviderId('anthropic')).toBe(true)
    expect(isGrowthAiVisibilityProviderId('perplexity')).toBe(true)
    expect(isGrowthAiVisibilityProviderId('gemini')).toBe(true)
    expect(isGrowthAiVisibilityProviderId('mistral')).toBe(false)
    expect(isGrowthAiVisibilityProviderId(42)).toBe(false)
  })

  it('reconoce execution modes y run kinds', () => {
    expect(isGrowthAiVisibilityExecutionMode('light')).toBe(true)
    expect(isGrowthAiVisibilityExecutionMode('full')).toBe(true)
    expect(isGrowthAiVisibilityExecutionMode('internal_audit')).toBe(true)
    expect(isGrowthAiVisibilityExecutionMode('deep')).toBe(false)

    expect(isGrowthAiVisibilityRunKind('smoke')).toBe(true)
    expect(isGrowthAiVisibilityRunKind('public_diagnostic')).toBe(true)
    expect(isGrowthAiVisibilityRunKind('nope')).toBe(false)
  })

  it('clasifica skip vs fallo de ejecución en los error codes', () => {
    expect(isGrowthAiVisibilitySkipErrorCode('missing_secret')).toBe(true)
    expect(isGrowthAiVisibilitySkipErrorCode('provider_disabled')).toBe(true)
    expect(isGrowthAiVisibilitySkipErrorCode('grader_disabled')).toBe(true)
    expect(isGrowthAiVisibilitySkipErrorCode('no_capability')).toBe(true)
    expect(isGrowthAiVisibilitySkipErrorCode('rate_limited')).toBe(false)
    expect(isGrowthAiVisibilitySkipErrorCode('timeout')).toBe(false)
    expect(isGrowthAiVisibilitySkipErrorCode('provider_error')).toBe(false)
  })
})

describe('growth/ai-visibility — run status transitions', () => {
  it('permite las transiciones canónicas', () => {
    expect(canTransitionRunStatus('pending', 'running')).toBe(true)
    expect(canTransitionRunStatus('pending', 'skipped')).toBe(true)
    expect(canTransitionRunStatus('running', 'succeeded')).toBe(true)
    expect(canTransitionRunStatus('running', 'partial')).toBe(true)
    expect(canTransitionRunStatus('running', 'failed')).toBe(true)
  })

  it('rechaza transiciones desde estados terminales y saltos inválidos', () => {
    expect(canTransitionRunStatus('succeeded', 'running')).toBe(false)
    expect(canTransitionRunStatus('failed', 'succeeded')).toBe(false)
    expect(canTransitionRunStatus('skipped', 'running')).toBe(false)
    expect(canTransitionRunStatus('pending', 'succeeded')).toBe(false)
  })

  it('assertRunStatusTransition lanza en transición inválida', () => {
    expect(() => assertRunStatusTransition('running', 'succeeded')).not.toThrow()
    expect(() => assertRunStatusTransition('succeeded', 'running')).toThrow(/inválida/)
  })

  it('marca los estados terminales', () => {
    expect(isTerminalRunStatus('succeeded')).toBe(true)
    expect(isTerminalRunStatus('partial')).toBe(true)
    expect(isTerminalRunStatus('failed')).toBe(true)
    expect(isTerminalRunStatus('skipped')).toBe(true)
    expect(isTerminalRunStatus('pending')).toBe(false)
    expect(isTerminalRunStatus('running')).toBe(false)
  })
})

describe('growth/ai-visibility — resolveRunStatusFromObservations (degradación honesta)', () => {
  it('0 observaciones → skipped', () => {
    expect(resolveRunStatusFromObservations([])).toBe('skipped')
  })

  it('todas skipped → skipped', () => {
    expect(resolveRunStatusFromObservations(['skipped', 'skipped'])).toBe('skipped')
  })

  it('todas succeeded → succeeded', () => {
    expect(resolveRunStatusFromObservations(['succeeded', 'succeeded'])).toBe('succeeded')
  })

  it('ninguna succeeded → failed', () => {
    expect(resolveRunStatusFromObservations(['failed', 'rate_limited', 'skipped'])).toBe('failed')
  })

  it('mezcla con al menos una succeeded → partial (nunca succeeded con evidencia incompleta)', () => {
    expect(resolveRunStatusFromObservations(['succeeded', 'failed'])).toBe('partial')
    expect(resolveRunStatusFromObservations(['succeeded', 'skipped'])).toBe('partial')
    expect(resolveRunStatusFromObservations(['succeeded', 'rate_limited'])).toBe('partial')
  })
})

describe('growth/ai-visibility — GrowthAiVisibilityError', () => {
  it('mapea status HTTP y flag de skip por error code', () => {
    const missingSecret = new GrowthAiVisibilityError('missing_secret', 'sin secret')

    expect(missingSecret.statusCode).toBe(503)
    expect(missingSecret.isSkip).toBe(true)

    const rateLimited = new GrowthAiVisibilityError('rate_limited', 'rate')

    expect(rateLimited.statusCode).toBe(429)
    expect(rateLimited.isSkip).toBe(false)

    const timeout = new GrowthAiVisibilityError('timeout', 'slow')

    expect(timeout.statusCode).toBe(504)

    const providerError = new GrowthAiVisibilityError('provider_error', 'boom')

    expect(providerError.statusCode).toBe(502)
    expect(providerError.isSkip).toBe(false)
  })

  it('cubre todos los error codes con un status válido', () => {
    for (const code of GROWTH_AI_VISIBILITY_PROVIDER_ERROR_CODES) {
      const error = new GrowthAiVisibilityError(code, 'msg')

      expect(error.statusCode).toBeGreaterThanOrEqual(400)
      expect(error.errorCode).toBe(code)
    }
  })
})
