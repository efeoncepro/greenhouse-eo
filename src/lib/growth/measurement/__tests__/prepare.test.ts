import { beforeEach,describe,expect,it,vi } from 'vitest'

vi.mock('@/lib/secrets/secret-manager',()=>({resolveSecret:vi.fn()}))
vi.mock('../policy-source',()=>({resolveMeasurementSource:vi.fn()}))
vi.mock('../policy-store',()=>({resolvePublishedMeasurementPolicy:vi.fn()}))
import { resolveSecret } from '@/lib/secrets/secret-manager'
import { resolvePublishedMeasurementPolicy } from '../policy-store'
import { resolveMeasurementSource } from '../policy-source'
import { prepareMeasurementConversion } from '../prepare'
import { decryptMeasurementPayload } from '../crypto'
import { policyFixture } from './policy-fixture'

const p=policyFixture(),now=new Date()
const key='ab'.repeat(32)

const input={scope:{...p.scope,sourceId:'fixture',sourceVersion:p.config.sourceVersion,origin:'https://efeoncepro.com',pageUri:'/contacto/',formSlug:'new-commercial-form'},
 fields:{workEmail:'person@example.com',mobile:'+56912345678',given:'Ada',family:'Lovelace'},
 measurementContext:{source:'hubspot_categories',policyVersion:'efeonce-categories-2026-10-13',capturedAt:now.toISOString(),advertisement:true,analytics:true,globalPrivacyControl:false,clientId:'123.456'},
 ip:'192.0.2.1',userAgent:'Fixture Browser',now}

const config={...p.config,mapping:{email:'workEmail',phone:'mobile',firstName:'given',lastName:'family'}}

beforeEach(()=>{
 vi.resetAllMocks()
 vi.mocked(resolvePublishedMeasurementPolicy).mockResolvedValue({...p,config})
 vi.mocked(resolveMeasurementSource).mockResolvedValue({scope:p.scope,name:'Fixture',sourceVersion:p.config.sourceVersion,origins:[...p.config.origins],fields:[],blockingReasons:[]})
 vi.mocked(resolveSecret).mockResolvedValue({value:key,source:'env'} as Awaited<ReturnType<typeof resolveSecret>>)
})
describe('policy-driven capture',()=>{
 it('maps custom compatible fields from data and pins revision with original visitor context',async()=>{
  const prepared=(await prepareMeasurementConversion(input,{NODE_ENV:'test',GROWTH_MEASUREMENT_CAPTURE_ENABLED:'true'}))!
  const data=decryptMeasurementPayload(prepared.encryptedPayload,key,prepared.eventId) as {meta:Record<string,unknown>}

  expect(prepared.policyRevisionId).toBe(p.revisionId)
  expect(data.meta.ip_override).toBe(input.ip)
  expect(data.meta.user_agent).toBe(input.userAgent)
  expect(data.meta['x-fb-ud-em']).toMatch(/^[a-f0-9]{64}$/)
  expect(data.meta.measurement_policy).toMatchObject({revision_id:p.revisionId,source_key:p.scope.sourceKey})
  expect(JSON.stringify(prepared)).not.toContain('person@example.com')
 })
 it('Google-only configuration never persists or queues a Meta payload',async()=>{
  vi.mocked(resolvePublishedMeasurementPolicy).mockResolvedValue({...p,config:{...config,destinations:['google_upd']}})
  const prepared=(await prepareMeasurementConversion(input,{NODE_ENV:'test',GROWTH_MEASUREMENT_CAPTURE_ENABLED:'true'}))!
  const data=decryptMeasurementPayload(prepared.encryptedPayload,key,prepared.eventId) as {meta:unknown;google:Record<string,unknown>}

  expect(prepared.destinations).toEqual(['google_upd'])
  expect(data.meta).toBeNull()
  expect(data.google).not.toHaveProperty('events')
 })
 it('queues nothing when a Google-only policy lacks analytics consent',async()=>{
  vi.mocked(resolvePublishedMeasurementPolicy).mockResolvedValue({...p,config:{...config,destinations:['google_upd']}})
  expect(await prepareMeasurementConversion({...input,measurementContext:{...input.measurementContext,analytics:false}},{NODE_ENV:'test',GROWTH_MEASUREMENT_CAPTURE_ENABLED:'true'})).toBeNull()
  expect(resolveSecret).not.toHaveBeenCalled()
 })
 it('advertising denial avoids policy and secret reads altogether',async()=>{
  expect(await prepareMeasurementConversion({...input,measurementContext:{...input.measurementContext,advertisement:false}},{NODE_ENV:'test',GROWTH_MEASUREMENT_CAPTURE_ENABLED:'true'})).toBeNull()
  expect(resolvePublishedMeasurementPolicy).not.toHaveBeenCalled()
  expect(resolveSecret).not.toHaveBeenCalled()
 })
 it('unavailable or disabled policy does not affect commercial acceptance',async()=>{
  vi.mocked(resolvePublishedMeasurementPolicy).mockResolvedValue(null)
  expect(await prepareMeasurementConversion(input,{NODE_ENV:'test',GROWTH_MEASUREMENT_CAPTURE_ENABLED:'true'})).toBeNull()
 })
})
