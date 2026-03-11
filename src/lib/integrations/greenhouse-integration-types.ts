export type IntegrationTenantSelector = {
  clientId?: string | null
  publicId?: string | null
  sourceSystem?: string | null
  sourceObjectType?: string | null
  sourceObjectId?: string | null
}

export type IntegrationCapabilityCatalogItem = {
  moduleCode: string
  publicModuleId: string
  moduleLabel: string
  moduleKind: 'business_line' | 'service_module'
  parentModuleCode: string | null
  description: string | null
  sortOrder: number
}

export type IntegrationTenantSnapshot = {
  clientId: string
  publicId: string
  clientName: string
  status: string
  active: boolean
  primaryContactEmail: string | null
  portalHomePath: string
  hubspotCompanyId: string | null
  businessLines: string[]
  serviceModules: string[]
  updatedAt: string | null
  capabilitiesUpdatedAt: string | null
}
