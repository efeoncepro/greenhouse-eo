import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { HIRING_PUBLIC_SENIORITIES, type HiringOpening, type PublicOpeningPayload } from '@/types/hiring'

import { isSyntheticDataOrigin } from './data-origin/contracts'
import { HiringNotFoundError, HiringValidationError } from './errors'
import { normalizePublicOpeningContent, parseRemoteEligibleCountries } from './public-careers/public-content'
import { assertPublishableOpening, requiresEditorialV2ForPublish } from './public-careers/publishability'
import { assertPublicTitleSeniorityConsistency, parseHiringPublicSeniority } from './public-seniority'

/**
 * Contrato de publicación pública del opening (TASK-353 Slice 3).
 *
 * El opening público es una **proyección allowlist derivada** del `HiringOpening` interno.
 * `buildPublicOpeningPayload` es la ÚNICA función autorizada para materializar lo que la
 * landing de careers (TASK-354) puede consumir: NUNCA incluye owner, budget/rate, risk,
 * notes internos, score, demanda madre ni cliente confidencial. Cambiar esta allowlist es
 * la única forma de exponer un campo nuevo al público.
 */
export const buildPublicOpeningPayload = (opening: HiringOpening): PublicOpeningPayload => {
  if (!opening.publicTitle?.trim()) {
    throw new HiringValidationError(
      'El opening no tiene un título público válido.',
      'hiring_opening_public_title_required',
      422
    )
  }

  const publicSeniority = parseHiringPublicSeniority(opening.publicSeniority)

  assertPublicTitleSeniorityConsistency(opening.publicTitle, publicSeniority)

  return {
    publicId: opening.publicId,
    title: opening.publicTitle.trim(),
    summary: opening.publicSummary,
    description: opening.publicDescription,
    requirements: opening.publicRequirements,
    niceToHave: opening.publicNiceToHave,
    locationMode: opening.publicLocationMode,
    workMode: opening.publicWorkMode,
    hiringRegion: opening.publicHiringRegion,
    city: opening.publicCity,
    country: opening.publicCountry,
    officeLocation: opening.publicOfficeLocation,
    area: opening.publicArea,
    skillTags: opening.publicSkillTags,
    compensationBand: opening.publicCompensationBand,
    employmentMode: opening.publicEmploymentMode,
    seniority: publicSeniority,
    processNotes: opening.publicProcessNotes,
    applyUrl: opening.applyUrl,
    publishedAt: opening.publishedAt,
    content: opening.publicContent,
    remoteEligibleCountries: opening.publicRemoteEligibleCountries
  }
}

// Columnas públicas allowlist para readers directos (no seleccionamos las internas).
const PUBLIC_OPENING_SELECT = `
  public_id, public_title, public_summary, public_description, public_requirements,
  public_nice_to_have, public_location_mode, public_work_mode, public_hiring_region, public_city,
  public_country, public_office_location, public_area, public_skill_tags, public_compensation_band,
  public_employment_mode, public_seniority,
  public_process_notes, public_content_json, public_remote_eligible_countries, apply_url, published_at`

type PublicOpeningRow = {
  public_id: unknown
  public_title: unknown
  public_summary: unknown
  public_description: unknown
  public_requirements: unknown
  public_nice_to_have: unknown
  public_location_mode: unknown
  public_work_mode: unknown
  public_hiring_region: unknown
  public_city: unknown
  public_country: unknown
  public_office_location: unknown
  public_area: unknown
  public_skill_tags: unknown
  public_compensation_band: unknown
  public_employment_mode: unknown
  public_seniority: unknown
  public_process_notes: unknown
  public_content_json: unknown
  public_remote_eligible_countries: unknown
  apply_url: unknown
  published_at: unknown
}

const str = (v: unknown): string => (v == null ? '' : String(v))
const nstr = (v: unknown): string | null => (v == null ? null : String(v))
const ts = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v))
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(item => String(item)).filter(Boolean) : [])

const normalizePublicOpeningRow = (row: PublicOpeningRow): PublicOpeningPayload | null => {
  const title = str(row.public_title).trim()

  try {
    const seniority = parseHiringPublicSeniority(row.public_seniority)

    assertPublicTitleSeniorityConsistency(title, seniority)

    return {
      publicId: str(row.public_id),
      title,
      summary: nstr(row.public_summary),
      description: nstr(row.public_description),
      requirements: nstr(row.public_requirements),
      niceToHave: nstr(row.public_nice_to_have),
      locationMode: nstr(row.public_location_mode),
      workMode: (nstr(row.public_work_mode) as PublicOpeningPayload['workMode']) ?? null,
      hiringRegion: nstr(row.public_hiring_region),
      city: nstr(row.public_city),
      country: nstr(row.public_country),
      officeLocation: nstr(row.public_office_location),
      area: nstr(row.public_area),
      skillTags: arr(row.public_skill_tags),
      compensationBand: nstr(row.public_compensation_band),
      employmentMode: nstr(row.public_employment_mode),
      seniority,
      processNotes: nstr(row.public_process_notes),
      applyUrl: nstr(row.apply_url),
      publishedAt: ts(row.published_at),
      content: normalizePublicOpeningContent(row.public_content_json),
      remoteEligibleCountries: arr(row.public_remote_eligible_countries)
    }
  } catch (error) {
    if (error instanceof HiringValidationError) return null

    throw error
  }
}

/**
 * Listado público de vacantes: SOLO openings con `publication_status = 'published'` y
 * `visibility = 'public_listed'`. Consumido por la landing de careers (TASK-354).
 */
export const listPublicOpenings = async (limit = 50, offset = 0): Promise<PublicOpeningPayload[]> => {
  const safeLimit = Math.min(Math.max(limit, 1), 200)
  const safeOffset = Math.max(offset, 0)

  const rows = await runGreenhousePostgresQuery<PublicOpeningRow>(
    `SELECT ${PUBLIC_OPENING_SELECT} FROM greenhouse_hiring.hiring_opening
     WHERE publication_status = 'published' AND visibility = 'public_listed'
       AND public_title IS NOT NULL AND btrim(public_title) <> ''
       AND public_seniority = ANY($3::text[])
     ORDER BY published_at DESC NULLS LAST LIMIT $1 OFFSET $2`,
    [safeLimit, safeOffset, HIRING_PUBLIC_SENIORITIES]
  )

  return rows.map(normalizePublicOpeningRow).filter((opening): opening is PublicOpeningPayload => opening != null)
}

/** Detalle público de una vacante por su public_id; null si no está publicada. */
export const getPublicOpeningByPublicId = async (publicId: string): Promise<PublicOpeningPayload | null> => {
  const rows = await runGreenhousePostgresQuery<PublicOpeningRow>(
    `SELECT ${PUBLIC_OPENING_SELECT} FROM greenhouse_hiring.hiring_opening
     WHERE public_id = $1 AND publication_status = 'published' AND visibility = 'public_listed'
       AND public_title IS NOT NULL AND btrim(public_title) <> ''
       AND public_seniority = ANY($2::text[]) LIMIT 1`,
    [publicId, HIRING_PUBLIC_SENIORITIES]
  )

  return rows[0] ? normalizePublicOpeningRow(rows[0]) : null
}

/**
 * TASK-1367 — Resuelve el `opening_id` INTERNO de un opening publicado a partir de su `public_id`.
 * El payload público NO expone el id interno; el apply intake lo necesita para `createHiringApplication`.
 * Aplica el MISMO gate de publicación (`published` + `public_listed`) → devuelve null si no está abierto
 * (el caller lo trata como 404 "vacante no disponible"). No expone nada más del opening.
 */
export const resolvePublishedOpeningIdByPublicId = async (publicId: string): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{
    opening_id: string
    public_title: string | null
    public_seniority: string | null
  }>(
    `SELECT opening_id, public_title, public_seniority FROM greenhouse_hiring.hiring_opening
     WHERE public_id = $1 AND publication_status = 'published' AND visibility = 'public_listed'
       AND public_seniority = ANY($2::text[]) LIMIT 1`,
    [publicId, HIRING_PUBLIC_SENIORITIES]
  )

  const row = rows[0]

  if (!row) return null

  try {
    const seniority = parseHiringPublicSeniority(row.public_seniority)

    assertPublicTitleSeniorityConsistency(row.public_title, seniority)

    return row.opening_id
  } catch (error) {
    if (error instanceof HiringValidationError) return null

    throw error
  }
}

const RETURN_OPENING = `opening_id, public_id, publication_status, visibility, status, published_at, public_title`

/**
 * Publica un opening: exige `public_title` presente (no se publica una vacante vacía), pone
 * `publication_status='published'`, `visibility='public_listed'`, `published_at=NOW()` y
 * activa el opening si estaba en draft. Emite `hiring.opening.published`.
 */
export const publishOpening = async (
  openingId: string,
  actorUserId: string | null
): Promise<{ openingId: string; publicId: string; publishedAt: string | null }> => {
  return withGreenhousePostgresTransaction(async client => {
    const current = await client.query(
      `SELECT public_title, public_summary, public_description, public_work_mode, public_hiring_region,
              public_city, public_country, public_office_location, public_area, public_skill_tags,
              public_seniority, public_content_json, public_remote_eligible_countries, publication_status,
              published_at, data_origin
       FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1 LIMIT 1`,
      [openingId]
    )

    const row = current.rows[0] as
      | {
          public_title: string | null
          public_summary: string | null
          public_description: string | null
          public_work_mode: string | null
          public_hiring_region: string | null
          public_city: string | null
          public_country: string | null
          public_office_location: string | null
          public_area: string | null
          public_skill_tags: string[] | null
          public_seniority: string | null
          public_content_json: unknown
          public_remote_eligible_countries: unknown
          publication_status: string
          published_at: Date | string | null
          data_origin: string | null
        }
      | undefined

    if (!row) throw new HiringNotFoundError('El opening no existe.', 'hiring_opening_not_found')

    // TASK-1739 Slice 2 — Una vacante que no representa un cargo real NUNCA se publica.
    //
    // Esto es la pieza PREVENTIVA del dominio, no una validación de forma. Ocho vacantes creadas
    // por un smoke (`task-1372-smoke`) llegaron a estar publicadas en el careers real; que ningún
    // candidato externo postulara a ellas fue suerte, no diseño. Y como la evidencia de identidad
    // es append-only, un candidato externo atrapado en una vacante de prueba no se puede deshacer
    // con el perfil runtime: queda pinneado por FK. Limpiar después es caro e incompleto; no
    // publicar es gratis.
    if (isSyntheticDataOrigin(row.data_origin)) {
      throw new HiringValidationError(
        'Una vacante marcada como dato no real no puede publicarse.',
        'hiring_opening_synthetic_not_publishable',
        422,
        { openingId, dataOrigin: row.data_origin }
      )
    }

    // TASK-1740/1741 — Grandfathering de vacantes ya publicadas.
    //
    // El contenido editorial v2 se exige a toda vacante que se publica POR PRIMERA VEZ: es la
    // barra de calidad del contrato nuevo. Pero exigirlo también para RE-publicar convertiría
    // una regla de autoría en una interrupción de servicio: una vacante viva —con postulantes
    // en proceso— que se pausa por cualquier motivo quedaría fuera del aire hasta reescribir
    // todo su bloque estructurado, y su URL pública respondería 404 mientras tanto.
    //
    // `published_at` es la señal honesta de "esta vacante ya estuvo al aire": sólo lo escribe
    // el publish. Una vacante nueva lo tiene en null y por lo tanto NO puede saltarse v2.
    const requireEditorialV2 = requiresEditorialV2ForPublish(row.published_at)

    assertPublishableOpening(
      {
        publicTitle: row.public_title,
        publicSummary: row.public_summary,
        publicDescription: row.public_description,
        publicWorkMode: row.public_work_mode as HiringOpening['publicWorkMode'],
        publicHiringRegion: row.public_hiring_region,
        publicCity: row.public_city,
        publicCountry: row.public_country,
        publicOfficeLocation: row.public_office_location,
        publicArea: row.public_area,
        publicSkillTags: row.public_skill_tags ?? [],
        publicSeniority: row.public_seniority,
        publicContent: normalizePublicOpeningContent(row.public_content_json),
        publicRemoteEligibleCountries: parseRemoteEligibleCountries(row.public_remote_eligible_countries)
      },
      { requireEditorialV2 }
    )

    const updated = await client.query(
      `UPDATE greenhouse_hiring.hiring_opening
       SET publication_status = 'published', visibility = 'public_listed', published_at = NOW(),
           status = CASE WHEN status = 'draft' THEN 'active' ELSE status END
       WHERE opening_id = $1 RETURNING ${RETURN_OPENING}`,
      [openingId]
    )

    const result = updated.rows[0] as { opening_id: string; public_id: string; published_at: Date | string | null }

    const publishedAt =
      result.published_at == null
        ? null
        : result.published_at instanceof Date
          ? result.published_at.toISOString()
          : String(result.published_at)

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringOpening,
        aggregateId: result.opening_id,
        eventType: EVENT_TYPES.hiringOpeningPublished,
        payload: { openingId: result.opening_id, publicId: result.public_id, actorUserId }
      },
      client
    )

    return { openingId: result.opening_id, publicId: result.public_id, publishedAt }
  })
}

/**
 * Despublica un opening: `publication_status='paused'` (o `'closed'`) y lo saca del listado
 * público (`visibility='internal_only'`). Emite `hiring.opening.unpublished`.
 */
export const unpublishOpening = async (
  openingId: string,
  actorUserId: string | null,
  mode: 'paused' | 'closed' = 'paused'
): Promise<{ openingId: string; publicId: string }> => {
  return withGreenhousePostgresTransaction(async client => {
    const updated = await client.query(
      `UPDATE greenhouse_hiring.hiring_opening
       SET publication_status = $2, visibility = 'internal_only'
       WHERE opening_id = $1 RETURNING opening_id, public_id`,
      [openingId, mode]
    )

    const result = updated.rows[0] as { opening_id: string; public_id: string } | undefined

    if (!result) throw new HiringNotFoundError('El opening no existe.', 'hiring_opening_not_found')
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringOpening,
        aggregateId: result.opening_id,
        eventType: EVENT_TYPES.hiringOpeningUnpublished,
        payload: { openingId: result.opening_id, publicId: result.public_id, mode, actorUserId }
      },
      client
    )

    return { openingId: result.opening_id, publicId: result.public_id }
  })
}
