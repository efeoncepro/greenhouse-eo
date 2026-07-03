import { describe, expect, it } from 'vitest'

import { AI_VISIBILITY_COMPANY_PROPERTIES, AI_VISIBILITY_CONTACT_PROPERTIES } from '../properties'
import { buildHubSpotLeadHandoffPayload, type LeadHandoffFacts } from '../property-mapper'

const baseFacts = (overrides: Partial<LeadHandoffFacts> = {}): LeadHandoffFacts => ({
  email: 'Ana@Acme.com',
  firstName: null,
  lastName: null,
  brandName: 'Acme',
  lastSubmitAt: '2026-06-25T10:00:00.000Z',
  reportUrl: 'https://think.efeoncepro.com/brand-visibility/r/tok123',
  report: {
    overallScore: 47,
    scoreVersion: 'ai_visibility_score_v1',
    primaryGapKey: 'entity_clarity',
    recommendedMotion: 'entity_foundation',
    competitorsDetected: ['Globex', 'Initech'],
    lastRunAt: '2026-06-25T09:00:00.000Z',
  },
  ...overrides,
})

describe('buildHubSpotLeadHandoffPayload', () => {
  it('mapea un lead corporativo a contact + company con props del titular', () => {
    const payload = buildHubSpotLeadHandoffPayload(baseFacts())

    expect(payload.contact.email).toBe('ana@acme.com') // normalizado lowercase
    expect(payload.contact.properties[AI_VISIBILITY_CONTACT_PROPERTIES.lastSubmitAt]).toBe('2026-06-25T10:00:00.000Z')

    expect(payload.company).not.toBeNull()
    expect(payload.company?.domain).toBe('acme.com')
    expect(payload.company?.name).toBe('Acme')
    const props = payload.company!.properties

    expect(props[AI_VISIBILITY_COMPANY_PROPERTIES.score]).toBe('47')
    expect(props[AI_VISIBILITY_COMPANY_PROPERTIES.scoreVersion]).toBe('ai_visibility_score_v1')
    expect(props[AI_VISIBILITY_COMPANY_PROPERTIES.primaryGap]).toBe('entity_clarity')
    expect(props[AI_VISIBILITY_COMPANY_PROPERTIES.recommendedMotion]).toBe('entity_foundation')
    expect(props[AI_VISIBILITY_COMPANY_PROPERTIES.competitorsDetected]).toBe('Globex, Initech')
    expect(props[AI_VISIBILITY_COMPANY_PROPERTIES.reportUrl]).toBe('https://think.efeoncepro.com/brand-visibility/r/tok123')
    expect(props[AI_VISIBILITY_COMPANY_PROPERTIES.lastRunAt]).toBe('2026-06-25T09:00:00.000Z')
  })

  it('email personal ⇒ company null (contact-only, sin company basura)', () => {
    const payload = buildHubSpotLeadHandoffPayload(baseFacts({ email: 'ana@gmail.com' }))

    expect(payload.company).toBeNull()
    expect(payload.contact.email).toBe('ana@gmail.com')
  })

  it('score null ⇒ NO escribe la prop de score ni score_version (sin 0 falso)', () => {
    const payload = buildHubSpotLeadHandoffPayload(
      baseFacts({ report: { ...baseFacts().report, overallScore: null } }),
    )

    expect(payload.company?.properties[AI_VISIBILITY_COMPANY_PROPERTIES.score]).toBeUndefined()
    expect(payload.company?.properties[AI_VISIBILITY_COMPANY_PROPERTIES.scoreVersion]).toBeUndefined()
  })

  it('acota la lista de competidores a 10 y omite vacíos', () => {
    const many = Array.from({ length: 15 }, (_, i) => `Comp${i}`)

    const payload = buildHubSpotLeadHandoffPayload(
      baseFacts({ report: { ...baseFacts().report, competitorsDetected: [...many, '', '  '] } }),
    )

    const detected = payload.company!.properties[AI_VISIBILITY_COMPANY_PROPERTIES.competitorsDetected]

    expect(detected.split(', ')).toHaveLength(10)
  })

  it('mapea firstName/lastName cuando existen (sub-task de captura)', () => {
    const payload = buildHubSpotLeadHandoffPayload(baseFacts({ firstName: '  Ana ', lastName: 'Pérez' }))

    expect(payload.contact.firstName).toBe('Ana')
    expect(payload.contact.lastName).toBe('Pérez')
  })

  it('reportUrl null ⇒ omite la prop (aún sin snapshot)', () => {
    const payload = buildHubSpotLeadHandoffPayload(baseFacts({ reportUrl: null }))

    expect(payload.company?.properties[AI_VISIBILITY_COMPANY_PROPERTIES.reportUrl]).toBeUndefined()
  })
})
