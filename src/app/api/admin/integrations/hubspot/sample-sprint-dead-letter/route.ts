import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-837 Slice 5 — list Sample Sprints in outbound_dead_letter.
 *
 * GET /api/admin/integrations/hubspot/sample-sprint-dead-letter
 *
 * Capability: `commercial.engagement.recover_outbound` (FINANCE_ADMIN + EFEONCE_ADMIN).
 * Returns services with hubspot_sync_status='outbound_dead_letter' + minimal
 * audit history (last 3 transitions). Error messages are redacted.
 */

interface DeadLetterRow extends Record<string, unknown> {
  service_id: string
  name: string
  hubspot_deal_id: string | null
  idempotency_key: string | null
  engagement_kind: string
  organization_id: string | null
  space_id: string | null
  updated_at: string | Date | null
  created_at: string | Date | null
}

interface AuditRow extends Record<string, unknown> {
  service_id: string
  event_kind: string
  payload_json: Record<string, unknown> | null
  created_at: string | Date | null
}

const toIso = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value

  return null
}

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'commercial.engagement.recover_outbound', 'read', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const rows = await query<DeadLetterRow>(
      `SELECT service_id, name, hubspot_deal_id, idempotency_key, engagement_kind,
              organization_id, space_id, updated_at, created_at
         FROM greenhouse_core.services
        WHERE engagement_kind != 'regular'
          AND hubspot_sync_status = 'outbound_dead_letter'
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 200`
    )

    if (rows.length === 0) {
      return NextResponse.json({ items: [], count: 0 })
    }

    const serviceIds = rows.map(r => r.service_id)

    const auditRows = await query<AuditRow>(
      `SELECT service_id, event_kind, payload_json, created_at
         FROM greenhouse_commercial.engagement_audit_log
        WHERE service_id = ANY($1::text[])
          AND event_kind IN ('outbound_failed', 'outbound_retry_attempted', 'outbound_dead_lettered')
        ORDER BY created_at DESC
        LIMIT 1000`,
      [serviceIds]
    )

    const auditByService = new Map<string, AuditRow[]>()

    for (const audit of auditRows) {
      const list = auditByService.get(audit.service_id) ?? []

      if (list.length < 3) list.push(audit)
      auditByService.set(audit.service_id, list)
    }

    const items = rows.map(row => ({
      serviceId: row.service_id,
      name: row.name,
      hubspotDealId: row.hubspot_deal_id,
      idempotencyKey: row.idempotency_key,
      engagementKind: row.engagement_kind,
      organizationId: row.organization_id,
      spaceId: row.space_id,
      updatedAt: toIso(row.updated_at),
      createdAt: toIso(row.created_at),
      lastErrors: (auditByService.get(row.service_id) ?? []).map(audit => {
        const errMsg =
          typeof audit.payload_json?.errorMessage === 'string'
            ? (audit.payload_json.errorMessage as string)
            : null

        return {
          eventKind: audit.event_kind,
          occurredAt: toIso(audit.created_at),
          errorMessage: errMsg ? redactErrorForResponse(new Error(errMsg)) : null
        }
      })
    }))

    return NextResponse.json({ items, count: items.length })
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'sample_sprint_dead_letter_list' }
    })
    
return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 502 })
  }
}
