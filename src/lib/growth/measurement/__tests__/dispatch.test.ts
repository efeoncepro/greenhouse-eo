import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/secrets/secret-manager', () => ({ resolveSecret: vi.fn() }))
vi.mock('../policy-store', () => ({measurementPolicyAllowsDelivery:vi.fn()}))
vi.mock('../store', () => ({ assertMetaReceiptStorageReady: vi.fn(), claimMeasurementDeliveries: vi.fn(), expireMeasurementDeliveries: vi.fn(), finishMeasurementDelivery: vi.fn() }))

import { sendMeasurementPayload, dispatchMeasurementConversions, dispatchMeasurementConversionsSafely } from '../dispatch'
import { resolveSecret } from '@/lib/secrets/secret-manager'
import { assertMetaReceiptStorageReady, claimMeasurementDeliveries, expireMeasurementDeliveries, finishMeasurementDelivery } from '../store'
import { META_RECEIPT_HEADER } from '../meta-receipt'
import { measurementPolicyAllowsDelivery } from '../policy-store'
import type { EnvSource } from '@/types/env-source'

describe('destination acknowledgements', () => {
  const context = { eventId: '11111111-1111-4111-8111-111111111111', eventTime: 1792254000, attemptId: '22222222-2222-4222-8222-222222222222', attempt: 1 }
  const payload = { event_name: 'generate_lead', event_id: context.eventId, event_time: context.eventTime }

  const receipt = { ...context, contract: 'meta-event-receipt.v1', datasetId: '708931297255942', apiVersion: 'v25.0', eventName: 'Lead',
    requestEventCount: 1, graphHttpStatus: 200, bodyStatus: 'valid', observedAtMs: 1792254001000, eventsReceived: 1, fbtraceId: 'AX_trace' }

  it('carries correlation outside the CAPI body and captures the original Graph receipt', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ meta_tag_status: 'success' }, { headers: { [META_RECEIPT_HEADER]: JSON.stringify(receipt) } }))
    const result = await sendMeasurementPayload('meta', payload, 'fixture-token', fetcher, context)

    expect(result).toMatchObject({ success: true, metaObservation: { status: 'recorded', receipt: { graphHttpStatus: 200, eventsReceived: 1 } } })
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({ 'x-efeonce-meta-attempt': context.attemptId, 'x-efeonce-meta-attempt-number': '1' })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(payload)
  })
  it.each([null, '{bad', JSON.stringify({ ...receipt, eventId: context.attemptId }), JSON.stringify({ ...receipt, attempt: 2 })])('does not retry accepted delivery to recover a missing/invalid receipt (%s)', async header => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ meta_tag_status: 'success' }, { headers: header === null ? {} : { [META_RECEIPT_HEADER]: header } }))

    expect(await sendMeasurementPayload('meta', payload, 'fixture-token', fetcher, context)).toMatchObject({ success: true, retryable: false,
      metaObservation: { status: header === null ? 'missing' : 'invalid' } })
    expect(fetcher).toHaveBeenCalledOnce()
  })
  it('isolates telemetry accessor failure from HTTP acceptance', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ meta_tag_status: 'success' }), headers: { get: () => { throw Error('private telemetry error') } } })

    expect(await sendMeasurementPayload('meta', payload, 'fixture-token', fetcher, context))
      .toMatchObject({ success: true, retryable: false, metaObservation: { status: 'unavailable' } })
  })
  it('does not make a POST with a mismatched source/lease envelope', async () => {
    const fetcher = vi.fn()

    await expect(sendMeasurementPayload('meta', { ...payload, event_id: context.attemptId }, 'fixture-token', fetcher, context)).rejects.toThrow('context_mismatch')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('retains a Graph failure receipt without changing existing transient ingress retries', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ meta_tag_status: 'failure' }, { status: 502,
      headers: { [META_RECEIPT_HEADER]: JSON.stringify({ ...receipt, graphHttpStatus: 400, errorCode: 190 }) } }))

    expect(await sendMeasurementPayload('meta', payload, 'fixture-token', fetcher, context)).toMatchObject({ success: false, retryable: true,
      metaObservation: { status: 'recorded', receipt: { graphHttpStatus: 400, errorCode: 190 } } })
  })
  it.each([0, 2])('does not retry successful ingress solely because Graph reported an unexpected count (%i)', async count => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ meta_tag_status: 'success' }, {
      headers: { [META_RECEIPT_HEADER]: JSON.stringify({ ...receipt, eventsReceived: count }) } }))

    expect(await sendMeasurementPayload('meta', payload, 'fixture-token', fetcher, context)).toMatchObject({ success: true, retryable: false,
      metaObservation: { status: 'recorded', receipt: { eventsReceived: count } } })
    expect(fetcher).toHaveBeenCalledOnce()
  })
  it('records timeout uncertainty without retaining request secrets', async () => {
    const fetcher = vi.fn().mockRejectedValue(Error('fixture-token private@example.test'))
    const result = await sendMeasurementPayload('meta', payload, 'fixture-token', fetcher, context)

    expect(result).toMatchObject({ success: false, metaObservation: { status: 'unavailable' } })
    expect(JSON.stringify(result)).not.toMatch(/fixture-token|private@/)
  })
  it('does not accept successful ingress HTTP if the Meta tag did not run', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ meta_tag_status: 'not_fired' }), { status: 200 }))
    const result = await sendMeasurementPayload('meta', {}, 'fixture-token', fetcher)

    expect(result).toMatchObject({ success: false, retryable: true, errorClass: 'meta_ack_invalid' })
  })
  it('accepts Meta HTTP evidence only with an explicit successful tag', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ meta_tag_status: 'success' }), { status: 200 }))

    expect(await sendMeasurementPayload('meta', {}, 'fixture-token', fetcher)).toMatchObject({ success: true, httpStatus: 200 })
    const [url, request] = fetcher.mock.calls[0]

    expect(url.endsWith('/efeonce/lead-enrichment')).toBe(true)
    expect(request.headers.Authorization).toBe('Bearer fixture-token')
    expect(request.redirect).toBe('error')
  })
  it('does not retry definitive authentication rejection', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 401 }))

    expect(await sendMeasurementPayload('meta', {}, 'fixture-token', fetcher)).toMatchObject({ success: false, retryable: false })
  })
  it.each([429, 503])('retries transient %i responses with the caller-owned identity', async status => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status }))
    const payload = { event_id: 'stable-id' }

    expect(await sendMeasurementPayload('meta', payload, 'fixture-token', fetcher)).toMatchObject({ success: false, retryable: true })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(payload)
  })
  it('sends Google UPD through the dedicated top-level user_data contract without another event', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const payload = { client_id: '123.456', user_data: { sha256_email_address: ['ab'.repeat(32)] } }

    expect(await sendMeasurementPayload('google_upd', payload, 'fixture-token', fetcher)).toMatchObject({ success: true })
    const [url, request] = fetcher.mock.calls[0]

    expect(new URL(url).origin).toBe('https://www.google-analytics.com')
    expect(JSON.parse(request.body)).not.toHaveProperty('events')
    expect(request.headers).not.toHaveProperty('Authorization')
  })
  it('never propagates a provider error containing request secrets', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('sensitive-url-and-body'))
    const result = await sendMeasurementPayload('google_upd', {}, 'fixture-token', fetcher)

    expect(result.errorClass).toBe('transport_or_ack_failed')
    expect(JSON.stringify(result)).not.toContain('sensitive')
  })
})


describe('shared cadence and destination isolation', () => {
 beforeEach(() => vi.resetAllMocks())
 const env: EnvSource = {NODE_ENV:'test',GROWTH_MEASUREMENT_META_ENABLED:'true',GROWTH_MEASUREMENT_GOOGLE_UPD_ENABLED:'true'}

 it('continues Meta when Google secret resolution fails', async () => {
  vi.mocked(resolveSecret).mockImplementation(async ({envVarName}) => {
   if(envVarName==='GROWTH_MEASUREMENT_GA4_API_SECRET') throw Error('private-secret-error')

return {value:'fixture',source:'env'} as Awaited<ReturnType<typeof resolveSecret>>
  })
  vi.mocked(claimMeasurementDeliveries).mockResolvedValue([])
  const result = await dispatchMeasurementConversions(50,env)

  expect(result).toMatchObject({unavailableDestinations:['google_upd']})
  expect(claimMeasurementDeliveries).toHaveBeenCalledWith(['meta'],1)
 })
 it('checks receipt storage before claiming Meta and leaves Google independently available',async()=>{
  vi.mocked(resolveSecret).mockResolvedValue({value:'fixture',source:'env'} as Awaited<ReturnType<typeof resolveSecret>>)
  vi.mocked(assertMetaReceiptStorageReady).mockRejectedValue(Error('missing schema'))
  vi.mocked(claimMeasurementDeliveries).mockResolvedValue([])
  const result=await dispatchMeasurementConversions(1,env)

  expect(result).toMatchObject({unavailableDestinations:['meta']})
  expect(claimMeasurementDeliveries).toHaveBeenCalledWith(['google_upd'],1)
 })
 it('an instrumentation DB outage does not throw into commercial dispatch', async () => {
  vi.mocked(expireMeasurementDeliveries).mockRejectedValue(new Error('private-db-error'))
  const warning=vi.spyOn(console,'warn').mockImplementation(()=>{})

  await expect(dispatchMeasurementConversionsSafely(50,env)).resolves.toMatchObject({errorClass:'measurement_dispatch_failed'})
  expect(JSON.stringify(warning.mock.calls)).not.toContain('private-db-error')
  warning.mockRestore()
 })
 it('retention runs with both senders disabled',async()=>{
  const result=await dispatchMeasurementConversions(50,{NODE_ENV:'test',GROWTH_MEASUREMENT_RETENTION_ENABLED:'true'})

  expect(expireMeasurementDeliveries).toHaveBeenCalledOnce()
  expect(result).toMatchObject({skipped:'measurement_disabled'})
  expect(resolveSecret).not.toHaveBeenCalled()
 })
})

describe('policy revocation immediately before delivery',()=>{
 beforeEach(()=>vi.resetAllMocks())
 const row={event_id:'a879b155-a143-40bd-9b15-731c2b62d173',policy_revision_id:'a879b155-a143-40bd-9b15-731c2b62d174',destination:'meta' as const,attempts:1,lease_token:'fixture',occurred_at:new Date(),encrypted_payload_json:{v:1 as const,iv:'fixture',tag:'fixture',ciphertext:'fixture'}}

 it.each([false,'unavailable'])('blocks HTTP for policy %s and records the correct retry posture',async state=>{
  vi.mocked(resolveSecret).mockResolvedValue({value:'ab'.repeat(32),source:'env'} as Awaited<ReturnType<typeof resolveSecret>>)
  vi.mocked(claimMeasurementDeliveries).mockResolvedValueOnce([row]).mockResolvedValue([])
  if(state==='unavailable') vi.mocked(measurementPolicyAllowsDelivery).mockRejectedValue(Error('private-db-error'))
  else vi.mocked(measurementPolicyAllowsDelivery).mockResolvedValue(false)
  const fetcher=vi.spyOn(globalThis,'fetch')

  await dispatchMeasurementConversions(1,{NODE_ENV:'test',GROWTH_MEASUREMENT_META_ENABLED:'true'})
  expect(fetcher).not.toHaveBeenCalled()
  expect(finishMeasurementDelivery).toHaveBeenCalledWith(row,expect.objectContaining({success:false,retryable:state==='unavailable',errorClass:state==='unavailable'?'measurement_policy_unavailable':'measurement_policy_revoked'}))
  fetcher.mockRestore()
 })
})
