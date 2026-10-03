import 'server-only'

import { query } from '@/lib/db'

import { rowToLoginAnnouncementRecord, type LoginAnnouncementRow } from './mapping'
import { LOGIN_ANNOUNCEMENT_COLUMNS } from './reader'
import { LoginAnnouncementError, type LoginAnnouncementRecord, type LoginAnnouncementStatus } from './types'
import { isLoginAnnouncementStatus, parseLoginAnnouncementInput } from './validation'

/**
 * TASK-1963 — Commands de las novedades del login. Toda escritura pasa por aquí (UI de administración futura, API
 * admin y Nexa vía `propose → confirm → execute`); la autorización la resuelve el caller con
 * `login_announcements.manage` antes de llamar.
 */

const valuesOf = (input: ReturnType<typeof parseLoginAnnouncementInput>) => [
  input.kind,
  input.serviceLine,
  input.tabLabel,
  input.kicker,
  input.title,
  input.body,
  input.cta?.label ?? null,
  input.cta?.url ?? null,
  input.image?.path ?? null,
  input.image?.alt ?? null,
  input.lens?.x ?? null,
  input.lens?.y ?? null,
  input.lens?.radiusRatio ?? null,
  input.priority,
  input.startsAt,
  input.endsAt
]

/** Crea una novedad en `draft`. Publicarla es un paso explícito (`setLoginAnnouncementStatus`). */
export const createLoginAnnouncement = async (raw: unknown, actorId: string): Promise<LoginAnnouncementRecord> => {
  const input = parseLoginAnnouncementInput(raw)

  const rows = await query<LoginAnnouncementRow>(
    `INSERT INTO greenhouse_core.login_announcements
       (kind, service_line, tab_label, kicker, title, body, cta_label, cta_url, image_path, image_alt,
        lens_x, lens_y, lens_radius_ratio, priority, starts_at, ends_at, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, NOW()), $16, 'draft', $17, $17)
     RETURNING ${LOGIN_ANNOUNCEMENT_COLUMNS}`,
    [...valuesOf(input), actorId]
  )

  return rowToLoginAnnouncementRecord(rows[0])
}

/** Reemplaza el contenido de una novedad (no cambia su estado). */
export const updateLoginAnnouncement = async (
  announcementId: string,
  raw: unknown,
  actorId: string
): Promise<LoginAnnouncementRecord> => {
  const input = parseLoginAnnouncementInput(raw)

  const rows = await query<LoginAnnouncementRow>(
    `UPDATE greenhouse_core.login_announcements
        SET kind = $1, service_line = $2, tab_label = $3, kicker = $4, title = $5, body = $6, cta_label = $7,
            cta_url = $8, image_path = $9, image_alt = $10, lens_x = $11, lens_y = $12, lens_radius_ratio = $13,
            priority = $14, starts_at = COALESCE($15, starts_at), ends_at = $16, updated_by = $17, updated_at = NOW()
      WHERE announcement_id = $18
      RETURNING ${LOGIN_ANNOUNCEMENT_COLUMNS}`,
    [...valuesOf(input), actorId, announcementId]
  )

  if (rows.length === 0) throw new LoginAnnouncementError('not_found')

  return rowToLoginAnnouncementRecord(rows[0])
}

/** Publica, devuelve a borrador o archiva. Idempotente: repetir el mismo estado no falla. */
export const setLoginAnnouncementStatus = async (
  announcementId: string,
  status: unknown,
  actorId: string
): Promise<LoginAnnouncementRecord> => {
  if (!isLoginAnnouncementStatus(status)) throw new LoginAnnouncementError('invalid', ['status_invalid'])

  const rows = await query<LoginAnnouncementRow>(
    `UPDATE greenhouse_core.login_announcements
        SET status = $1, updated_by = $2, updated_at = CASE WHEN status = $1 THEN updated_at ELSE NOW() END
      WHERE announcement_id = $3
      RETURNING ${LOGIN_ANNOUNCEMENT_COLUMNS}`,
    [status satisfies LoginAnnouncementStatus, actorId, announcementId]
  )

  if (rows.length === 0) throw new LoginAnnouncementError('not_found')

  return rowToLoginAnnouncementRecord(rows[0])
}
