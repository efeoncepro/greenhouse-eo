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
  const isHrUser = hasRole(roleCodes, 'hr_payroll') || hasRole(roleCodes, 'hr_manager')
  const isFinanceUser = hasRole(roleCodes, 'finance_analyst') || hasRole(roleCodes, 'finance_admin')

  const isPureCollaborator =
    hasRole(roleCodes, 'collaborator') &&
    !hasRole(roleCodes, 'efeonce_admin') &&
    !hasRole(roleCodes, 'efeonce_operations')

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
