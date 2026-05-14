import { NextResponse } from 'next/server'

import { withTransaction } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'

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

interface CompleteIntakeBody {
  readonly reason?: string
}

interface MemberRow extends Record<string, unknown> {
  member_id: string
  display_name: string
  workforce_intake_status: 'pending_intake' | 'in_review' | 'completed'
  active: boolean
  identity_profile_id: string | null
}

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) => {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'workforce.member.complete_intake', 'update', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden — capability workforce.member.complete_intake required' }, { status: 403 })
  }

  const { memberId } = await params

  if (!memberId || typeof memberId !== 'string') {
    return NextResponse.json({ error: 'memberId path param is required' }, { status: 400 })
  }

  let body: CompleteIntakeBody = {}

  try {
    body = ((await request.json().catch(() => ({}))) as CompleteIntakeBody) ?? {}
  } catch {
    body = {}
  }

  const reason = (body.reason ?? '').trim() || null

  try {
    return await withTransaction(async client => {
      // 1. Verify member exists + intake_status allows transition
      const existing = await client.query<MemberRow>(
        `SELECT member_id, display_name, workforce_intake_status, active, identity_profile_id
         FROM greenhouse_core.members
         WHERE member_id = $1
         FOR UPDATE`,
        [memberId]
      )

      if (existing.rows.length === 0) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      const member = existing.rows[0]

      if (member.workforce_intake_status === 'completed') {
        // Idempotent: already complete
        return NextResponse.json(
          {
            memberId: member.member_id,
            workforceIntakeStatus: 'completed',
            transitioned: false,
            reason: 'already_completed'
          },
          { status: 200 }
        )
      }

      if (member.workforce_intake_status !== 'pending_intake' && member.workforce_intake_status !== 'in_review') {
        return NextResponse.json(
          {
            error: `Invalid transition source state: ${member.workforce_intake_status}`,
            details: { allowed: ['pending_intake', 'in_review'] }
          },
          { status: 409 }
        )
      }

      const previousStatus = member.workforce_intake_status

      // 2. UPDATE atomic
      await client.query(
        `UPDATE greenhouse_core.members
         SET workforce_intake_status = 'completed',
             updated_at = CURRENT_TIMESTAMP
         WHERE member_id = $1`,
        [memberId]
      )

      // 3. Outbox event v1
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.member,
          aggregateId: memberId,
          eventType: EVENT_TYPES.workforceMemberIntakeCompleted,
          payload: {
            schemaVersion: 1,
            memberId,
            displayName: member.display_name,
            identityProfileId: member.identity_profile_id,
            previousStatus,
            newStatus: 'completed',
            actorUserId: tenant.userId,
            reason,
            transitionedAt: new Date().toISOString()
          }
        },
        client
      )

      return NextResponse.json(
        {
          memberId,
          workforceIntakeStatus: 'completed',
          previousStatus,
          transitioned: true,
          actorUserId: tenant.userId
        },
        { status: 200 }
      )
    })
  } catch (error) {
    captureWithDomain(error instanceof Error ? error : new Error(String(error)), 'identity', {
      tags: { source: 'workforce_member_complete_intake', stage: 'transition' },
      extra: { memberId }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
