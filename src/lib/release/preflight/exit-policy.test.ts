import { describe, expect, it } from 'vitest'

import { shouldFailPreflightCommand } from './exit-policy'

describe('production preflight CLI exit policy', () => {
  it('does not fail without fail-fast mode even when the payload is not deployable', () => {
    expect(shouldFailPreflightCommand({ readyToDeploy: false }, false)).toBe(false)
  })

  it('passes in fail-fast mode only when readyToDeploy is true', () => {
    expect(shouldFailPreflightCommand({ readyToDeploy: true }, true)).toBe(false)
  })

  it('fails in fail-fast mode when preflight is degraded, unknown, or otherwise not ready', () => {
    expect(shouldFailPreflightCommand({ readyToDeploy: false }, true)).toBe(true)
  })
})
