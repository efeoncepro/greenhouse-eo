import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { buildServiceEnablementPreview } from './preview'
import type { EnablementInventory } from './types'

const observedAt = '2026-09-09T20:00:00.000Z'

const inventory = (people: EnablementInventory['people']): EnablementInventory => ({
  organization: { id: 'org-a', active: true }, observedAt, businessLines: ['globe'],
  services: [{ id: 'svc-a', spaceId: 'spc-a', active: true, status: 'active', startsAt: null, endsAt: null }],
  terms: [{ id: 'terms-a', serviceId: 'svc-a', moduleKeys: ['creative_hub_globe_v1'], startsAt: '2026-09-09', endsAt: null }],
  modules: [{ key: 'creative_hub_globe_v1', scope: 'globe', startsAt: '2026-05-12', endsAt: null, viewCodes: ['cliente.pulse'], dataSources: ['agency.ico'] }],
  assignments: [{ id: 'cpma-a', moduleKey: 'creative_hub_globe_v1', status: 'active', startsAt: '2026-08-09', endsAt: null, expiresAt: null, revision: 'r1' }],
  people, sources: [], channels: []
})

const person = (id: string, status: string | null, active = status === 'active'): EnablementInventory['people'][number] => ({
  id, active, status, identityLinked: false, lastLoginAt: null, emailDeliverable: true, revokedViewCodes: [], preferences: []
})

const request = { organizationId: 'org-a', targets: [{ serviceId: 'svc-a', moduleKey: 'creative_hub_globe_v1' }], personIds: ['p-active', 'p-invited', 'p-missing'] }

describe('service enablement preview — person states are never collapsed (TASK-1852)', () => {
  it('distinguishes a provisioned-but-undelivered invitation from a non-member and from an active person', () => {
    const preview = buildServiceEnablementPreview(request, inventory([person('p-active', 'active'), person('p-invited', 'invited', false)]))

    expect(preview.blockers).toEqual(expect.arrayContaining([
      { code: 'person_invitation_pending', subject: 'p-invited', owner: 'Identity' },
      { code: 'person_not_authorized_in_organization', subject: 'p-missing', owner: 'Identity' }
    ]))
    expect(preview.blockers.filter(item => item.subject === 'p-active')).toEqual([])
    expect(preview.blockers.filter(item => item.subject === 'p-invited').map(item => item.code)).toEqual(['person_invitation_pending'])
    expect(preview.canApply).toBe(false)
    expect(preview.changes).toEqual([{ serviceId: 'svc-a', termsId: 'terms-a', moduleKey: 'creative_hub_globe_v1', action: 'preserve', assignmentId: 'cpma-a' }])
  })

  it('reports a clean preview when the mapped term, active module, active assignment and active people line up', () => {
    const preview = buildServiceEnablementPreview({ ...request, personIds: ['p-active'] }, inventory([person('p-active', 'active')]))

    expect(preview.blockers).toEqual([])
    expect(preview.canApply).toBe(true)
    expect(preview.readiness.map(item => item.code)).toEqual(expect.arrayContaining(['human_login_unverified', 'identity_link_unverified', 'producer_coverage_unverified']))
  })

  it('still blocks on commercial mapping when the current term does not bundle the module', () => {
    const base = inventory([person('p-active', 'active')])
    const preview = buildServiceEnablementPreview({ ...request, personIds: ['p-active'] }, { ...base, terms: [{ ...base.terms[0], moduleKeys: ['seo_v2'] }] })

    expect(preview.blockers).toEqual([{ code: 'commercial_mapping_unresolved', subject: 'creative_hub_globe_v1', owner: 'Commercial' }])
  })
})
