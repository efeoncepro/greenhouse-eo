import {describe,it,expect,vi} from 'vitest'

import {createPolicyAgentFetch} from './policy-cli'
import {executePolicyRequest} from '../../src/lib/growth/measurement/policy-client'
import {policyFixture} from '../../src/lib/growth/measurement/__tests__/policy-fixture'

const state={cookies:[{name:'__Secure-next-auth.session-token',value:'signed-session',domain:'greenhouse.example.invalid',path:'/',secure:true,expires:Date.now()/1000+300}]}

describe('agent HTTP transport and durable receipt recovery',()=>{
 it('uses user-bound session only for its exact HTTPS origin and never follows redirects',async()=>{
  const network=vi.fn().mockResolvedValue(new Response('{}'))
  const client=createPolicyAgentFetch('https://greenhouse.example.invalid',state,undefined,network)

  await client('/api/admin/growth/measurement')
  expect(network).toHaveBeenCalledWith('https://greenhouse.example.invalid/api/admin/growth/measurement',expect.objectContaining({redirect:'error',headers:expect.objectContaining({Cookie:'__Secure-next-auth.session-token=signed-session'})}))
  await expect(client('https://attacker.invalid')).rejects.toThrow('route_out_of_scope')
  expect(()=>createPolicyAgentFetch('https://other.invalid',state)).toThrow('fresh_user_bound_session_required')
  expect(()=>createPolicyAgentFetch('http://greenhouse.example.invalid',state)).toThrow('https_origin_required')
 })
 it('checkpoints a known receipt before readback; retry never repeats the write',async()=>{
  const p=policyFixture({state:'draft',publishedRevisionId:null})
  const request={mutation:{action:'draft' as const,scope:p.scope,config:p.config,expectedPublishedRevisionId:null,idempotencyKey:p.policyId}}
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({ok:true,policy:p,blockingReasons:[]})).mockRejectedValueOnce(Error('network'))
  const checkpoint=vi.fn()

  await expect(executePolicyRequest(request,fetcher,checkpoint)).rejects.toThrow()
  expect(checkpoint).toHaveBeenCalledWith(p)
  fetcher.mockResolvedValueOnce(Response.json({policies:[p],sources:[],permissions:{read:true}}))
  expect((await executePolicyRequest(request,fetcher,checkpoint)).revision).toEqual(p)
  expect(fetcher.mock.calls.filter(call=>call[1]?.method==='POST')).toHaveLength(1)
 })
})
