import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockClientQuery = vi.fn()

import { applyWorkflowApprovalOverrideInTransaction } from './store'

describe('applyWorkflowApprovalOverrideInTransaction', () => {
  beforeEach(() => {
    mockClientQuery.mockReset()
  })

  it('casts override values inside snapshot JSON payload updates', async () => {
    mockClientQuery.mockResolvedValue({
      rows: [
        {
          snapshot_id: 'EO-APS-12345678',
          workflow_domain: 'leave',
          workflow_entity_id: 'leave-1',
          stage_code: 'supervisor_review',
          subject_member_id: 'daniela-ferreira',
          authority_source: 'admin_override',
          formal_approver_member_id: 'julio-reyes',
          formal_approver_name: 'Julio Reyes',
          effective_approver_member_id: 'julio-reyes',
          effective_approver_name: 'Julio Reyes',
          delegate_member_id: null,
          delegate_member_name: null,
          delegate_responsibility_id: null,
          fallback_role_codes: [],
          override_actor_user_id: 'user-admin-1',
          override_reason: null,
          snapshot_payload: {},
          created_by_user_id: 'user-1',
          created_at: '2026-04-15T00:00:00.000Z',
          updated_at: '2026-04-15T00:00:01.000Z'
        }
      ]
    })

    await applyWorkflowApprovalOverrideInTransaction({
      workflowDomain: 'leave',
      workflowEntityId: 'leave-1',
      stageCode: 'supervisor_review',
      overrideActorUserId: 'user-admin-1',
      overrideReason: null,
      client: { query: mockClientQuery } as any
    })

    const sql = String(mockClientQuery.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain("'overrideActorUserId', $4::text")
    expect(sql).toContain("'overrideReason', $5::text")
  })
})
