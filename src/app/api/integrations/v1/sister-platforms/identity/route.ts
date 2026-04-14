import { NextResponse } from 'next/server'

import { requireIntegrationRequest } from '@/lib/integrations/integration-auth'
import { getTenantAccessRecordByEmail, updateTenantLastLogin, verifyTenantPassword } from '@/lib/tenant/access'

export const dynamic = 'force-dynamic'

const normalizeEmail = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '')
const normalizePassword = (value: unknown) => (typeof value === 'string' ? value : '')

export async function POST(request: Request) {
  const { authorized, errorResponse } = requireIntegrationRequest(request)

  if (!authorized) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: Record<string, unknown>

  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const email = normalizeEmail(payload.email)
  const password = normalizePassword(payload.password)

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const tenant = await getTenantAccessRecordByEmail(email)

  if (!tenant || !(await verifyTenantPassword(tenant, password))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  await updateTenantLastLogin(tenant, 'sister_platform_credentials')

  return NextResponse.json({
    user: {
      id: tenant.userId,
      email: tenant.email,
      name: tenant.fullName,
      userId: tenant.userId,
      clientId: tenant.clientId,
      clientName: tenant.clientName,
      tenantType: tenant.tenantType,
      roleCodes: tenant.roleCodes,
      primaryRoleCode: tenant.primaryRoleCode,
      routeGroups: tenant.routeGroups,
      projectScopes: tenant.projectScopes,
      campaignScopes: tenant.campaignScopes,
      businessLines: tenant.businessLines,
      serviceModules: tenant.serviceModules,
      projectIds: tenant.projectIds,
      role: tenant.role,
      featureFlags: tenant.featureFlags,
      timezone: tenant.timezone,
      portalHomePath: tenant.portalHomePath,
      authMode: tenant.authMode,
      provider: 'credentials',
      microsoftEmail: tenant.microsoftEmail,
      organization: {
        clientId: tenant.clientId,
        clientName: tenant.clientName,
        tenantType: tenant.tenantType
      }
    }
  })
}
