/**
 * TASK-1001 — reader de candidatos a usuario de portal (seed HubSpot + rol sugerido + alreadyInvited).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const resolveScopeMock = vi.fn()
const listSuggestionsMock = vi.fn()
const queryMock = vi.fn()

vi.mock('@/lib/account-360/resolve-scope', () => ({
  resolveAccountScope: (...a: unknown[]) => resolveScopeMock(...a)
}))
vi.mock('./finance-contact-suggestions', () => ({
  listFinanceContactSuggestionsForCompany: (...a: unknown[]) => listSuggestionsMock(...a)
}))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...a: unknown[]) => queryMock(...a)
}))

import { listClientPortalPersonCandidates } from './client-portal-person-candidates'

beforeEach(() => {
  queryMock.mockResolvedValue([])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('listClientPortalPersonCandidates', () => {
  it('degrada client_not_ready si la org no tiene Cliente todavía', async () => {
    resolveScopeMock.mockResolvedValue({ clientIds: [], hubspotCompanyId: 'hs-1' })

    const result = await listClientPortalPersonCandidates('org-1')

    expect(result).toMatchObject({ clientId: null, candidates: [], degraded: true, degradedReason: 'client_not_ready' })
    expect(listSuggestionsMock).not.toHaveBeenCalled()
  })

  it('degrada hubspot_unavailable si el seed lanza (bridge caído)', async () => {
    resolveScopeMock.mockResolvedValue({ clientIds: ['client-1'], hubspotCompanyId: 'hs-1' })
    listSuggestionsMock.mockRejectedValue(new Error('bridge 503'))

    const result = await listClientPortalPersonCandidates('org-1')

    expect(result).toMatchObject({ clientId: 'client-1', degraded: true, degradedReason: 'hubspot_unavailable' })
  })

  it('mapea candidatos con rol sugerido y marca alreadyInvited por email (case-insensitive)', async () => {
    resolveScopeMock.mockResolvedValue({ clientIds: ['client-1'], hubspotCompanyId: 'hs-1' })
    listSuggestionsMock.mockResolvedValue([
      { hubspotContactId: 'c1', name: 'Ana CMO', email: 'Ana@Sky.com', jobTitle: 'CMO' },
      { hubspotContactId: 'c2', name: 'Beto Mgr', email: 'beto@sky.com', jobTitle: 'Marketing Manager' },
      { hubspotContactId: 'c3', name: 'Caro Spec', email: null, jobTitle: 'Diseñadora' }
    ])
    queryMock.mockResolvedValue([{ email: 'ana@sky.com' }])

    const result = await listClientPortalPersonCandidates('org-1')

    expect(result.degraded).toBe(false)
    expect(result.candidates).toHaveLength(3)
    expect(result.candidates[0]).toMatchObject({ suggestedRole: 'client_executive', alreadyInvited: true })
    expect(result.candidates[1]).toMatchObject({ suggestedRole: 'client_manager', alreadyInvited: false })
    expect(result.candidates[2]).toMatchObject({ suggestedRole: 'client_specialist', alreadyInvited: false })
  })

  it('usa el primer clientId cuando la org tiene varios', async () => {
    resolveScopeMock.mockResolvedValue({ clientIds: ['client-a', 'client-b'], hubspotCompanyId: null })
    listSuggestionsMock.mockResolvedValue([])

    const result = await listClientPortalPersonCandidates('org-1')

    expect(result.clientId).toBe('client-a')
    expect(result.degraded).toBe(false)
  })
})
