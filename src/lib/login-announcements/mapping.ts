/**
 * TASK-1963 — Fila de `greenhouse_core.login_announcements` → DTO. Puro: lo comparten reader y commands.
 */
import type { LoginAnnouncementDto, LoginAnnouncementRecord } from './types'

export type LoginAnnouncementRow = {
  announcement_id: string
  kind: LoginAnnouncementDto['kind']
  service_line: LoginAnnouncementDto['serviceLine']
  tab_label: string
  kicker: string | null
  title: string | null
  body: string | null
  cta_label: string | null
  cta_url: string | null
  image_path: string | null
  image_alt: string | null
  lens_x: string | number | null
  lens_y: string | number | null
  lens_radius_ratio: string | number | null
  priority: number
  status: LoginAnnouncementRecord['status']
  starts_at: Date | string
  ends_at: Date | string | null
  created_by: string
  updated_by: string
  created_at: Date | string
  updated_at: Date | string
}

const iso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString())

/** Postgres devuelve NUMERIC como string; la lente sólo existe si sus tres valores existen. */
export const rowToLoginAnnouncementDto = (row: LoginAnnouncementRow): LoginAnnouncementDto => ({
  id: row.announcement_id,
  kind: row.kind,
  serviceLine: row.service_line,
  tabLabel: row.tab_label,
  kicker: row.kicker,
  title: row.title,
  body: row.body,
  cta: row.cta_label && row.cta_url ? { label: row.cta_label, url: row.cta_url } : null,
  image: row.image_path && row.image_alt ? { path: row.image_path, alt: row.image_alt } : null,
  lens:
    row.lens_x !== null && row.lens_y !== null && row.lens_radius_ratio !== null
      ? { x: Number(row.lens_x), y: Number(row.lens_y), radiusRatio: Number(row.lens_radius_ratio) }
      : null
})

export const rowToLoginAnnouncementRecord = (row: LoginAnnouncementRow): LoginAnnouncementRecord => ({
  ...rowToLoginAnnouncementDto(row),
  priority: row.priority,
  status: row.status,
  startsAt: iso(row.starts_at),
  endsAt: row.ends_at === null ? null : iso(row.ends_at),
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at)
})
