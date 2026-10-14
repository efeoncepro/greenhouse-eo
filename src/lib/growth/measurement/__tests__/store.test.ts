import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PoolClient } from 'pg'

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }))

vi.mock('@/lib/db', () => ({ getDb: vi.fn(async () => ({})) }))
vi.mock('kysely', () => ({ sql: Object.assign(vi.fn(() => ({ execute })), { join: vi.fn() }) }))

import { enqueueMeasurementConversion, finishMeasurementDelivery } from '../store'
import type { PreparedMeasurement } from '../contracts'

const prepared: PreparedMeasurement = {
 policyRevisionId:'a879b155-a143-40bd-9b15-731c2b62d174',
 eventId: 'a879b155-a143-40bd-9b15-731c2b62d173', occurredAt: '2026-10-13T20:00:00Z',
 consent: { source:'hubspot_categories', policyVersion:'efeonce-categories-2026-10-13',capturedAt:'2026-10-13T20:00:00Z',advertisement:true,analytics:true,globalPrivacyControl:false },
 encryptedPayload:{v:1,iv:'fixture',tag:'fixture',ciphertext:'fixture'},destinations:['meta','google_upd'],
}

beforeEach(()=>vi.clearAllMocks())
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
