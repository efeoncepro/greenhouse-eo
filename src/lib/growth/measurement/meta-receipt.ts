/** Operational metadata only. This module must never accept/persist raw provider bodies. */
import { z } from 'zod'

export const META_RECEIPT_HEADER = 'x-efeonce-meta-receipt'
export const META_ATTEMPT_HEADER = 'x-efeonce-meta-attempt'
export const META_ATTEMPT_NUMBER_HEADER = 'x-efeonce-meta-attempt-number'
const uuid = z.string().uuid()
const integer = z.number().int().nonnegative().max(1_000_000)

export const metaReceiptContextSchema = z.object({
  eventId: uuid, eventTime: z.number().int().positive(), attemptId: uuid, attempt: z.number().int().min(1).max(5),
})
export type MetaReceiptContext = z.infer<typeof metaReceiptContextSchema>

const receiptSchema = metaReceiptContextSchema.extend({
  contract: z.literal('meta-event-receipt.v1'), datasetId: z.literal('708931297255942'),
  apiVersion: z.literal('v25.0'), eventName: z.literal('Lead'), requestEventCount: z.literal(1),
  graphHttpStatus: z.number().int().min(100).max(599), bodyStatus: z.enum(['valid', 'invalid', 'oversize']),
  observedAtMs: z.number().int().positive().max(8_640_000_000_000_000),
  eventsReceived: integer.optional(), fbtraceId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/).optional(),
  errorCode: integer.optional(), errorSubcode: integer.optional(),
})

export type MetaEventReceipt = z.infer<typeof receiptSchema>

export function parseMetaEventReceipt(value: unknown, expected?: MetaReceiptContext): MetaEventReceipt | null {
  const parsed = receiptSchema.safeParse(value)

  if (!parsed.success) return null
  const r = parsed.data

  if (expected && (r.eventId !== expected.eventId || r.eventTime !== expected.eventTime ||
    r.attemptId !== expected.attemptId || r.attempt !== expected.attempt)) return null
  if (r.observedAtMs < r.eventTime * 1000 - 300_000) return null
  if (expected && r.observedAtMs > Date.now() + 300_000) return null

  return r
}

const observationSchema = z.object({
  contract: z.literal('meta-attempt-receipt.v1'), eventId: uuid, attemptId: uuid,
  attempt: z.number().int().min(1).max(5), status: z.enum(['recorded', 'missing', 'invalid', 'unavailable', 'not_sent']),
  recordedAt: z.string().datetime(), receipt: z.unknown().optional(),
})

export type MetaReceiptObservation = Omit<z.infer<typeof observationSchema>, 'receipt'> & { receipt?: MetaEventReceipt }

export function parseMetaReceiptObservation(value: unknown): MetaReceiptObservation | null {
  const parsed = observationSchema.safeParse(value)

  if (!parsed.success) return null
  const { receipt: raw, ...o } = parsed.data
  const r = raw === undefined ? null : parseMetaEventReceipt(raw)

  if (o.status === 'recorded' ? !r || r.eventId !== o.eventId || r.attemptId !== o.attemptId || r.attempt !== o.attempt : raw !== undefined) return null

  return { ...o, ...(r ? { receipt: r } : {}) }
}

export function metaReceiptObservation(context: MetaReceiptContext, header: string | null, fallback: 'missing' | 'unavailable' | 'not_sent' = 'missing'): MetaReceiptObservation {
  const c = metaReceiptContextSchema.parse(context)
  let receipt: MetaEventReceipt | null = null

  if (header && header.length <= 2048) {
    try { receipt = parseMetaEventReceipt(JSON.parse(header), c) } catch { /* Raw response never leaves this boundary. */ }
  }

  return { contract: 'meta-attempt-receipt.v1', eventId: c.eventId, attemptId: c.attemptId, attempt: c.attempt,
    status: receipt ? 'recorded' : header !== null ? 'invalid' : fallback, recordedAt: new Date().toISOString(),
    ...(receipt ? { receipt } : {}) }
}

export function metaReceiptAccepted(receipt: MetaEventReceipt): boolean {
  return receipt.graphHttpStatus >= 200 && receipt.graphHttpStatus < 300 && receipt.bodyStatus === 'valid' &&
    receipt.eventsReceived === 1 && receipt.errorCode === undefined && receipt.errorSubcode === undefined
}

export function summarizeMetaReceipts(value: unknown, eventId: string | undefined, eventTime: number | undefined, maximumAttempt: number | undefined) {
  type Attempt = { attempt: number; status: MetaReceiptObservation['status']; recordedAt: string; receipt?: Omit<MetaEventReceipt, 'attemptId'> }

  const result: { status: 'not_recorded' | 'recorded' | 'invalid'; reception: 'unknown' | 'acknowledged' | 'not_confirmed'; attempts: Attempt[] } = {
    status: 'not_recorded', reception: 'unknown', attempts: [],
  }

  if (value === undefined || value === null) return result
  if (!Array.isArray(value) || value.length > 5) return { ...result, status: 'invalid' as const }
  const seen = new Set<number>()

  for (const item of value) {
    const o = parseMetaReceiptObservation(item)

    if (!o || o.eventId !== eventId || maximumAttempt === undefined || o.attempt > maximumAttempt || seen.has(o.attempt) ||
      (o.receipt && o.receipt.eventTime !== eventTime)) return { ...result, attempts: [], status: 'invalid' as const, reception: 'unknown' as const }
    seen.add(o.attempt)

    let receipt: Omit<MetaEventReceipt, 'attemptId'> | undefined

    if (o.receipt) {
      const { attemptId, ...safe } = o.receipt

      void attemptId
      receipt = safe
    }

    result.attempts.push({ attempt: o.attempt, status: o.status, recordedAt: o.recordedAt, ...(receipt ? { receipt } : {}) })

    if (o.receipt) {
      result.status = 'recorded'
      if (metaReceiptAccepted(o.receipt)) result.reception = 'acknowledged'
      else if (result.reception !== 'acknowledged') result.reception = 'not_confirmed'
    }
  }

  return result
}
