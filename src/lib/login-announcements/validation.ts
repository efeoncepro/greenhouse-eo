/**
 * TASK-1963 — Validación pura de las novedades del login. Sin I/O: la usan los commands y los tests.
 * Espejo de los CHECK de la tabla, para responder `invalid_request` antes de llegar a la base de datos.
 */
import {
  LOGIN_ANNOUNCEMENT_KINDS,
  LOGIN_ANNOUNCEMENT_LIMITS,
  LOGIN_ANNOUNCEMENT_SERVICE_LINES,
  LOGIN_ANNOUNCEMENT_STATUSES,
  LoginAnnouncementError,
  type LoginAnnouncementInput,
  type LoginAnnouncementKind,
  type LoginAnnouncementServiceLine,
  type LoginAnnouncementStatus
} from './types'

const SAFE_URL = /^(\/[^/]|https:\/\/)/

/** Una URL es segura si es una ruta relativa del portal (`/…`, nunca `//`) o `https://`. */
export const isSafeAnnouncementUrl = (value: string): boolean => SAFE_URL.test(value)

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

const date = (value: unknown, field: string, issues: string[]): Date | null => {
  if (value === undefined || value === null || value === '') return null
  const parsed = new Date(String(value))

  if (Number.isNaN(parsed.getTime())) issues.push(`${field}_invalid`)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const within = (value: string | null, max: number, field: string, issues: string[]) => {
  if (value !== null && value.length > max) issues.push(`${field}_too_long`)
}

export const isLoginAnnouncementStatus = (value: unknown): value is LoginAnnouncementStatus =>
  typeof value === 'string' && (LOGIN_ANNOUNCEMENT_STATUSES as readonly string[]).includes(value)

/**
 * Normaliza y valida una novedad completa. Lanza `LoginAnnouncementError('invalid', issues)` con todos los problemas
 * encontrados (no sólo el primero), para que quien la crea —persona, UI o Nexa— pueda corregir todo de una vez.
 */
export const parseLoginAnnouncementInput = (raw: unknown): LoginAnnouncementInput => {
  const issues: string[] = []

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new LoginAnnouncementError('invalid', ['body_invalid'])
  const body = raw as Record<string, unknown>

  const kind = body.kind as LoginAnnouncementKind

  if (!(LOGIN_ANNOUNCEMENT_KINDS as readonly string[]).includes(String(body.kind))) issues.push('kind_invalid')

  const serviceLine = body.serviceLine as LoginAnnouncementServiceLine

  if (!(LOGIN_ANNOUNCEMENT_SERVICE_LINES as readonly string[]).includes(String(body.serviceLine)))
    issues.push('service_line_invalid')

  const tabLabel = text(body.tabLabel)

  if (!tabLabel) issues.push('tab_label_required')
  within(tabLabel, LOGIN_ANNOUNCEMENT_LIMITS.tabLabel, 'tab_label', issues)

  const kicker = text(body.kicker)
  const title = text(body.title)
  const description = text(body.body)

  within(kicker, LOGIN_ANNOUNCEMENT_LIMITS.kicker, 'kicker', issues)
  within(title, LOGIN_ANNOUNCEMENT_LIMITS.title, 'title', issues)
  within(description, LOGIN_ANNOUNCEMENT_LIMITS.body, 'body', issues)
  if (kind === 'text' && !title) issues.push('title_required')

  const ctaRaw = body.cta && typeof body.cta === 'object' ? (body.cta as Record<string, unknown>) : null
  const ctaLabel = text(ctaRaw?.label)
  const ctaUrl = text(ctaRaw?.url)

  if ((ctaLabel === null) !== (ctaUrl === null)) issues.push('cta_incomplete')
  within(ctaLabel, LOGIN_ANNOUNCEMENT_LIMITS.ctaLabel, 'cta_label', issues)
  if (ctaUrl && !isSafeAnnouncementUrl(ctaUrl)) issues.push('cta_url_unsafe')

  const imageRaw = body.image && typeof body.image === 'object' ? (body.image as Record<string, unknown>) : null
  const imagePath = text(imageRaw?.path)
  const imageAlt = text(imageRaw?.alt)

  if (imagePath && !isSafeAnnouncementUrl(imagePath)) issues.push('image_path_unsafe')
  if (imagePath && !imageAlt) issues.push('image_alt_required')
  within(imageAlt, LOGIN_ANNOUNCEMENT_LIMITS.imageAlt, 'image_alt', issues)
  if (kind === 'banner' && !imagePath) issues.push('banner_image_required')

  const lensRaw = body.lens && typeof body.lens === 'object' ? (body.lens as Record<string, unknown>) : null
  let lens: LoginAnnouncementInput['lens'] = null

  if (lensRaw) {
    const x = Number(lensRaw.x)
    const y = Number(lensRaw.y)
    const radiusRatio = Number(lensRaw.radiusRatio)

    if (!(x >= 0 && x <= 100) || !(y >= 0 && y <= 100) || !(radiusRatio > 0 && radiusRatio <= 1)) issues.push('lens_invalid')
    else lens = { x, y, radiusRatio }
  }

  const priority = body.priority === undefined ? 0 : Number(body.priority)

  if (!Number.isInteger(priority)) issues.push('priority_invalid')

  const startsAt = date(body.startsAt, 'starts_at', issues)
  const endsAt = date(body.endsAt, 'ends_at', issues)

  if (endsAt && endsAt.getTime() <= (startsAt ?? new Date()).getTime()) issues.push('window_invalid')

  if (issues.length > 0) throw new LoginAnnouncementError('invalid', issues)

  return {
    kind,
    serviceLine,
    tabLabel: tabLabel as string,
    kicker,
    title,
    body: description,
    cta: ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl } : null,
    image: imagePath && imageAlt ? { path: imagePath, alt: imageAlt } : null,
    lens,
    priority,
    startsAt,
    endsAt
  }
}
