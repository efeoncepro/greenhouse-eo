import { describe, expect, it } from 'vitest'

import { buildAutoCampaignSeedCandidates, deriveSeedPrefix } from './backfill-heuristics'

describe('campaign backfill heuristics', () => {
  it('normalizes obvious recurring prefixes without collapsing every project into a campaign', () => {
    expect(deriveSeedPrefix('GTM - Q1 - 2026')).toBe('gtm')
    expect(deriveSeedPrefix('Content Q2 - 2026')).toBe('content')
    expect(deriveSeedPrefix('Nuevo proyecto')).toBeNull()
    expect(deriveSeedPrefix('Sin nombre')).toBeNull()
  })

  it('builds conservative auto-cluster candidates only when at least two projects share a prefix inside a space', () => {
    const candidates = buildAutoCampaignSeedCandidates([
      {
        spaceId: 'space-efeonce',
        clientId: null,
        projectSourceId: 'p-1',
        projectName: 'GTM - Q1 - 2026',
        projectStatus: 'En curso',
        startDate: '2026-01-01T03:00:00.000Z',
        endDate: '2026-03-31T03:00:00.000Z'
      },
      {
        spaceId: 'space-efeonce',
        clientId: null,
        projectSourceId: 'p-2',
        projectName: 'GTM - Q2 - 2026',
        projectStatus: 'Trabajo acumulado',
        startDate: '2026-04-01T03:00:00.000Z',
        endDate: '2026-06-30T04:00:00.000Z'
      },
      {
        spaceId: 'space-efeonce',
        clientId: null,
        projectSourceId: 'p-3',
        projectName: 'Operaciones - Marzo 26',
        projectStatus: 'En curso',
        startDate: '2026-03-01T03:00:00.000Z',
        endDate: '2026-03-31T03:00:00.000Z'
      },
      {
        spaceId: 'greenhouse-demo-client',
        clientId: 'greenhouse-demo-client',
        projectSourceId: 'p-4',
        projectName: 'Content - Q1 - 2026',
        projectStatus: 'En curso',
        startDate: '2026-01-01T03:00:00.000Z',
        endDate: '2026-03-31T03:00:00.000Z'
      },
      {
        spaceId: 'greenhouse-demo-client',
        clientId: 'greenhouse-demo-client',
        projectSourceId: 'p-5',
        projectName: 'Content Q2 - 2026',
        projectStatus: 'Trabajo acumulado',
        startDate: null,
        endDate: null
      }
    ])

    expect(candidates).toEqual([
      {
        spaceId: 'space-efeonce',
        clientId: null,
        displayName: 'Gtm',
        campaignType: 'campaign',
        status: 'active',
        plannedStartDate: '2026-01-01',
        plannedEndDate: '2026-06-30',
        projectSourceIds: ['p-1', 'p-2'],
        sourceProjectNames: ['GTM - Q1 - 2026', 'GTM - Q2 - 2026'],
        strategy: 'auto-cluster'
      },
      {
        spaceId: 'greenhouse-demo-client',
        clientId: 'greenhouse-demo-client',
        displayName: 'Content',
        campaignType: 'campaign',
        status: 'active',
        plannedStartDate: '2026-01-01',
        plannedEndDate: '2026-03-31',
        projectSourceIds: ['p-4', 'p-5'],
        sourceProjectNames: ['Content - Q1 - 2026', 'Content Q2 - 2026'],
        strategy: 'auto-cluster'
      }
    ])
  })
})
