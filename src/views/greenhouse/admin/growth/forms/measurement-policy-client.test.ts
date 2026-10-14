import { describe, expect, it, vi } from 'vitest'

import { policyFixture } from '@/lib/growth/measurement/__tests__/policy-fixture'
import type { MeasurementPolicyMutation } from '@/lib/growth/measurement/policy-contract'

import { executePolicyRequest, readMeasurementCatalog, type MeasurementCatalog, type PolicyRequest } from './measurement-policy-client'

const policy=policyFixture()
const mutation: MeasurementPolicyMutation={action:'publish',policyId:policy.policyId,revisionId:policy.revisionId,expectedPublishedRevisionId:null,idempotencyKey:'a879b155-a143-40bd-9b15-731c2b62d179'}
const catalog: MeasurementCatalog={sources:[],policies:[policy],permissions:{read:true,author:true,publish:true,disable:true}}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status})

describe('measurement policy network boundary',()=>{
  it('replays the identical command and idempotency key after a lost POST response',async()=>{
    const fetcher=vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(json({ok:true,policy})).mockResolvedValueOnce(json(catalog))
    const request:PolicyRequest={mutation}

    await expect(executePolicyRequest(request,fetcher)).rejects.toThrow()
    await expect(executePolicyRequest(request,fetcher)).resolves.toMatchObject({revision:{state:'published'}})
    expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body)
  })
  it('does not submit again when the write is known but GET readback fails',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(json({ok:true,policy})).mockRejectedValueOnce(new Error('readback failed')).mockResolvedValueOnce(json(catalog))
    const request:PolicyRequest={mutation}

    await expect(executePolicyRequest(request,fetcher)).rejects.toThrow()
    expect(request.receipt?.revisionId).toBe(policy.revisionId)
    await expect(executePolicyRequest(request,fetcher)).resolves.toMatchObject({revision:{state:'published'}})
    expect(fetcher.mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(1)
  })
  it('never claims publication when the independent readback has a different head',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(json({ok:true,policy})).mockResolvedValueOnce(json({...catalog,policies:[{...policy,state:'superseded',publishedRevisionId:'another'}]}))

    await expect(executePolicyRequest({mutation},fetcher)).rejects.toMatchObject({kind:'conflict'})
  })
  it('retains retry state on an uncertain server error and distinguishes forbidden from validation',async()=>{
    const request:PolicyRequest={mutation}

    await expect(executePolicyRequest(request,vi.fn().mockResolvedValue(json({},503)))).rejects.toMatchObject({kind:'unavailable'})
    expect(request.receipt).toBeUndefined()
    await expect(executePolicyRequest({mutation},vi.fn().mockResolvedValue(json({},403)))).rejects.toMatchObject({kind:'denied'})
    await expect(executePolicyRequest({mutation},vi.fn().mockResolvedValue(json({ok:false,blockingReasons:['source_version_changed']},422)))).rejects.toMatchObject({kind:'invalid',reasons:['source_version_changed']})
  })
  it('requires a disabled revision and empty published pointer to confirm disable',async()=>{
    const request:PolicyRequest={mutation:{...mutation,action:'disable'},receipt:policy}
    const fetcher=vi.fn().mockResolvedValueOnce(json(catalog)).mockResolvedValueOnce(json({...catalog,policies:[{...policy,state:'disabled',publishedRevisionId:null}]}))

    await expect(executePolicyRequest(request,fetcher)).rejects.toMatchObject({kind:'conflict'})
    await expect(executePolicyRequest(request,fetcher)).resolves.toMatchObject({revision:{state:'disabled'}})
  })
  it('denies catalog access without exposing the response body',async()=>{
    await expect(readMeasurementCatalog(vi.fn().mockResolvedValue(json({private:'not for UI'},403)))).rejects.toMatchObject({kind:'denied'})
  })
})
