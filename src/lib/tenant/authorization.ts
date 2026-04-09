import 'server-only'

import { NextResponse } from 'next/server'

import { ROLE_CODES } from '@/config/role-codes'
import { getTenantContext, type TenantContext } from '@/lib/tenant/get-tenant-context'

export type TenantRouteGroup = 'client' | 'internal' | 'admin' | 'agency' | 'hr' | 'finance' | 'my' | 'people' | 'ai_tooling'

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

export const canReadCostIntelligence = (tenant: TenantContext) =>
  hasRouteGroup(tenant, 'finance') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

export const canCloseCostIntelligencePeriod = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN) || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

export const canReopenCostIntelligencePeriod = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

export const canAccessBankTreasury = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN) ||
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN) ||
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ANALYST)

export const canAccessPeopleModule = (tenant: TenantContext) =>
  hasRouteGroup(tenant, 'people') ||
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN) ||
  (hasRouteGroup(tenant, 'internal') && hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN))

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

  if (!hasRouteGroup(tenant, 'hr') && !hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
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

  if (!hasRouteGroup(tenant, 'my') && !hasRouteGroup(tenant, 'hr') && !hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
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

  const hasPeopleAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.personas',
    fallback: canAccessPeopleModule(tenant)
  })

  if (!hasPeopleAccess) {
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

  if (!hasRouteGroup(tenant, 'finance') && !hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
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

export const requireBankTreasuryTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.banco',
    fallback: canAccessBankTreasury(tenant)
  })

  if (!hasAccess) {
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

export const requireShareholderAccountTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.cuenta_corriente_accionista',
    fallback: canAccessBankTreasury(tenant)
  })

  if (!hasAccess) {
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

export const requireCostIntelligenceTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!canReadCostIntelligence(tenant)) {
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

  if (!hasRouteGroup(tenant, 'admin') || !hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
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

  if (!hasRouteGroup(tenant, 'ai_tooling') && !hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
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
