import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

import { query } from '@/lib/db'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import {
  countCommercialEngagementBudgetOverrun,
  countCommercialEngagementOverdueDecision,
  countCommercialEngagementStaleProgress,
  countCommercialEngagementUnapprovedActive,
  countCommercialEngagementZombie,
  getCommercialEngagementConversionRateSnapshot
} from './health'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockedQuery.mockReset()
})

const internalAdminTenant: TenantContext = {
  userId: 'user-julio',
  clientId: 'client-efeonce',
  clientName: 'Efeonce',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: ['internal', 'admin'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  role: 'efeonce_admin',
  projectIds: [],
  featureFlags: [],
  timezone: 'America/Santiago',
  portalHomePath: '/dashboard',
  authMode: 'sso',
  preferredLocale: 'es-CL',
  tenantDefaultLocale: 'es-CL',
  legacyLocale: 'es-CL',
  effectiveLocale: 'es-CL'
}

const clientTenantWithSpace: TenantContext = {
  ...internalAdminTenant,
  userId: 'user-sky-001',
  clientId: 'client-sky',
  clientName: 'Sky Airline',
  tenantType: 'client',
  roleCodes: ['client_executive'],
  primaryRoleCode: 'client_executive',
  routeGroups: ['client'],
  spaceId: 'space-sky-airline'
}

describe('TASK-835 Slice 4 — Commercial Health helpers tenant scope', () => {
  describe('backward compat (sin tenantContext) — comportamiento global preservado', () => {
    it('countCommercialEngagementOverdueDecision sin options usa SQL global (sin params)', async () => {
      mockedQuery.mockResolvedValue([{ n: 5 }])

      const count = await countCommercialEngagementOverdueDecision()

      expect(count).toBe(5)
      expect(mockedQuery).toHaveBeenCalledTimes(1)
      const args = mockedQuery.mock.calls[0]!

      expect(args).toHaveLength(1) // sin segundo arg de params
      expect(args[0]).not.toContain('$1') // SQL no parametrizado
    })

    it('getCommercialEngagementConversionRateSnapshot sin options preserva shape original', async () => {
      mockedQuery.mockResolvedValue([{ total_outcomes: 10, converted_outcomes: 4 }])

      const snap = await getCommercialEngagementConversionRateSnapshot()

      expect(snap.totalOutcomes).toBe(10)
      expect(snap.convertedOutcomes).toBe(4)
      expect(snap.conversionRate).toBeCloseTo(0.4)
    })

    it('Efeonce admin sin spaceId NO aplica scope SQL (visión global)', async () => {
      mockedQuery.mockResolvedValue([{ n: 7 }])

      await countCommercialEngagementOverdueDecision({ tenantContext: internalAdminTenant })

      const [sql, params] = mockedQuery.mock.calls[0]!

      expect(sql).not.toContain('s.space_id =')
      expect(params).toBeUndefined()
    })
  })

  describe('client tenant con spaceId — scope canónico aplicado', () => {
    it('countCommercialEngagementOverdueDecision filtra por space_id', async () => {
      mockedQuery.mockResolvedValue([{ n: 1 }])

      await countCommercialEngagementOverdueDecision({ tenantContext: clientTenantWithSpace })

      const [sql, params] = mockedQuery.mock.calls[0]!

      expect(sql).toContain('s.space_id = $1')
      expect(sql).toContain('EXISTS (')
      expect(params).toEqual(['space-sky-airline', 'client-sky'])
    })

    it('countCommercialEngagementBudgetOverrun aplica el mismo scope', async () => {
      mockedQuery.mockResolvedValue([{ n: 2 }])

      await countCommercialEngagementBudgetOverrun({ tenantContext: clientTenantWithSpace })

      const [sql, params] = mockedQuery.mock.calls[0]!

      expect(sql).toContain('s.space_id = $1')
      expect(params).toEqual(['space-sky-airline', 'client-sky'])
    })

    it('countCommercialEngagementZombie aplica el mismo scope', async () => {
      mockedQuery.mockResolvedValue([{ n: 0 }])

      await countCommercialEngagementZombie({ tenantContext: clientTenantWithSpace })

      const [, params] = mockedQuery.mock.calls[0]!

      expect(params).toEqual(['space-sky-airline', 'client-sky'])
    })

    it('countCommercialEngagementUnapprovedActive aplica el mismo scope', async () => {
      mockedQuery.mockResolvedValue([{ n: 0 }])

      await countCommercialEngagementUnapprovedActive({ tenantContext: clientTenantWithSpace })

      const [, params] = mockedQuery.mock.calls[0]!

      expect(params).toEqual(['space-sky-airline', 'client-sky'])
    })

    it('countCommercialEngagementStaleProgress inserta scope dentro del subselect', async () => {
      mockedQuery.mockResolvedValue([{ n: 3 }])

      await countCommercialEngagementStaleProgress({ tenantContext: clientTenantWithSpace })

      const [sql, params] = mockedQuery.mock.calls[0]!

      expect(sql).toContain('s.space_id = $1')
      expect(params).toEqual(['space-sky-airline', 'client-sky'])
    })

    it('getCommercialEngagementConversionRateSnapshot aplica scope con params', async () => {
      mockedQuery.mockResolvedValue([{ total_outcomes: 6, converted_outcomes: 1 }])

      const snap = await getCommercialEngagementConversionRateSnapshot({ tenantContext: clientTenantWithSpace })

      const [, params] = mockedQuery.mock.calls[0]!

      expect(params).toEqual(['space-sky-airline', 'client-sky'])
      expect(snap.conversionRate).toBeCloseTo(1 / 6)
    })
  })
})
