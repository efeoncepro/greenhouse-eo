import { NextResponse } from 'next/server'

import { normalizeLocale } from '@/i18n/locales'
import {
  getTenantLocaleSnapshot,
  localeOptions,
  updateTenantDefaultLocale
} from '@/lib/i18n/locale-preferences'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parseLocaleBody = async (request: Request) => {
  const body = (await request.json().catch(() => null)) as { locale?: unknown } | null
  const locale = typeof body?.locale === 'string' ? normalizeLocale(body.locale) : null

  return locale
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const tenantLocale = await getTenantLocaleSnapshot(id)

  if (!tenantLocale) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  return NextResponse.json({ tenantLocale, options: localeOptions })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const locale = await parseLocaleBody(request)

  if (!locale) {
    return NextResponse.json({ error: 'locale must be es-CL or en-US' }, { status: 400 })
  }

  const { id } = await params

  try {
    const tenantLocale = await updateTenantDefaultLocale({ clientId: id, locale })

    return NextResponse.json({ tenantLocale, options: localeOptions })
  } catch (error) {
    if (error instanceof Error && error.message === 'TENANT_NOT_FOUND') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    console.error('PATCH /api/admin/tenants/[id]/locale failed:', error)

    return NextResponse.json({ error: 'Unable to update tenant locale' }, { status: 500 })
  }
}
