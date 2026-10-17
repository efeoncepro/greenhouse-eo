import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'

import { measurementPolicyConfigSchema, type MeasurementPolicyRevision } from './policy-contract'

import { publicMeasurementContextSchema, type MatchingContact, type MeasurementScope } from './contracts'
import { googleAdsConversionReceiptSchema } from './google-ads-receipt'

const HOSTS = new Set(['efeoncepro.com', 'think.efeoncepro.com'])
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : ''

const email = (value: unknown): string | undefined => {
  const normalized = text(value).toLowerCase().replace(/\s/g, '')

  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : undefined
}

const phone = (value: unknown): string | undefined => {
  const normalized = text(value).replace(/[\s().-]/g, '')

  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : undefined
}

const metaName = (value: unknown): string | undefined => {
  // Meta capi-param-builder string normalization; plain hex, without its appendix.
  const normalized = text(value).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\p{Z}\s]/gu, '')

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
      // A contact email is available before asynchronous CRM delivery; never use a submission ID.
      ...(em || ph ? { 'x-fb-ud-external_id': sha256(em || ph!.slice(1)) } : {}),
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
  policy?: MeasurementPolicyRevision
  measurementContext: unknown
  ip?: string | null
  userAgent?: string | null
  requestGlobalPrivacyControl?: boolean
  googleAdsEnabled?: boolean
  now?: Date
  eventId?: string
}) => {
  const now = input.now ?? new Date()
  const parsed = publicMeasurementContextSchema.safeParse(input.measurementContext)

  if (input.requestGlobalPrivacyControl || !parsed.success || !parsed.data.advertisement || parsed.data.globalPrivacyControl) return null
  const consent = parsed.data

  if (Math.abs(now.getTime() - Date.parse(consent.capturedAt)) > 10 * 60_000) return null
  const scope = input.scope

  const policy = input.policy
  const config = measurementPolicyConfigSchema.safeParse(policy?.config)

  if (!policy || !config.success || policy.state !== 'published' || policy.publishedRevisionId !== policy.revisionId ||
      policy.scope.sourceKind !== scope.sourceKind || policy.scope.sourceKey !== scope.sourceKey ||
      policy.scope.surfaceId !== scope.surfaceId || policy.config.sourceVersion !== scope.sourceVersion ||
      !policy.config.origins.some(origin => origin === scope.origin)) return null
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
    schema_version: 2,
    measurement_policy: {
      policy_id: policy.policyId, revision_id: policy.revisionId, revision: policy.revision,
      source_kind: scope.sourceKind, source_key: policy.scope.sourceKey, source_version: policy.config.sourceVersion,
      surface_id: scope.surfaceId, purpose: 'commercial_lead',
    },
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

  const google = policy.config.destinations.includes('google_upd') && consent.analytics && consent.clientId ? {
    client_id: consent.clientId,
    user_data: matches.google,
    consent: { ad_user_data: 'GRANTED', ad_personalization: 'GRANTED' },
    // Intentionally no events: the browser owns the GA4 generate_lead mirror.
  } : null

  const googleAdsConfig = config.data.googleAds
  const googleConsent = consent.googleConsent

  const adsAuthorized = input.googleAdsEnabled === true && googleAdsConfig && consent.analytics && googleConsent &&
    Object.values(googleConsent).every(value => value === 'granted') &&
    Date.parse(googleAdsConfig.activationAt) <= now.getTime() &&
    googleAdsConfig.conversionKey === (scope.sourceKind === 'meeting_booking' ? 'meeting_booking' : 'commercial_lead')

  const googleAdsConversion = adsAuthorized ? googleAdsConversionReceiptSchema.parse({
    version: 1, transactionId: eventId, conversionKey: googleAdsConfig.conversionKey,
    issuedAt: occurredAt, expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
    ...(googleAdsConfig.enhancedConversions ? { userData: {
      ...(matches.google.sha256_email_address ? { sha256_email_address: matches.google.sha256_email_address[0] } : {}),
      ...(matches.google.sha256_phone_number ? { sha256_phone_number: matches.google.sha256_phone_number[0] } : {}),
    } } : {}),
  }) : undefined

  const click = consent.googleClick

  const googleAds = googleAdsConversion ? {
    ...googleAdsConversion, consent: googleConsent,
    ...(click && now.getTime() - Date.parse(click.capturedAt) <= 30 * 24 * 60 * 60_000 && Date.parse(click.capturedAt) <= now.getTime()
      ? { click } : {}),
  } : null

  return { eventId, occurredAt, consent, meta, google, googleAds, googleAdsConversion }
}
