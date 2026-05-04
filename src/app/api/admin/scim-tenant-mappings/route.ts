import { NextResponse } from 'next/server'

import { getDb, query } from '@/lib/db'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// ── GET — List all tenant mappings ──

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()

  const mappings = await db
    .selectFrom('greenhouse_core.scim_tenant_mappings')
    .selectAll()
    .orderBy('tenant_name', 'asc')
    .execute()

  return NextResponse.json({ mappings })
}

// ── POST — Create a new tenant mapping ──

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.microsoftTenantId) {
    return NextResponse.json(
      { error: 'microsoftTenantId is required' },
      { status: 400 }
    )
  }

  const normalizedClientId = String(body.clientId || '').trim() || null

  const id = normalizedClientId
    ? `scim-tm-${normalizedClientId}`
    : `scim-tm-${String(body.microsoftTenantId).toLowerCase()}`

  const rows = await query<Record<string, unknown>>(
    `INSERT INTO greenhouse_core.scim_tenant_mappings (
       scim_tenant_mapping_id, microsoft_tenant_id, tenant_name, client_id,
       default_role_code, allowed_email_domains, auto_provision, active,
       created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (microsoft_tenant_id) DO UPDATE SET
       tenant_name = EXCLUDED.tenant_name,
       client_id = EXCLUDED.client_id,
       default_role_code = EXCLUDED.default_role_code,
       allowed_email_domains = EXCLUDED.allowed_email_domains,
       auto_provision = EXCLUDED.auto_provision,
       active = true,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      id,
      body.microsoftTenantId,
      body.tenantName || null,
      normalizedClientId,
      body.defaultRoleCode || 'collaborator',
      body.allowedEmailDomains || [],
      body.autoProvision !== false
    ]
  )

  return NextResponse.json({ mapping: rows[0] }, { status: 201 })
}
