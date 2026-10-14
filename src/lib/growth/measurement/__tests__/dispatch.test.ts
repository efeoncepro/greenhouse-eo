import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/secrets/secret-manager', () => ({ resolveSecret: vi.fn() }))
vi.mock('../policy-store', () => ({measurementPolicyAllowsDelivery:vi.fn()}))
vi.mock('../store', () => ({ claimMeasurementDeliveries: vi.fn(), expireMeasurementDeliveries: vi.fn(), finishMeasurementDelivery: vi.fn() }))

import { sendMeasurementPayload, dispatchMeasurementConversions, dispatchMeasurementConversionsSafely } from '../dispatch'
import { resolveSecret } from '@/lib/secrets/secret-manager'
import { claimMeasurementDeliveries, expireMeasurementDeliveries, finishMeasurementDelivery } from '../store'
import { measurementPolicyAllowsDelivery } from '../policy-store'

describe('destination acknowledgements', () => {
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
 const env: NodeJS.ProcessEnv = {NODE_ENV:'test',GROWTH_MEASUREMENT_META_ENABLED:'true',GROWTH_MEASUREMENT_GOOGLE_UPD_ENABLED:'true'}

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
