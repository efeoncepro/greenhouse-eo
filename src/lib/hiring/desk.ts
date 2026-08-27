import 'server-only'

import { activeProcessPredicate } from './active-process'
import { isHiringSyntheticDataFilterEnabled } from './data-origin/config'
import { realOnlyPredicate } from './data-origin/contracts'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  HiringApplicationQueueNavigation,
  HiringDeskApplicationSummary,
  HiringDeskOpeningSummary,
  HiringDeskSnapshot,
} from '@/types/hiring'

import {
  listHiringApplications,
  listHiringOpenings,
  listTalentDemands,
} from './store'

export interface HiringDeskSnapshotInput {
  /**
   * TASK-1739 — opt-in explícito para ver también datos no reales. Default: el desk NO cuenta
   * fantasmas. Mientras `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` esté OFF el filtro no se aplica y el
   * desk se comporta exactamente como antes.
   */
  includeSynthetic?: boolean
  openingId?: string
  /** Postulación que debe viajar en el snapshot aunque quede fuera del límite cronológico. */
  focusApplicationId?: string
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
  phone_e164: string | null
  residence_country_code: string | null
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

type QueueNavigationRow = {
  position: string | number
  total: string | number
  previous_application_id: string | null
  next_application_id: string | null
}

const clampLimit = (value: number | undefined, fallback: number) =>
  Math.max(1, Math.min(value ?? fallback, 120))

const toCount = (value: string | number | undefined) => Number(value ?? 0)

const mergeUniqueBy = <T,>(items: readonly T[], pinned: readonly T[], key: (item: T) => string): T[] => {
  const seen = new Set<string>()

  return [...pinned, ...items].filter((item) => {
    const value = key(item)

    if (seen.has(value)) return false
    seen.add(value)

    return true
  })
}

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

  // TASK-1739 — El filtro llega detrás de flag. Con el flag OFF el desk incluye todo, que es el
  // comportamiento previo exacto; con el flag ON deja de contar fantasmas. El caller puede pedir
  // ver sintéticos explícitamente, y ese opt-in gana sobre el flag.
  const includeSynthetic = input.includeSynthetic ?? !isHiringSyntheticDataFilterEnabled()
  // Los dos agregados corren sobre SQL propio: si el filtro no viajara también acá, los KPIs
  // seguirían contando lo que las listas ya no muestran — el desk mostraría totales que no cuadran.
  const originFilter = includeSynthetic ? '' : ` AND ${realOnlyPredicate('entity')}`
  const originWhere = includeSynthetic ? '' : ` WHERE ${realOnlyPredicate('entity')}`

  const focusedApplications = input.focusApplicationId
    ? await listHiringApplications({
        applicationId: input.focusApplicationId,
        includeSynthetic,
        limit: 1,
      })
    : []

  const focusedApplication = focusedApplications[0]
  const effectiveOpeningId = focusedApplication?.openingId ?? input.openingId

  const [listedDemands, listedOpenings, listedApplications, focusedOpenings, counts, totals] = await Promise.all([
    listTalentDemands({ limit: 120, includeSynthetic }),
    listHiringOpenings({ limit: openingLimit, includeSynthetic }),
    listHiringApplications({ openingId: effectiveOpeningId, limit: applicationLimit, includeSynthetic }),
    effectiveOpeningId
      ? listHiringOpenings({ openingId: effectiveOpeningId, limit: 1, includeSynthetic })
      : Promise.resolve([]),
    runGreenhousePostgresQuery<OpeningCountRow>(
      `SELECT opening_id,
              COUNT(*)::int AS application_count,
              COUNT(*) FILTER (WHERE ${activeProcessPredicate('entity')})::int AS active_application_count
       FROM greenhouse_hiring.hiring_application entity${originWhere}
       GROUP BY opening_id`,
    ),
    runGreenhousePostgresQuery<TotalsRow>(
      `SELECT
         (SELECT COUNT(*) FROM greenhouse_hiring.hiring_opening entity${originWhere})::int AS openings,
         (SELECT COUNT(*) FROM greenhouse_hiring.hiring_application entity${originWhere})::int AS applications,
         (SELECT COUNT(*) FROM greenhouse_hiring.hiring_opening entity WHERE publication_status = 'published'${originFilter})::int AS published_openings,
         (SELECT COUNT(*) FROM greenhouse_hiring.talent_demand entity WHERE status NOT IN ('fulfilled', 'cancelled')${originFilter})::int AS active_demands`,
    ),
  ])

  const focusedOpening = focusedOpenings[0]

  const focusedDemands = focusedOpening
    ? await listTalentDemands({ demandId: focusedOpening.demandId, limit: 1, includeSynthetic })
    : []

  const demands = mergeUniqueBy(listedDemands, focusedDemands, (demand) => demand.demandId)
  const openings = mergeUniqueBy(listedOpenings, focusedOpenings, (opening) => opening.openingId)

  const applications = mergeUniqueBy(
    listedApplications,
    focusedApplication && focusedApplication.openingId === effectiveOpeningId ? [focusedApplication] : [],
    (application) => application.applicationId,
  )

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
          `SELECT candidate_facet_id, portfolio_url, linkedin_url, phone_e164, residence_country_code
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
        phoneE164: facet?.phone_e164 ?? null,
        residenceCountryCode: facet?.residence_country_code ?? null,
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

/**
 * Cola neutral para review secuencial. Se limita a la misma vacante + etapa y excluye archivados.
 * La consulta devuelve sólo ids/posición: el reader 360 sigue siendo dueño de PII, scores y ceguera.
 */
export const getHiringApplicationQueueNavigation = async (
  applicationId: string,
): Promise<HiringApplicationQueueNavigation | null> => {
  const includeSynthetic = !isHiringSyntheticDataFilterEnabled()
  const [application] = await listHiringApplications({ applicationId, includeSynthetic, limit: 1 })

  if (!application || application.archivedAt) return null

  const originFilter = includeSynthetic ? '' : ` AND ${realOnlyPredicate('app')}`

  const rows = await runGreenhousePostgresQuery<QueueNavigationRow>(
    `WITH ordered AS (
       SELECT application_id,
              ROW_NUMBER() OVER (ORDER BY created_at DESC, application_id ASC)::int AS position,
              COUNT(*) OVER ()::int AS total
       FROM greenhouse_hiring.hiring_application app
       WHERE app.opening_id = $1
         AND app.stage = $2
         AND app.archived_at IS NULL${originFilter}
     )
     SELECT current.position,
            current.total,
            prev_item.application_id AS previous_application_id,
            next_item.application_id AS next_application_id
     FROM ordered current
     LEFT JOIN ordered prev_item ON prev_item.position = current.position - 1
     LEFT JOIN ordered next_item ON next_item.position = current.position + 1
     WHERE current.application_id = $3
     LIMIT 1`,
    [application.openingId, application.stage, application.applicationId],
  )

  const row = rows[0]

  if (!row) return null

  return {
    openingId: application.openingId,
    stage: application.stage,
    position: toCount(row.position),
    total: toCount(row.total),
    previousApplicationId: row.previous_application_id,
    nextApplicationId: row.next_application_id,
  }
}
