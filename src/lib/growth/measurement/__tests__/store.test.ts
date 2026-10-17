import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PoolClient } from 'pg'

const { execute, statements } = vi.hoisted(() => ({ execute: vi.fn(), statements: [] as Array<{ text: string; values: unknown[] }> }))

vi.mock('@/lib/db', () => ({ getDb: vi.fn(async () => ({})) }))
vi.mock('kysely', () => ({ sql: Object.assign(vi.fn((parts: TemplateStringsArray, ...values: unknown[]) => { statements.push({ text: parts.join('?'), values });

return { execute } }), { join: vi.fn() }) }))

import { assertMetaReceiptStorageReady, enqueueMeasurementConversion, finishMeasurementDelivery } from '../store'
import type { PreparedMeasurement } from '../contracts'
import { metaReceiptObservation } from '../meta-receipt'

const prepared: PreparedMeasurement = {
 policyRevisionId:'a879b155-a143-40bd-9b15-731c2b62d174',
 eventId: 'a879b155-a143-40bd-9b15-731c2b62d173', occurredAt: '2026-10-13T20:00:00Z',
 consent: { source:'hubspot_categories', policyVersion:'efeonce-categories-2026-10-13',capturedAt:'2026-10-13T20:00:00Z',advertisement:true,analytics:true,globalPrivacyControl:false },
 encryptedPayload:{v:1,iv:'fixture',tag:'fixture',ciphertext:'fixture'},destinations:['meta','google_upd'],
}

beforeEach(()=>{vi.clearAllMocks();statements.length=0})
describe('commercial transaction isolation',()=>{
 it('rolls back only instrumentation if its INSERT fails',async()=>{
  const query=vi.fn().mockResolvedValue({rows:[]}).mockResolvedValueOnce({rows:[]}).mockRejectedValueOnce(new Error('private-db-error'))
  const warning=vi.spyOn(console,'warn').mockImplementation(()=>{})

  await expect(enqueueMeasurementConversion({query} as unknown as PoolClient,'form_submission','source',prepared)).resolves.toBeUndefined()
  expect(query.mock.calls.map(c=>c[0])).toContain('ROLLBACK TO SAVEPOINT measurement_enqueue')
  expect(query.mock.calls.at(-1)?.[0]).toBe('RELEASE SAVEPOINT measurement_enqueue')
  expect(JSON.stringify(warning.mock.calls)).not.toContain('private-db-error')
  warning.mockRestore()
 })
 it('does not insert a receipt after policy revocation before enqueue',async()=>{
  const query=vi.fn().mockResolvedValue({rows:[]})

  await enqueueMeasurementConversion({query} as unknown as PoolClient,'form_submission','source',prepared)
  expect(query).toHaveBeenCalledTimes(3)
  expect(query.mock.calls.some(c=>String(c[0]).includes('INSERT'))).toBe(false)
 })
 it('source deduplication does not create a second pair of delivery rows',async()=>{
  const query=vi.fn().mockResolvedValue({rows:[]}).mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{policy_id:'fixture'}]})

  await enqueueMeasurementConversion({query} as unknown as PoolClient,'form_submission','source',prepared)
  expect(query).toHaveBeenCalledTimes(4)
 })
 it.each([0n,1n])('counts only an actually finalized lease (%s affected)',async count=>{
  execute.mockResolvedValue({numAffectedRows:count})
  const row={policy_revision_id:prepared.policyRevisionId,event_id:prepared.eventId,destination:'meta' as const,attempts:1,lease_token:prepared.eventId,occurred_at:prepared.occurredAt,encrypted_payload_json:prepared.encryptedPayload}

  expect(await finishMeasurementDelivery(row,{success:true,httpStatus:200,retryable:false,errorClass:null})).toBe(count===1n)
 })
})

describe('per-event receipt persistence', () => {
 const context={eventId:prepared.eventId,eventTime:Math.floor(Date.parse(prepared.occurredAt)/1000),attemptId:prepared.policyRevisionId,attempt:1}

 const row={policy_revision_id:prepared.policyRevisionId,event_id:prepared.eventId,destination:'meta' as const,attempts:1,
   lease_token:context.attemptId,occurred_at:prepared.occurredAt,encrypted_payload_json:prepared.encryptedPayload}

 const receipt={...context,contract:'meta-event-receipt.v1',datasetId:'708931297255942',apiVersion:'v25.0',eventName:'Lead',requestEventCount:1,
   graphHttpStatus:200,bodyStatus:'valid',observedAtMs:context.eventTime*1000+1000,eventsReceived:1,fbtraceId:'AX_trace'}

 it('checks the additive schema before a Meta claim can send',async()=>{
  execute.mockRejectedValueOnce(Error('missing column'))
  await expect(assertMetaReceiptStorageReady()).rejects.toThrow('missing column')
  expect(statements[0].text).toContain('SELECT provider_receipts_json')
  expect(statements[0].text).toContain('LIMIT 0')
 })
 it.each([0n,1n])('appends in the same lease-and-attempt CAS; late finalization updates nothing (%s)',async affected=>{
  execute.mockResolvedValue({numAffectedRows:affected})
  const observation=metaReceiptObservation(context,JSON.stringify(receipt))

  expect(await finishMeasurementDelivery(row,{success:true,httpStatus:200,retryable:false,errorClass:null,metaObservation:observation})).toBe(affected===1n)
  expect(execute).toHaveBeenCalledTimes(1)
  expect(statements.some(s=>s.text.includes('provider_receipts_json = provider_receipts_json ||'))).toBe(true)
  const final=statements.at(-1)!

  expect(final.text).toContain("state = 'sending' AND lease_token =")
  expect(final.text).toContain('AND attempts =')
  expect(final.values).toContain(row.lease_token)
  expect(final.values).toContain(row.attempts)
 })
 it('replaces a foreign receipt with invalid metadata while preserving HTTP success',async()=>{
  execute.mockResolvedValue({numAffectedRows:1n})
  const observation=metaReceiptObservation(context,JSON.stringify(receipt))

  await finishMeasurementDelivery(row,{success:true,httpStatus:200,retryable:false,errorClass:null,
    metaObservation:{...observation,attemptId:prepared.eventId}})
  const values=statements.flatMap(s=>s.values).filter((v):v is string=>typeof v==='string')
  const record=JSON.parse(values.find(v=>v.startsWith('[{"contract":"meta-attempt-receipt.v1"'))!)[0]

  expect(record).toMatchObject({status:'invalid',attemptId:row.lease_token})
  expect(record).not.toHaveProperty('receipt')
  expect(statements.at(-1)!.values).toContain('http_accepted')
 })
 it('does not append Meta receipts to Google deliveries',async()=>{
  execute.mockResolvedValue({numAffectedRows:1n})
  await finishMeasurementDelivery({...row,destination:'google_upd'},{success:true,httpStatus:204,retryable:false,errorClass:null})
  expect(statements.some(s=>s.text.includes('provider_receipts_json ='))).toBe(false)
 })
})
