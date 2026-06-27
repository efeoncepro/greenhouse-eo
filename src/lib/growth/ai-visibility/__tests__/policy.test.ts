import { describe, expect, it } from 'vitest'

import { GROWTH_AI_VISIBILITY_EXECUTION_MODES } from '../contracts'
import {
  GROWTH_AI_VISIBILITY_PROVIDER_POLICY_VERSION,
  isProviderEligibleForMode,
  resolveProviderPolicy
} from '../policy'

describe('growth/ai-visibility — provider policy resolver', () => {
  it('light excluye Anthropic por costo/latencia (calibración §5)', () => {
    const policy = resolveProviderPolicy('light')

    expect(policy.eligibleProviders).not.toContain('anthropic')
    expect(policy.eligibleProviders).toContain('openai')
    expect(policy.eligibleProviders).toContain('google_ai_overview')
    expect(isProviderEligibleForMode('anthropic', 'light')).toBe(false)
    expect(isProviderEligibleForMode('openai', 'light')).toBe(true)
    expect(isProviderEligibleForMode('google_ai_overview', 'light')).toBe(true)
  })

  it('full e internal_audit incluyen Anthropic y Google AI Overview', () => {
    expect(resolveProviderPolicy('full').eligibleProviders).toContain('anthropic')
    expect(resolveProviderPolicy('full').eligibleProviders).toContain('google_ai_overview')
    expect(resolveProviderPolicy('internal_audit').eligibleProviders).toContain('anthropic')
    expect(resolveProviderPolicy('internal_audit').eligibleProviders).toContain('google_ai_overview')
    expect(isProviderEligibleForMode('anthropic', 'full')).toBe(true)
    expect(isProviderEligibleForMode('anthropic', 'internal_audit')).toBe(true)
  })

  it('los caps escalan light < full < internal_audit y nunca dejan techo permisivo', () => {
    const light = resolveProviderPolicy('light')
    const full = resolveProviderPolicy('full')
    const audit = resolveProviderPolicy('internal_audit')

    expect(light.maxPromptsPerRun).toBeLessThan(full.maxPromptsPerRun)
    expect(full.maxPromptsPerRun).toBeLessThanOrEqual(audit.maxPromptsPerRun)
    expect(light.costCeilingUsdPerRun).toBeLessThan(full.costCeilingUsdPerRun)
    expect(full.costCeilingUsdPerRun).toBeLessThan(audit.costCeilingUsdPerRun)

    for (const mode of GROWTH_AI_VISIBILITY_EXECUTION_MODES) {
      const policy = resolveProviderPolicy(mode)

      expect(policy.costCeilingUsdPerRun).toBeGreaterThan(0)
      expect(policy.perCallTimeoutMs).toBeGreaterThan(0)
      expect(policy.maxRetriesPerCall).toBeGreaterThanOrEqual(0)
      expect(policy.policyVersion).toBe(GROWTH_AI_VISIBILITY_PROVIDER_POLICY_VERSION)
    }
  })

  it('devuelve una copia inmutable (mutar el resultado no afecta el siguiente resolve)', () => {
    const first = resolveProviderPolicy('full')

    first.eligibleProviders.push('openai')
    expect(resolveProviderPolicy('full').eligibleProviders.filter(p => p === 'openai')).toHaveLength(1)
  })
})
