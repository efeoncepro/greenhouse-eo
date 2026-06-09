import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

export type OrganizationSourceSystem =
  | 'greenhouse'
  | 'hubspot'
  | 'account360'
  | 'finance360'
  | 'delivery360'
  | 'services360'
  | 'staffAug360'

export type OrganizationProvenanceInput = {
  hasHubspotCompany?: boolean
  resolvedFacets?: readonly string[] | null
}

const COPY = GH_ORGANIZATION_WORKSPACE.enterprise.provenance

const sourceLabel = (source: OrganizationSourceSystem) => COPY.sources[source]

export const formatOrganizationSourceSystems = (sources: readonly OrganizationSourceSystem[]): string =>
  sources.map(sourceLabel).join(COPY.joiner)

export const resolveOrganizationIdentitySources = ({
  hasHubspotCompany
}: OrganizationProvenanceInput): OrganizationSourceSystem[] => {
  const sources: OrganizationSourceSystem[] = []

  if (hasHubspotCompany) sources.push('hubspot')

  sources.push('greenhouse')

  return sources
}

export const resolveOrganizationWorkspaceSources = ({
  hasHubspotCompany,
  resolvedFacets
}: OrganizationProvenanceInput): OrganizationSourceSystem[] => {
  const sources = new Set<OrganizationSourceSystem>(resolveOrganizationIdentitySources({ hasHubspotCompany }))
  const facets = new Set(resolvedFacets ?? [])

  if (facets.size > 0) sources.add('account360')
  if (facets.has('finance') || facets.has('economics')) sources.add('finance360')
  if (facets.has('delivery')) sources.add('delivery360')
  if (facets.has('services')) sources.add('services360')
  if (facets.has('staffAug')) sources.add('staffAug360')

  return Array.from(sources)
}

export const organizationIdentitySourceDisplay = (input: OrganizationProvenanceInput): string =>
  `${COPY.mastheadPrefix}: ${formatOrganizationSourceSystems(resolveOrganizationIdentitySources(input))}`

export const organizationWorkspaceSourceDisplay = (input: OrganizationProvenanceInput): string =>
  formatOrganizationSourceSystems(resolveOrganizationWorkspaceSources(input))
