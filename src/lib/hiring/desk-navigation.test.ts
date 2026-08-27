import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listApplications: vi.fn(),
  listOpenings: vi.fn(),
  listDemands: vi.fn(),
  runQuery: vi.fn(),
}))

vi.mock('./store', () => ({
  listHiringApplications: mocks.listApplications,
  listHiringOpenings: mocks.listOpenings,
  listTalentDemands: mocks.listDemands,
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runQuery,
}))

vi.mock('./data-origin/config', () => ({
  isHiringSyntheticDataFilterEnabled: () => true,
}))

import { getHiringApplicationQueueNavigation, getHiringDeskSnapshot } from './desk'

const application = {
  applicationId: 'happ-focus',
  publicId: 'EO-APP-9999',
  openingId: 'opng-focus',
  identityProfileId: 'identity-focus',
  candidateFacetId: 'facet-focus',
  stage: 'shortlisted',
  source: 'manual',
  archivedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Hiring Desk — navegación exacta y neutral', () => {
  it('fija la postulación y su vacante aunque ambas queden fuera de los límites cronológicos', async () => {
    mocks.listApplications.mockImplementation(async (filters: { applicationId?: string }) => (
      filters.applicationId ? [application] : []
    ))
    mocks.listOpenings.mockImplementation(async (filters: { openingId?: string }) => (
      filters.openingId
        ? [{
            openingId: 'opng-focus',
            publicId: 'EO-OPN-9999',
            demandId: 'demand-focus',
            internalTitle: 'Vacante fuera del límite',
            publicTitle: 'Vacante fuera del límite',
            publicArea: 'People',
          }]
        : []
    ))
    mocks.listDemands.mockImplementation(async (filters: { demandId?: string }) => (
      filters.demandId
        ? [{ demandId: 'demand-focus', requestedRole: 'Talent Partner', businessUnit: 'People' }]
        : []
    ))
    mocks.runQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('GROUP BY opening_id')) return []

      if (sql.includes('published_openings')) {
        return [{ openings: 1, applications: 121, published_openings: 1, active_demands: 1 }]
      }

      if (sql.includes('identity_profiles')) {
        return [{ profile_id: 'identity-focus', full_name: 'Persona exacta', canonical_email: 'persona@example.com' }]
      }

      if (sql.includes('candidate_facet')) {
        return [{ candidate_facet_id: 'facet-focus', portfolio_url: null, linkedin_url: null, phone_e164: null, residence_country_code: null }]
      }

      return []
    })

    const snapshot = await getHiringDeskSnapshot({
      openingId: 'opng-incorrect',
      focusApplicationId: 'happ-focus',
      openingLimit: 1,
      applicationLimit: 1,
    })

    expect(snapshot.openings.map(item => item.opening.openingId)).toEqual(['opng-focus'])
    expect(snapshot.applications.map(item => item.application.applicationId)).toEqual(['happ-focus'])
    expect(snapshot.applications[0]?.candidateName).toBe('Persona exacta')
    expect(mocks.listApplications).toHaveBeenCalledWith(expect.objectContaining({ openingId: 'opng-focus' }))
  })

  it('navega por orden cronológico dentro de vacante+etapa sin scores ni contenido evaluativo', async () => {
    mocks.listApplications.mockResolvedValue([application])
    mocks.runQuery.mockResolvedValue([{
      position: 3,
      total: 8,
      previous_application_id: 'happ-previous',
      next_application_id: 'happ-next',
    }])

    const result = await getHiringApplicationQueueNavigation('happ-focus')
    const [sql, values] = mocks.runQuery.mock.calls[0] as [string, unknown[]]

    expect(result).toEqual({
      openingId: 'opng-focus',
      stage: 'shortlisted',
      position: 3,
      total: 8,
      previousApplicationId: 'happ-previous',
      nextApplicationId: 'happ-next',
    })
    expect(values).toEqual(['opng-focus', 'shortlisted', 'happ-focus'])
    expect(sql).toContain('archived_at IS NULL')
    expect(sql).not.toMatch(/\b(score|match_score|explainability_json)\b/)
  })

  it('no crea una cola para una postulación archivada', async () => {
    mocks.listApplications.mockResolvedValue([{ ...application, archivedAt: '2026-08-24T00:00:00.000Z' }])

    await expect(getHiringApplicationQueueNavigation('happ-focus')).resolves.toBeNull()
    expect(mocks.runQuery).not.toHaveBeenCalled()
  })
})
