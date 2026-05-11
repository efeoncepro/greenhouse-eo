import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import type { ReliabilitySignal } from '@/types/reliability'

export const IDENTITY_GOVERNANCE_AUDIT_LOG_WRITE_FAILURES_SIGNAL_ID =
  'identity.governance.audit_log_write_failures'

export const IDENTITY_GOVERNANCE_PENDING_APPROVAL_OVERDUE_SIGNAL_ID =
  'identity.governance.pending_approval_overdue'

const WINDOW_HOURS = 24

type CountRow = {
  n: string | number
}

export const getIdentityGovernanceAuditLogWriteFailuresSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CountRow>(
      `
        SELECT COUNT(*)::text AS n
        FROM greenhouse_sync.outbox_events event
        WHERE event.event_type IN (
          'access.entitlement_role_default_changed',
          'access.entitlement_user_override_changed',
          'access.startup_policy_changed'
        )
          AND event.occurred_at >= NOW() - ($1::text || ' hours')::interval
          AND NOT EXISTS (
            SELECT 1
            FROM greenhouse_core.entitlement_governance_audit_log audit
            WHERE audit.space_id = COALESCE(event.payload_json->>'spaceId', '__platform__')
              AND audit.performed_by = event.payload_json->>'changedByUserId'
              AND audit.created_at BETWEEN event.occurred_at - INTERVAL '5 minutes'
                                      AND event.occurred_at + INTERVAL '5 minutes'
              AND (
                audit.target_role = event.payload_json->>'roleCode'
                OR audit.target_user = event.payload_json->>'userId'
                OR event.event_type = 'access.startup_policy_changed'
              )
          )
      `,
      [String(WINDOW_HOURS)]
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_GOVERNANCE_AUDIT_LOG_WRITE_FAILURES_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityGovernanceAuditLogWriteFailuresSignal',
      label: 'Governance audit log write failures',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? `0 governance outbox events without matching audit row in last ${WINDOW_HOURS}h.`
          : `${count} governance outbox event${count === 1 ? '' : 's'} without matching audit row in last ${WINDOW_HOURS}h.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'missing_audit_count', value: String(count) },
        { kind: 'metric', label: 'window_hours', value: String(WINDOW_HOURS) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-839-issue-068-fase-5-admin-center-governance-wire-up.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_identity_governance_audit_log_write_failures' }
    })

    return {
      signalId: IDENTITY_GOVERNANCE_AUDIT_LOG_WRITE_FAILURES_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityGovernanceAuditLogWriteFailuresSignal',
      label: 'Governance audit log write failures',
      severity: 'unknown',
      summary: `No fue posible leer el signal de audit log governance: ${redactErrorForResponse(error)}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: redactErrorForResponse(error) }
      ]
    }
  }
}

export const getIdentityGovernancePendingApprovalOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CountRow>(
      `
        SELECT COUNT(*)::text AS n
        FROM greenhouse_core.user_entitlement_overrides
        WHERE approval_status = 'pending_approval'
          AND updated_at < NOW() - INTERVAL '7 days'
      `
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_GOVERNANCE_PENDING_APPROVAL_OVERDUE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityGovernancePendingApprovalOverdueSignal',
      label: 'Governance pending approvals overdue',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? '0 sensitive entitlement overrides pending approval for more than 7 days.'
          : `${count} sensitive entitlement override${count === 1 ? '' : 's'} pending approval for more than 7 days.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'overdue_pending_approval_count', value: String(count) },
        { kind: 'metric', label: 'threshold_days', value: '7' },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-839-issue-068-fase-5-admin-center-governance-wire-up.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_identity_governance_pending_approval_overdue' }
    })

    return {
      signalId: IDENTITY_GOVERNANCE_PENDING_APPROVAL_OVERDUE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityGovernancePendingApprovalOverdueSignal',
      label: 'Governance pending approvals overdue',
      severity: 'unknown',
      summary: `No fue posible leer approvals pendientes de governance: ${redactErrorForResponse(error)}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: redactErrorForResponse(error) }
      ]
    }
  }
}
