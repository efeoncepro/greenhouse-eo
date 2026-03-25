import { describe, expect, it } from 'vitest'

import {
  registerProjection,
  getProjectionsForEvent,
  getRegisteredProjections,
  getAllTriggerEventTypes,
  getRegisteredDomains,
  type ProjectionDefinition
} from '@/lib/sync/projection-registry'

const makeTestProjection = (name: string, triggers: string[]): ProjectionDefinition => ({
  name,
  description: `Test projection ${name}`,
  domain: 'delivery',
  triggerEvents: triggers,
  extractScope: () => ({ entityType: 'test', entityId: 'test-1' }),
  refresh: async () => `refreshed ${name}`,
  maxRetries: 1
})

describe('projection registry', () => {
  it('registers a projection and retrieves it', () => {
    const proj = makeTestProjection('vitest_proj_1', ['member.created'])

    registerProjection(proj)

    const all = getRegisteredProjections()
    const found = all.find(p => p.name === 'vitest_proj_1')

    expect(found).toBeTruthy()
    expect(found?.domain).toBe('delivery')
  })

  it('getProjectionsForEvent matches by triggerEvents', () => {
    registerProjection(makeTestProjection('vitest_proj_event_match', ['vitest.trigger_a', 'vitest.trigger_b']))

    const matched = getProjectionsForEvent('vitest.trigger_a')
    const names = matched.map(p => p.name)

    expect(names).toContain('vitest_proj_event_match')
  })

  it('getProjectionsForEvent returns empty for unmatched event', () => {
    const matched = getProjectionsForEvent('zzz_unknown_event.never')

    expect(matched.length).toBe(0)
  })

  it('getAllTriggerEventTypes returns collected trigger events', () => {
    const triggers = getAllTriggerEventTypes()

    expect(triggers.length).toBeGreaterThan(0)
    expect(triggers).toContain('vitest.trigger_a')
  })

  it('getRegisteredDomains includes delivery', () => {
    const domains = getRegisteredDomains()

    expect(domains).toContain('delivery')
  })

  it('extractScope can return null', () => {
    const proj = makeTestProjection('vitest_proj_null_scope', ['test.null_scope'])

    proj.extractScope = () => null

    expect(proj.extractScope({})).toBeNull()
  })

  it('refresh returns a string result', async () => {
    const proj = makeTestProjection('vitest_proj_refresh', ['test.refresh_test'])
    const result = await proj.refresh({ entityType: 'test', entityId: 'test-1' })

    expect(result).toBe('refreshed vitest_proj_refresh')
  })
})
