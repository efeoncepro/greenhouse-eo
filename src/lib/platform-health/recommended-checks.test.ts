import { describe, it, expect } from 'vitest'

import {
  PLATFORM_HEALTH_CHECK_CATALOGUE,
  collectRecommendedChecks
} from './recommended-checks'

describe('collectRecommendedChecks', () => {
  it('returns empty when no triggers match', () => {
    const out = collectRecommendedChecks(new Set())

    expect(out).toEqual([])
  })

  it('returns the reliability-overview check for overall:degraded', () => {
    const out = collectRecommendedChecks(new Set(['overall:degraded']))

    expect(out.some(check => check.id === 'reliability-overview')).toBe(true)
  })

  it('returns pg-doctor when cloud is blocked', () => {
    const out = collectRecommendedChecks(new Set(['module:cloud:blocked']))

    expect(out.map(check => check.id)).toContain('pg-doctor')
  })

  it('returns webhook endpoint check when notifySafe is false', () => {
    const out = collectRecommendedChecks(new Set(['safe-mode:notifySafe:false']))

    expect(out.map(check => check.id)).toContain('inspect-webhook-endpoints')
  })

  it('does not duplicate checks when multiple triggers map to the same check', () => {
    const out = collectRecommendedChecks(
      new Set(['module:cloud:degraded', 'module:cloud:blocked', 'safe-mode:writeSafe:false'])
    )

    const pgDoctorCount = out.filter(check => check.id === 'pg-doctor').length

    expect(pgDoctorCount).toBe(1)
  })

  it('preserves catalogue order for stable consumer experience', () => {
    const out = collectRecommendedChecks(
      new Set([
        'safe-mode:writeSafe:false', // pg-doctor + inspect-handler-health (later)
        'overall:degraded' // reliability-overview (earlier)
      ])
    )

    const reliabilityIdx = out.findIndex(check => check.id === 'reliability-overview')
    const pgDoctorIdx = out.findIndex(check => check.id === 'pg-doctor')

    expect(reliabilityIdx).toBeGreaterThanOrEqual(0)
    expect(pgDoctorIdx).toBeGreaterThan(reliabilityIdx)
  })
})

describe('PLATFORM_HEALTH_CHECK_CATALOGUE', () => {
  it('every check has a unique id', () => {
    const ids = PLATFORM_HEALTH_CHECK_CATALOGUE.map(check => check.id)
    const unique = new Set(ids)

    expect(unique.size).toBe(ids.length)
  })

  it('every check declares at least one appliesWhen condition', () => {
    for (const check of PLATFORM_HEALTH_CHECK_CATALOGUE) {
      expect(check.appliesWhen.length).toBeGreaterThan(0)
    }
  })
})
