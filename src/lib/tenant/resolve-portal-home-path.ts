import { ROLE_CODES } from '@/config/role-codes'

type ResolvePortalHomePathInput = {
  portalHomePath?: string | null
  tenantType?: 'client' | 'efeonce_internal' | string | null
  roleCodes?: string[] | null
  routeGroups?: string[] | null
}

export type PortalHomePolicyKey = 'client_default' | 'internal_default' | 'hr_workspace' | 'finance_workspace' | 'my_workspace'

export type PortalHomePolicy = {
  key: PortalHomePolicyKey
  label: string
  defaultPath: string
}

export const PORTAL_HOME_PATH = '/home'
export const LEGACY_CLIENT_DASHBOARD_PATH = '/dashboard'
export const LEGACY_INTERNAL_DASHBOARD_PATH = '/internal/dashboard'
export const LEGACY_FINANCE_DASHBOARD_PATH = '/finance/dashboard'
export const LEGACY_HR_HOME_PATH = '/hr/leave'
export const LEGACY_MY_HOME_PATH = '/my/profile'

const PORTAL_HOME_ALIASES = new Map<string, string>([
  [LEGACY_CLIENT_DASHBOARD_PATH, PORTAL_HOME_PATH],
  [LEGACY_INTERNAL_DASHBOARD_PATH, PORTAL_HOME_PATH],
  [LEGACY_FINANCE_DASHBOARD_PATH, '/finance'],
  [LEGACY_HR_HOME_PATH, '/hr/payroll'],
  [LEGACY_MY_HOME_PATH, '/my']
])

const hasRole = (roleCodes: string[], roleCode: string) => roleCodes.includes(roleCode)
const hasRouteGroup = (routeGroups: string[], routeGroup: string) => routeGroups.includes(routeGroup)

const PORTAL_HOME_POLICY_MAP: Record<PortalHomePolicyKey, PortalHomePolicy> = {
  hr_workspace: {
    key: 'hr_workspace',
    label: 'HR Workspace',
    defaultPath: '/hr/payroll'
  },
  finance_workspace: {
    key: 'finance_workspace',
    label: 'Finance Workspace',
    defaultPath: '/finance'
  },
  my_workspace: {
    key: 'my_workspace',
    label: 'My Workspace',
    defaultPath: '/my'
  },
  internal_default: {
    key: 'internal_default',
    label: 'Internal Home',
    defaultPath: PORTAL_HOME_PATH
  },
  client_default: {
    key: 'client_default',
    label: 'Client Home',
    defaultPath: PORTAL_HOME_PATH
  }
}

export const normalizePortalHomeAlias = (portalHomePath?: string | null) => {
  const normalizedPortalHomePath = portalHomePath?.trim() || ''

  if (!normalizedPortalHomePath) {
    return ''
  }

  return PORTAL_HOME_ALIASES.get(normalizedPortalHomePath) || normalizedPortalHomePath
}

export const resolvePortalAccessFallbackPath = (portalHomePath?: string | null) =>
  normalizePortalHomeAlias(portalHomePath) || PORTAL_HOME_PATH

export const resolvePortalHomePolicy = ({
  tenantType,
  roleCodes: rawRoleCodes,
  routeGroups: rawRouteGroups
}: Omit<ResolvePortalHomePathInput, 'portalHomePath'>): PortalHomePolicy => {
  const roleCodes = Array.isArray(rawRoleCodes) ? rawRoleCodes.filter(Boolean) : []
  const routeGroups = Array.isArray(rawRouteGroups) ? rawRouteGroups.filter(Boolean) : []
  const isInternalTenant = tenantType === 'efeonce_internal'

  const isHrUser =
    hasRouteGroup(routeGroups, 'hr') ||
    hasRole(roleCodes, ROLE_CODES.HR_PAYROLL) ||
    hasRole(roleCodes, ROLE_CODES.HR_MANAGER)

  const isFinanceUser =
    hasRouteGroup(routeGroups, 'finance') ||
    hasRole(roleCodes, ROLE_CODES.FINANCE_ANALYST) ||
    hasRole(roleCodes, ROLE_CODES.FINANCE_ADMIN)

  const isPureCollaborator =
    hasRole(roleCodes, ROLE_CODES.COLLABORATOR) &&
    !hasRole(roleCodes, ROLE_CODES.EFEONCE_ADMIN) &&
    !hasRole(roleCodes, ROLE_CODES.EFEONCE_OPERATIONS)

  if (isHrUser) {
    return PORTAL_HOME_POLICY_MAP.hr_workspace
  }

  if (isFinanceUser) {
    return PORTAL_HOME_POLICY_MAP.finance_workspace
  }

  if (isPureCollaborator) {
    return PORTAL_HOME_POLICY_MAP.my_workspace
  }

  return isInternalTenant ? PORTAL_HOME_POLICY_MAP.internal_default : PORTAL_HOME_POLICY_MAP.client_default
}

export const resolvePortalHomeDefaultPath = (input: Omit<ResolvePortalHomePathInput, 'portalHomePath'>) =>
  resolvePortalHomePolicy(input).defaultPath

export const resolvePortalHomeContract = (input: ResolvePortalHomePathInput) => {
  const normalizedPortalHomePath = normalizePortalHomeAlias(input.portalHomePath)
  const policy = resolvePortalHomePolicy(input)

  return {
    policy,
    configuredPath: input.portalHomePath?.trim() || null,
    normalizedConfiguredPath: normalizedPortalHomePath || null,
    defaultPath: policy.defaultPath,
    effectivePath: resolvePortalHomePath(input)
  }
}

export const resolvePortalHomePath = ({
  portalHomePath,
  tenantType,
  roleCodes: rawRoleCodes,
  routeGroups: rawRouteGroups
}: ResolvePortalHomePathInput): string => {
  const normalizedPortalHomePath = normalizePortalHomeAlias(portalHomePath)

  const policy = resolvePortalHomePolicy({
    tenantType,
    roleCodes: rawRoleCodes,
    routeGroups: rawRouteGroups
  })

  if (policy.key === 'hr_workspace' || policy.key === 'finance_workspace' || policy.key === 'my_workspace') {
    return policy.defaultPath
  }

  return normalizedPortalHomePath || policy.defaultPath
}
