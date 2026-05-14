import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import {
  completeWorkforceMemberIntake,
  type CompleteWorkforceIntakeBody
} from '@/lib/workforce/intake/complete-intake'

/**
 * TASK-872 Slice 5 — Workforce intake transition admin endpoint.
 *
 * POST /api/admin/workforce/members/[memberId]/complete-intake
 *
 * Transition: members.workforce_intake_status pending_intake|in_review → completed.
 * V1.0 minimal: solo la transición + audit row + outbox event. V1.1 ship UI dedicada
 * Workforce Intake con validation pre-flight (compensation_packages + contract_terms +
 * person_legal_profile readiness).
 *
 * Body: { reason?: string }
 *
 * Auth: requireAdminTenantContext + can(subject, 'workforce.member.complete_intake',
 *       'update', 'tenant').
 * Capability: FINANCE_ADMIN + EFEONCE_ADMIN canonical (seeded TASK-872 Slice 1.5).
 *
 * Spec: docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md
 * Runbook: docs/operations/runbooks/scim-internal-collaborator-recovery.md (escenario 4)
 */

export const dynamic = 'force-dynamic'

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) => {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { memberId } = await params
  let body: CompleteWorkforceIntakeBody = {}

  try {
    body = ((await request.json().catch(() => ({}))) as CompleteWorkforceIntakeBody) ?? {}
  } catch {
    body = {}
  }

  return completeWorkforceMemberIntake({ memberId, tenant, body })
}
