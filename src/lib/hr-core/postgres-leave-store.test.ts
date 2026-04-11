import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => true,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn()
}))

vi.mock('@/lib/approval-authority/store', () => ({
  applyWorkflowApprovalOverrideInTransaction: vi.fn(),
  getWorkflowApprovalSnapshotForStage: vi.fn(),
  listVisibleWorkflowEntityIdsForApprover: vi.fn(async () => []),
  listWorkflowApprovalSnapshotsForEntities: vi.fn(async () => []),
  upsertWorkflowApprovalSnapshotInTransaction: vi.fn()
}))

vi.mock('@/lib/reporting-hierarchy/access', () => ({
  getSupervisorScopeForTenant: vi.fn()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

const { listLeaveRequestsFromPostgres } = await import('./postgres-leave-store')

const REQUIRED_TABLES = [
  'greenhouse_core.client_users',
  'greenhouse_core.departments',
  'greenhouse_core.members',
  'greenhouse_hr.leave_types',
  'greenhouse_hr.leave_policies',
  'greenhouse_hr.leave_balances',
  'greenhouse_hr.leave_requests',
  'greenhouse_hr.leave_request_actions'
]

const adminTenant: TenantContext = {
  userId: 'user-admin-1',
  clientId: 'efeonce',
  clientName: 'Efeonce',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: ['hr'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  role: 'admin',
  projectIds: [],
  featureFlags: [],
  timezone: 'America/Santiago',
  portalHomePath: '/hr',
  authMode: 'credentials'
}

describe('listLeaveRequestsFromPostgres', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
  })

  it('hydrates avatars from the canonical person/avatar pipeline instead of forcing null', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce(REQUIRED_TABLES.map(qualified_name => ({ qualified_name })))
      .mockResolvedValueOnce([
        {
          request_id: 'leave-1',
          member_id: 'member-1',
          member_name: 'Julio Reyes',
          member_email: 'julio@efeoncepro.com',
          member_avatar_url: 'gs://greenhouse-assets/users/julio.png',
          member_linked_user_id: 'user-1',
          leave_type_code: 'vacaciones',
          leave_type_name: 'Vacaciones',
          start_date: '2026-04-08',
          end_date: '2026-04-10',
          start_period: 'full_day',
          end_period: 'full_day',
          requested_days: 3,
          status: 'approved',
          reason: 'Permiso',
          attachment_asset_id: null,
          attachment_url: null,
          supervisor_member_id: 'member-2',
          supervisor_name: 'CEO',
          hr_reviewer_user_id: null,
          decided_at: null,
          decided_by: null,
          notes: null,
          created_at: '2026-04-08T12:00:00.000Z'
        }
      ])

    const payload = await listLeaveRequestsFromPostgres({
      tenant: adminTenant,
      year: 2026
    })

    expect(payload.requests).toHaveLength(1)
    expect(payload.requests[0]?.memberAvatarUrl).toBe('/api/media/users/user-1/avatar')

    const queryText = String(mockRunGreenhousePostgresQuery.mock.calls[1]?.[0] ?? '')

    expect(queryText).toContain('greenhouse_serving.person_360')
    expect(queryText).toContain('resolved_avatar_url')
  })
})
