type TenantIdInput = {
  clientId: string
  hubspotCompanyId?: string | null
}

type UserIdInput = {
  userId: string
}

type ModuleIdInput = {
  moduleCode: string
  moduleKind: 'business_line' | 'service_module'
}

type IdentityProfileInput = {
  sourceSystem: string
  sourceObjectType: string
  sourceObjectId: string
}

const HUBSPOT_TENANT_ID_PATTERN = /^hubspot-company-(\d+)$/i
const HUBSPOT_USER_ID_PATTERN = /^user-hubspot-contact-(\d+)$/i

const normalizeToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')

const toPublicToken = (value: string) => normalizeToken(value).toUpperCase()

export const extractNumericHubSpotCompanyId = ({ clientId, hubspotCompanyId }: TenantIdInput) => {
  if (hubspotCompanyId && /^\d+$/.test(hubspotCompanyId.trim())) {
    return hubspotCompanyId.trim()
  }

  const legacyMatch = clientId.match(HUBSPOT_TENANT_ID_PATTERN)

  return legacyMatch?.[1] || null
}

export const extractNumericHubSpotContactId = ({ userId }: UserIdInput) => {
  const legacyMatch = userId.match(HUBSPOT_USER_ID_PATTERN)

  return legacyMatch?.[1] || null
}

export const buildTenantPublicId = ({ clientId, hubspotCompanyId }: TenantIdInput) => {
  const numericHubSpotId = extractNumericHubSpotCompanyId({ clientId, hubspotCompanyId })

  if (numericHubSpotId) {
    return `EO-${numericHubSpotId}`
  }

  if (clientId.startsWith('space-')) {
    return `EO-SPACE-${toPublicToken(clientId.slice('space-'.length))}`
  }

  return `EO-TEN-${toPublicToken(clientId)}`
}

export const buildUserPublicId = ({ userId }: UserIdInput) => {
  const numericHubSpotId = extractNumericHubSpotContactId({ userId })

  if (numericHubSpotId) {
    return `EO-USR-${numericHubSpotId}`
  }

  const stableSuffix = userId.startsWith('user-') ? userId.slice('user-'.length) : userId

  return `EO-USR-${toPublicToken(stableSuffix)}`
}

export const buildModulePublicId = ({ moduleCode, moduleKind }: ModuleIdInput) =>
  `${moduleKind === 'business_line' ? 'EO-BL' : 'EO-SVC'}-${toPublicToken(moduleCode)}`

export const buildClientServiceAssignmentPublicId = ({ clientId, hubspotCompanyId, moduleCode }: TenantIdInput & { moduleCode: string }) =>
  `EO-CAP-${buildTenantPublicId({ clientId, hubspotCompanyId }).replace(/^EO-/, '')}-${toPublicToken(moduleCode)}`

export const buildRoleAssignmentPublicId = ({
  userId,
  roleCode,
  clientId,
  hubspotCompanyId
}: UserIdInput & { roleCode: string; clientId?: string | null; hubspotCompanyId?: string | null }) => {
  const userSegment = buildUserPublicId({ userId }).replace(/^EO-USR-/, '')
  const tenantSegment = clientId ? buildTenantPublicId({ clientId, hubspotCompanyId }).replace(/^EO-/, '') : 'INTERNAL'

  return `EO-ROLE-${tenantSegment}-${userSegment}-${toPublicToken(roleCode)}`
}

export const buildFeatureFlagPublicId = ({ clientId, hubspotCompanyId, featureCode }: TenantIdInput & { featureCode: string }) =>
  `EO-FLG-${buildTenantPublicId({ clientId, hubspotCompanyId }).replace(/^EO-/, '')}-${toPublicToken(featureCode)}`

export const buildIdentityProfileId = ({ sourceSystem, sourceObjectType, sourceObjectId }: IdentityProfileInput) => {
  const systemToken = normalizeToken(sourceSystem)
  const objectTypeToken = normalizeToken(sourceObjectType)
  const objectIdToken = normalizeToken(sourceObjectId)

  return `identity-${systemToken}-${objectTypeToken}-${objectIdToken}`
}

export const buildIdentityProfilePublicId = ({ sourceSystem, sourceObjectType, sourceObjectId }: IdentityProfileInput) => {
  const normalizedSourceSystem = normalizeToken(sourceSystem)
  const normalizedObjectType = normalizeToken(sourceObjectType)
  const normalizedObjectId = normalizeToken(sourceObjectId)

  if (normalizedSourceSystem === 'hubspot-crm' && normalizedObjectType === 'owner' && /^\d+$/.test(sourceObjectId.trim())) {
    return `EO-ID-HSO-${sourceObjectId.trim()}`
  }

  if (normalizedSourceSystem === 'greenhouse-auth' && normalizedObjectType === 'client-user') {
    return `EO-ID-GH-${toPublicToken(sourceObjectId)}`
  }

  if (normalizedSourceSystem === 'notion' && normalizedObjectType === 'person') {
    return `EO-ID-NOT-${toPublicToken(sourceObjectId)}`
  }

  if (normalizedSourceSystem === 'azure-ad' && normalizedObjectType === 'user') {
    return `EO-ID-AAD-${toPublicToken(sourceObjectId)}`
  }

  return `EO-ID-${toPublicToken(normalizedSourceSystem)}-${toPublicToken(normalizedObjectType)}-${toPublicToken(normalizedObjectId)}`
}

export const buildIdentitySourceLinkId = ({ profileId, sourceSystem, sourceObjectType, sourceObjectId }: IdentityProfileInput & { profileId: string }) =>
  `identity-link-${normalizeToken(profileId)}-${normalizeToken(sourceSystem)}-${normalizeToken(sourceObjectType)}-${normalizeToken(sourceObjectId)}`
