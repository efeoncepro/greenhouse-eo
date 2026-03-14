import 'server-only'

import { NextResponse } from 'next/server'

import { getTenantContext, type TenantContext } from '@/lib/tenant/get-tenant-context'

export type TenantRouteGroup = 'client' | 'internal' | 'admin' | 'agency' | 'hr' | 'finance'

export const isClientTenant = (tenant: TenantContext) => tenant.tenantType === 'client' && Boolean(tenant.clientId)

export const hasRoleCode = (tenant: TenantContext, roleCode: string) => tenant.roleCodes.includes(roleCode)

export const hasRouteGroup = (tenant: TenantContext, routeGroup: TenantRouteGroup) => tenant.routeGroups.includes(routeGroup)

export const canAccessProject = (tenant: TenantContext, projectId: string) => tenant.projectIds.includes(projectId)

export const canAccessPeopleModule = (tenant: TenantContext) =>
  hasRouteGroup(tenant, 'internal') &&
  (hasRoleCode(tenant, 'efeonce_admin') || hasRoleCode(tenant, 'efeonce_operations') || hasRoleCode(tenant, 'hr_payroll'))

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
