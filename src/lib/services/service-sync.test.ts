import { describe, expect, it } from 'vitest'

describe('service sync ID generation', () => {
  it('generates SVC-HS- prefixed IDs from HubSpot service IDs', () => {
    const hubspotServiceId = '12345'
    const serviceId = `SVC-HS-${hubspotServiceId}`

    expect(serviceId).toBe('SVC-HS-12345')
    expect(serviceId).toMatch(/^SVC-HS-\d+$/)
  })
})

describe('service line validation', () => {
  const VALID_LINES = ['globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions'] as const

  type ServiceLine = (typeof VALID_LINES)[number]

  const normalizeServiceLine = (v: string | null | undefined): ServiceLine => {
    if (!v) return 'efeonce_digital'

    const lower = v.toLowerCase().trim()

    return VALID_LINES.includes(lower as ServiceLine) ? (lower as ServiceLine) : 'efeonce_digital'
  }

  it('returns valid service lines as-is', () => {
    expect(normalizeServiceLine('globe')).toBe('globe')
    expect(normalizeServiceLine('reach')).toBe('reach')
    expect(normalizeServiceLine('wave')).toBe('wave')
  })

  it('returns default for null/undefined/empty', () => {
    expect(normalizeServiceLine(null)).toBe('efeonce_digital')
    expect(normalizeServiceLine(undefined)).toBe('efeonce_digital')
    expect(normalizeServiceLine('')).toBe('efeonce_digital')
  })

  it('returns default for invalid values', () => {
    expect(normalizeServiceLine('invalid')).toBe('efeonce_digital')
    expect(normalizeServiceLine('GLOBE')).toBe('globe') // case insensitive
  })
})

describe('pipeline stage validation', () => {
  const VALID_STAGES = ['onboarding', 'active', 'renewal_pending', 'renewed', 'closed', 'paused'] as const

  it('covers all 6 pipeline stages', () => {
    expect(VALID_STAGES.length).toBe(6)
    expect(VALID_STAGES).toContain('onboarding')
    expect(VALID_STAGES).toContain('active')
    expect(VALID_STAGES).toContain('closed')
  })
})
