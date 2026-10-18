import { describe, expect, it } from 'vitest'

import { metaReceiptAccepted, metaReceiptObservation, parseMetaEventReceipt, parseMetaReceiptObservation, summarizeMetaReceipts } from '../meta-receipt'

export const context = { eventId: '11111111-1111-4111-8111-111111111111', eventTime: 1792254000,
  attemptId: '22222222-2222-4222-8222-222222222222', attempt: 1 }
export const receipt = { ...context, contract: 'meta-event-receipt.v1', datasetId: '708931297255942', apiVersion: 'v25.0',
  eventName: 'Lead', requestEventCount: 1, graphHttpStatus: 200, bodyStatus: 'valid', observedAtMs: 1792254001000,
  eventsReceived: 1, fbtraceId: 'AX_fixture-trace' }

describe('Meta per-event receipt boundary', () => {
  it('binds exact event, timestamp, lease and attempt, dropping free messages and unexpected data', () => {
    const parsed = parseMetaEventReceipt({ ...receipt, messages: ['private@example.test'], access_token: 'secret', user_data: { em: 'hash' } }, context)!

    expect(metaReceiptAccepted(parsed)).toBe(true)
    expect(JSON.stringify(parsed)).not.toMatch(/private|secret|user_data|messages|hash/)
  })
  it.each([{ eventId: context.attemptId }, { eventTime: context.eventTime + 1 }, { attemptId: context.eventId }, { attempt: 2 },
    { datasetId: 'other' }, { eventName: 'PageView' }, { requestEventCount: 2 }, { fbtraceId: 'private@example.test' },
    { graphHttpStatus: '200' }, { eventsReceived: '1' }, { errorCode: 'secret' }])('rejects unbound/malformed receipt %j', patch => {
    expect(parseMetaEventReceipt({ ...receipt, ...patch }, context)).toBeNull()
  })
  it.each([{ eventsReceived: 0 }, { eventsReceived: 2 }, { bodyStatus: 'invalid' }, { graphHttpStatus: 400 }, { errorCode: 190 }])('keeps non-acceptance evidence without inventing reception %j', patch => {
    const parsed = parseMetaEventReceipt({ ...receipt, ...patch }, context)!

    expect(parsed).not.toBeNull()
    expect(metaReceiptAccepted(parsed)).toBe(false)
  })
  it('explicitly records absent, invalid, oversize, transport and unsent evidence', () => {
    expect(metaReceiptObservation(context, null).status).toBe('missing')
    expect(metaReceiptObservation(context, '{bad').status).toBe('invalid')
    expect(metaReceiptObservation(context, 'x'.repeat(2049)).status).toBe('invalid')
    expect(metaReceiptObservation(context, null, 'unavailable').status).toBe('unavailable')
    expect(metaReceiptObservation(context, null, 'not_sent').status).toBe('not_sent')
  })
  it('does not permit mismatched nested observations or bodies on a missing receipt', () => {
    const observation = metaReceiptObservation(context, JSON.stringify(receipt))

    expect(parseMetaReceiptObservation({ ...observation, attemptId: context.eventId })).toBeNull()
    expect(parseMetaReceiptObservation({ ...observation, status: 'missing' })).toBeNull()
  })
  it('summarizes reception separately and hides private lease identifiers', () => {
    const observation = metaReceiptObservation(context, JSON.stringify(receipt))
    const result = summarizeMetaReceipts([observation], context.eventId, context.eventTime, 1)

    expect(result).toMatchObject({ status: 'recorded', reception: 'acknowledged', attempts: [{ attempt: 1 }] })
    expect(JSON.stringify(result)).not.toContain(context.attemptId)
    expect(result).not.toHaveProperty('processing')
  })
  it('rejects a historical receipt observed after its own durable record, without consulting the present clock', () => {
    const observation = metaReceiptObservation(context, JSON.stringify(receipt))

    expect(parseMetaReceiptObservation({ ...observation, recordedAt: new Date(receipt.observedAtMs - 300_001).toISOString() })).toBeNull()
  })
  it('rejects reordered retry history while allowing gaps for attempts with no durable evidence', () => {
    const first = metaReceiptObservation(context, JSON.stringify(receipt))
    const later = metaReceiptObservation({ ...context, attempt: 3 }, null)

    expect(summarizeMetaReceipts([first, later], context.eventId, context.eventTime, 3).reception).toBe('acknowledged')
    expect(summarizeMetaReceipts([later, first], context.eventId, context.eventTime, 3)).toMatchObject({ status: 'invalid', reception: 'unknown', attempts: [] })
  })
  it.each(['foreign', 'duplicate', 'future_attempt', 'wrong_time'])('cannot promote corrupt historical ledger %s', kind => {
    const observation = metaReceiptObservation(context, JSON.stringify(receipt))
    const values = kind === 'foreign' ? [{ ...observation, eventId: context.attemptId }] : kind === 'duplicate' ? [observation, observation] : [observation]

    expect(summarizeMetaReceipts(values, context.eventId, kind === 'wrong_time' ? 1 : context.eventTime, kind === 'future_attempt' ? 0 : 1))
      .toMatchObject({ status: 'invalid', reception: 'unknown', attempts: [] })
  })
})
