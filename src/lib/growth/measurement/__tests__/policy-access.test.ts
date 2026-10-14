import { describe,expect,it,vi } from 'vitest'

vi.mock('../policy-source',()=>({listMeasurementSources:vi.fn()}))
vi.mock('../policy-store',()=>({listMeasurementPolicies:vi.fn(),mutateMeasurementPolicyStore:vi.fn()}))
import { measurementPermissions,executeMeasurementPolicyCommand } from '../policy-command'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { policyFixture } from './policy-fixture'

const actor: TenantEntitlementSubject={userId:'fixture-actor',tenantType:'efeonce_internal',roleCodes:['efeonce_admin'],primaryRoleCode:'efeonce_admin',routeGroups:['internal'],authorizedViews:[]}

describe('measurement capabilities and internal authority',()=>{
 it.each(['efeonce_admin','efeonce_operations'])('grants fine capabilities to the intended %s role',role=>{
  expect(measurementPermissions({...actor,roleCodes:[role]})).toEqual({read:true,author:true,publish:true,disable:true})
 })
 it('does not grant policy writes merely for an internal route or an account role',()=>{
  expect(measurementPermissions({...actor,roleCodes:['efeonce_account']})).toEqual({read:false,author:false,publish:false,disable:false})
 })
 it('denies client authority even if an incoming context carries a privileged role',async()=>{
  const client={...actor,tenantType:'client' as const}
  const p=policyFixture()

  expect(measurementPermissions(client).publish).toBe(false)
  expect(await executeMeasurementPolicyCommand(client,{action:'draft',scope:p.scope,config:p.config,expectedPublishedRevisionId:null,idempotencyKey:p.policyId})).toMatchObject({ok:false,error:'forbidden'})
 })
})
