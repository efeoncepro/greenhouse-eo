import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { resolveProfileIdForMember } from '@/lib/person-legal-profile'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ memberId: string }>
}

interface AuditRow {
  audit_id: string
  target_kind: string
  target_id: string
  action: string
  actor_user_id: string | null
  actor_email: string | null
  reason: string | null
  diff_json: unknown
  created_at: Date
  [key: string]: unknown
}

/**
 * TASK-784 HR redesign — GET: combined audit log (documents + addresses)
 * for a member's legal profile, ordered by created_at DESC.
 *
 * Capability: `person.legal_profile.read_masked` (HR scope tenant).
 * Returns up to 50 events. NEVER includes value_full / street_line_1 in
 * diff_json — the audit writer sanitizes upstream.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { tenant, errorResponse: authErr } = await requireHrCoreReadTenantContext()

  if (!tenant || authErr) return authErr ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'person.legal_profile.read_masked', 'read', 'tenant')) {
    return NextResponse.json(
      { error: 'Capability missing: person.legal_profile.read_masked', code: 'forbidden' },
      { status: 403 }
    )
  }

  const { memberId } = await params

  try {
    const profileId = await resolveProfileIdForMember(memberId)

    if (!profileId) {
      return NextResponse.json({ events: [] })
    }

    const rows = await query<AuditRow>(
      `
        SELECT
          audit_id,
          'document' AS target_kind,
          document_id AS target_id,
          action,
          actor_user_id,
          actor_email,
          reason,
          diff_json,
          created_at
        FROM greenhouse_core.person_identity_document_audit_log
        WHERE profile_id = $1

        UNION ALL

        SELECT
          audit_id,
          'address' AS target_kind,
          address_id AS target_id,
          action,
          actor_user_id,
          actor_email,
          reason,
          diff_json,
          created_at
        FROM greenhouse_core.person_address_audit_log
        WHERE profile_id = $1

        ORDER BY created_at DESC
        LIMIT 50
      `,
      [profileId]
    )

    return NextResponse.json({
      events: rows.map(r => ({
        auditId: r.audit_id,
        targetKind: r.target_kind,
        targetId: r.target_id,
        action: r.action,
        actorUserId: r.actor_user_id,
        actorEmail: r.actor_email,
        reason: r.reason,
        diffJson: r.diff_json && typeof r.diff_json === 'object' ? r.diff_json : {},
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
      }))
    })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      extra: { route: 'hr/legal-profile/audit-log', method: 'GET', memberId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
