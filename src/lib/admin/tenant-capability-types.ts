export type CapabilityKind = 'business_line' | 'service_module'

export interface TenantCapabilityRecord {
  moduleCode: string
  moduleLabel: string
  moduleKind: CapabilityKind
  parentModuleCode: string | null
  description: string | null
  selected: boolean
  assignmentSourceSystem: string | null
  assignmentSourceObjectType: string | null
  assignmentSourceObjectId: string | null
  assignmentClosedwonDealId: string | null
  assignmentConfidence: string | null
  derivedFromLatestClosedwon: boolean
  updatedAt: string | null
}

export interface TenantCapabilityState {
  clientId: string
  hubspotCompanyId: string | null
  businessLines: string[]
  serviceModules: string[]
  capabilities: TenantCapabilityRecord[]
}
