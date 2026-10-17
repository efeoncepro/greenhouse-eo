/** Browser-safe consent/context only. Contact values never enter telemetry. */
export interface GoogleMeasurementConsent {
  adStorage: 'granted' | 'denied'
  adUserData: 'granted' | 'denied'
  adPersonalization: 'granted' | 'denied'
  analyticsStorage: 'granted' | 'denied'
}

export interface GoogleClickContext {
  source: 'landing_query'
  capturedAt: string
  gclid?: string
  gbraid?: string
  wbraid?: string
}

export const readGoogleMeasurementConsent = (win: Window): GoogleMeasurementConsent | undefined => {
  const attributes = ['ad-storage', 'ad-user-data', 'ad-personalization', 'analytics-storage']
  const values = attributes.map(key => win.document.documentElement.getAttribute(`data-efeonce-google-${key}`))

  if (!values.every(value => value === 'granted' || value === 'denied')) return undefined

  return {
    adStorage: values[0] as GoogleMeasurementConsent['adStorage'],
    adUserData: values[1] as GoogleMeasurementConsent['adUserData'],
    adPersonalization: values[2] as GoogleMeasurementConsent['adPersonalization'],
    analyticsStorage: values[3] as GoogleMeasurementConsent['analyticsStorage'],
  }
}

const readGoogleClick = (win: Window): GoogleClickContext | undefined => {
  const value = (win as Window & { efeonceReadGoogleAdsAttribution?: () => unknown }).efeonceReadGoogleAdsAttribution?.()

  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const observed = typeof record.capturedAt === 'string' ? Date.parse(record.capturedAt) : NaN

  if (record.source !== 'landing_query' || !Number.isFinite(observed) || observed > Date.now() || Date.now() - observed > 30 * 86400_000) return undefined
  const ids: Pick<GoogleClickContext, 'gclid' | 'gbraid' | 'wbraid'> = {}

  for (const key of ['gclid', 'gbraid', 'wbraid'] as const) {
    const id = record[key]

    if (typeof id === 'string' && /^[A-Za-z0-9._~-]{1,512}$/.test(id)) ids[key] = id
  }

  return Object.keys(ids).length ? { source: 'landing_query', capturedAt: new Date(observed).toISOString(), ...ids } : undefined
}

export interface PublicMeasurementContext {
  source: 'hubspot_categories'
  policyVersion: 'efeonce-categories-2026-10-13'
  capturedAt: string
  advertisement: boolean
  analytics: boolean
  globalPrivacyControl: boolean
  clientId?: string
  fbp?: string
  fbc?: string
  googleConsent?: GoogleMeasurementConsent
  googleClick?: GoogleClickContext
}

export const readPublicMeasurementContext = (
  win: Window | undefined = typeof window === 'undefined' ? undefined : window,
): PublicMeasurementContext | undefined => {
  if (!win || !/^(efeoncepro\.com|think\.efeoncepro\.com)$/.test(win.location.hostname)) return undefined

  const ads = win.document.documentElement.getAttribute('data-efeonce-ads-consent')
  const analytics = win.document.documentElement.getAttribute('data-efeonce-analytics-consent')

  if (!['granted', 'denied'].includes(ads ?? '') || !['granted', 'denied'].includes(analytics ?? '')) return undefined

  const gpc = (win.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true

  const context: PublicMeasurementContext = {
    source: 'hubspot_categories', policyVersion: 'efeonce-categories-2026-10-13',
    capturedAt: new Date().toISOString(), advertisement: ads === 'granted' && !gpc,
    analytics: analytics === 'granted', globalPrivacyControl: gpc,
  }

  const googleConsent = readGoogleMeasurementConsent(win)

  if (googleConsent) context.googleConsent = googleConsent

  if (context.advertisement && googleConsent?.adStorage === 'granted' &&
      googleConsent.adUserData === 'granted' && googleConsent.adPersonalization === 'granted') {
    try { context.googleClick = readGoogleClick(win) } catch { /* Optional instrumentation cannot prevent submission. */ }
  }

  const cookie = (key: string): string | undefined => {
    try {
      const value = win.document.cookie.split(';').map(item => item.trim()).find(item => item.startsWith(`${key}=`))

      return value ? decodeURIComponent(value.slice(key.length + 1)) : undefined
    } catch { return undefined }
  }

  if (context.analytics) {
    const match = cookie('_ga')?.match(/^GA\d+\.\d+\.(\d+\.\d+)$/)

    if (match) context.clientId = match[1]
  }

  if (context.advertisement) {
    const attribution = (win as Window & { efeonceReadMetaAttribution?: () => { fbp?: string; fbc?: string } }).efeonceReadMetaAttribution?.()
    const fbp = attribution?.fbp || cookie('_fbp')
    const fbc = attribution?.fbc || cookie('_fbc')
    const fbclid = new URL(win.location.href).searchParams.get('fbclid')

    if (fbp && /^fb\.\d+\.\d{13}\.\d{1,20}$/.test(fbp)) context.fbp = fbp
    if (fbc && /^fb\.\d+\.\d{13}\.[A-Za-z0-9._~-]{1,512}$/.test(fbc)) context.fbc = fbc
    else if (fbclid && /^[A-Za-z0-9._~-]{1,512}$/.test(fbclid)) context.fbc = `fb.1.${Date.now()}.${fbclid}`
  }

  return context
}
