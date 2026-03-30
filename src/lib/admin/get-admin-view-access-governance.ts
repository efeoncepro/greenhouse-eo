import 'server-only'

import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { getAdminPersistedViewAccessGovernance } from '@/lib/admin/view-access-store'
import { GOVERNANCE_SECTIONS, VIEW_REGISTRY, type GovernanceSection, type GovernanceViewRegistryEntry } from '@/lib/admin/view-access-catalog'

export type AdminGovernanceRole = {
  roleCode: string
  roleName: string
  tenantType: 'client' | 'efeonce_internal'
  isAdmin: boolean
  isInternal: boolean
  routeGroups: string[]
  assignedUsers: number
}

export type AdminGovernanceUserPreview = {
  userId: string
  fullName: string
  email: string
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]
  routeGroups: string[]
}

export type AdminGovernanceUserOverride = {
  userId: string
  viewCode: string
  overrideType: 'grant' | 'revoke'
  reason: string | null
  expiresAt: string | null
}

export type AdminGovernanceAuditEntry = {
  action: 'grant_role' | 'revoke_role' | 'grant_user' | 'revoke_user' | 'expire_user'
  targetRole: string | null
  targetUser: string | null
  viewCode: string
  performedBy: string
  reason: string | null
  createdAt: string
}

export type AdminGovernanceMatrixEntry = GovernanceViewRegistryEntry & {
  roleAccess: Record<string, boolean>
  roleAccessSource?: Record<string, 'persisted' | 'hardcoded_fallback'>
}

export type AdminGovernanceOverview = {
  totals: {
    registeredViews: number
    configuredRoles: number
    previewableUsers: number
    sections: number
  }
  roles: AdminGovernanceRole[]
  users: AdminGovernanceUserPreview[]
  views: AdminGovernanceMatrixEntry[]
  userOverrides: AdminGovernanceUserOverride[]
  auditLog: AdminGovernanceAuditEntry[]
  sections: Array<{
    key: GovernanceSection
    label: string
    description: string
  }>
  persistence?: {
    rolesWithPersistedAssignments: number
    usesPersistedRegistry: boolean
  }
}

const roleCanAccessView = (role: AdminGovernanceRole, view: GovernanceViewRegistryEntry) => {
  if (role.routeGroups.includes(view.routeGroup)) {
    return true
  }

  if (role.isAdmin) {
    return ['admin', 'finance', 'hr', 'people', 'ai_tooling', 'internal'].includes(view.routeGroup)
  }

  if (view.routeGroup === 'people') {
    return role.roleCode === 'efeonce_operations' || role.roleCode === 'hr_payroll'
  }

  if (view.routeGroup === 'internal') {
    return role.isInternal
  }

  return false
}

const userCanAccessView = (user: AdminGovernanceUserPreview, view: GovernanceViewRegistryEntry) => {
  if (user.routeGroups.includes(view.routeGroup)) {
    return true
  }

  if (user.routeGroups.includes('admin')) {
    return ['admin', 'finance', 'hr', 'people', 'ai_tooling', 'internal'].includes(view.routeGroup)
  }

  if (view.routeGroup === 'people') {
    return user.roleCodes.includes('efeonce_operations') || user.roleCodes.includes('hr_payroll')
  }

  if (view.routeGroup === 'internal') {
    return user.routeGroups.includes('internal')
  }

  return false
}

export const getAdminViewAccessGovernance = async (): Promise<AdminGovernanceOverview> => {
  try {
    return await getAdminPersistedViewAccessGovernance()
  } catch (error) {
    console.warn('Falling back to hardcoded admin view access baseline.', error)
  }

  const access = await getAdminAccessOverview()

  const roles: AdminGovernanceRole[] = access.roles.map(role => ({
    roleCode: role.roleCode,
    roleName: role.roleName,
    tenantType: role.tenantType,
    isAdmin: role.isAdmin,
    isInternal: role.isInternal,
    routeGroups: role.routeGroups,
    assignedUsers: role.assignedUsers
  }))

  const users: AdminGovernanceUserPreview[] = access.users.map(user => ({
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    tenantType: user.tenantType,
    roleCodes: user.roleCodes,
    routeGroups: user.routeGroups
  }))

  const views: AdminGovernanceMatrixEntry[] = VIEW_REGISTRY.map(view => ({
    ...view,
    roleAccess: Object.fromEntries(roles.map(role => [role.roleCode, roleCanAccessView(role, view)]))
  }))

  return {
    totals: {
      registeredViews: views.length,
      configuredRoles: roles.length,
      previewableUsers: users.length,
      sections: GOVERNANCE_SECTIONS.length
    },
    roles,
    users,
    views,
    userOverrides: [],
    auditLog: [],
    sections: GOVERNANCE_SECTIONS
  }
}

export const getVisibleViewsForPreviewUser = (
  overview: AdminGovernanceOverview,
  userId: string
) => {
  const user = overview.users.find(candidate => candidate.userId === userId) ?? overview.users[0]

  if (!user) {
    return {
      user: null,
      views: []
    }
  }

  return {
    user,
    views: overview.views.filter(view => userCanAccessView(user, view))
  }
}
