import { beforeEach,describe,expect,it,vi } from 'vitest'

vi.mock('@/lib/db',()=>({getDb:vi.fn()}))
vi.mock('@/lib/growth/forms/store',()=>({getFormDefinitionByKey:vi.fn(),getPublishedVersionBySlug:vi.fn(),getHostSurfaceById:vi.fn()}))
vi.mock('@/lib/growth/meetings/store',()=>({getMeetingSurfaceAuthority:vi.fn()}))
import { getFormDefinitionByKey,getPublishedVersionBySlug,getHostSurfaceById } from '@/lib/growth/forms/store'
import { getMeetingSurfaceAuthority } from '@/lib/growth/meetings/store'
import { matchingFieldCatalog,resolveMeasurementSource } from '../policy-source'
import { policyFixture } from './policy-fixture'

const p=policyFixture()
const form={form_id:'form-id',form_key:p.scope.sourceKey,slug:'new-commercial-form',name:'Fixture',status:'active',form_kind:'contact',risk_profile:'low'}

beforeEach(()=>{
 vi.resetAllMocks()
 vi.mocked(getFormDefinitionByKey).mockResolvedValue(form as Awaited<ReturnType<typeof getFormDefinitionByKey>>)
 vi.mocked(getPublishedVersionBySlug).mockResolvedValue({form_version_id:p.config.sourceVersion,field_schema_json:[{key:'email',type:'email'}]} as Awaited<ReturnType<typeof getPublishedVersionBySlug>>)
 vi.mocked(getHostSurfaceById).mockResolvedValue({status:'active',allowed_form_slugs_json:['new-commercial-form'],origin_allowlist_json:['https://efeoncepro.com']} as Awaited<ReturnType<typeof getHostSurfaceById>>)
})
describe('source authority and typed contact mapping',()=>{
 it('uses a new form by stable key and current version with no slug list',async()=>{
  expect(await resolveMeasurementSource(p.scope)).toMatchObject({sourceVersion:p.config.sourceVersion,blockingReasons:[],fields:[{key:'email',type:'email'}]})
 })
 it.each(['application','subscribe','survey'])('never authorizes a %s purpose as a commercial Lead',async kind=>{
  vi.mocked(getFormDefinitionByKey).mockResolvedValue({...form,form_kind:kind} as Awaited<ReturnType<typeof getFormDefinitionByKey>>)
  expect((await resolveMeasurementSource(p.scope))?.blockingReasons).toContain('purpose_not_commercial')
 })
 it('exposes only declared typed fields and explicit namePolicy outputs',()=>{
  const fields=matchingFieldCatalog([{key:'fullName',type:'text'},{key:'email',type:'email'},{key:'phone',type:'text'},{key:'nationalId',type:'national_id'}],{namePolicy:{mode:'split_full_name',sourceField:'fullName',firstNameField:'firstName',lastNameField:'lastName'}})

  expect(fields.filter(f=>f.derived)).toEqual([{key:'firstName',type:'text',derived:true},{key:'lastName',type:'text',derived:true}])
  expect(fields.some(f=>f.key==='phone'&&f.type==='tel')).toBe(false)
  expect(fields.some(f=>f.key==='nationalId')).toBe(false)
 })
 it('binds Meetings to the real active scheduler and fingerprints authority changes',async()=>{
  const binding={surfaceId:p.scope.surfaceId,schedulerKey:'discovery',origins:['https://efeoncepro.com'],fallbackUrl:'https://example.com',defaultTimezone:'America/Santiago',defaultLocale:'es'}

  vi.mocked(getMeetingSurfaceAuthority).mockResolvedValue(binding)
  const scope={...p.scope,sourceKind:'meeting_booking' as const,sourceKey:'discovery'}
  const first=await resolveMeasurementSource(scope)

  vi.mocked(getMeetingSurfaceAuthority).mockResolvedValue({...binding,origins:['https://think.efeoncepro.com']})
  expect((await resolveMeasurementSource(scope))?.sourceVersion).not.toBe(first?.sourceVersion)
  expect(first?.blockingReasons).toEqual([])
 })
})
