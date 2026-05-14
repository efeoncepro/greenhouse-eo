import 'server-only'

import { createHash } from 'crypto'

import { NextResponse } from 'next/server'

import { withTransaction } from '@/lib/db'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { isWorkforceActivationReadinessGuardEnabled } from '@/lib/workforce/activation/flags'
import {
  buildWorkforceActivationReadinessAuditSnapshot,
  resolveWorkforceActivationReadiness
} from '@/lib/workforce/activation/readiness'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'

export interface CompleteWorkforceIntakeBody {
  readonly reason?: string
  readonly override?: boolean
  readonly overrideReason?: string
}

interface MemberRow extends Record<string, unknown> {
  member_id: string
  display_name: string
  workforce_intake_status: 'pending_intake' | 'in_review' | 'completed'
  active: boolean
  identity_profile_id: string | null
}

export const completeWorkforceMemberIntake = async ({
  memberId,
  tenant,
  body
}: {
  readonly memberId: string
  readonly tenant: TenantContext
  readonly body: CompleteWorkforceIntakeBody
}) => {
  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'workforce.member.complete_intake', 'update', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden — capability workforce.member.complete_intake required' }, { status: 403 })
  }

  if (!memberId || typeof memberId !== 'string') {
    return NextResponse.json({ error: 'memberId path param is required' }, { status: 400 })
  }

  const reason = (body.reason ?? '').trim() || null
  const overrideRequested = body.override === true
  const overrideReason = (body.overrideReason ?? '').trim()
  const canOverride = can(subject, 'workforce.member.activation_readiness.override', 'override', 'tenant')

  try {
    return await withTransaction(async client => {
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
      const readiness = await resolveWorkforceActivationReadiness(memberId)
      const readinessSnapshot = buildWorkforceActivationReadinessAuditSnapshot(readiness)
      const readinessSnapshotHash = createHash('sha256').update(JSON.stringify(readinessSnapshot)).digest('hex')
      let overrideApplied = false

      if (isWorkforceActivationReadinessGuardEnabled() && !readiness.ready) {
        if (!overrideRequested) {
          return NextResponse.json(
            {
              error: 'Workforce activation readiness is blocked.',
              code: 'activation_readiness_blocked',
              readiness,
              readinessSnapshotHash
            },
            { status: 409 }
          )
        }

        if (!canOverride) {
          return NextResponse.json(
            {
              error: 'Forbidden — capability workforce.member.activation_readiness.override required',
              code: 'activation_readiness_override_forbidden'
            },
            { status: 403 }
          )
        }

        if (overrideReason.length < 20) {
          return NextResponse.json(
            {
              error: 'Override reason must be at least 20 characters.',
              code: 'activation_readiness_override_reason_required'
            },
            { status: 400 }
          )
        }

        overrideApplied = true
      }

      await client.query(
        `UPDATE greenhouse_core.members
         SET workforce_intake_status = 'completed',
             updated_at = CURRENT_TIMESTAMP
         WHERE member_id = $1`,
        [memberId]
      )

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
            readinessSnapshot,
            readinessSnapshotHash,
            readinessOverride: overrideApplied
              ? {
                  actorUserId: tenant.userId,
                  reason: overrideReason,
                  appliedAt: new Date().toISOString()
                }
              : null,
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
          actorUserId: tenant.userId,
          readinessSnapshotHash,
          readinessOverrideApplied: overrideApplied
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
