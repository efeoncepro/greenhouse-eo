export interface Person360MemberFacet {
  memberId: string
  memberPublicId: string | null
  displayName: string
  email: string | null
  phone: string | null
  jobLevel: string | null
  employmentType: string | null
  hireDate: string | null
  contractEndDate: string | null
  dailyRequired: boolean
  reportsToMemberId: string | null
  status: string
  active: boolean
  departmentId: string | null
  departmentName: string | null
}

export interface Person360UserFacet {
  userId: string
  userPublicId: string | null
  email: string | null
  fullName: string | null
  tenantType: string
  authMode: string | null
  status: string
  active: boolean
  clientId: string | null
  clientName: string | null
  lastLoginAt: string | null
  avatarUrl: string | null
  timezone: string | null
  defaultPortalHomePath: string | null
  microsoftOid: string | null
  googleSub: string | null
  passwordHashAlgorithm: string | null
}

export interface Person360CrmFacet {
  contactRecordId: string
  displayName: string | null
  email: string | null
  jobTitle: string | null
  phone: string | null
  mobilePhone: string | null
  lifecycleStage: string | null
  leadStatus: string | null
  hubspotContactId: string | null
}

export interface Person360Resolved {
  email: string | null
  displayName: string
  avatarUrl: string | null
  phone: string | null
  jobTitle: string | null
}

export interface Person360 {
  // Canonical identity — THE one ID
  identityProfileId: string
  eoId: string
  serialNumber: number
  canonicalEmail: string | null
  fullName: string
  jobTitle: string | null
  profileType: string
  identityStatus: string
  identityActive: boolean
  primarySourceSystem: string | null
  defaultAuthMode: string | null

  // Resolved (best available cross-facet)
  resolved: Person360Resolved

  // Facets
  memberFacet: Person360MemberFacet | null
  userFacet: Person360UserFacet | null
  crmFacet: Person360CrmFacet | null

  // Aggregates
  userCount: number
  sourceLinkCount: number
  linkedSystems: string[]
  activeRoleCodes: string[]

  // Convenience
  hasMemberFacet: boolean
  hasUserFacet: boolean
  hasCrmFacet: boolean
}
