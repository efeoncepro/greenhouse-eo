import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockClientQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => true,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn(async (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    callback({ query: mockClientQuery }))
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

const { listLeaveBalancesFromPostgres, listLeaveRequestsFromPostgres } = await import('./postgres-leave-store')

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
    mockClientQuery.mockReset()
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
          created_at: '2026-04-08T12:00:00.000Z',
          source_kind: 'admin_backfill'
        }
      ])

    const payload = await listLeaveRequestsFromPostgres({
      tenant: adminTenant,
      year: 2026
    })

    expect(payload.requests).toHaveLength(1)
    expect(payload.requests[0]?.memberAvatarUrl).toBe('/api/media/users/user-1/avatar')
    expect(payload.requests[0]?.sourceKind).toBe('admin_backfill')

    const queryText = String(mockRunGreenhousePostgresQuery.mock.calls[1]?.[0] ?? '')

    expect(queryText).toContain('greenhouse_serving.person_360')
    expect(queryText).toContain('resolved_avatar_url')
  })

  it('qualifies member columns before hydrating balances for a specific collaborator', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query)

      if (sql.includes('FROM greenhouse_hr.leave_policies')) {
        return []
      }

      if (sql.includes('FROM greenhouse_hr.leave_balances AS b')) {
        return [
          {
            balance_id: 'balance-medical-2026',
            member_id: 'daniela-ferreira',
            member_name: 'Daniela Ferreira',
            leave_type_code: 'medical',
            leave_type_name: 'Permiso médico / cita médica',
            year: 2026,
            allowance_days: 0,
            progressive_extra_days: 0,
            carried_over_days: 0,
            adjustment_days: 0,
            accumulated_periods: 0,
            used_days: 0,
            reserved_days: 0
          }
        ]
      }

      return REQUIRED_TABLES.map(qualified_name => ({ qualified_name }))
    })

    mockClientQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query)

      if (sql.includes('FROM greenhouse_core.members AS m')) {
        return {
          rows: [
            {
              member_id: 'daniela-ferreira',
              display_name: 'Daniela Ferreira',
              email: 'daniela@efeoncepro.com',
              avatar_url: null,
              linked_user_id: 'user-daniela',
              identity_profile_id: 'identity-daniela',
              reports_to: null,
              employment_type: 'full_time',
              hire_date: '2024-01-10',
              prior_work_years: 0,
              contract_type: 'indefinido',
              pay_regime: 'chile',
              payroll_via: 'internal'
            }
          ]
        }
      }

      if (sql.includes('FROM greenhouse_hr.leave_types')) {
        return {
          rows: [
            {
            leave_type_code: 'medical',
            leave_type_name: 'Permiso médico / cita médica',
            description: null,
              default_annual_allowance_days: 0,
              requires_attachment: true,
              is_paid: true,
              active: true,
            color_token: null
          }
        ]
      }
      }

      if (sql.includes('FROM greenhouse_hr.leave_policies')) {
        return { rows: [] }
      }

      if (sql.includes('INSERT INTO greenhouse_hr.leave_balances')) {
        return { rows: [], rowCount: 1 }
      }

      return { rows: [] }
    })

    const payload = await listLeaveBalancesFromPostgres({
      tenant: adminTenant,
      memberId: 'daniela-ferreira',
      year: 2026
    })

    expect(payload.balances).toHaveLength(1)
    expect(payload.balances[0]?.memberId).toBe('daniela-ferreira')
    expect(payload.balances[0]?.policyExplain).toMatchObject({
      contractType: 'indefinido',
      payRegime: 'chile',
      payrollVia: 'internal'
    })

    const memberQuery = mockClientQuery.mock.calls.find(call =>
      String(call[0]).includes('FROM greenhouse_core.members AS m'))

    expect(memberQuery).toBeTruthy()
    expect(String(memberQuery?.[0])).toContain('m.member_id,')
    expect(String(memberQuery?.[0])).toContain('m.display_name,')
    expect(String(memberQuery?.[0])).toContain('m.identity_profile_id,')
    expect(String(memberQuery?.[0])).not.toContain('\n        member_id,')
  })
})
