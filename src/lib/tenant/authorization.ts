import 'server-only'

import { NextResponse } from 'next/server'

import { ROLE_CODES } from '@/config/role-codes'
import { getSupervisorScopeForTenant } from '@/lib/reporting-hierarchy/access'
import type { SupervisorScopeRecord } from '@/lib/reporting-hierarchy/types'
import { getTenantContext, type TenantContext } from '@/lib/tenant/get-tenant-context'

export type TenantRouteGroup =
  | 'client'
  | 'internal'
  | 'admin'
  | 'agency'
  | 'commercial'
  | 'hr'
  | 'finance'
  | 'my'
  | 'people'
  | 'ai_tooling'

export type DerivedAccessMode = 'broad' | 'supervisor'

export type DerivedTenantAccessContext = {
  accessMode: DerivedAccessMode
  supervisorScope: SupervisorScopeRecord | null
}

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

export const canAccessCommercialModule = (tenant: TenantContext) =>
  hasRouteGroup(tenant, 'commercial') ||
  hasRouteGroup(tenant, 'finance') ||
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

export const canCloseCostIntelligencePeriod = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN) || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

export const canReopenCostIntelligencePeriod = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

export const canAccessBankTreasury = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN) ||
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN) ||
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ANALYST)

/**
 * Gates visibility of the internal cost stack in the commercial pricing builder
 * (TASK-464e §Permission gating rule). Hidden to account/ops/client roles so that
 * bill rates + margins remain visible but hourly cost breakdown + markup stays internal.
 *
 * Aligned with canAccessBankTreasury (finance admin + finance analyst + efeonce admin).
 * Reconciled from TASK-464e spec which used `finance_manager` (not a runtime role code
 * in this repo) and `finance` (not a role code, it's a route group).
 */
export const canViewCostStack = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN) ||
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN) ||
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ANALYST)

/**
 * Gates el admin UI de pricing catalog (TASK-467).
 * Finance admin y Efeonce admin pueden administrar el catálogo entero
 * (crear roles, tools, overheads; ajustar governance tables).
 */
export const canAdministerPricingCatalog = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN) ||
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN)

/**
 * Gates revert de cambios del pricing catalog desde el audit timeline (TASK-471 slice 2).
 * Más restrictivo que `canAdministerPricingCatalog` (que permite PATCH directo): un revert
 * deshace la decisión de otro admin, así que se limita a `efeonce_admin` puros.
 * Finance admin puede editar/crear catálogo pero NO revertir cambios históricos del audit log.
 *
 * Follow-up V2 (TASK-471 slice 5 maker-checker): considerar maker≠reverter cuando haya
 * approval queue en producción.
 */
export const canRevertPricingCatalogChange = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

/**
 * Gates el workflow de aprobaciones de cambios críticos del pricing catalog (TASK-471 slice 5).
 * Solo efeonce_admin puede aprobar/rechazar; el proposer NO puede ser el mismo actor que
 * el reviewer (enforced server-side en el endpoint de decide).
 */
export const canReviewPricingCatalogApproval = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

/**
 * Gates override manual de costo sugerido por línea en el Quote Builder (TASK-481).
 * Más restrictivo que canViewCostStack: finance_analyst puede leer el cost stack
 * para investigar márgenes pero NO puede mutar con overrides — eso queda en
 * efeonce_admin + finance_admin. Alineado con el patrón de pricing catalog admin
 * (TASK-467/TASK-470).
 *
 * Follow-up V2: threshold-based dual approval para deltas > umbral.
 */
export const canOverrideQuoteCost = (tenant: TenantContext) =>
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN) ||
  hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN)

export const canAccessPeopleModule = (tenant: TenantContext) =>
  hasRouteGroup(tenant, 'people') ||
  hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN) ||
  (hasRouteGroup(tenant, 'internal') && hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN))

export const hasBroadPeopleAccess = (tenant: TenantContext) =>
  hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.personas',
    fallback: canAccessPeopleModule(tenant)
  })

export const hasBroadHrLeaveAccess = (tenant: TenantContext) =>
  hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.permisos',
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

export const hasBroadHrOrgChartAccess = (tenant: TenantContext) =>
  hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.organigrama',
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

export const resolvePeopleAccessContext = async (
  tenant: TenantContext
): Promise<DerivedTenantAccessContext | null> => {
  if (hasBroadPeopleAccess(tenant)) {
    return {
      accessMode: 'broad',
      supervisorScope: null
    }
  }

  const supervisorScope = await getSupervisorScopeForTenant(tenant).catch(() => null)

  if (supervisorScope?.canAccessSupervisorPeople) {
    return {
      accessMode: 'supervisor',
      supervisorScope
    }
  }

  return null
}

export const resolveHrLeaveAccessContext = async (
  tenant: TenantContext
): Promise<DerivedTenantAccessContext | null> => {
  if (hasBroadHrLeaveAccess(tenant)) {
    return {
      accessMode: 'broad',
      supervisorScope: null
    }
  }

  const supervisorScope = await getSupervisorScopeForTenant(tenant).catch(() => null)

  if (supervisorScope?.canAccessSupervisorLeave) {
    return {
      accessMode: 'supervisor',
      supervisorScope
    }
  }

  return null
}

export const resolveHrOrgChartAccessContext = async (
  tenant: TenantContext
): Promise<DerivedTenantAccessContext | null> => {
  if (hasBroadHrOrgChartAccess(tenant)) {
    return {
      accessMode: 'broad',
      supervisorScope: null
    }
  }

  const supervisorScope = await getSupervisorScopeForTenant(tenant).catch(() => null)

  if (supervisorScope?.canAccessSupervisorPeople) {
    return {
      accessMode: 'supervisor',
      supervisorScope
    }
  }

  return null
}

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

export const requireTalentReviewTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.equipo',
    fallback: hasRouteGroup(tenant, 'hr') || hasRouteGroup(tenant, 'admin') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)
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

  const accessContext = await resolvePeopleAccessContext(tenant)

  if (!accessContext) {
    return {
      tenant: null,
      accessContext: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    accessContext,
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

export const requireCommercialTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!canAccessCommercialModule(tenant)) {
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
