export type HubSpotCompanyNameResolutionSource =
  | 'hubspot_name'
  | 'domain'
  | 'website_host'
  | 'technical_fallback'

export interface HubSpotCompanyNameResolutionInput {
  hubspotCompanyId: string | null | undefined
  name?: string | null
  domain?: string | null
  website?: string | null
}

export interface HubSpotCompanyNameResolution {
  companyName: string
  legalName: string | null
  source: HubSpotCompanyNameResolutionSource
  missingHubSpotName: boolean
}

const toTrimmedString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim()

  return normalized ? normalized : null
}

const normalizeHostCandidate = (value: string | null | undefined): string | null => {
  const candidate = toTrimmedString(value)

  if (!candidate) return null

  const withoutProtocol = candidate.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  const host = withoutProtocol.split('/')[0]?.split('?')[0]?.split('#')[0]?.trim().toLowerCase()

  return host || null
}

export const resolveHubSpotCompanyName = (
  input: HubSpotCompanyNameResolutionInput
): HubSpotCompanyNameResolution => {
  const hubspotCompanyId = toTrimmedString(input.hubspotCompanyId) ?? 'unknown'
  const name = toTrimmedString(input.name)

  if (name) {
    return {
      companyName: name,
      legalName: name,
      source: 'hubspot_name',
      missingHubSpotName: false
    }
  }

  const domain = normalizeHostCandidate(input.domain)

  if (domain) {
    return {
      companyName: domain,
      legalName: null,
      source: 'domain',
      missingHubSpotName: true
    }
  }

  const websiteHost = normalizeHostCandidate(input.website)

  if (websiteHost) {
    return {
      companyName: websiteHost,
      legalName: null,
      source: 'website_host',
      missingHubSpotName: true
    }
  }

  return {
    companyName: `HubSpot Company ${hubspotCompanyId}`,
    legalName: null,
    source: 'technical_fallback',
    missingHubSpotName: true
  }
}
