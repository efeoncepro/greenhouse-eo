import 'server-only'

import { NextResponse } from 'next/server'

import { getTenantContext, type TenantContext } from '@/lib/tenant/get-tenant-context'

export type TenantRouteGroup = 'client' | 'internal' | 'admin' | 'agency' | 'hr' | 'finance' | 'employee' | 'my' | 'people' | 'ai_tooling'

export const hasAuthorizedViewCode = ({
  tenant,
  viewCode,
  fallback
}: {
  tenant: TenantContext
  viewCode: string
  fallback: boolean
}) => {
  if (tenant.authorizedViews.length === 0) {
    return fallback
  }

  return tenant.authorizedViews.includes(viewCode)
}

export const hasAnyAuthorizedViewCode = ({
  tenant,
  viewCodes,
  fallback
}: {
  tenant: TenantContext
  viewCodes: string[]
  fallback: boolean
}) => {
  if (tenant.authorizedViews.length === 0) {
    return fallback
  }

  return viewCodes.some(viewCode => tenant.authorizedViews.includes(viewCode))
}

export const isClientTenant = (tenant: TenantContext) => tenant.tenantType === 'client' && Boolean(tenant.clientId)

export const hasRoleCode = (tenant: TenantContext, roleCode: string) => tenant.roleCodes.includes(roleCode)

export const hasRouteGroup = (tenant: TenantContext, routeGroup: TenantRouteGroup) => tenant.routeGroups.includes(routeGroup)

export const canAccessProject = (tenant: TenantContext, projectId: string) => tenant.projectIds.includes(projectId)

export const canAccessPeopleModule = (tenant: TenantContext) =>
  hasRouteGroup(tenant, 'people') ||
  (hasRouteGroup(tenant, 'internal') &&
    (hasRoleCode(tenant, 'efeonce_admin') || hasRoleCode(tenant, 'efeonce_operations') || hasRoleCode(tenant, 'hr_payroll') || hasRoleCode(tenant, 'finance_manager')))

export const requireMyTenantContext = async (): Promise<{
  tenant: TenantContext | null
  memberId: string | null
  errorResponse: NextResponse | null
}> => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return { tenant: null, memberId: null, errorResponse: unauthorizedResponse }
  }

  if (tenant.tenantType !== 'efeonce_internal') {
    return { tenant: null, memberId: null, errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const memberId = tenant.memberId || null

  if (!memberId) {
    return { tenant: null, memberId: null, errorResponse: NextResponse.json({ error: 'Member identity not linked' }, { status: 422 }) }
  }

  return { tenant, memberId, errorResponse: null }
}

export const requireTenantContext = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      unauthorizedResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return {
    tenant,
    unauthorizedResponse: null
  }
}

export const requireClientTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!isClientTenant(tenant) || !hasRouteGroup(tenant, 'client')) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}

export const requireInternalTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!hasRouteGroup(tenant, 'internal')) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}

export const requireAgencyTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!hasRouteGroup(tenant, 'internal') && !hasRouteGroup(tenant, 'admin')) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}

export const requireHrTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!hasRouteGroup(tenant, 'hr') && !hasRoleCode(tenant, 'efeonce_admin')) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}

export const requireEmployeeTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!hasRouteGroup(tenant, 'employee') && !hasRouteGroup(tenant, 'hr') && !hasRoleCode(tenant, 'efeonce_admin')) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}

export const requirePeopleTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!canAccessPeopleModule(tenant)) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}

export const requireFinanceTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!hasRouteGroup(tenant, 'finance') && !hasRoleCode(tenant, 'efeonce_admin')) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}

export const requireAdminTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!hasRouteGroup(tenant, 'admin') || !hasRoleCode(tenant, 'efeonce_admin')) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}

export const requireAiToolingTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!hasRouteGroup(tenant, 'ai_tooling') && !hasRoleCode(tenant, 'efeonce_admin')) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}
