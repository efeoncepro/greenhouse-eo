export type OrganizationTab = 'overview' | 'people' | 'finance'

export interface OrganizationSpace {
  spaceId: string
  publicId: string
  spaceName: string
  spaceType: string
  clientId: string | null
  status: string
}

export interface OrganizationPerson {
  membershipId: string
  publicId: string
  profileId: string
  fullName: string | null
  canonicalEmail: string | null
  membershipType: string
  roleLabel: string | null
  department: string | null
  isPrimary: boolean
  spaceId: string | null
}

export interface OrganizationDetailData {
  organizationId: string
  publicId: string
  organizationName: string
  legalName: string | null
  taxId: string | null
  taxIdType: string | null
  industry: string | null
  country: string | null
  hubspotCompanyId: string | null
  status: string
  active: boolean
  notes: string | null
  spaceCount: number
  membershipCount: number
  uniquePersonCount: number
  spaces: OrganizationSpace[] | null
  people: OrganizationPerson[] | null
  createdAt: string
  updatedAt: string
}
