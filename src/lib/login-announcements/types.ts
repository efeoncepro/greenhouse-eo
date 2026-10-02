/**
 * TASK-1963 — Novedades del login (carrusel del login V4).
 *
 * Contrato compartido entre el reader, los commands, la API y la UI. Los tipos son puros (sin `server-only`) para que
 * la vista cliente reciba el DTO tipado.
 */

export const LOGIN_ANNOUNCEMENT_KINDS = ['text', 'banner'] as const
export type LoginAnnouncementKind = (typeof LOGIN_ANNOUNCEMENT_KINDS)[number]

/** Líneas de servicio de «La órbita» más `greenhouse` para funciones del propio portal. */
export const LOGIN_ANNOUNCEMENT_SERVICE_LINES = [
  'growth',
  'brand',
  'engine',
  'voice',
  'revenue-hubspot',
  'revenue-salesforce',
  'greenhouse'
] as const
export type LoginAnnouncementServiceLine = (typeof LOGIN_ANNOUNCEMENT_SERVICE_LINES)[number]

export const LOGIN_ANNOUNCEMENT_STATUSES = ['draft', 'published', 'archived'] as const
export type LoginAnnouncementStatus = (typeof LOGIN_ANNOUNCEMENT_STATUSES)[number]

/** Máximo de novedades que el login muestra a la vez (una pestaña por novedad). */
export const LOGIN_ANNOUNCEMENT_ACTIVE_LIMIT = 3

/** Límites de longitud; espejo de los CHECK de `greenhouse_core.login_announcements`. */
export const LOGIN_ANNOUNCEMENT_LIMITS = {
  tabLabel: 24,
  kicker: 60,
  title: 80,
  body: 180,
  ctaLabel: 40,
  imageAlt: 200
} as const

export type LoginAnnouncementLens = {
  /** Centro de la lente en % del ancho del escenario (0–100). */
  x: number
  /** Centro de la lente en % del alto del escenario (0–100). */
  y: number
  /** Radio de la lente como fracción del lado corto del escenario (0–1]. */
  radiusRatio: number
}

/** DTO público: sólo campos de presentación, lo único que sale por la API pública y llega al login. */
export type LoginAnnouncementDto = {
  id: string
  kind: LoginAnnouncementKind
  serviceLine: LoginAnnouncementServiceLine
  tabLabel: string
  kicker: string | null
  title: string | null
  body: string | null
  cta: { label: string; url: string } | null
  image: { path: string; alt: string } | null
  lens: LoginAnnouncementLens | null
}

/** Registro completo para administración (API admin). */
export type LoginAnnouncementRecord = LoginAnnouncementDto & {
  priority: number
  status: LoginAnnouncementStatus
  startsAt: string
  endsAt: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

/** Entrada de creación/edición ya validada (ver `validation.ts`). */
export type LoginAnnouncementInput = {
  kind: LoginAnnouncementKind
  serviceLine: LoginAnnouncementServiceLine
  tabLabel: string
  kicker: string | null
  title: string | null
  body: string | null
  cta: { label: string; url: string } | null
  image: { path: string; alt: string } | null
  lens: LoginAnnouncementLens | null
  priority: number
  startsAt: Date | null
  endsAt: Date | null
}

export type LoginAnnouncementErrorCode = 'invalid' | 'not_found'

export class LoginAnnouncementError extends Error {
  readonly code: LoginAnnouncementErrorCode
  readonly issues: readonly string[]

  constructor(code: LoginAnnouncementErrorCode, issues: readonly string[] = []) {
    super(code === 'invalid' ? `Novedad inválida: ${issues.join(', ')}` : 'Novedad no encontrada')
    this.name = 'LoginAnnouncementError'
    this.code = code
    this.issues = issues
  }
}
