import 'server-only'

import { Buffer } from 'node:buffer'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { getNextAuthSecret } from '@/lib/auth-secrets'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { isHiringSyntheticDataFilterEnabled } from '@/lib/hiring/data-origin/config'
import { realOnlyPredicate } from '@/lib/hiring/data-origin/contracts'
import { HiringNotFoundError, HiringValidationError } from '@/lib/hiring/errors'

import type {
  SearchTalentPoolInput,
  SearchTalentPoolResult,
  TalentPoolEvidenceDto,
  TalentPoolLifecycle,
  TalentPoolProfileDto
} from './contracts'
import { deriveTalentPoolAccess } from './policy'

type ProfileRow = {
  public_id: string
  lifecycle_status: TalentPoolLifecycle
  aggregate_version: number
  future_consent_expires_at: Date | string | null
  availability: string | null
  seniority: string | null
  country_code: string | null
  full_name: string | null
  updated_at: Date | string
}

type EvidenceRow = {
  membership_public_id: string
  source_type: TalentPoolEvidenceDto['sourceType']
  source_id: string
  application_public_id: string | null
  capability_key: string | null
  seniority: string | null
  language_code: string | null
  country_code: string | null
  availability: string | null
  evidence_state: TalentPoolEvidenceDto['evidenceState']
  result_band: string | null
  observed_at: Date | string
  fresh_until: Date | string | null
}

const iso = (value: Date | string) => new Date(value).toISOString()
const optionalIso = (value: Date | string | null) => (value ? iso(value) : null)
const clampLimit = (value?: number) => Math.max(1, Math.min(value ?? 25, 50))

const safeFilter = (value: string, field: string) => {
  const normalized = value.trim()

  if (!/^[a-zA-Z0-9_.:@+/-]{1,80}$/.test(normalized)) {
    throw new HiringValidationError(`El filtro ${field} no es válido.`, 'talent_pool_invalid_filter')
  }

  return normalized
}

const safeQuery = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, ' ')

  if (!/^[\p{L}\p{N} ._@+/-]{1,80}$/u.test(normalized)) {
    throw new HiringValidationError('La búsqueda no es válida.', 'talent_pool_invalid_filter')
  }

  return normalized
}

const CURSOR_POLICY_VERSION = 'talent-pool-search-v2'
const CURSOR_MAX_AGE_MS = 15 * 60 * 1000

type CursorPayload = {
  v: typeof CURSOR_POLICY_VERSION
  updatedAt: string
  publicId: string
  snapshotAt: string
  filterHash: string
  bindingHash: string
}

const digest = (value: string) => createHash('sha256').update(value).digest('hex')

const filterFingerprint = (input: SearchTalentPoolInput) =>
  digest(
    JSON.stringify({
      query: input.query?.trim() || null,
      capabilityKeys: [...(input.capabilityKeys ?? [])].sort(),
      seniority: input.seniority ?? null,
      languageCode: input.languageCode ?? null,
      countryCode: input.countryCode?.toUpperCase() ?? null,
      availability: input.availability ?? null,
      lifecycle: [...(input.lifecycle ?? [])].sort(),
      // El cursor firma la procedencia igual que los demas filtros: sin esto, una pagina emitida con
      // el filtro puesto se podria continuar sin el (o al reves) y la paginacion serviria un conjunto
      // distinto del que firmo.
      includeSynthetic: resolveIncludeSynthetic(input.includeSynthetic)
    })
  )

const encodeCursor = (payload: CursorPayload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getNextAuthSecret()).update(body).digest('base64url')

  return `${body}.${signature}`
}

const decodeCursor = (cursor: string | undefined, input: SearchTalentPoolInput): CursorPayload | null => {
  if (!cursor) return null

  try {
    const [body, signature, extra] = cursor.split('.')

    if (!body || !signature || extra) throw new Error('shape')
    const expected = createHmac('sha256', getNextAuthSecret()).update(body).digest()
    const supplied = Buffer.from(signature, 'base64url')

    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('signature')
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<CursorPayload>

    if (
      parsed.v !== CURSOR_POLICY_VERSION ||
      typeof parsed.updatedAt !== 'string' ||
      typeof parsed.publicId !== 'string' ||
      typeof parsed.snapshotAt !== 'string' ||
      parsed.filterHash !== filterFingerprint(input) ||
      parsed.bindingHash !== digest(input.cursorBinding ?? 'unbound') ||
      !Number.isFinite(Date.parse(parsed.snapshotAt)) ||
      Date.now() - Date.parse(parsed.snapshotAt) > CURSOR_MAX_AGE_MS
    ) {
      throw new Error('binding')
    }

    return parsed as CursorPayload
  } catch {
    throw new HiringValidationError('El cursor no es válido.', 'talent_pool_invalid_cursor')
  }
}

const loadEvidence = async (publicIds: string[]) => {
  if (publicIds.length === 0) return new Map<string, TalentPoolEvidenceDto[]>()

  const rows = await runGreenhousePostgresQuery<EvidenceRow>(
    `SELECT m.public_id AS membership_public_id, e.source_type, e.source_id,
            a.application_id AS application_public_id, e.capability_key, e.seniority,
            e.language_code, e.country_code, e.availability, e.evidence_state,
            e.result_band, e.observed_at, e.fresh_until
       FROM greenhouse_hiring.talent_pool_evidence_projection e
       JOIN greenhouse_hiring.talent_pool_membership m ON m.membership_id = e.membership_id
       LEFT JOIN greenhouse_hiring.hiring_application a ON a.application_id = e.application_id
      WHERE m.public_id = ANY($1::text[])
      ORDER BY e.observed_at DESC, e.evidence_id ASC`,
    [publicIds]
  )

  const byProfile = new Map<string, TalentPoolEvidenceDto[]>()

  for (const row of rows) {
    const freshUntil = optionalIso(row.fresh_until)

    const item: TalentPoolEvidenceDto = {
      sourceType: row.source_type,
      sourceRef: row.source_id,
      applicationRef: row.application_public_id,
      capabilityKey: row.capability_key === '__general__' ? null : row.capability_key,
      seniority: row.seniority,
      languageCode: row.language_code,
      countryCode: row.country_code,
      availability: row.availability,
      evidenceState: row.evidence_state,
      resultBand: row.result_band,
      observedAt: iso(row.observed_at),
      freshUntil,
      isStale: Boolean(freshUntil && Date.parse(freshUntil) <= Date.now())
    }

    byProfile.set(row.membership_public_id, [...(byProfile.get(row.membership_public_id) ?? []), item])
  }

  return byProfile
}

const mapProfile = (row: ProfileRow, evidence: TalentPoolEvidenceDto[]): TalentPoolProfileDto => {
  const access = deriveTalentPoolAccess({
    lifecycleStatus: row.lifecycle_status,
    futureConsentExpiresAt: optionalIso(row.future_consent_expires_at)
  })

  const stale = evidence.length > 0 && evidence.every(item => item.isStale)

  if (evidence.length === 0) access.reasonCodes.push('evidence_missing')
  else if (stale) access.reasonCodes.push('evidence_stale')

  return {
    talentProfileId: row.public_id,
    displayName: row.full_name?.trim() || `Talento ${row.public_id}`,
    lifecycleStatus: row.lifecycle_status,
    aggregateVersion: Number(row.aggregate_version),
    futureConsentExpiresAt: optionalIso(row.future_consent_expires_at),
    availability: row.availability,
    seniority: row.seniority,
    countryCode: row.country_code,
    access,
    evidenceCoverage:
      evidence.length === 0
        ? 'none'
        : evidence.some(item => item.evidenceState === 'evaluated')
          ? 'structured'
          : 'partial',
    evidenceFreshness: evidence.length === 0 ? 'none' : stale ? 'stale' : 'current',
    evidence,
    updatedAt: iso(row.updated_at)
  }
}

/**
 * TASK-1748 Slice 1 — la invisibilidad de un dato sintetico debe derivar de SU PROCEDENCIA, no de un
 * estado del ciclo de vida.
 *
 * Hasta esta task las 11 fichas sinteticas no aparecian en el Banco de Talento, pero por accidente:
 * quedaron en `lifecycle_status='needs_reconsent'` y el `baseSelect` solo sirve
 * `('active_process','pool_eligible','paused')`. Nadie garantizaba ese estado — y de hecho el
 * archivado del Slice 2 lo cambia: al devolver las postulaciones sinteticas de `closed` a su etapa
 * previa, la projection las reclasifica a `active_process` en su siguiente corrida (cada 5 min por
 * Cloud Scheduler) y reaparecerian. Por eso el filtro es precondicion de ese Slice, no un adorno.
 *
 * Mismo contrato exacto que el desk (`desk.ts`): el flag decide el default y el `includeSynthetic`
 * explicito del caller gana sobre el flag.
 */
const resolveIncludeSynthetic = (value: boolean | undefined): boolean =>
  value ?? !isHiringSyntheticDataFilterEnabled()

/** La procedencia de una ficha se hereda de la persona: `candidate_facet` no tiene `data_origin`. */
const originClause = (includeSynthetic: boolean): string =>
  includeSynthetic ? '' : ` AND ${realOnlyPredicate('ip')}`

const baseSelect = `SELECT m.public_id, m.lifecycle_status, m.aggregate_version,
  m.future_consent_expires_at, cf.availability, cf.seniority,
  cf.residence_country_code AS country_code, ip.full_name, m.updated_at
  FROM greenhouse_hiring.talent_pool_membership m
  JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id = m.candidate_facet_id
  JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = cf.identity_profile_id`

export const searchTalentPool = async (input: SearchTalentPoolInput = {}): Promise<SearchTalentPoolResult> => {
  const values: unknown[] = []
  const includeSynthetic = resolveIncludeSynthetic(input.includeSynthetic)

  const where = [
    `m.lifecycle_status IN ('active_process', 'pool_eligible', 'paused')${originClause(includeSynthetic)}`
  ]

  const add = (clause: string, value: unknown) => {
    values.push(value)
    where.push(clause.replace('?', `$${values.length}`))
  }

  if (input.query) {
    const query = safeQuery(input.query)

    values.push(query)
    where.push(`(ip.full_name ILIKE ('%' || $${values.length} || '%') OR EXISTS (
      SELECT 1 FROM greenhouse_hiring.talent_pool_evidence_projection ef
       WHERE ef.membership_id = m.membership_id
         AND (ef.fresh_until IS NULL OR ef.fresh_until > NOW())
         AND (ef.capability_key ILIKE ('%' || $${values.length} || '%')
           OR ef.seniority ILIKE ('%' || $${values.length} || '%'))
    ))`)
  }

  if (input.seniority) add('cf.seniority = ?', safeFilter(input.seniority, 'seniority'))
  if (input.countryCode)
    add('cf.residence_country_code = ?', safeFilter(input.countryCode, 'countryCode').toUpperCase())
  if (input.availability) add('cf.availability = ?', safeFilter(input.availability, 'availability'))
  if (input.lifecycle?.length) add('m.lifecycle_status = ANY(?::text[])', input.lifecycle)
  if (input.capabilityKeys?.length)
    add(
      `EXISTS (SELECT 1 FROM greenhouse_hiring.talent_pool_evidence_projection ef
    WHERE ef.membership_id = m.membership_id
      AND (ef.fresh_until IS NULL OR ef.fresh_until > NOW())
      AND ef.capability_key = ANY(?::text[]))`,
      input.capabilityKeys.map(value => safeFilter(value, 'capabilityKeys'))
    )
  if (input.languageCode)
    add(
      `EXISTS (SELECT 1 FROM greenhouse_hiring.talent_pool_evidence_projection ef
    WHERE ef.membership_id = m.membership_id
      AND (ef.fresh_until IS NULL OR ef.fresh_until > NOW()) AND ef.language_code = ?)`,
      safeFilter(input.languageCode, 'languageCode')
    )
  const cursor = decodeCursor(input.cursor, input)
  const snapshotAt = cursor?.snapshotAt ?? new Date().toISOString()

  values.push(snapshotAt)
  where.push(`m.updated_at <= $${values.length}::timestamptz`)

  if (cursor) {
    values.push(cursor.updatedAt, cursor.publicId)
    where.push(`(m.updated_at, m.public_id) < ($${values.length - 1}::timestamptz, $${values.length})`)
  }

  const limit = clampLimit(input.limit)

  values.push(limit + 1)

  const rows = await runGreenhousePostgresQuery<ProfileRow>(
    `${baseSelect} WHERE ${where.join(' AND ')}
    ORDER BY m.updated_at DESC, m.public_id DESC LIMIT $${values.length}`,
    values
  )

  const page = rows.slice(0, limit)
  const evidence = await loadEvidence(page.map(row => row.public_id))

  return {
    items: page.map(row => mapProfile(row, evidence.get(row.public_id) ?? [])),
    nextCursor:
      rows.length > limit && page.length
        ? encodeCursor({
            v: CURSOR_POLICY_VERSION,
            updatedAt: iso(page.at(-1)!.updated_at),
            publicId: page.at(-1)!.public_id,
            snapshotAt,
            filterHash: filterFingerprint(input),
            bindingHash: digest(input.cursorBinding ?? 'unbound')
          })
        : null
  }
}

export const getTalentPoolProfile = async (
  talentProfileId: string,
  options: { includeSynthetic?: boolean } = {}
): Promise<TalentPoolProfileDto> => {
  const id = safeFilter(talentProfileId, 'talentProfileId')
  const includeSynthetic = resolveIncludeSynthetic(options.includeSynthetic)

  const rows = await runGreenhousePostgresQuery<ProfileRow>(
    `${baseSelect} WHERE m.public_id = $1
      AND m.lifecycle_status IN ('active_process', 'pool_eligible', 'paused')${originClause(includeSynthetic)}
      LIMIT 1`,
    [id]
  )

  if (!rows[0]) throw new HiringNotFoundError('El perfil de talento no existe.', 'talent_pool_profile_not_found')
  const evidence = await loadEvidence([id])

  return mapProfile(rows[0], evidence.get(id) ?? [])
}
