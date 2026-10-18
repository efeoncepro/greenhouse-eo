import { readGoogleMeasurementConsent } from '../growth-measurement-context/context'

export type GoogleAdsConversionKey = 'commercial_lead' | 'meeting_booking'
export interface GoogleAdsUserData {
  sha256_email_address?: string
  sha256_phone_number?: string
}
/** Reserved enhanced-conversion response channel. Never ordinary GA4/host telemetry. */
export interface GoogleAdsConversionReceipt {
  version: 1
  transactionId: string
  conversionKey: GoogleAdsConversionKey
  issuedAt: string
  expiresAt: string
  userData?: GoogleAdsUserData
}

type AdsWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>
  efeonceReadGoogleAdsUserData?: (transactionId: string) => GoogleAdsUserData | undefined
  /** Shared closure across independently bundled Forms and Meetings renderers. */
  efeonceEmitGoogleAdsConversion?: (receipt: unknown, expected: GoogleAdsConversionKey) => boolean
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const hash = /^[a-f0-9]{64}$/
const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

export const parseGoogleAdsConversionReceipt = (
  value: unknown, expected: GoogleAdsConversionKey, now = Date.now(),
): GoogleAdsConversionReceipt | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>

  if (Object.keys(record).some(key => !['version', 'transactionId', 'conversionKey', 'issuedAt', 'expiresAt', 'userData'].includes(key)) ||
      record.version !== 1 || record.conversionKey !== expected || typeof record.transactionId !== 'string' || !uuid.test(record.transactionId) ||
      typeof record.issuedAt !== 'string' || !iso.test(record.issuedAt) || typeof record.expiresAt !== 'string' || !iso.test(record.expiresAt)) return undefined
  const issued = Date.parse(record.issuedAt)
  const expires = Date.parse(record.expiresAt)

  if (!Number.isFinite(issued) || !Number.isFinite(expires) || issued > now + 30_000 || now - issued > 600_000 ||
      expires <= now || expires <= issued || expires - issued > 600_000) return undefined
  let userData: GoogleAdsUserData | undefined

  if (record.userData !== undefined) {
    if (!record.userData || typeof record.userData !== 'object' || Array.isArray(record.userData)) return undefined
    const data = record.userData as Record<string, unknown>
    const keys = Object.keys(data)

    if (!keys.length || keys.some(key => !['sha256_email_address', 'sha256_phone_number'].includes(key)) ||
        keys.some(key => typeof data[key] !== 'string' || !hash.test(data[key] as string))) return undefined
    userData = { ...data } as GoogleAdsUserData
  }

  return {
    version: 1, transactionId: record.transactionId, conversionKey: expected,
    issuedAt: record.issuedAt, expiresAt: record.expiresAt, ...(userData ? { userData } : {}),
  }
}

const permitted = (win: Window): boolean => {
  if (!/^(efeoncepro\.com|think\.efeoncepro\.com)$/.test(win.location.hostname) ||
      (win.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return false
  const consent = readGoogleMeasurementConsent(win)

  return Boolean(consent && Object.values(consent).every(value => value === 'granted') &&
    win.document.documentElement.getAttribute('data-efeonce-ads-consent') === 'granted' &&
    win.document.documentElement.getAttribute('data-efeonce-analytics-consent') === 'granted')
}

const installBridge = (win: AdsWindow): void => {
  if (win.efeonceEmitGoogleAdsConversion || win.efeonceReadGoogleAdsUserData) return
  const pending = new Map<string, { data: GoogleAdsUserData; expiresAt: number }>()
  const emitted = new Set<string>()
  const clear = () => pending.clear()
  const releasePending = (transactionId: string) => pending.delete(transactionId)

  const read = (id: string): GoogleAdsUserData | undefined => {
    if (!permitted(win)) { clear();

return undefined }

    const entry = pending.get(id)

    if (!entry || entry.expiresAt <= Date.now()) { pending.delete(id);

return undefined }

    return { ...entry.data }
  }

  const emit = (value: unknown, expected: GoogleAdsConversionKey): boolean => {
    if (!permitted(win)) { clear();

return false }

    const receipt = parseGoogleAdsConversionReceipt(value, expected)

    if (!receipt || emitted.has(receipt.transactionId)) return false
    emitted.add(receipt.transactionId)
    if (receipt.userData) pending.set(receipt.transactionId, { data: receipt.userData, expiresAt: Math.min(Date.parse(receipt.expiresAt), Date.now() + 10_000) })
    // A bound primitive ID keeps the dataLayer callback from retaining the receipt/hashes.
    const release = releasePending.bind(undefined, receipt.transactionId)

    win.setTimeout(release, 10_000)
    win.dataLayer = win.dataLayer || []

    try {
      win.dataLayer.push({
        event: 'gh_ads_conversion', ads_conversion_key: receipt.conversionKey,
        transaction_id: receipt.transactionId, eventCallback: release, eventTimeout: 2000,
      })

      return true
    } catch { release();

return false }
  }

  Object.defineProperties(win, {
    efeonceReadGoogleAdsUserData: { value: read, configurable: false, writable: false, enumerable: false },
    efeonceEmitGoogleAdsConversion: { value: emit, configurable: false, writable: false, enumerable: false },
  })
  win.addEventListener('pagehide', clear)
  win.addEventListener('efeonce:privacy-consent', () => { if (!permitted(win)) clear() })
}

/** Failure cannot alter an accepted form or confirmed booking. Consent is rechecked at dispatch. */
export const emitGoogleAdsConversion = (
  receipt: unknown, expected: GoogleAdsConversionKey,
  win: Window | undefined = typeof window === 'undefined' ? undefined : window,
): boolean => {
  if (!win) return false

  try {
    if (!permitted(win) || !parseGoogleAdsConversionReceipt(receipt, expected)) return false
    const target = win as AdsWindow

    installBridge(target)

    return target.efeonceEmitGoogleAdsConversion?.(receipt, expected) === true
  } catch { return false }
}
