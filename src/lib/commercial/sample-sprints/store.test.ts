import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

vi.mock('./approvals', () => ({
  getApprovalForService: vi.fn(async () => null)
}))

vi.mock('./outcomes', () => ({
  getOutcomeForService: vi.fn(async () => null)
}))

vi.mock('./progress-recorder', () => ({
  listSnapshotsForService: vi.fn(async () => [])
}))

import { query } from '@/lib/db'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { getSampleSprintDetail } from './store'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>

const buildTenant = (overrides: Partial<TenantContext> = {}): TenantContext => ({
  userId: 'user-agent-e2e-001',
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
  effectiveLocale: 'es-CL',
  ...overrides
})

describe('sample sprint store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads detail audit trail using the canonical occurred_at column', async () => {
    mockedQuery
      .mockResolvedValueOnce([
        {
          service_id: 'svc-001',
          public_id: 'EO-SVC-0001',
          name: 'Smoke Sample Sprint',
          engagement_kind: 'pilot',
          status: 'pending_approval',
          pipeline_stage: 'onboarding',
          space_id: 'space-001',
          space_name: 'Sky Airline',
          client_id: 'client-001',
          client_name: 'Sky Airline',
          organization_id: 'org-001',
          organization_name: 'Sky Airlines',
          start_date: '2026-05-11',
          target_end_date: '2026-06-11',
          total_cost: '698000',
          commitment_terms_json: {
            successCriteria: { summary: 'Prove operational value' },
            proposedTeam: []
          },
          approval_status: 'pending',
          latest_snapshot_date: null,
          outcome_kind: null,
          created_at: '2026-06-20T16:51:39.332Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          audit_id: 'engagement-audit-1',
          event_kind: 'declared',
          actor_user_id: 'user-agent-e2e-001',
          reason: null,
          payload_json: { serviceId: 'svc-001' },
          created_at: '2026-06-20T16:51:39.400Z'
        }
      ])

    const detail = await getSampleSprintDetail({
      tenant: buildTenant(),
      serviceId: 'svc-001'
    })

    const auditSql = String(mockedQuery.mock.calls[1]?.[0] ?? '')

    expect(auditSql).toContain('occurred_at AS created_at')
    expect(auditSql).toContain('ORDER BY occurred_at DESC')
    expect(auditSql).not.toContain('ORDER BY created_at DESC')
    expect(detail?.auditEvents[0]).toMatchObject({
      auditId: 'engagement-audit-1',
      eventKind: 'declared',
      createdAt: '2026-06-20T16:51:39.400Z'
    })
  })
})
