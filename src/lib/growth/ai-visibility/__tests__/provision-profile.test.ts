import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const state = vi.hoisted(() => ({
  orgRows: [] as Array<Record<string, unknown>>,
  profileRows: [] as Array<Record<string, unknown>>,
  insertedRows: [] as Array<Record<string, unknown>>
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[]) => {
    if (sql.includes('FROM greenhouse_core.organizations')) {
      return state.orgRows
    }

    if (sql.includes('FROM greenhouse_growth.grader_profiles')) {
      return state.profileRows
    }

    if (sql.includes('INSERT INTO greenhouse_growth.grader_profiles')) {
      const row = {
        profile_id: 'gp-created',
        public_id: 'EO-GP-CREATED',
        params
      }

      state.insertedRows.push(row)

      return [row]
    }

    return []
  }
}))

import {
  ProvisionGraderProfileError,
  provisionGraderProfileForOrganization
} from '../provision-profile'

beforeEach(() => {
  vi.clearAllMocks()
  state.orgRows = [
    {
      organization_id: 'org-1',
      organization_name: 'Acme',
      website_url: 'https://acme.cl',
      country: 'CL',
      industry: 'retail'
    }
  ]
  state.profileRows = []
  state.insertedRows = []
})

describe('provisionGraderProfileForOrganization', () => {
  it('creates an active grader profile from canonical organization website_url', async () => {
    const result = await provisionGraderProfileForOrganization('org-1')

    expect(result).toMatchObject({
      profileId: 'gp-created',
      publicId: 'EO-GP-CREATED',
      idempotent: false,
      websiteUrl: 'https://acme.cl',
      market: 'CL',
      locale: 'es-CL'
    })
    expect(state.insertedRows).toHaveLength(1)
    expect(state.insertedRows[0]?.params).toEqual([
      'Acme',
      'https://acme.cl',
      'CL',
      'es-CL',
      'retail',
      [],
      'org-1'
    ])
  })

  it('is idempotent when an active profile already exists', async () => {
    state.profileRows = [
      {
        profile_id: 'gp-existing',
        public_id: 'EO-GP-EXISTING',
        website_url: 'https://acme.cl'
      }
    ]

    const result = await provisionGraderProfileForOrganization('org-1')

    expect(result).toMatchObject({
      profileId: 'gp-existing',
      publicId: 'EO-GP-EXISTING',
      idempotent: true
    })
    expect(state.insertedRows).toHaveLength(0)
  })

  it('fails honestly when the organization has no canonical website_url', async () => {
    state.orgRows = [{ ...state.orgRows[0], website_url: null }]

    await expect(provisionGraderProfileForOrganization('org-1')).rejects.toMatchObject({
      name: 'ProvisionGraderProfileError',
      code: 'website_required'
    })
    expect(state.insertedRows).toHaveLength(0)
  })

  it('fails when organization is not active/found', async () => {
    state.orgRows = []

    await expect(provisionGraderProfileForOrganization('org-missing')).rejects.toBeInstanceOf(
      ProvisionGraderProfileError
    )
  })
})
