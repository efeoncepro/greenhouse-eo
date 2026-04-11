export const SISTER_PLATFORM_KEYS = ['kortex', 'verk'] as const

export type SisterPlatformKey = (typeof SISTER_PLATFORM_KEYS)[number] | (string & {})

export const SISTER_PLATFORM_EXTERNAL_SCOPE_TYPES = [
  'tenant',
  'workspace',
  'portal',
  'installation',
  'client',
  'space',
  'organization',
  'other'
] as const

export type SisterPlatformExternalScopeType = (typeof SISTER_PLATFORM_EXTERNAL_SCOPE_TYPES)[number]

export const SISTER_PLATFORM_GREENHOUSE_SCOPE_TYPES = ['organization', 'client', 'space', 'internal'] as const

export type SisterPlatformGreenhouseScopeType = (typeof SISTER_PLATFORM_GREENHOUSE_SCOPE_TYPES)[number]

export const SISTER_PLATFORM_BINDING_ROLES = ['primary', 'secondary', 'observer'] as const

export type SisterPlatformBindingRole = (typeof SISTER_PLATFORM_BINDING_ROLES)[number]

export const SISTER_PLATFORM_BINDING_STATUSES = ['draft', 'active', 'suspended', 'deprecated'] as const

export type SisterPlatformBindingStatus = (typeof SISTER_PLATFORM_BINDING_STATUSES)[number]

export type SisterPlatformBindingRecord = {
  bindingId: string
  publicId: string
  sisterPlatformKey: string
  externalScopeType: SisterPlatformExternalScopeType
  externalScopeId: string
  externalScopeParentId: string | null
  externalDisplayName: string | null
  greenhouseScopeType: SisterPlatformGreenhouseScopeType
  organizationId: string | null
  organizationName: string | null
  clientId: string | null
  clientName: string | null
  spaceId: string | null
  spaceName: string | null
  bindingRole: SisterPlatformBindingRole
  bindingStatus: SisterPlatformBindingStatus
  notes: string | null
  metadata: Record<string, unknown>
  lastVerifiedAt: string | null
  createdByUserId: string | null
  activatedByUserId: string | null
  suspendedByUserId: string | null
  deprecatedByUserId: string | null
  activatedAt: string | null
  suspendedAt: string | null
  deprecatedAt: string | null
  createdAt: string
  updatedAt: string
}

export type SisterPlatformBindingResolution = {
  sisterPlatformKey: string
  externalScopeType: SisterPlatformExternalScopeType
  externalScopeId: string
  bindingStatus: SisterPlatformBindingStatus
  greenhouseScopeType: SisterPlatformGreenhouseScopeType
  organizationId: string | null
  organizationName: string | null
  clientId: string | null
  clientName: string | null
  spaceId: string | null
  spaceName: string | null
  bindingId: string
  publicId: string
}

export type CreateSisterPlatformBindingInput = {
  sisterPlatformKey: string
  externalScopeType: SisterPlatformExternalScopeType
  externalScopeId: string
  externalScopeParentId?: string | null
  externalDisplayName?: string | null
  greenhouseScopeType: SisterPlatformGreenhouseScopeType
  organizationId?: string | null
  clientId?: string | null
  spaceId?: string | null
  bindingRole?: SisterPlatformBindingRole
  bindingStatus?: SisterPlatformBindingStatus
  notes?: string | null
  metadata?: Record<string, unknown> | null
  lastVerifiedAt?: string | null
}

export type UpdateSisterPlatformBindingInput = Partial<CreateSisterPlatformBindingInput> & {
  bindingStatus?: SisterPlatformBindingStatus
}
