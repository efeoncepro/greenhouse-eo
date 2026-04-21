import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  DEFAULT_HUBSPOT_STAGE_MAP,
  getEffectiveHubSpotStageMap,
  isKnownHubSpotStage,
  normalizeHubSpotStage,
  resolveHubSpotStage,
  __resetHubSpotStageMappingCache
} from '../hubspot-lifecycle-mapping'

const ENV_VAR = 'HUBSPOT_LIFECYCLE_STAGE_MAP_OVERRIDE'

describe('hubspot-lifecycle-mapping', () => {
  const originalEnv = process.env[ENV_VAR]

  beforeEach(() => {
    delete process.env[ENV_VAR]
    __resetHubSpotStageMappingCache()
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[ENV_VAR]
    } else {
      process.env[ENV_VAR] = originalEnv
    }

    __resetHubSpotStageMappingCache()
  })

  describe('normalizeHubSpotStage', () => {
    it('trims and lowercases', () => {
      expect(normalizeHubSpotStage('  Customer ')).toBe('customer')
    })

    it('returns null for empty / null / whitespace-only input', () => {
      expect(normalizeHubSpotStage(null)).toBeNull()
      expect(normalizeHubSpotStage(undefined)).toBeNull()
      expect(normalizeHubSpotStage('')).toBeNull()
      expect(normalizeHubSpotStage('   ')).toBeNull()
    })
  })

  describe('resolveHubSpotStage — defaults', () => {
    it('resolves canonical §4.5 mapping case-insensitively', () => {
      expect(resolveHubSpotStage('subscriber')).toBe('prospect')
      expect(resolveHubSpotStage('LEAD')).toBe('prospect')
      expect(resolveHubSpotStage('  marketingqualifiedlead ')).toBe('prospect')
      expect(resolveHubSpotStage('salesqualifiedlead')).toBe('prospect')
      expect(resolveHubSpotStage('opportunity')).toBe('opportunity')
      expect(resolveHubSpotStage('customer')).toBe('active_client')
      expect(resolveHubSpotStage('evangelist')).toBe('active_client')
      expect(resolveHubSpotStage('other')).toBe('churned')
    })

    it('falls back to prospect for null / empty / unknown without warning for empty input', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      expect(resolveHubSpotStage(null)).toBe('prospect')
      expect(resolveHubSpotStage(undefined)).toBe('prospect')
      expect(resolveHubSpotStage('')).toBe('prospect')

      expect(warn).not.toHaveBeenCalled()

      expect(resolveHubSpotStage('someunknownstage')).toBe('prospect')
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain('someunknownstage')

      warn.mockRestore()
    })

    it('honors a custom unknownFallback and onUnknown handler', () => {
      const handler = vi.fn()

      const result = resolveHubSpotStage('novel-stage', {
        unknownFallback: 'disqualified',
        onUnknown: handler
      })

      expect(result).toBe('disqualified')
      expect(handler).toHaveBeenCalledWith('novel-stage')
    })
  })

  describe('resolveHubSpotStage — env override', () => {
    it('applies env-var JSON override over defaults', () => {
      process.env[ENV_VAR] = JSON.stringify({ partner: 'active_client', 'renamed-lead': 'prospect' })
      __resetHubSpotStageMappingCache()

      expect(resolveHubSpotStage('partner')).toBe('active_client')
      expect(resolveHubSpotStage('RENAMED-LEAD')).toBe('prospect')

      // Defaults still apply for non-overridden keys.
      expect(resolveHubSpotStage('customer')).toBe('active_client')
    })

    it('ignores malformed override JSON without throwing', () => {
      process.env[ENV_VAR] = '{not-json'
      __resetHubSpotStageMappingCache()

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      expect(resolveHubSpotStage('customer')).toBe('active_client')
      expect(warn).toHaveBeenCalled()

      warn.mockRestore()
    })

    it('skips override entries with invalid Greenhouse stage values', () => {
      process.env[ENV_VAR] = JSON.stringify({ partner: 'nonexistent_stage' })
      __resetHubSpotStageMappingCache()

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      expect(resolveHubSpotStage('partner')).toBe('prospect') // fallback
      expect(warn).toHaveBeenCalled()

      warn.mockRestore()
    })

    it('ad-hoc overrides win over env and defaults', () => {
      process.env[ENV_VAR] = JSON.stringify({ customer: 'inactive' })
      __resetHubSpotStageMappingCache()

      expect(
        resolveHubSpotStage('customer', {
          overrides: { customer: 'opportunity' }
        })
      ).toBe('opportunity')
    })
  })

  describe('isKnownHubSpotStage', () => {
    it('is true for default canonical stages', () => {
      expect(isKnownHubSpotStage('customer')).toBe(true)
      expect(isKnownHubSpotStage('OTHER')).toBe(true)
    })

    it('is false for unknowns and empty', () => {
      expect(isKnownHubSpotStage('something-else')).toBe(false)
      expect(isKnownHubSpotStage(null)).toBe(false)
    })

    it('recognizes env-overridden stages', () => {
      process.env[ENV_VAR] = JSON.stringify({ partner: 'active_client' })
      __resetHubSpotStageMappingCache()

      expect(isKnownHubSpotStage('partner')).toBe(true)
    })
  })

  describe('getEffectiveHubSpotStageMap', () => {
    it('merges defaults with env override', () => {
      process.env[ENV_VAR] = JSON.stringify({ partner: 'active_client' })
      __resetHubSpotStageMappingCache()

      const map = getEffectiveHubSpotStageMap()

      expect(map).toMatchObject({ ...DEFAULT_HUBSPOT_STAGE_MAP, partner: 'active_client' })
    })
  })
})
