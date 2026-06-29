import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { AI_VISIBILITY_COMPANY_PROPERTIES } from '../../hubspot/properties'
import {
  buildOperatorCrossSellPayload,
  deriveAeoCheckResult,
  type OperatorCrossSellFacts,
  type OperatorCrossSellReportFacts
} from '../hubspot-cross-sell-mapper'

const baseReport: OperatorCrossSellReportFacts = {
  overallScore: 64,
  scoreVersion: 'v3',
  gateStatus: 'ready',
  primaryGapKey: 'topical_authority',
  recommendedMotion: 'authority_content',
  competitorsDetected: ['Rival A', 'Rival B'],
  lastRunAt: '2026-06-28T00:00:00.000Z'
}

const baseFacts: OperatorCrossSellFacts = {
  recipient: { email: 'Maria@Globe.com', firstName: 'María', lastName: 'Pérez' },
  organizationName: 'Globe Co',
  organizationDomain: 'globe.com',
  leadType: 'new_business',
  report: baseReport,
  reportUrl: 'https://greenhouse.efeoncepro.com/grader/r/grt-token'
}

describe('deriveAeoCheckResult', () => {
  it('ready + score > 0 → Aparece', () => {
    expect(deriveAeoCheckResult({ ...baseReport, gateStatus: 'ready', overallScore: 64 })).toBe('Aparece')
  })

  it('ready + score 0 → No aparece (el gap comercial más valioso)', () => {
    expect(deriveAeoCheckResult({ ...baseReport, gateStatus: 'ready', overallScore: 0 })).toBe('No aparece')
  })

  it('no releasable (insufficient_data) → No verificado', () => {
    expect(deriveAeoCheckResult({ ...baseReport, gateStatus: 'insufficient_data' })).toBe('No verificado')
  })

  it('score null → No verificado', () => {
    expect(deriveAeoCheckResult({ ...baseReport, overallScore: null })).toBe('No verificado')
  })
})

describe('buildOperatorCrossSellPayload', () => {
  it('arma Contact (email normalizado) + Company (por dominio org) + Lead (no Deal)', () => {
    const payload = buildOperatorCrossSellPayload(baseFacts)

    expect(payload.contact.email).toBe('maria@globe.com')
    expect(payload.company?.domain).toBe('globe.com')
    expect(payload.company?.name).toBe('Globe Co')
    expect(payload.company?.properties[AI_VISIBILITY_COMPANY_PROPERTIES.aeoCheckResult]).toBe('Aparece')
    expect(payload.company?.properties[AI_VISIBILITY_COMPANY_PROPERTIES.score]).toBe('64')
    expect(payload.lead.name).toBe('Diagnóstico AEO — Globe Co')
  })

  it('sin dominio de org → Lead contact-only (Company null)', () => {
    const payload = buildOperatorCrossSellPayload({ ...baseFacts, organizationDomain: null })

    expect(payload.company).toBeNull()
    expect(payload.lead.name).toBe('Diagnóstico AEO — Globe Co')
  })

  it('score null → NO escribe la prop de score (null ≠ 0) pero sí aeo_check_result=No verificado', () => {
    const payload = buildOperatorCrossSellPayload({
      ...baseFacts,
      report: { ...baseReport, overallScore: null }
    })

    expect(payload.company?.properties[AI_VISIBILITY_COMPANY_PROPERTIES.score]).toBeUndefined()
    expect(payload.company?.properties[AI_VISIBILITY_COMPANY_PROPERTIES.aeoCheckResult]).toBe('No verificado')
  })
})
