import { NextResponse } from 'next/server'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetServerAuthSession = vi.fn()
const mockGetHomeSnapshot = vi.fn()

vi.mock('@/lib/auth', () => ({
  getServerAuthSession: () => mockGetServerAuthSession()
}))

vi.mock('@/lib/home/get-home-snapshot', () => ({
  getHomeSnapshot: (...args: unknown[]) => mockGetHomeSnapshot(...args)
}))

const { GET } = await import('./route')

describe('GET /api/home/snapshot', () => {
  it('returns the extended home snapshot payload', async () => {
    mockGetServerAuthSession.mockResolvedValue({
      user: {
        userId: 'user-1',
        clientId: 'client-1',
        name: 'Julio Reyes',
        role: 'admin',
        tenantType: 'efeonce_internal',
        primaryRoleCode: 'efeonce_admin',
        businessLines: [],
        serviceModules: [],
        roleCodes: [],
        routeGroups: [],
        authorizedViews: [],
        portalHomePath: '/home',
        organizationId: 'org-1'
      }
    })

    mockGetHomeSnapshot.mockResolvedValue({
      greeting: { title: 'Hola Julio', subtitle: 'Pulse' },
      modules: [],
      tasks: [],
      recommendedShortcuts: [],
      accessContext: null,
      nexaInsights: {
        totalAnalyzed: 1,
        lastAnalysis: '2026-04-15T13:10:00.000Z',
        runStatus: 'succeeded',
        insights: []
      },
      financeStatus: null,
      nexaIntro: 'Hola',
      computedAt: '2026-04-15T13:10:00.000Z'
    })

    const response = await GET()

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      greeting: { title: 'Hola Julio', subtitle: 'Pulse' },
      modules: [],
      tasks: [],
      recommendedShortcuts: [],
      accessContext: null,
      nexaInsights: {
        totalAnalyzed: 1,
        lastAnalysis: '2026-04-15T13:10:00.000Z',
        runStatus: 'succeeded',
        insights: []
      },
      financeStatus: null,
      nexaIntro: 'Hola',
      computedAt: '2026-04-15T13:10:00.000Z'
    })
  })
})
