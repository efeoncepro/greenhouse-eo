// TASK-263: Permission Sets — shared types for API and UI

export type PermissionSetSummary = {
  setId: string
  setName: string
  description: string | null
  section: string | null
  viewCodes: string[]
  isSystem: boolean
  active: boolean
  userCount: number
  createdAt: string
  updatedAt: string
}

export type PermissionSetDetail = PermissionSetSummary & {
  createdBy: string | null
  updatedBy: string | null
  users: PermissionSetUserAssignment[]
}

export type PermissionSetUserAssignment = {
  assignmentId: string
  userId: string
  fullName: string | null
  email: string | null
  active: boolean
  expiresAt: string | null
  reason: string | null
  assignedByUserId: string | null
  createdAt: string
}

export type EffectiveViewSource = 'role' | 'role_fallback' | 'permission_set' | 'user_override'

export type EffectiveViewEntry = {
  viewCode: string
  label: string
  section: string
  routeGroup: string
  source: EffectiveViewSource
  sourceId: string | null
  sourceName: string | null
}

export type EffectiveViewsResponse = {
  userId: string
  effectiveViews: EffectiveViewEntry[]
  summary: {
    totalViews: number
    fromRoles: number
    fromRoleFallback: number
    fromPermissionSets: number
    fromOverrides: number
  }
}

export type UserPermissionSetInfo = {
  setId: string
  setName: string
  description: string | null
  section: string | null
  viewCodes: string[]
  isSystem: boolean
  active: boolean
  assignmentId: string
  expiresAt: string | null
  reason: string | null
  assignedByUserId: string | null
  assignedAt: string
}
