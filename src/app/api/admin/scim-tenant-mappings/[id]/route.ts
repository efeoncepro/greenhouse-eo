import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// ── PATCH — Update a tenant mapping ──

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (body.tenantName !== undefined) {
    sets.push(`tenant_name = $${idx++}`)
    values.push(body.tenantName)
  }

  if (body.clientId !== undefined) {
    sets.push(`client_id = $${idx++}`)
    values.push(String(body.clientId || '').trim() || null)
  }

  if (body.defaultRoleCode !== undefined) {
    sets.push(`default_role_code = $${idx++}`)
    values.push(body.defaultRoleCode)
  }

  if (body.allowedEmailDomains !== undefined) {
    sets.push(`allowed_email_domains = $${idx++}`)
    values.push(body.allowedEmailDomains)
  }

  if (body.autoProvision !== undefined) {
    sets.push(`auto_provision = $${idx++}`)
    values.push(body.autoProvision)
  }

  if (body.active !== undefined) {
    sets.push(`active = $${idx++}`)
    values.push(body.active)
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  sets.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)

  const rows = await query<Record<string, unknown>>(
    `UPDATE greenhouse_core.scim_tenant_mappings
     SET ${sets.join(', ')}
     WHERE scim_tenant_mapping_id = $${idx}
     RETURNING *`,
    values
  )

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Mapping not found' }, { status: 404 })
  }

  return NextResponse.json({ mapping: rows[0] })
}

// ── DELETE — Deactivate a tenant mapping ──

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const rows = await query<Record<string, unknown>>(
    `UPDATE greenhouse_core.scim_tenant_mappings
     SET active = false, updated_at = CURRENT_TIMESTAMP
     WHERE scim_tenant_mapping_id = $1
     RETURNING scim_tenant_mapping_id`,
    [id]
  )

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Mapping not found' }, { status: 404 })
  }

  return NextResponse.json({ deleted: true })
}
