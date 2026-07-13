import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireHiringFairnessPolicy } from './config'

afterEach(() => vi.unstubAllEnvs())

describe('fairness runtime policy (TASK-1365)', () => {
  it('falla cerrado con flag OFF', () => {
    vi.stubEnv('HIRING_FAIRNESS_MONITOR_ENABLED', 'false')

    expect(() => requireHiringFairnessPolicy()).toThrowError(/no está habilitado/)
  })

  it('falla cerrado con flag ON pero policy incompleta', () => {
    vi.stubEnv('HIRING_FAIRNESS_MONITOR_ENABLED', 'true')
    vi.stubEnv('HIRING_FAIRNESS_POLICY_VERSION', '')

    expect(() => requireHiringFairnessPolicy()).toThrowError(/no está configurada/)
  })

  it('acepta solo dimensiones y categorías allowlisted', () => {
    const policy = requireHiringFairnessPolicy({
      NODE_ENV: 'test',
      HIRING_FAIRNESS_MONITOR_ENABLED: 'true',
      HIRING_FAIRNESS_POLICY_VERSION: 'privacy-v1',
      HIRING_FAIRNESS_RETENTION_DAYS: '365',
      HIRING_FAIRNESS_ALLOWED_CATEGORIES_JSON: JSON.stringify({ dimension_a: ['group_a', 'group_b'] }),
    })

    expect(policy.policyVersion).toBe('privacy-v1')
    expect(policy.retentionDays).toBe(365)
    expect(policy.allowedCategories.get('dimension_a')?.has('group_b')).toBe(true)
  })
})
