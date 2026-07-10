import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  HiringDeskApplicationSummary,
  HiringDeskOpeningSummary,
  HiringDeskSnapshot,
} from '@/types/hiring'

import {
  listHiringApplications,
  listHiringOpenings,
  listTalentDemands,
} from './store'

interface HiringDeskSnapshotInput {
  openingId?: string
  query?: string
  openingLimit?: number
  applicationLimit?: number
}

type IdentityRow = {
  profile_id: string
  full_name: string | null
  canonical_email: string | null
}

type CandidateFacetLinkRow = {
  candidate_facet_id: string
  portfolio_url: string | null
  linkedin_url: string | null
}

type OpeningCountRow = {
  opening_id: string
  application_count: string | number
  active_application_count: string | number
}

type TotalsRow = {
  openings: string | number
  applications: string | number
  published_openings: string | number
  active_demands: string | number
}

const clampLimit = (value: number | undefined, fallback: number) =>
  Math.max(1, Math.min(value ?? fallback, 120))

const toCount = (value: string | number | undefined) => Number(value ?? 0)

const initialsForName = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('es-CL') ?? '')
    .join('') || '—'

export const maskHiringEmail = (email: string | null): string | null => {
  if (!email) return null

  const [local, domain] = email.split('@')

  if (!local || !domain) return '••••••'

  return `${local.slice(0, 1)}${'•'.repeat(Math.min(Math.max(local.length - 1, 3), 8))}@${domain}`
}

/** Read model interno: no retorna correo crudo y limita cada colección. */
export const getHiringDeskSnapshot = async (
  input: HiringDeskSnapshotInput = {},
): Promise<HiringDeskSnapshot> => {
  const openingLimit = clampLimit(input.openingLimit, 60)
  const applicationLimit = clampLimit(input.applicationLimit, 100)
  const normalizedQuery = input.query?.trim().toLocaleLowerCase('es-CL') ?? ''

  const [demands, openings, applications, counts, totals] = await Promise.all([
    listTalentDemands({ limit: 120 }),
    listHiringOpenings({ limit: openingLimit }),
    listHiringApplications({ openingId: input.openingId, limit: applicationLimit }),
    runGreenhousePostgresQuery<OpeningCountRow>(
      `SELECT opening_id,
              COUNT(*)::int AS application_count,
              COUNT(*) FILTER (WHERE stage NOT IN ('rejected', 'withdrawn', 'closed'))::int AS active_application_count
       FROM greenhouse_hiring.hiring_application
       GROUP BY opening_id`,
    ),
    runGreenhousePostgresQuery<TotalsRow>(
      `SELECT
         (SELECT COUNT(*) FROM greenhouse_hiring.hiring_opening)::int AS openings,
         (SELECT COUNT(*) FROM greenhouse_hiring.hiring_application)::int AS applications,
         (SELECT COUNT(*) FROM greenhouse_hiring.hiring_opening WHERE publication_status = 'published')::int AS published_openings,
         (SELECT COUNT(*) FROM greenhouse_hiring.talent_demand WHERE status NOT IN ('fulfilled', 'cancelled'))::int AS active_demands`,
    ),
  ])

  const demandById = new Map(demands.map((demand) => [demand.demandId, demand]))
  const openingById = new Map(openings.map((opening) => [opening.openingId, opening]))
  const countByOpening = new Map(counts.map((item) => [item.opening_id, item]))
  const identityIds = [...new Set(applications.map((application) => application.identityProfileId))]
  const facetIds = [...new Set(applications.map((application) => application.candidateFacetId))]

  const [identities, facets] = await Promise.all([
    identityIds.length > 0
      ? runGreenhousePostgresQuery<IdentityRow>(
          `SELECT profile_id, full_name, canonical_email
           FROM greenhouse_core.identity_profiles
           WHERE profile_id = ANY($1::text[])`,
          [identityIds],
        )
      : Promise.resolve([]),
    facetIds.length > 0
      ? runGreenhousePostgresQuery<CandidateFacetLinkRow>(
          `SELECT candidate_facet_id, portfolio_url, linkedin_url
           FROM greenhouse_hiring.candidate_facet
           WHERE candidate_facet_id = ANY($1::text[])`,
          [facetIds],
        )
      : Promise.resolve([]),
  ])

  const identityById = new Map(identities.map((identity) => [identity.profile_id, identity]))
  const facetById = new Map(facets.map((facet) => [facet.candidate_facet_id, facet]))

  const openingSummaries: HiringDeskOpeningSummary[] = openings
    .flatMap((opening) => {
      const demand = demandById.get(opening.demandId)

      if (!demand) return []

      const count = countByOpening.get(opening.openingId)

      return [{
        opening,
        demand,
        applicationCount: toCount(count?.application_count),
        activeApplicationCount: toCount(count?.active_application_count),
      }]
    })
    .filter(({ opening, demand }) => {
      if (!normalizedQuery) return true

      return [opening.internalTitle, opening.publicTitle, demand.requestedRole, demand.businessUnit]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase('es-CL').includes(normalizedQuery))
    })

  const applicationSummaries: HiringDeskApplicationSummary[] = applications
    .flatMap((application) => {
      const opening = openingById.get(application.openingId)

      if (!opening) return []

      const identity = identityById.get(application.identityProfileId)
      const facet = facetById.get(application.candidateFacetId)
      const candidateName = identity?.full_name?.trim() || `Candidato ${application.publicId}`
      const area = opening.publicArea ?? demandById.get(opening.demandId)?.businessUnit ?? null

      return [{
        application,
        candidateName,
        candidateInitials: initialsForName(candidateName),
        maskedEmail: maskHiringEmail(identity?.canonical_email ?? null),
        portfolioUrl: facet?.portfolio_url ?? null,
        linkedinUrl: facet?.linkedin_url ?? null,
        openingTitle: opening.publicTitle ?? opening.internalTitle,
        openingPublicId: opening.publicId,
        area,
      }]
    })
    .filter(({ candidateName, openingTitle, application }) => {
      if (!normalizedQuery) return true

      return [candidateName, openingTitle, application.publicId]
        .some((value) => value.toLocaleLowerCase('es-CL').includes(normalizedQuery))
    })

  const total = totals[0]

  return {
    openings: openingSummaries,
    applications: applicationSummaries,
    totals: {
      openings: toCount(total?.openings),
      applications: toCount(total?.applications),
      publishedOpenings: toCount(total?.published_openings),
      activeDemands: toCount(total?.active_demands),
    },
  }
}
