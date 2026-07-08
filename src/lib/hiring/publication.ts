import 'server-only'

import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction,
} from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { HiringOpening, PublicOpeningPayload } from '@/types/hiring'

import { HiringNotFoundError, HiringValidationError } from './errors'

/**
 * Contrato de publicación pública del opening (TASK-353 Slice 3).
 *
 * El opening público es una **proyección allowlist derivada** del `HiringOpening` interno.
 * `buildPublicOpeningPayload` es la ÚNICA función autorizada para materializar lo que la
 * landing de careers (TASK-354) puede consumir: NUNCA incluye owner, budget/rate, risk,
 * notes internos, score, demanda madre ni cliente confidencial. Cambiar esta allowlist es
 * la única forma de exponer un campo nuevo al público.
 */
export const buildPublicOpeningPayload = (opening: HiringOpening): PublicOpeningPayload => ({
  publicId: opening.publicId,
  title: opening.publicTitle ?? opening.internalTitle,
  summary: opening.publicSummary,
  description: opening.publicDescription,
  requirements: opening.publicRequirements,
  niceToHave: opening.publicNiceToHave,
  locationMode: opening.publicLocationMode,
  employmentMode: opening.publicEmploymentMode,
  seniority: opening.publicSeniority ?? opening.seniority,
  processNotes: opening.publicProcessNotes,
  applyUrl: opening.applyUrl,
  publishedAt: opening.publishedAt,
})

// Columnas públicas allowlist para readers directos (no seleccionamos las internas).
const PUBLIC_OPENING_SELECT = `
  public_id, public_title, internal_title, public_summary, public_description, public_requirements,
  public_nice_to_have, public_location_mode, public_employment_mode, public_seniority, seniority,
  public_process_notes, apply_url, published_at`

type PublicOpeningRow = {
  public_id: unknown
  public_title: unknown
  internal_title: unknown
  public_summary: unknown
  public_description: unknown
  public_requirements: unknown
  public_nice_to_have: unknown
  public_location_mode: unknown
  public_employment_mode: unknown
  public_seniority: unknown
  seniority: unknown
  public_process_notes: unknown
  apply_url: unknown
  published_at: unknown
}

const str = (v: unknown): string => (v == null ? '' : String(v))
const nstr = (v: unknown): string | null => (v == null ? null : String(v))
const ts = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v))

const normalizePublicOpeningRow = (row: PublicOpeningRow): PublicOpeningPayload => ({
  publicId: str(row.public_id),
  title: nstr(row.public_title) ?? str(row.internal_title),
  summary: nstr(row.public_summary),
  description: nstr(row.public_description),
  requirements: nstr(row.public_requirements),
  niceToHave: nstr(row.public_nice_to_have),
  locationMode: nstr(row.public_location_mode),
  employmentMode: nstr(row.public_employment_mode),
  seniority: nstr(row.public_seniority) ?? nstr(row.seniority),
  processNotes: nstr(row.public_process_notes),
  applyUrl: nstr(row.apply_url),
  publishedAt: ts(row.published_at),
})

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
     ORDER BY published_at DESC NULLS LAST LIMIT $1 OFFSET $2`,
    [safeLimit, safeOffset],
  )

  
return rows.map(normalizePublicOpeningRow)
}

/** Detalle público de una vacante por su public_id; null si no está publicada. */
export const getPublicOpeningByPublicId = async (publicId: string): Promise<PublicOpeningPayload | null> => {
  const rows = await runGreenhousePostgresQuery<PublicOpeningRow>(
    `SELECT ${PUBLIC_OPENING_SELECT} FROM greenhouse_hiring.hiring_opening
     WHERE public_id = $1 AND publication_status = 'published' AND visibility = 'public_listed' LIMIT 1`,
    [publicId],
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
  const rows = await runGreenhousePostgresQuery<{ opening_id: string }>(
    `SELECT opening_id FROM greenhouse_hiring.hiring_opening
     WHERE public_id = $1 AND publication_status = 'published' AND visibility = 'public_listed' LIMIT 1`,
    [publicId],
  )


return rows[0]?.opening_id ?? null
}

const RETURN_OPENING = `opening_id, public_id, publication_status, visibility, status, published_at, public_title`

/**
 * Publica un opening: exige `public_title` presente (no se publica una vacante vacía), pone
 * `publication_status='published'`, `visibility='public_listed'`, `published_at=NOW()` y
 * activa el opening si estaba en draft. Emite `hiring.opening.published`.
 */
export const publishOpening = async (
  openingId: string,
  actorUserId: string | null,
): Promise<{ openingId: string; publicId: string; publishedAt: string | null }> => {
  return withGreenhousePostgresTransaction(async (client) => {
    const current = await client.query(
      `SELECT public_title, publication_status FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1 LIMIT 1`,
      [openingId],
    )

    const row = current.rows[0] as { public_title: string | null; publication_status: string } | undefined

    if (!row) throw new HiringNotFoundError('El opening no existe.', 'hiring_opening_not_found')

    if (!row.public_title || row.public_title.trim().length === 0) {
      throw new HiringValidationError(
        'No se puede publicar un opening sin título público. Completa el payload público primero.',
        'hiring_opening_missing_public_copy',
        422,
      )
    }

    const updated = await client.query(
      `UPDATE greenhouse_hiring.hiring_opening
       SET publication_status = 'published', visibility = 'public_listed', published_at = NOW(),
           status = CASE WHEN status = 'draft' THEN 'active' ELSE status END
       WHERE opening_id = $1 RETURNING ${RETURN_OPENING}`,
      [openingId],
    )

    const result = updated.rows[0] as { opening_id: string; public_id: string; published_at: Date | string | null }
    const publishedAt = result.published_at == null ? null : result.published_at instanceof Date ? result.published_at.toISOString() : String(result.published_at)

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringOpening,
        aggregateId: result.opening_id,
        eventType: EVENT_TYPES.hiringOpeningPublished,
        payload: { openingId: result.opening_id, publicId: result.public_id, actorUserId },
      },
      client,
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
  mode: 'paused' | 'closed' = 'paused',
): Promise<{ openingId: string; publicId: string }> => {
  return withGreenhousePostgresTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE greenhouse_hiring.hiring_opening
       SET publication_status = $2, visibility = 'internal_only'
       WHERE opening_id = $1 RETURNING opening_id, public_id`,
      [openingId, mode],
    )

    const result = updated.rows[0] as { opening_id: string; public_id: string } | undefined

    if (!result) throw new HiringNotFoundError('El opening no existe.', 'hiring_opening_not_found')
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringOpening,
        aggregateId: result.opening_id,
        eventType: EVENT_TYPES.hiringOpeningUnpublished,
        payload: { openingId: result.opening_id, publicId: result.public_id, mode, actorUserId },
      },
      client,
    )
    
return { openingId: result.opening_id, publicId: result.public_id }
  })
}
