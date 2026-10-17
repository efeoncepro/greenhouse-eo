/** Per-occurrence operational evidence. Never put visitor fields or raw provider responses here. */
export const HUBSPOT_SUBMISSION_ID_PROPERTY = 'ef_greenhouse_submission_id'
export const HUBSPOT_RECEIPT_CONTRACT = 'hubspot-form-receipt.v1' as const
export const HUBSPOT_RECEIPT_MAX_CHECKS = 8
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const SOURCE_ID = /^fsub-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export type HubSpotFormReceipt = {
  contract: typeof HUBSPOT_RECEIPT_CONTRACT
  status: 'pending' | 'verified' | 'ambiguous' | 'exhausted' | 'denied'
  portalId: string
  formGuid: string
  markerProperty: string
  markerValue: string
  checks: number
  nextCheckAt: string
  checkedAt?: string
  safeErrorCode?: string
  paginationComplete?: boolean
}

export function isNativeHubspotSubmissionId(value: unknown): value is string {
  return typeof value === 'string' && (UUID.test(value) || /^\d{1,40}$/.test(value))
}

export function parseHubSpotFormReceipt(value: unknown): HubSpotFormReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const r = value as Record<string, unknown>
  const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v))

  if (r.contract !== HUBSPOT_RECEIPT_CONTRACT || !['pending', 'verified', 'ambiguous', 'exhausted', 'denied'].includes(String(r.status)) ||
    r.portalId !== '48713323' || typeof r.formGuid !== 'string' || !UUID.test(r.formGuid) ||
    r.markerProperty !== HUBSPOT_SUBMISSION_ID_PROPERTY || typeof r.markerValue !== 'string' || !SOURCE_ID.test(r.markerValue) ||
    !Number.isInteger(r.checks) || Number(r.checks) < 0 || Number(r.checks) > HUBSPOT_RECEIPT_MAX_CHECKS || !validDate(r.nextCheckAt) ||
    (r.checkedAt !== undefined && !validDate(r.checkedAt)) ||
    (r.safeErrorCode !== undefined && (typeof r.safeErrorCode !== 'string' || !/^[a-z0-9_]{1,100}$/.test(r.safeErrorCode))) ||
    (r.paginationComplete !== undefined && typeof r.paginationComplete !== 'boolean')) return null

  // Reconstruct an allowlisted object: extra response fields and PII are never persisted.
  return { contract: HUBSPOT_RECEIPT_CONTRACT, status: r.status as HubSpotFormReceipt['status'], portalId: r.portalId,
    formGuid: r.formGuid, markerProperty: r.markerProperty, markerValue: r.markerValue, checks: Number(r.checks), nextCheckAt: r.nextCheckAt,
    ...(r.checkedAt !== undefined ? { checkedAt: r.checkedAt } : {}),
    ...(r.safeErrorCode !== undefined ? { safeErrorCode: r.safeErrorCode } : {}),
    ...(r.paginationComplete !== undefined ? { paginationComplete: r.paginationComplete } : {}) }
}

/** Null means tracking is unconfigured. It never means the delivery failed. */
export function createHubSpotFormReceipt(input: { portalId?: string; formGuid?: string; submissionIdProperty?: string }, submissionId: string, now = new Date()): HubSpotFormReceipt | null {
  return parseHubSpotFormReceipt({ contract: HUBSPOT_RECEIPT_CONTRACT, status: 'pending', portalId: input.portalId,
    formGuid: input.formGuid, markerProperty: input.submissionIdProperty, markerValue: submissionId,
    checks: 0, nextCheckAt: new Date(now.getTime() + 30_000).toISOString() })
}
