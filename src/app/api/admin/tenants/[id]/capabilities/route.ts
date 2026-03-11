import { NextResponse } from 'next/server'

import {
  getTenantCapabilityState,
  setTenantCapabilitiesFromAdmin
} from '@/lib/admin/tenant-capabilities'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const normalizeCodeList = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const state = await getTenantCapabilityState(id)

  return NextResponse.json(state)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const state = await setTenantCapabilitiesFromAdmin({
    clientId: id,
    actorUserId: tenant.userId,
    businessLines: normalizeCodeList(body.businessLines),
    serviceModules: normalizeCodeList(body.serviceModules)
  })

  return NextResponse.json(state)
}
