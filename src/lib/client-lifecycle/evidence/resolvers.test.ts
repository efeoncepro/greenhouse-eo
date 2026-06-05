import { describe, expect, it } from 'vitest'

import { AUTO_DERIVABLE_ITEM_CODES, canAutoCompleteFromEvidence, isAutoDerivableItem } from './evidence-types'
import {
  classifyBilling,
  classifyHubspot,
  classifyNotion,
  classifyPortalUsers,
  classifyTeam,
  classifyTeamsChannel
} from './resolvers'

describe('isAutoDerivableItem', () => {
  it('matches the 6 canonical auto-derivable codes', () => {
    expect(AUTO_DERIVABLE_ITEM_CODES).toHaveLength(6)
    for (const code of AUTO_DERIVABLE_ITEM_CODES) expect(isAutoDerivableItem(code)).toBe(true)
  })

  it('rejects declarative + unknown codes', () => {
    expect(isAutoDerivableItem('confirm_legal_documents')).toBe(false)
    expect(isAutoDerivableItem('declare_engagement_kind')).toBe(false)
    expect(isAutoDerivableItem('verify_notion_flowing')).toBe(false)
    expect(isAutoDerivableItem('nope')).toBe(false)
  })
})

describe('canAutoCompleteFromEvidence (safety-critical, anti-fake-green)', () => {
  it('autocompletes a detected, non-evidence item from pending', () => {
    expect(canAutoCompleteFromEvidence({ evidenceStatus: 'detected', requiresEvidence: false, itemStatus: 'pending' })).toBe(true)
  })

  it('autocompletes from in_progress too', () => {
    expect(canAutoCompleteFromEvidence({ evidenceStatus: 'detected', requiresEvidence: false, itemStatus: 'in_progress' })).toBe(true)
  })

  it('NEVER autocompletes pending/unverifiable evidence', () => {
    expect(canAutoCompleteFromEvidence({ evidenceStatus: 'pending', requiresEvidence: false, itemStatus: 'pending' })).toBe(false)
    expect(canAutoCompleteFromEvidence({ evidenceStatus: 'unverifiable', requiresEvidence: false, itemStatus: 'pending' })).toBe(false)
  })

  it('NEVER autocompletes a requires-evidence item (system evidence ≠ human asset)', () => {
    expect(canAutoCompleteFromEvidence({ evidenceStatus: 'detected', requiresEvidence: true, itemStatus: 'pending' })).toBe(false)
  })

  it('NEVER overrides a manual decision (completed/skipped/not_applicable/blocked)', () => {
    for (const itemStatus of ['completed', 'skipped', 'not_applicable', 'blocked']) {
      expect(canAutoCompleteFromEvidence({ evidenceStatus: 'detected', requiresEvidence: false, itemStatus })).toBe(false)
    }
  })
})

describe('classifyHubspot', () => {
  it('detected when a HubSpot company is linked', () => {
    expect(classifyHubspot({ hasClient: true, hubspotCompanyId: 'hs-1' }).status).toBe('detected')
  })

  it('pending when client exists but no HubSpot company', () => {
    expect(classifyHubspot({ hasClient: true, hubspotCompanyId: null }).status).toBe('pending')
  })

  it('pending (not unverifiable) when client not yet instantiated', () => {
    expect(classifyHubspot({ hasClient: false, hubspotCompanyId: null }).status).toBe('pending')
  })
})

describe('classifyTeam', () => {
  it('detected with at least one active assignment', () => {
    const v = classifyTeam({ hasClient: true, activeAssignments: 2, totalFte: 1.5 })

    expect(v.status).toBe('detected')
    expect(v.detail).toContain('2 personas asignadas')
    expect(v.detail).toContain('1.50 FTE')
  })

  it('singular copy + no FTE suffix when fte is 0/null', () => {
    const v = classifyTeam({ hasClient: true, activeAssignments: 1, totalFte: 0 })

    expect(v.status).toBe('detected')
    expect(v.detail).toContain('1 persona asignada')
    expect(v.detail).not.toContain('FTE')
  })

  it('pending with zero assignments', () => {
    expect(classifyTeam({ hasClient: true, activeAssignments: 0, totalFte: null }).status).toBe('pending')
  })

  it('pending when client not instantiated', () => {
    expect(classifyTeam({ hasClient: false, activeAssignments: 0, totalFte: null }).status).toBe('pending')
  })
})

describe('classifyNotion', () => {
  it('detected when readyToOnboard', () => {
    expect(classifyNotion({ hasSpace: true, readyToOnboard: true, summary: 'ok' }).status).toBe('detected')
  })

  it('pending surfaces the preflight summary when not ready', () => {
    const v = classifyNotion({ hasSpace: true, readyToOnboard: false, summary: 'Falta el raw.' })

    expect(v.status).toBe('pending')
    expect(v.detail).toBe('Falta el raw.')
  })

  it('pending when there is no linked space', () => {
    expect(classifyNotion({ hasSpace: false, readyToOnboard: false, summary: '' }).status).toBe('pending')
  })
})

describe('classifyTeamsChannel', () => {
  it('detected with a ready channel', () => {
    expect(classifyTeamsChannel({ hasSpace: true, readyChannels: 1 }).status).toBe('detected')
  })

  it('pending with no ready channels', () => {
    expect(classifyTeamsChannel({ hasSpace: true, readyChannels: 0 }).status).toBe('pending')
  })

  it('pending without a space', () => {
    expect(classifyTeamsChannel({ hasSpace: false, readyChannels: 0 }).status).toBe('pending')
  })
})

describe('classifyPortalUsers', () => {
  it('detected with at least one active user', () => {
    expect(classifyPortalUsers({ hasClient: true, activeUsers: 3 }).status).toBe('detected')
  })

  it('pending with zero users', () => {
    expect(classifyPortalUsers({ hasClient: true, activeUsers: 0 }).status).toBe('pending')
  })
})

describe('classifyBilling', () => {
  it('detected when payment currency present and no PO required', () => {
    const v = classifyBilling({ hasClient: true, paymentCurrency: 'CLP', requiresPo: false, poNumber: null })

    expect(v.status).toBe('detected')
    expect(v.detail).toContain('CLP')
  })

  it('detected when PO required and a PO is registered', () => {
    const v = classifyBilling({ hasClient: true, paymentCurrency: 'MXN', requiresPo: true, poNumber: 'OC-77' })

    expect(v.status).toBe('detected')
    expect(v.detail).toContain('OC OC-77')
  })

  it('pending when PO required but missing (honra el caso Berel sin false-pending)', () => {
    const v = classifyBilling({ hasClient: true, paymentCurrency: 'MXN', requiresPo: true, poNumber: null })

    expect(v.status).toBe('pending')
    expect(v.detail).toContain('orden de compra')
  })

  it('pending when payment currency is missing', () => {
    expect(classifyBilling({ hasClient: true, paymentCurrency: null, requiresPo: false, poNumber: null }).status).toBe('pending')
  })
})
