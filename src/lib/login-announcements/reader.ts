import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import { rowToLoginAnnouncementDto, rowToLoginAnnouncementRecord, type LoginAnnouncementRow } from './mapping'
import { LOGIN_ANNOUNCEMENT_ACTIVE_LIMIT, type LoginAnnouncementDto, type LoginAnnouncementRecord } from './types'

const COLUMNS = `announcement_id, kind, service_line, tab_label, kicker, title, body, cta_label, cta_url, image_path,
  image_alt, lens_x, lens_y, lens_radius_ratio, priority, status, starts_at, ends_at, created_by, updated_by,
  created_at, updated_at`

/**
 * TASK-1963 — Novedades publicadas y vigentes para el login (y para `GET /api/public/login-announcements`).
 *
 * Nunca rompe el login: ante cualquier error de base de datos registra el error y devuelve `[]`, y el escenario del
 * login cae a su foto por defecto.
 */
export const listActiveLoginAnnouncements = async (
  limit: number = LOGIN_ANNOUNCEMENT_ACTIVE_LIMIT
): Promise<LoginAnnouncementDto[]> => {
  const bounded = Math.min(Math.max(Math.trunc(limit), 1), LOGIN_ANNOUNCEMENT_ACTIVE_LIMIT)

  try {
    const rows = await query<LoginAnnouncementRow>(
      `SELECT ${COLUMNS}
         FROM greenhouse_core.login_announcements
        WHERE status = 'published'
          AND starts_at <= NOW()
          AND (ends_at IS NULL OR ends_at > NOW())
        ORDER BY priority DESC, starts_at DESC
        LIMIT $1`,
      [bounded]
    )

    return rows.map(rowToLoginAnnouncementDto)
  } catch (error) {
    captureWithDomain(error, 'platform', { level: 'warning', tags: { surface: 'login-announcements', task: 'TASK-1963' } })

    return []
  }
}

/** TASK-1963 — Todas las novedades (cualquier estado) para la API admin, más recientes primero. */
export const listLoginAnnouncementsForAdmin = async (): Promise<LoginAnnouncementRecord[]> => {
  const rows = await query<LoginAnnouncementRow>(
    `SELECT ${COLUMNS} FROM greenhouse_core.login_announcements ORDER BY updated_at DESC LIMIT 200`
  )

  return rows.map(rowToLoginAnnouncementRecord)
}

export const LOGIN_ANNOUNCEMENT_COLUMNS = COLUMNS
