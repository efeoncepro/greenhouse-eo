export type OrganizationTab = 'overview' | 'people' | 'finance' | 'ico' | 'integrations'

export interface OrganizationClientFinance {
  clientId: string
  clientName: string
  totalRevenueClp: number
  directCostsClp: number
  indirectCostsClp: number
  grossMarginPercent: number | null
  netMarginPercent: number | null
  headcountFte: number | null
}

export interface OrganizationFinanceSummary {
  organizationId: string
  periodYear: number
  periodMonth: number
  clientCount: number
  totalRevenueClp: number
  totalDirectCostsClp: number
  totalIndirectCostsClp: number
  avgGrossMarginPercent: number | null
  avgNetMarginPercent: number | null
  totalFte: number | null
  clients: OrganizationClientFinance[]
}

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
