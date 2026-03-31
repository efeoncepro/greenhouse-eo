import { ROLE_CODES } from '@/config/role-codes'

type ResolvePortalHomePathInput = {
  portalHomePath?: string | null
  tenantType?: 'client' | 'efeonce_internal' | string | null
  roleCodes?: string[] | null
}

const hasRole = (roleCodes: string[], roleCode: string) => roleCodes.includes(roleCode)

export const resolvePortalHomePath = ({
  portalHomePath,
  tenantType,
  roleCodes: rawRoleCodes
}: ResolvePortalHomePathInput): string => {
  const roleCodes = Array.isArray(rawRoleCodes) ? rawRoleCodes.filter(Boolean) : []
  const normalizedPortalHomePath = portalHomePath?.trim() || ''
  const isInternalTenant = tenantType === 'efeonce_internal'
  const isHrUser = hasRole(roleCodes, ROLE_CODES.HR_PAYROLL) || hasRole(roleCodes, ROLE_CODES.HR_MANAGER)
  const isFinanceUser = hasRole(roleCodes, ROLE_CODES.FINANCE_ANALYST) || hasRole(roleCodes, ROLE_CODES.FINANCE_ADMIN)

  const isPureCollaborator =
    hasRole(roleCodes, ROLE_CODES.COLLABORATOR) &&
    !hasRole(roleCodes, ROLE_CODES.EFEONCE_ADMIN) &&
    !hasRole(roleCodes, ROLE_CODES.EFEONCE_OPERATIONS)

  if (isHrUser) {
    return '/hr/payroll'
  }

  if (isFinanceUser) {
    return '/finance'
  }

  if (isPureCollaborator) {
    return '/my'
  }

  if (isInternalTenant) {
    if (!normalizedPortalHomePath || normalizedPortalHomePath === '/internal/dashboard') {
      return '/home'
    }

    return normalizedPortalHomePath
  }

  return normalizedPortalHomePath || '/dashboard'
}
