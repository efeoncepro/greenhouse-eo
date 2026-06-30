import { describe, expect, it } from 'vitest'

import { isFixItArtifactsEnabled, isGraderEnabled, isProviderFlagEnabled } from '../flags'

const env = (overrides: Record<string, string>): NodeJS.ProcessEnv => ({ ...overrides }) as NodeJS.ProcessEnv

describe('growth/ai-visibility — feature flags (default OFF)', () => {
  it('grader OFF por defecto (sin env)', () => {
    expect(isGraderEnabled(env({}))).toBe(false)
    expect(isProviderFlagEnabled('openai', env({}))).toBe(false)
  })

  it('grader solo ON con "true" exacto', () => {
    expect(isGraderEnabled(env({ GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true' }))).toBe(true)
    expect(isGraderEnabled(env({ GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'TRUE' }))).toBe(true)
    expect(isGraderEnabled(env({ GROWTH_AI_VISIBILITY_GRADER_ENABLED: '1' }))).toBe(false)
    expect(isGraderEnabled(env({ GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'yes' }))).toBe(false)
  })

  it('provider flag requiere grader global ON además del flag del provider', () => {
    expect(
      isProviderFlagEnabled('openai', env({ GROWTH_AI_VISIBILITY_OPENAI_ENABLED: 'true' }))
    ).toBe(false)

    expect(
      isProviderFlagEnabled(
        'openai',
        env({ GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true', GROWTH_AI_VISIBILITY_OPENAI_ENABLED: 'true' })
      )
    ).toBe(true)

    expect(
      isProviderFlagEnabled(
        'anthropic',
        env({ GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true', GROWTH_AI_VISIBILITY_OPENAI_ENABLED: 'true' })
      )
    ).toBe(false)

    expect(
      isProviderFlagEnabled(
        'google_ai_overview',
        env({ GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true', GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED: 'true' })
      )
    ).toBe(true)
  })

  it('fix-it artifacts requiere kill switch global + flag propio', () => {
    expect(isFixItArtifactsEnabled(env({}))).toBe(false)
    expect(isFixItArtifactsEnabled(env({ GROWTH_AI_VISIBILITY_FIX_IT_ENABLED: 'true' }))).toBe(false)
    expect(
      isFixItArtifactsEnabled(
        env({ GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true', GROWTH_AI_VISIBILITY_FIX_IT_ENABLED: 'true' })
      )
    ).toBe(true)
  })
})
