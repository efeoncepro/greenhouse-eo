import 'server-only'

const DEFAULT_BASE_URL = 'https://hubspot-greenhouse-integration-183008134038.us-central1.run.app'
const DEFAULT_TIMEOUT_MS = 4000

export interface HubSpotGreenhouseServiceContract {
  service: string
  version: string
  realtime: {
    supported: boolean
    mode: string
    details: string
  }
}

export interface HubSpotGreenhouseCompanyProfile {
  hubspotCompanyId: string
  identity: {
    hubspotCompanyId: string
    name: string | null
    domain: string | null
    website: string | null
    industry: string | null
    country: string | null
    city: string | null
    state: string | null
  }
  lifecycle: {
    lifecyclestage: string | null
    hs_current_customer: string | null
    hubspotTeamId: string | null
  }
  capabilities: {
    businessLines: string[]
    serviceModules: string[]
  }
  owner: {
    hubspotOwnerId: string | null
  }
  source: {
    sourceSystem: string
    sourceObjectType: string
    sourceObjectId: string
  }
}

export interface HubSpotGreenhouseOwnerProfile {
  hubspotOwnerId: string
  ownerEmail: string | null
  ownerFirstName: string | null
  ownerLastName: string | null
  ownerDisplayName: string | null
  userId: number | null
  archived: boolean | null
}

export interface HubSpotGreenhouseCompanyOwnerResponse {
  hubspotCompanyId: string
  owner: HubSpotGreenhouseOwnerProfile | null
  detail?: string
}

export interface HubSpotGreenhouseLiveContext {
  serviceConfigured: boolean
  serviceBaseUrl: string | null
  fetchedAt: string | null
  contract: HubSpotGreenhouseServiceContract | null
  company: HubSpotGreenhouseCompanyProfile | null
  owner: HubSpotGreenhouseOwnerProfile | null
  error: string | null
}

const normalizeBaseUrl = (value: string | undefined) => {
  const normalized = value?.trim().replace(/\/+$/, '')

  return normalized || DEFAULT_BASE_URL
}

const parseTimeoutMs = (value: string | undefined) => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS
  }

  return Math.floor(parsed)
}

const getServiceConfig = () => ({
  baseUrl: normalizeBaseUrl(process.env.HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL),
  timeoutMs: parseTimeoutMs(process.env.HUBSPOT_GREENHOUSE_INTEGRATION_TIMEOUT_MS)
})

const fetchJson = async <T>(path: string): Promise<T> => {
  const { baseUrl, timeoutMs } = getServiceConfig()

  const response = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!response.ok) {
    const body = await response.text()

    throw new Error(`HubSpot integration service returned ${response.status} for ${path}: ${body || response.statusText}`)
  }

  return (await response.json()) as T
}

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown HubSpot integration service error'
}

export const getHubSpotGreenhouseLiveContext = async (
  hubspotCompanyId: string | null
): Promise<HubSpotGreenhouseLiveContext> => {
  const { baseUrl } = getServiceConfig()

  if (!hubspotCompanyId) {
    return {
      serviceConfigured: Boolean(baseUrl),
      serviceBaseUrl: baseUrl,
      fetchedAt: null,
      contract: null,
      company: null,
      owner: null,
      error: null
    }
  }

  const [contractResult, companyResult, ownerResult] = await Promise.allSettled([
    fetchJson<HubSpotGreenhouseServiceContract>('/contract'),
    fetchJson<HubSpotGreenhouseCompanyProfile>(`/companies/${hubspotCompanyId}`),
    fetchJson<HubSpotGreenhouseCompanyOwnerResponse>(`/companies/${hubspotCompanyId}/owner`)
  ])

  const company = companyResult.status === 'fulfilled' ? companyResult.value : null
  const owner = ownerResult.status === 'fulfilled' ? ownerResult.value.owner : null

  const errors = [contractResult, companyResult, ownerResult]
    .filter(result => result.status === 'rejected')
    .map(result => toErrorMessage((result as PromiseRejectedResult).reason))

  return {
    serviceConfigured: Boolean(baseUrl),
    serviceBaseUrl: baseUrl,
    fetchedAt: new Date().toISOString(),
    contract: contractResult.status === 'fulfilled' ? contractResult.value : null,
    company,
    owner,
    error: errors.length > 0 ? errors.join(' | ') : null
  }
}
