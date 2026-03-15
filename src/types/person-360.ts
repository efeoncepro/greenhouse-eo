export interface Person360MemberFacet {
  memberId: string
  memberPublicId: string | null
  displayName: string
  email: string | null
  jobLevel: string | null
  employmentType: string | null
  hireDate: string | null
  status: string
  active: boolean
  departmentId: string | null
  departmentName: string | null
}

export interface Person360UserFacet {
  userId: string
  userPublicId: string | null
  email: string | null
  tenantType: string
  authMode: string | null
  status: string
  active: boolean
  clientId: string | null
  clientName: string | null
  lastLoginAt: string | null
}

export interface Person360CrmFacet {
  contactRecordId: string
  displayName: string | null
  email: string | null
}

export interface Person360 {
  identityProfileId: string
  identityPublicId: string | null
  canonicalEmail: string | null
  fullName: string
  jobTitle: string | null
  profileType: string
  identityStatus: string
  identityActive: boolean
  primarySourceSystem: string | null

  memberFacet: Person360MemberFacet | null
  userFacet: Person360UserFacet | null
  crmFacet: Person360CrmFacet | null

  userCount: number
  sourceLinkCount: number
  linkedSystems: string[]

  hasMemberFacet: boolean
  hasUserFacet: boolean
  hasCrmFacet: boolean
}
