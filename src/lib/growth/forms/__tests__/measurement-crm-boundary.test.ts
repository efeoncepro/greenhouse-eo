import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PoolClient } from 'pg'

const { query, publishOutboxEvent }=vi.hoisted(()=>({query:vi.fn(),publishOutboxEvent:vi.fn()}))

vi.mock('@/lib/db',()=>({query:vi.fn(),getDb:vi.fn(),withTransaction:vi.fn(async(callback:(client:PoolClient)=>unknown)=>callback({query} as unknown as PoolClient))}))
vi.mock('@/lib/sync/publish-event',()=>({publishOutboxEvent}))

import { persistAcceptedSubmission, type PersistSubmissionInput } from '../store'
import { buildSecureSubmitBody } from '../destinations/hubspot/adapter'
import type { PreparedMeasurement } from '@/lib/growth/measurement/contracts'

const prepared:PreparedMeasurement={policyRevisionId:'a879b155-a143-40bd-9b15-731c2b62d174',eventId:'a879b155-a143-40bd-9b15-731c2b62d173',occurredAt:'2026-10-14T12:00:00Z',
  consent:{source:'hubspot_categories',policyVersion:'efeonce-categories-2026-10-13',capturedAt:'2026-10-14T12:00:00Z',advertisement:true,analytics:true,globalPrivacyControl:false},
  encryptedPayload:{v:1,iv:'fixture',tag:'fixture',ciphertext:'fixture'},destinations:['meta']}

const input:PersistSubmissionInput={formId:'fixture-form',formVersionId:'fixture-version',surfaceId:null,pageUri:null,pageName:null,leadEmailHash:null,
  normalizedFields:{businessEmail:'synthetic@example.com',firstName:'Synthetic'},dedupeFingerprint:null,requestId:null,ipHash:null,consent:{consentPolicyVersion:'fixture',checkboxes:['privacy']}}

afterEach(()=>vi.restoreAllMocks())

describe('Growth Forms → HubSpot Forms → CRM / measurement boundary',()=>{
  it.each(['no_advertising_consent','policy_revoked','measurement_unavailable'] as const)('preserves acceptance, consent and CRM outbox when %s',async mode=>{
    query.mockReset();publishOutboxEvent.mockReset()
    const row={submission_id:'fixture-submission',form_id:input.formId,form_version_id:input.formVersionId,normalized_fields_json:input.normalizedFields,status:'accepted'}

    query.mockImplementation(async(text:string)=>{
      if(text.includes('INSERT INTO greenhouse_growth.form_submission (')) return {rows:[row]}
      if(text.includes('SELECT p.policy_id') && mode==='measurement_unavailable') throw Error('private-database-detail')

      return {rows:[]}
    })
    const warning=vi.spyOn(console,'warn').mockImplementation(()=>{})
    const accepted=await persistAcceptedSubmission({...input,measurement:mode==='no_advertising_consent'?null:prepared})

    expect(accepted.status).toBe('accepted')
    expect(accepted.measurementPersisted).toBe(false)
    expect(accepted.normalized_fields_json).toEqual(input.normalizedFields)
    expect(query.mock.calls.some(([statement])=>statement.includes('INSERT INTO greenhouse_growth.form_submission_consent_snapshot'))).toBe(true)
    expect(publishOutboxEvent).toHaveBeenCalledWith(expect.objectContaining({eventType:'growth.forms.submission_accepted',aggregateId:'fixture-submission'}),expect.objectContaining({query}))
    // The existing destination mapping still receives its own normalized fields.
    const crm=buildSecureSubmitBody(accepted,null,{fieldMapping:{businessEmail:'email',firstName:'firstname'}})

    expect(crm.fields).toEqual([{name:'email',value:'synthetic@example.com'},{name:'firstname',value:'Synthetic'}])
    expect(query.mock.calls.some(([statement])=>statement.includes('INSERT INTO greenhouse_growth.measurement_conversion'))).toBe(false)
    expect(JSON.stringify(warning.mock.calls)).not.toContain('private-database-detail')
  })
})
