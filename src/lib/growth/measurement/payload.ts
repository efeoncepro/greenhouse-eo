import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'

import { publicMeasurementContextSchema, type MatchingContact, type MeasurementScope } from './contracts'

const COMMERCIAL_FORMS = new Set([
  'efeonce-aeo-diagnostic', 'efeonce-seo-diagnostic', 'efeonce-desarrollo-web-cotizacion',
  'efeonce-lead-gen-web', 'efeonce-social-audit', 'ai-visibility-grader',
])

const HOSTS = new Set(['efeoncepro.com', 'think.efeoncepro.com'])
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : ''

const email = (value: unknown): string | undefined => {
  const normalized = text(value).toLowerCase()

  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : undefined
}

const phone = (value: unknown): string | undefined => {
  const normalized = text(value).replace(/[\s().-]/g, '')

  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : undefined
}

const metaName = (value: unknown): string | undefined => {
  // Meta capi-param-builder string normalization; plain hex, without its appendix.
  const normalized = text(value).toLowerCase().replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, '')

  return normalized && normalized.length <= 160 ? normalized : undefined
}

export const buildMatchingData = (contact: MatchingContact) => {
  const em = email(contact.email)
  const ph = phone(contact.phone)
  const fn = metaName(contact.firstName)
  const ln = metaName(contact.lastName)
  const googleEmail = em?.replace(/\s/g, '').replace(/^(.*?)@(gmail\.com|googlemail\.com)$/, (_, local, domain) => `${local.replace(/\./g, '')}@${domain}`)

  return {
    meta: {
      ...(em ? { 'x-fb-ud-em': sha256(em) } : {}),
      ...(ph ? { 'x-fb-ud-ph': sha256(ph.slice(1)) } : {}),
      ...(fn ? { 'x-fb-ud-fn': sha256(fn) } : {}),
      ...(ln ? { 'x-fb-ud-ln': sha256(ln) } : {}),
    },
    google: {
      ...(googleEmail ? { sha256_email_address: [sha256(googleEmail)] } : {}),
      ...(ph ? { sha256_phone_number: [sha256(ph)] } : {}),
    },
    hasIdentity: Boolean(em || ph),
  }
}

export const safeMeasurementUrl = (origin: string | null, pageUri?: string | null): string | null => {
  try {
    if (!origin) return null
    const host = new URL(origin)
    const url = new URL(pageUri || '/', host)

    if (host.protocol !== 'https:' || !HOSTS.has(host.hostname) || host.port || host.username || host.password ||
      url.origin !== host.origin || url.username || url.password) return null

    // Personal/tokenized paths are not advertising surfaces, even after query stripping.
    if (!/^\/[A-Za-z0-9/_-]*$/.test(url.pathname) || /\/(?:shared|report|api|assets|status|token)(?:\/|$)/i.test(url.pathname)) return null

    return `${host.origin}${url.pathname}`
  } catch { return null }
}

export const buildMeasurementPayloads = (input: {
  scope: MeasurementScope
  contact: MatchingContact
  measurementContext: unknown
  ip?: string | null
  userAgent?: string | null
  requestGlobalPrivacyControl?: boolean
  now?: Date
  eventId?: string
}) => {
  const now = input.now ?? new Date()
  const parsed = publicMeasurementContextSchema.safeParse(input.measurementContext)

  if (input.requestGlobalPrivacyControl || !parsed.success || !parsed.data.advertisement || parsed.data.globalPrivacyControl) return null
  const consent = parsed.data

  if (Math.abs(now.getTime() - Date.parse(consent.capturedAt)) > 10 * 60_000) return null
  const scope = input.scope

  if (scope.sourceKind === 'form_submission' && (!scope.formSlug || !COMMERCIAL_FORMS.has(scope.formSlug))) return null
  if (scope.sourceKind === 'meeting_booking' && (scope.schedulerKey !== 'efeonce-discovery-30' || scope.surfaceId !== 'fhsf-efeonce-lead-gen-web')) return null
  const pageLocation = safeMeasurementUrl(scope.origin, scope.pageUri)

  if (!pageLocation || !scope.surfaceId) return null
  const matches = buildMatchingData(input.contact)

  if (!matches.hasIdentity) return null
  const eventId = input.eventId ?? randomUUID()

  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(eventId)) return null
  const occurredAt = now.toISOString()

  const classification = {
    lead_source: scope.sourceKind === 'form_submission' ? 'growth_form' : 'meeting_booking',
    surface_id: scope.surfaceId,
    ...(scope.formSlug ? { form_slug: scope.formSlug } : {}),
    ...(scope.schedulerKey ? { scheduler_key: scope.schedulerKey } : {}),
  }

  const meta = {
    schema_version: 1,
    event_name: 'generate_lead', event_id: eventId,
    event_time: Math.floor(now.getTime() / 1000),
    action_source: 'website', page_location: pageLocation,
    meta_ads_consent: 'granted', backend_verified: '1',
    ...matches.meta,
    ...(input.ip && isIP(input.ip) ? { ip_override: input.ip } : {}),
    ...(input.userAgent && input.userAgent.length <= 1024 ? { user_agent: input.userAgent } : {}),
    ...(consent.fbp ? { 'x-fb-ck-fbp': consent.fbp } : {}),
    ...(consent.fbc ? { 'x-fb-ck-fbc': consent.fbc } : {}),
    // Pinned Meta template calls indexOf before parsing: this must be a JSON string.
    custom_properties: JSON.stringify(classification),
  }

  const google = consent.analytics && consent.clientId ? {
    client_id: consent.clientId,
    user_data: matches.google,
    consent: { ad_user_data: 'GRANTED', ad_personalization: 'GRANTED' },
    // Intentionally no events: the browser owns the GA4 generate_lead mirror.
  } : null

  return { eventId, occurredAt, consent, meta, google }
}
