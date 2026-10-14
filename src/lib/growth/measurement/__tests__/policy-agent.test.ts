import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../policy-source',()=>({listMeasurementSources:vi.fn()}))
vi.mock('../policy-store',()=>({listMeasurementPolicies:vi.fn(),mutateMeasurementPolicyStore:vi.fn()}))
import { listMeasurementSources } from '../policy-source'
import { listMeasurementPolicies, mutateMeasurementPolicyStore } from '../policy-store'
import { previewMeasurementPolicyCommand, readMeasurementPolicyCatalog } from '../policy-command'
import { policyFixture } from './policy-fixture'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

const actor:TenantEntitlementSubject={userId:'agent-proof',tenantType:'efeonce_internal',roleCodes:['efeonce_admin'],primaryRoleCode:'efeonce_admin',routeGroups:['internal'],authorizedViews:[]}
const policy=policyFixture()
const draft={action:'draft',scope:policy.scope,config:policy.config,expectedPublishedRevisionId:policy.revisionId,idempotencyKey:policy.policyId}

beforeEach(()=>{
 vi.clearAllMocks()
 vi.mocked(listMeasurementPolicies).mockResolvedValue([policy])
 vi.mocked(listMeasurementSources).mockResolvedValue([{scope:policy.scope,name:'Form',sourceVersion:policy.config.sourceVersion,origins:policy.config.origins,fields:[{key:'email',type:'email'},{key:'phone',type:'tel'},{key:'firstName',type:'text'},{key:'lastName',type:'text'}],blockingReasons:[]}])
})
describe('agent-first measurement discovery and non-mutating preflight',()=>{
 it('discovers the effective contract, fields, permissions and current revision together',async()=>{
  expect(await readMeasurementPolicyCatalog(actor)).toMatchObject({contract:{version:'growth-measurement-policy.v1',operations:expect.arrayContaining(['validate','verify'])},permissions:{publish:true},policies:[policy]})
 })
 it('validates typed mapping and exposes bounded impact without writing or accepting a contact',async()=>{
  expect(await previewMeasurementPolicyCommand(actor,draft)).toMatchObject({ok:true,dryRun:true,impact:{commercialAcceptanceChanged:false,crmDestinationChanged:false}})
  expect(mutateMeasurementPolicyStore).not.toHaveBeenCalled()
 })
 it('rejects incompatible mappings and stale CAS before an agent asks to apply',async()=>{
  expect(await previewMeasurementPolicyCommand(actor,{...draft,config:{...draft.config,mapping:{email:'firstName'}}})).toMatchObject({ok:false,blockingReasons:['mapping_incompatible_email']})
  expect(await previewMeasurementPolicyCommand(actor,{...draft,expectedPublishedRevisionId:null})).toMatchObject({ok:false,error:'conflict'})
  expect(mutateMeasurementPolicyStore).not.toHaveBeenCalled()
 })
 it('rejects client authority before reading the catalog',async()=>{
  expect(await previewMeasurementPolicyCommand({...actor,tenantType:'client'},draft)).toMatchObject({ok:false,error:'forbidden'})
  expect(listMeasurementPolicies).not.toHaveBeenCalled()
 })
 it('cannot skip review or disable a draft, but allows disabling an invalidated published source',async()=>{
  expect(await previewMeasurementPolicyCommand(actor,{action:'publish',policyId:policy.policyId,revisionId:policy.revisionId,expectedPublishedRevisionId:policy.revisionId,idempotencyKey:policy.policyId})).toMatchObject({ok:false,error:'conflict'})
  vi.mocked(listMeasurementSources).mockResolvedValue([])
  expect(await previewMeasurementPolicyCommand(actor,{action:'disable',policyId:policy.policyId,revisionId:policy.revisionId,expectedPublishedRevisionId:policy.revisionId,idempotencyKey:policy.policyId})).toMatchObject({ok:true,dryRun:true})
 })
 it('returns schema paths/codes without echoing an unknown personal field',async()=>{
  const result=await previewMeasurementPolicyCommand(actor,{...draft,email:'private@example.invalid'})

  expect(result).toMatchObject({ok:false,error:'invalid_input',issues:expect.any(Array)})
  expect(JSON.stringify(result)).not.toContain('private@')
 })
})
