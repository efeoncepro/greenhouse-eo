import { describe,expect,it } from 'vitest'

import { measurementPolicyConfigSchema,measurementPolicyMutationSchema,validateMeasurementMapping, type MeasurementPolicySource } from '../policy-contract'
import { policyFixture } from './policy-fixture'

const policy=policyFixture()
const source: MeasurementPolicySource={scope:policy.scope,name:'Fixture',sourceVersion:policy.config.sourceVersion,origins:[...policy.config.origins],fields:[{key:'email',type:'email'},{key:'phone',type:'tel'},{key:'firstName',type:'text'},{key:'lastName',type:'text'}],blockingReasons:[]}

describe('published measurement data contract',()=>{
 it('supports a new source identity and independent destinations without source changes',()=>{
  expect(validateMeasurementMapping({...policy.config,destinations:['google_upd']},source)).toEqual([])
  expect(measurementPolicyConfigSchema.safeParse({...policy.config,destinations:[]}).success).toBe(true)
 })
 it.each([
  {...policy.config,purpose:'newsletter'}, {...policy.config,origins:['https://other.example.com']},
  {...policy.config,mapping:{email:'free.value'}}, {...policy.config,mapping:{ip:'address',email:'email'}},
  {...policy.config,mapping:{firstName:'firstName'}}, {...policy.config,destinations:['meta','meta']},
 ])('rejects purpose, host, unknown fields and invalid identity mappings',config=>{
  expect(measurementPolicyConfigSchema.safeParse(config).success).toBe(false)
 })
 it('rejects type drift, unavailable sources and incompatible versions',()=>{
  expect(validateMeasurementMapping({...policy.config,mapping:{email:'firstName'}},source)).toContain('mapping_incompatible_email')
  expect(validateMeasurementMapping({...policy.config,sourceVersion:'ab'.repeat(32)},source)).toContain('source_version_changed')
  expect(validateMeasurementMapping(policy.config,{...source,blockingReasons:['purpose_not_commercial']})).toContain('purpose_not_commercial')
 })
 it.each(['fver-efeonce-lead-gen-web-v1','fver-0df81cf5-b580-49bd-b17b-c46aabd08765'])('accepts canonical opaque immutable form version %s',sourceVersion=>{
  expect(measurementPolicyConfigSchema.safeParse({...policy.config,sourceVersion}).success).toBe(true)
 })
 it('ties mutation to expected publication and an idempotency UUID, without public identity values',()=>{
  const mutation={action:'draft',scope:policy.scope,config:policy.config,expectedPublishedRevisionId:null,idempotencyKey:policy.policyId}

  expect(measurementPolicyMutationSchema.safeParse(mutation).success).toBe(true)
  expect(measurementPolicyMutationSchema.safeParse({...mutation,rawEmail:'private@example.com'}).success).toBe(false)
  expect(measurementPolicyMutationSchema.safeParse({...mutation,idempotencyKey:'random'}).success).toBe(false)
 })
})
