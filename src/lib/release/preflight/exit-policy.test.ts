import { describe, expect, it } from 'vitest'

import { shouldFailPreflightCommand } from './exit-policy'

describe('production preflight CLI exit policy', () => {
  it('does not fail without fail-fast mode even when the payload is not deployable', () => {
    expect(
      shouldFailPreflightCommand({ readyToDeploy: false, overallStatus: 'blocked' }, false)
    ).toBe(false)
  })

  it('passes in fail-fast mode only when readyToDeploy is true', () => {
    expect(
      shouldFailPreflightCommand({ readyToDeploy: true, overallStatus: 'healthy' }, true)
    ).toBe(false)
  })

  it('fails in fail-fast mode when preflight is degraded, unknown, or otherwise not ready', () => {
    expect(
      shouldFailPreflightCommand({ readyToDeploy: false, overallStatus: 'degraded' }, true)
    ).toBe(true)
  })

  /**
   * TASK-871 follow-up — operator bypass for degraded preflight.
   *
   * `bypassWarnings=true` is the orchestrator's translation of
   * `bypass_preflight_reason >= 20 chars`. It allows degraded (warnings) and
   * unknown payloads to pass while keeping `blocked` (any error severity)
   * as the hard gate.
   *
   * Detected live on TASK-871 attempts 2 + 3 (runs 25822955070 + 25823823716):
   * persistent warnings on `playwright_smoke` (0 workflows for main pushes by
   * design) + `sentry_critical_issues` (1-9 issue warning threshold) blocked
   * the release that would have FIXED the underlying smoke probe failures.
   */
  describe('TASK-871 bypassWarnings operator override', () => {
    it('passes degraded preflight when bypass + no errors', () => {
      expect(
        shouldFailPreflightCommand(
          { readyToDeploy: false, overallStatus: 'degraded' },
          true,
          true
        )
      ).toBe(false)
    })

    it('passes unknown preflight when bypass + no errors', () => {
      expect(
        shouldFailPreflightCommand(
          { readyToDeploy: false, overallStatus: 'unknown' },
          true,
          true
        )
      ).toBe(false)
    })

    it('still blocks on errors even with bypass set', () => {
      expect(
        shouldFailPreflightCommand(
          { readyToDeploy: false, overallStatus: 'blocked' },
          true,
          true
        )
      ).toBe(true)
    })

    it('bypassWarnings is no-op when failOnError is false', () => {
      expect(
        shouldFailPreflightCommand(
          { readyToDeploy: false, overallStatus: 'blocked' },
          false,
          true
        )
      ).toBe(false)
    })

    it('bypassWarnings does not change healthy success path', () => {
      expect(
        shouldFailPreflightCommand(
          { readyToDeploy: true, overallStatus: 'healthy' },
          true,
          true
        )
      ).toBe(false)
    })
  })
})
