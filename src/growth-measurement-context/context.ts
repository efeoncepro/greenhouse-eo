/** Browser-safe consent/context only. Contact values never enter telemetry. */
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
    const fbp = cookie('_fbp')
    const fbc = cookie('_fbc')
    const fbclid = new URL(win.location.href).searchParams.get('fbclid')

    if (fbp && /^fb\.\d+\.\d{13}\.\d{1,20}$/.test(fbp)) context.fbp = fbp
    if (fbc && /^fb\.\d+\.\d{13}\.[A-Za-z0-9._~-]{1,512}$/.test(fbc)) context.fbc = fbc
    else if (fbclid && /^[A-Za-z0-9._~-]{1,512}$/.test(fbclid)) context.fbc = `fb.1.${Date.now()}.${fbclid}`
  }

  return context
}
