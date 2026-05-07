import { NextResponse } from 'next/server'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { syncServicesForCompany } from '@/lib/services/service-sync'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

/**
 * TASK-813 Slice 7 — Admin endpoint para listar HubSpot p_services huérfanos.
 *
 * Lista los webhook_inbox_events que el handler `hubspot-services` marcó
 * `failed` con `error_message LIKE 'organization_unresolved:%'`. Cada fila
 * representa un service HubSpot que el operador comercial necesita resolver:
 *   - Crear el client en Greenhouse (si la company HubSpot existe en CRM
 *     pero no se promovió a core), o
 *   - Archivar el service en HubSpot (si es un dato basura).
 *
 * Capability granular post TASK-555:
 * `commercial.service_engagement.resolve_orphan`.
 */

export const dynamic = 'force-dynamic'

interface OrphanRow extends Record<string, unknown> {
  webhook_inbox_event_id: string
  received_at: string
  error_message: string
  payload_json: unknown
}

interface OrphanItem {
  webhookInboxEventId: string
  receivedAt: string
  hubspotServiceId: string | null
  hubspotCompanyId: string | null
  reason: 'no_company_association' | 'no_greenhouse_space' | 'unknown'
  ageDays: number
  rawErrorMessage: string
}

const QUERY_SQL = `
  SELECT
    e.webhook_inbox_event_id,
    e.received_at::text AS received_at,
    e.error_message,
    e.payload_json
  FROM greenhouse_sync.webhook_inbox_events e
  JOIN greenhouse_sync.webhook_endpoints ep
    ON ep.webhook_endpoint_id = e.webhook_endpoint_id
  WHERE ep.endpoint_key = 'hubspot-services'
    AND e.status = 'failed'
    AND e.error_message LIKE 'organization_unresolved:%'
  ORDER BY e.received_at DESC
  LIMIT 100
`

const hasResolveOrphanCapability = (tenant: TenantContext) =>
  hasEntitlement(
    buildTenantEntitlementSubject(tenant),
    'commercial.service_engagement.resolve_orphan',
    'approve'
  )

const parseOrphan = (row: OrphanRow): OrphanItem => {
  const error = row.error_message ?? ''
  // error_message format: "organization_unresolved:<svc_id>" or
  // "organization_unresolved:<svc_id>:<hs_company_id>" or
  // "organization_unresolved:organization_unresolved:<svc_id>; ..."
  const parts = error.split(':').filter(p => p && p !== 'organization_unresolved')
  const svcId = parts[0] ?? null
  const hsCompanyId = parts[1] ?? null

  let reason: OrphanItem['reason'] = 'unknown'

  if (parts.length === 1) reason = 'no_company_association'
  else if (parts.length >= 2) reason = 'no_greenhouse_space'

  const receivedAt = new Date(row.received_at)
  const ageDays = Math.floor((Date.now() - receivedAt.getTime()) / (1000 * 60 * 60 * 24))

  return {
    webhookInboxEventId: row.webhook_inbox_event_id,
    receivedAt: row.received_at,
    hubspotServiceId: svcId,
    hubspotCompanyId: hsCompanyId,
    reason,
    ageDays,
    rawErrorMessage: error
  }
}

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasResolveOrphanCapability(tenant)) {
    return NextResponse.json(
      { error: 'Missing capability commercial.service_engagement.resolve_orphan.' },
      { status: 403 }
    )
  }

  try {
    const rows = await runGreenhousePostgresQuery<OrphanRow>(QUERY_SQL)
    const items = rows.map(parseOrphan)

    return NextResponse.json({
      items,
      total: items.length,
      stale: items.filter(i => i.ageDays > 7).length
    })
  } catch (error) {
    captureWithDomain(error, 'integrations.hubspot', {
      tags: { source: 'admin_orphan_services_list' }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasResolveOrphanCapability(tenant)) {
    return NextResponse.json(
      { error: 'Missing capability commercial.service_engagement.resolve_orphan.' },
      { status: 403 }
    )
  }

  let body: { hubspotCompanyId?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const hubspotCompanyId = typeof body.hubspotCompanyId === 'string' ? body.hubspotCompanyId.trim() : ''

  if (!hubspotCompanyId) {
    return NextResponse.json({ error: 'hubspotCompanyId is required.' }, { status: 400 })
  }

  try {
    const result = await syncServicesForCompany(hubspotCompanyId, {
      createMissingSpace: true,
      createdBySource: 'admin:hubspot-orphan-services'
    })

    return NextResponse.json({
      hubspotCompanyId,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
      spaceAutoCreated: Boolean(result.spaceAutoCreated)
    })
  } catch (error) {
    captureWithDomain(error, 'integrations.hubspot', {
      tags: { source: 'admin_orphan_services_retry' },
      extra: { hubspotCompanyId }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
