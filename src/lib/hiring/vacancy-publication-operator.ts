import 'server-only'

import { performance } from 'node:perf_hooks'

import type { ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { executeApiPlatformCommand } from '@/lib/api-platform/core/commands'
import type { CommandExecutionScope } from '@/lib/api-platform/core/idempotency'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  HIRING_PUBLIC_AREAS,
  HIRING_PUBLIC_WORK_MODES,
  type CreateHiringOpeningInput,
  type CreateTalentDemandInput,
  type HiringOpening,
  type HiringPublicArea,
  type HiringPublicWorkMode,
  type TalentDemand,
  type TalentDemandEngagementType,
  type TalentDemandOrigin,
  type TalentDemandPriority,
} from '@/types/hiring'

import { HiringValidationError } from './errors'
import { publishOpening } from './publication'
import {
  createHiringOpening,
  createTalentDemand,
  getHiringOpeningById,
  updateHiringOpening,
} from './store'

export const HIRING_VACANCY_PUBLICATION_ROUTE_KEY = 'hiring.vacancy_publication.publish'

export type HiringVacancyPublicationMode = 'dryRun' | 'execute' | 'publish'
export type HiringVacancyPublicationOutcome = 'validated' | 'created' | 'published' | 'duplicate' | 'reused_draft'

export type HiringVacancyBrief = {
  idempotencyKey?: string | null
  mode?: HiringVacancyPublicationMode
  sourceReference?: string | null
  requestedRole: string
  publicTitle: string
  publicSummary: string
  publicDescription: string
  responsibilities?: string[]
  requirements?: string[]
  niceToHave?: string[]
  skillTags?: string[]
  competencyTags?: string[]
  publicArea: HiringPublicArea | string
  workMode: HiringPublicWorkMode
  hiringRegion?: string | null
  city?: string | null
  country?: string | null
  officeLocation?: string | null
  seniority?: string | null
  employmentMode?: string | null
  engagementType?: TalentDemandEngagementType
  fulfillmentMode?: CreateTalentDemandInput['fulfillmentMode']
  demandOrigin?: TalentDemandOrigin
  requestedSeats?: number
  priority?: TalentDemandPriority
  ownerUserId?: string | null
  publicProcessNotes?: string | null
  publicCompensationBand?: string | null
  sourceUrl?: string | null
}

export type HiringVacancyPublicationPreview = {
  demand: CreateTalentDemandInput
  opening: CreateHiringOpeningInput
  publicOpening: {
    publicTitle: string
    publicSummary: string
    publicDescription: string
    publicRequirements: string
    publicNiceToHave: string | null
    publicWorkMode: HiringPublicWorkMode
    publicHiringRegion: string | null
    publicCity: string | null
    publicCountry: string | null
    publicOfficeLocation: string | null
    publicArea: string
    publicSkillTags: string[]
    publicLocationMode: string
    publicEmploymentMode: string | null
    publicSeniority: string | null
    publicProcessNotes: string | null
    publicCompensationBand: string | null
    publicationSourceRef: string | null
  }
}

export type HiringVacancyPublicationResult = {
  outcome: HiringVacancyPublicationOutcome
  mode: HiringVacancyPublicationMode
  demandId?: string
  demandPublicId?: string
  openingId?: string
  openingPublicId?: string
  status?: string
  detailUrl?: string
  applyUrl?: string
  warnings: string[]
  timings: Array<{ step: string; durationMs: number }>
  preview?: HiringVacancyPublicationPreview
}

type NormalizedBrief = Required<Pick<HiringVacancyBrief, 'mode' | 'requestedRole' | 'publicTitle' | 'publicSummary' | 'publicDescription' | 'publicArea' | 'workMode'>> &
  Omit<HiringVacancyBrief, 'mode' | 'requestedRole' | 'publicTitle' | 'publicSummary' | 'publicDescription' | 'publicArea' | 'workMode'> & {
    publicArea: HiringPublicArea
    skillTags: string[]
    requirements: string[]
    responsibilities: string[]
    niceToHave: string[]
    publicLocationMode: string
    sourceReference: string | null
    engagementType: TalentDemandEngagementType
    fulfillmentMode: CreateTalentDemandInput['fulfillmentMode']
    demandOrigin: TalentDemandOrigin
    requestedSeats: number
    priority: TalentDemandPriority
    warnings: string[]
  }

const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://greenhouse.efeoncepro.com'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const clean = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

const optionalClean = (value: unknown): string | null => {
  const cleaned = clean(value)

  return cleaned || null
}

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return value.map(clean).filter(Boolean)
}

const requireString = (value: unknown, field: string): string => {
  const cleaned = clean(value)

  if (!cleaned) {
    throw new HiringValidationError(
      `El campo ${field} es obligatorio para publicar una vacante.`,
      'hiring_vacancy_publication_invalid_input',
      400,
      { field },
    )
  }

  return cleaned
}

const requireArea = (value: unknown): HiringPublicArea => {
  const area = requireString(value, 'publicArea')

  if (!HIRING_PUBLIC_AREAS.includes(area as HiringPublicArea)) {
    throw new HiringValidationError(
      'El area publica de la vacante no esta aprobada.',
      'hiring_vacancy_publication_invalid_input',
      400,
      { field: 'publicArea', allowed: HIRING_PUBLIC_AREAS },
    )
  }

  return area as HiringPublicArea
}

const requireWorkMode = (value: unknown): HiringPublicWorkMode => {
  const workMode = requireString(value, 'workMode')

  if (!HIRING_PUBLIC_WORK_MODES.includes(workMode as HiringPublicWorkMode)) {
    throw new HiringValidationError(
      'La modalidad publica de la vacante debe ser unica y aprobada.',
      'hiring_vacancy_publication_invalid_input',
      400,
      { field: 'workMode', allowed: HIRING_PUBLIC_WORK_MODES },
    )
  }

  return workMode as HiringPublicWorkMode
}

const readMode = (value: unknown): HiringVacancyPublicationMode => {
  const mode = clean(value) || 'dryRun'

  if (mode === 'dryRun' || mode === 'execute' || mode === 'publish') return mode

  throw new HiringValidationError(
    'El modo de publicacion debe ser dryRun, execute o publish.',
    'hiring_vacancy_publication_invalid_input',
    400,
    { field: 'mode' },
  )
}

const normalizeBrief = (input: unknown): NormalizedBrief => {
  if (!isRecord(input)) {
    throw new HiringValidationError(
      'El brief de vacante debe ser un objeto JSON.',
      'hiring_vacancy_publication_invalid_input',
      400,
    )
  }

  const mode = readMode(input.mode)
  const workMode = requireWorkMode(input.workMode)
  const publicArea = requireArea(input.publicArea ?? input.department ?? input.area)
  const requirements = readStringArray(input.requirements)
  const responsibilities = readStringArray(input.responsibilities)
  const niceToHave = readStringArray(input.niceToHave)
  const skillTags = [...readStringArray(input.skillTags), ...readStringArray(input.competencyTags)]
  const uniqueSkillTags = Array.from(new Set(skillTags)).slice(0, 8)
  const hiringRegion = optionalClean(input.hiringRegion)
  const city = optionalClean(input.city)
  const country = optionalClean(input.country)
  const officeLocation = optionalClean(input.officeLocation)
  const warnings: string[] = []

  if (!uniqueSkillTags.length) {
    throw new HiringValidationError(
      'La vacante debe declarar publicSkillTags/competencyTags estructurados.',
      'hiring_vacancy_publication_invalid_input',
      400,
      { field: 'skillTags' },
    )
  }

  if (workMode === 'remote' && !hiringRegion) {
    throw new HiringValidationError(
      'Una vacante remota debe declarar hiringRegion publico.',
      'hiring_vacancy_publication_publish_guard',
      422,
      { field: 'hiringRegion' },
    )
  }

  if ((workMode === 'hybrid' || workMode === 'onsite') && !officeLocation && (!city || !country)) {
    throw new HiringValidationError(
      'Una vacante hibrida/presencial debe declarar officeLocation o city+country publicos.',
      'hiring_vacancy_publication_publish_guard',
      422,
      { field: 'officeLocation' },
    )
  }

  if (!optionalClean(input.publicCompensationBand)) {
    warnings.push('public_compensation_band_not_set')
  }

  const publicLocationMode = workMode === 'remote'
    ? hiringRegion ?? ''
    : officeLocation ?? [city, country].filter(Boolean).join(', ')

  return {
    ...input,
    mode,
    requestedRole: requireString(input.requestedRole, 'requestedRole'),
    publicTitle: requireString(input.publicTitle, 'publicTitle'),
    publicSummary: requireString(input.publicSummary, 'publicSummary'),
    publicDescription: requireString(input.publicDescription, 'publicDescription'),
    publicArea,
    workMode,
    hiringRegion,
    city,
    country,
    officeLocation,
    seniority: optionalClean(input.seniority),
    employmentMode: optionalClean(input.employmentMode),
    engagementType: (clean(input.engagementType) || 'on_going') as TalentDemandEngagementType,
    fulfillmentMode: (clean(input.fulfillmentMode) || 'internal_hire') as CreateTalentDemandInput['fulfillmentMode'],
    demandOrigin: (clean(input.demandOrigin) || 'manual_internal') as TalentDemandOrigin,
    requestedSeats: Number.isInteger(Number(input.requestedSeats)) ? Number(input.requestedSeats) : 1,
    priority: (clean(input.priority) || 'high') as TalentDemandPriority,
    ownerUserId: optionalClean(input.ownerUserId),
    publicProcessNotes: optionalClean(input.publicProcessNotes),
    publicCompensationBand: optionalClean(input.publicCompensationBand),
    sourceUrl: optionalClean(input.sourceUrl),
    sourceReference: optionalClean(input.sourceReference),
    requirements,
    responsibilities,
    niceToHave,
    skillTags: uniqueSkillTags,
    publicLocationMode,
    warnings,
  }
}

const buildPublicTextBlock = (intro: string, items: string[]): string => {
  if (!items.length) return intro

  return `${intro}\n\n${items.map(item => `- ${item}`).join('\n')}`
}

const buildPreview = (brief: NormalizedBrief): HiringVacancyPublicationPreview => {
  const demand: CreateTalentDemandInput = {
    stakeholderType: 'internal',
    engagementType: brief.engagementType,
    fulfillmentMode: brief.fulfillmentMode,
    demandOrigin: brief.demandOrigin,
    requestedRole: brief.requestedRole,
    requestedSeats: brief.requestedSeats,
    requestedSkills: brief.skillTags,
    priority: brief.priority,
    ownerUserId: brief.ownerUserId,
    notes: [
      brief.sourceReference ? `publication_source_ref=${brief.sourceReference}` : null,
      brief.sourceUrl ? `source_url=${brief.sourceUrl}` : null,
    ].filter(Boolean).join('\n') || null,
  }

  const opening: CreateHiringOpeningInput = {
    demandId: '<created-demand-id>',
    internalTitle: brief.requestedRole,
    seniority: brief.seniority,
    requestedSeats: brief.requestedSeats,
    ownerUserId: brief.ownerUserId,
  }

  return {
    demand,
    opening,
    publicOpening: {
      publicTitle: brief.publicTitle,
      publicSummary: brief.publicSummary,
      publicDescription: buildPublicTextBlock(brief.publicDescription, brief.responsibilities),
      publicRequirements: brief.requirements.join('\n'),
      publicNiceToHave: brief.niceToHave.length ? brief.niceToHave.join('\n') : null,
      publicWorkMode: brief.workMode,
      publicHiringRegion: brief.hiringRegion ?? null,
      publicCity: brief.city ?? null,
      publicCountry: brief.country ?? null,
      publicOfficeLocation: brief.officeLocation ?? null,
      publicArea: brief.publicArea,
      publicSkillTags: brief.skillTags,
      publicLocationMode: brief.publicLocationMode,
      publicEmploymentMode: brief.employmentMode ?? null,
      publicSeniority: brief.seniority ?? null,
      publicProcessNotes: brief.publicProcessNotes ?? null,
      publicCompensationBand: brief.publicCompensationBand ?? null,
      publicationSourceRef: brief.sourceReference,
    },
  }
}

const withTiming = async <T>(
  timings: HiringVacancyPublicationResult['timings'],
  step: string,
  run: () => Promise<T>,
): Promise<T> => {
  const startedAt = performance.now()

  try {
    return await run()
  } finally {
    timings.push({ step, durationMs: Math.round(performance.now() - startedAt) })
  }
}

const findOpeningBySourceReference = async (sourceReference: string | null): Promise<HiringOpening | null> => {
  if (!sourceReference) return null

  const rows = await runGreenhousePostgresQuery<{ opening_id: string }>(
    `SELECT opening_id FROM greenhouse_hiring.hiring_opening WHERE publication_source_ref = $1 LIMIT 1`,
    [sourceReference],
  )

  const openingId = rows[0]?.opening_id

  return openingId ? getHiringOpeningById(openingId) : null
}

const buildResultUrls = (publicId: string) => ({
  detailUrl: `${PUBLIC_BASE_URL}/public/careers/${encodeURIComponent(publicId)}`,
  applyUrl: `${PUBLIC_BASE_URL}/public/careers/${encodeURIComponent(publicId)}/apply`,
})

export const publishHiringVacancyFromBrief = async (
  input: unknown,
  actorUserId: string | null,
): Promise<HiringVacancyPublicationResult> => {
  const timings: HiringVacancyPublicationResult['timings'] = []
  const brief = normalizeBrief(input)
  const preview = buildPreview(brief)

  if (brief.mode === 'dryRun') {
    return { outcome: 'validated', mode: brief.mode, warnings: brief.warnings, timings, preview }
  }

  const existingOpening = await withTiming(timings, 'lookup_existing_opening', () =>
    findOpeningBySourceReference(brief.sourceReference),
  )

  let demand: TalentDemand | null = null
  let opening = existingOpening
  let outcome: HiringVacancyPublicationOutcome = opening ? 'reused_draft' : 'created'

  if (!opening) {
    demand = await withTiming(timings, 'create_talent_demand', () =>
      createTalentDemand(preview.demand, actorUserId),
    )

    opening = await withTiming(timings, 'create_hiring_opening', () =>
      createHiringOpening({ ...preview.opening, demandId: demand!.demandId }, actorUserId),
    )
  } else {
    demand = null
  }

  opening = await withTiming(timings, 'update_public_opening_projection', () =>
    updateHiringOpening(
      opening!.openingId,
      {
        publicTitle: preview.publicOpening.publicTitle,
        publicSummary: preview.publicOpening.publicSummary,
        publicDescription: preview.publicOpening.publicDescription,
        publicRequirements: preview.publicOpening.publicRequirements,
        publicNiceToHave: preview.publicOpening.publicNiceToHave,
        publicWorkMode: preview.publicOpening.publicWorkMode,
        publicHiringRegion: preview.publicOpening.publicHiringRegion,
        publicCity: preview.publicOpening.publicCity,
        publicCountry: preview.publicOpening.publicCountry,
        publicOfficeLocation: preview.publicOpening.publicOfficeLocation,
        publicArea: preview.publicOpening.publicArea,
        publicSkillTags: preview.publicOpening.publicSkillTags,
        publicLocationMode: preview.publicOpening.publicLocationMode,
        publicEmploymentMode: preview.publicOpening.publicEmploymentMode,
        publicSeniority: preview.publicOpening.publicSeniority,
        publicProcessNotes: preview.publicOpening.publicProcessNotes,
        publicCompensationBand: preview.publicOpening.publicCompensationBand,
        publicationSourceRef: preview.publicOpening.publicationSourceRef,
      },
      actorUserId,
    ),
  )

  if (brief.mode === 'publish') {
    const published = await withTiming(timings, 'publish_opening', () => publishOpening(opening!.openingId, actorUserId))

    opening = { ...opening, publicationStatus: 'published', visibility: 'public_listed', publishedAt: published.publishedAt }
    outcome = existingOpening?.publicationStatus === 'published' ? 'duplicate' : 'published'
  }

  const urls = buildResultUrls(opening.publicId)

  return {
    outcome,
    mode: brief.mode,
    demandId: demand?.demandId ?? undefined,
    demandPublicId: demand?.publicId ?? undefined,
    openingId: opening.openingId,
    openingPublicId: opening.publicId,
    status: opening.publicationStatus,
    detailUrl: urls.detailUrl,
    applyUrl: urls.applyUrl,
    warnings: brief.warnings,
    timings,
    preview,
  }
}

export const executeHiringVacancyPublicationCommand = async ({
  request,
  actorUserId,
  body,
  scope = {},
}: {
  request: Request
  actorUserId: string | null
  body: unknown
  scope?: CommandExecutionScope
}): Promise<ApiPlatformSuccessResult<HiringVacancyPublicationResult>> => {
  const mode = isRecord(body) ? readMode(body.mode) : 'dryRun'

  if (mode === 'dryRun') {
    return { data: await publishHiringVacancyFromBrief(body, actorUserId), status: 200 }
  }

  const idempotencyKey = isRecord(body) ? optionalClean(body.idempotencyKey) : null
  const headerIdempotencyKey = request.headers.get('idempotency-key')?.trim() || null

  if (!idempotencyKey && !headerIdempotencyKey) {
    throw new HiringValidationError(
      'execute/publish requieren idempotencyKey o header Idempotency-Key.',
      'hiring_vacancy_publication_invalid_input',
      400,
      { field: 'idempotencyKey' },
    )
  }

  return executeApiPlatformCommand({
    principal: {
      lane: 'internal',
      principalKind: 'internal_actor',
      principalId: actorUserId ?? 'hiring-vacancy-publication-operator',
      userId: actorUserId,
    },
    scope,
    routeKey: HIRING_VACANCY_PUBLICATION_ROUTE_KEY,
    request,
    body,
    idempotencyKeyOverride: idempotencyKey,
    run: async () => ({ data: await publishHiringVacancyFromBrief(body, actorUserId), status: 200 }),
  })
}
