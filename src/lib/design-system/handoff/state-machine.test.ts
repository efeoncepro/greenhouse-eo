import { describe, expect, it } from 'vitest'

import { DesignHandoffError, assertValidHandoffTransition, normalizeImplementedSurfaceKey } from './state-machine'

describe('design handoff state machine', () => {
  it('allows the canonical implementation lifecycle', () => {
    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'proposed',
        toStatus: 'in_implementation'
      })
    ).not.toThrow()

    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'in_implementation',
        toStatus: 'implemented',
        implementedSurfaceKey: '/design-system/handoff'
      })
    ).not.toThrow()
  })

  it('allows archive from any active status and keeps archived terminal', () => {
    expect(() => assertValidHandoffTransition({ fromStatus: 'proposed', toStatus: 'archived' })).not.toThrow()
    expect(() => assertValidHandoffTransition({ fromStatus: 'in_implementation', toStatus: 'archived' })).not.toThrow()
    expect(() => assertValidHandoffTransition({ fromStatus: 'implemented', toStatus: 'archived' })).not.toThrow()

    expect(() => assertValidHandoffTransition({ fromStatus: 'archived', toStatus: 'implemented' })).toThrow(
      DesignHandoffError
    )
  })

  it('rejects jumps to implemented without an app route', () => {
    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'proposed',
        toStatus: 'implemented',
        implementedSurfaceKey: '/design-system/handoff'
      })
    ).toThrow(DesignHandoffError)

    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'in_implementation',
        toStatus: 'implemented'
      })
    ).toThrow(DesignHandoffError)
  })

  it('normalizes implemented surface keys as internal app routes only', () => {
    expect(normalizeImplementedSurfaceKey('/design-system/handoff/')).toBe('/design-system/handoff')
    expect(normalizeImplementedSurfaceKey('   ')).toBeNull()
    expect(() => normalizeImplementedSurfaceKey('https://example.com/design-system/handoff')).toThrow(
      DesignHandoffError
    )
    expect(() => normalizeImplementedSurfaceKey('design-system/handoff')).toThrow(DesignHandoffError)
  })
})
