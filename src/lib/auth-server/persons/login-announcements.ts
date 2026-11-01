import { AUTH_LOGIN_STAGE_ASSETS } from '../oauth/pages/login-stage.generated'
import type { LoginAnnouncementDto, LoginAnnouncementServiceLine } from '@/lib/login-announcements/types'

/** The portal's public, presentation-only reader. The issuer never queries its database. */
const SOURCE = 'https://greenhouse.efeoncepro.com/api/public/login-announcements'
const PORTAL_ORIGIN = 'https://greenhouse.efeoncepro.com'
const TIMEOUT_MS = 600
const MAX_RESPONSE_BYTES = 16_384
// The portal reader already caches for five minutes. A short issuer cache prevents
// unauthenticated login traffic from multiplying requests to that public feed.
const ISSUER_CACHE_TTL_MS = 30_000

const SERVICE_LINES = new Set<LoginAnnouncementServiceLine>([
  'growth', 'brand', 'engine', 'voice', 'revenue-hubspot', 'revenue-salesforce', 'greenhouse'
])

const shortText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max

const optionalText = (value: unknown, max: number): value is string | null =>
  value === null || shortText(value, max)

const safeUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u001f\u007f\\]/u.test(value) ||
    !(value.startsWith('https://') || (value.startsWith('/') && !value.startsWith('//')))) return false

  try {
    const url = new URL(value, PORTAL_ORIGIN)

    return url.protocol === 'https:' && !url.username && !url.password &&
      (!value.startsWith('/') || url.origin === PORTAL_ORIGIN)
  } catch {
    return false
  }
}

const parseAnnouncement = (value: unknown): LoginAnnouncementDto | null => {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const image = item.image as Record<string, unknown> | null
  const cta = item.cta as Record<string, unknown> | null
  const lens = item.lens as Record<string, unknown> | null

  if (!shortText(item.id, 100) || (item.kind !== 'text' && item.kind !== 'banner') ||
    !SERVICE_LINES.has(item.serviceLine as LoginAnnouncementServiceLine) || !shortText(item.tabLabel, 24) ||
    !optionalText(item.kicker, 60) || !optionalText(item.title, 80) || !optionalText(item.body, 180) ||
    !image || typeof image.path !== 'string' || !Object.hasOwn(AUTH_LOGIN_STAGE_ASSETS, image.path) ||
    !shortText(image.alt, 200)) return null

  if (cta !== null && (!cta || !shortText(cta.label, 40) || !safeUrl(cta.url))) return null
  if (lens !== null && (!lens || typeof lens.x !== 'number' || !Number.isFinite(lens.x) || lens.x < 0 || lens.x > 100 ||
    typeof lens.y !== 'number' || !Number.isFinite(lens.y) || lens.y < 0 || lens.y > 100 ||
    typeof lens.radiusRatio !== 'number' || !Number.isFinite(lens.radiusRatio) || lens.radiusRatio <= 0 || lens.radiusRatio > 1)) return null

  return item as unknown as LoginAnnouncementDto
}

/** Fail visually to the approved fallback photo within a bounded time; sign-in never depends on editorial data. */
export const loadPublicLoginAnnouncements = async (
  fetcher: typeof fetch = fetch
): Promise<readonly LoginAnnouncementDto[]> => {
  try {
    const response = await fetcher(SOURCE, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error'
    })

    if (!response.ok || !response.body) return []
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let bytes = 0
    let json = ''

    for (;;) {
      const { done, value } = await reader.read()

      if (done) break

      bytes += value.byteLength

      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel()

        return []
      }

      json += decoder.decode(value, { stream: true })
    }

    json += decoder.decode()
    const body: unknown = JSON.parse(json)

    if (!body || typeof body !== 'object' || !Array.isArray((body as { announcements?: unknown }).announcements)) return []

    return ((body as { announcements: unknown[] }).announcements).slice(0, 3)
      .map(parseAnnouncement).filter((item): item is LoginAnnouncementDto => item !== null)
  } catch {
    return []
  }
}

/** Process-local, identity-free cache with one upstream request per refresh window. */
export const createCachedLoginAnnouncementsLoader = (
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now
): (() => Promise<readonly LoginAnnouncementDto[]>) => {
  let cached: { value: readonly LoginAnnouncementDto[]; expiresAt: number } | null = null
  let pending: Promise<readonly LoginAnnouncementDto[]> | null = null

  return () => {
    if (cached && now() < cached.expiresAt) return Promise.resolve(cached.value)
    if (pending) return pending

    pending = loadPublicLoginAnnouncements(fetcher)
      .then(value => {
        cached = { value, expiresAt: now() + ISSUER_CACHE_TTL_MS }

        return value
      })
      .finally(() => { pending = null })

    return pending
  }
}
