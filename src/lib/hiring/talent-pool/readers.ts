import 'server-only'

import { Buffer } from 'node:buffer'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
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

const encodeCursor = (updatedAt: string, publicId: string) =>
  Buffer.from(JSON.stringify([updatedAt, publicId])).toString('base64url')

const decodeCursor = (cursor?: string): [string, string] | null => {
  if (!cursor) return null

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown

    if (!Array.isArray(parsed) || parsed.length !== 2 || parsed.some(value => typeof value !== 'string'))
      throw new Error('shape')

    return parsed as [string, string]
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

const baseSelect = `SELECT m.public_id, m.lifecycle_status, m.aggregate_version,
  m.future_consent_expires_at, cf.availability, cf.seniority,
  cf.residence_country_code AS country_code, ip.full_name, m.updated_at
  FROM greenhouse_hiring.talent_pool_membership m
  JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id = m.candidate_facet_id
  JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = cf.identity_profile_id`

export const searchTalentPool = async (input: SearchTalentPoolInput = {}): Promise<SearchTalentPoolResult> => {
  const values: unknown[] = []
  const where = [`m.lifecycle_status NOT IN ('withdrawn', 'expired')`]

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
    WHERE ef.membership_id = m.membership_id AND ef.capability_key = ANY(?::text[]))`,
      input.capabilityKeys.map(value => safeFilter(value, 'capabilityKeys'))
    )
  if (input.languageCode)
    add(
      `EXISTS (SELECT 1 FROM greenhouse_hiring.talent_pool_evidence_projection ef
    WHERE ef.membership_id = m.membership_id AND ef.language_code = ?)`,
      safeFilter(input.languageCode, 'languageCode')
    )
  const cursor = decodeCursor(input.cursor)

  if (cursor) {
    values.push(cursor[0], cursor[1])
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
      rows.length > limit && page.length ? encodeCursor(iso(page.at(-1)!.updated_at), page.at(-1)!.public_id) : null
  }
}

export const getTalentPoolProfile = async (talentProfileId: string): Promise<TalentPoolProfileDto> => {
  const id = safeFilter(talentProfileId, 'talentProfileId')
  const rows = await runGreenhousePostgresQuery<ProfileRow>(`${baseSelect} WHERE m.public_id = $1 LIMIT 1`, [id])

  if (!rows[0]) throw new HiringNotFoundError('El perfil de talento no existe.', 'talent_pool_profile_not_found')
  const evidence = await loadEvidence([id])

  return mapProfile(rows[0], evidence.get(id) ?? [])
}
