/** Isolated Meta Test Events canary. Never creates a CRM contact or ordinary dataset event. */
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

import { GoogleAuth } from 'google-auth-library'

import type { buildMeasurementPayloads } from '../../src/lib/growth/measurement/payload'
import { readVisitorMeasurementRequest } from '../../src/lib/growth/measurement/visitor-request'

import { loadGreenhouseToolEnv,applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv();applyGreenhousePostgresProfile('ops')

const origin = 'https://efeonce-gtm-tagging-183008134038.us-central1.run.app'

let stage='init'

async function main() {
  const testCode = process.env.META_TEST_EVENT_CODE

  if (!testCode || !/^TEST[0-9]{1,20}$/.test(testCode)) throw Error('verified_META_TEST_EVENT_CODE_required')
  const previewFile = process.env.META_TEST_PREVIEW_HEADER_FILE
  const preview = previewFile ? readFileSync(previewFile, 'utf8').trim() : undefined
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const client = await auth.getClient()

  const secret = await client.request<{ payload: { data: string } }>({
    url: 'https://secretmanager.googleapis.com/v1/projects/efeonce-group/secrets/greenhouse-measurement-ingress-token/versions/1:access',
  })

  const token = Buffer.from(secret.data.payload.data, 'base64').toString('utf8')

  if (!/^[a-f0-9]{64}$/.test(token)) throw Error('ingress_credential_invalid')
  const now = new Date()
  const timestamp = now.getTime()

  const measurementContext = {
    source: 'hubspot_categories', policyVersion: 'efeonce-categories-2026-10-13', capturedAt: now.toISOString(),
    advertisement: true, analytics: false, globalPrivacyControl: false,
    fbp: `fb.1.${timestamp}.123456789012345`, fbc: `fb.1.${timestamp}.synthetic-test-click`,
  }

  // RFC 5737 reserved IP and an explicitly synthetic agent, never a worker IP/agent fallback.
  const visitor = readVisitorMeasurementRequest(new Headers({ 'x-forwarded-for': '198.51.100.9, 192.0.2.2', 'user-agent': 'Efeonce synthetic visitor browser / Meta Test Events' }))

  const {listMeasurementPolicies}=await import('../../src/lib/growth/measurement/policy-store')
  const policies=await listMeasurementPolicies()
  const form=policies.find(p=>p.state==='published'&&p.scope.surfaceId==='fhsf-ai-visibility-grader')
  const meeting=policies.find(p=>p.state==='published'&&p.scope.sourceKind==='meeting_booking'&&p.scope.sourceKey==='discovery')

  if(!form||!meeting) throw Error('published_test_scopes_required')

  let scopes: Array<Parameters<typeof buildMeasurementPayloads>[0]['scope'] & { policy: typeof form }> = [
    { ...form.scope, sourceVersion:form.config.sourceVersion,sourceId:'synthetic-test-only',origin:'https://think.efeoncepro.com',pageUri:'/web-agentica/',formSlug:'ai-visibility-grader',policy:form },
    { ...meeting.scope,sourceVersion:meeting.config.sourceVersion,sourceId:'synthetic-test-only',origin:'https://efeoncepro.com',pageUri:'/contacto/',schedulerKey:'discovery',policy:meeting },
  ]

  const isolatedPolicyId=process.env.META_TEST_POLICY_ID

  if(isolatedPolicyId) {
    if(!/^[a-f0-9-]{36}$/i.test(isolatedPolicyId)) throw Error('invalid_test_policy_id')
    const policy=policies.find(value=>value.policyId===isolatedPolicyId&&value.state==='published'&&value.publishedRevisionId===value.revisionId)

    if(!policy) throw Error('published_test_policy_required')
    const {resolveMeasurementSource}=await import('../../src/lib/growth/measurement/policy-source')
    const source=await resolveMeasurementSource(policy.scope)

    if(!source || source.blockingReasons.length || !policy.config.destinations.includes('meta')) throw Error('compatible_test_source_required')
    scopes=[{...policy.scope,sourceVersion:policy.config.sourceVersion,sourceId:'synthetic-test-only',origin:policy.config.origins[0],pageUri:'/measurement-proof/',
      ...(policy.scope.sourceKind==='form_submission'?{formSlug:source.formSlug!}:{schedulerKey:policy.scope.sourceKey}),policy}]
  }

  const receipts = []
  const testKey=randomBytes(32).toString('hex')

  for (const scope of scopes) {
    const eventId = randomUUID()
    const contact:Record<string,string>={email:'synthetic.lead@example.com',phone:'+12025550148',firstName:'Synthetic',lastName:'Fixture'}
    const fields=Object.fromEntries(Object.entries(scope.policy.config.mapping).map(([target,key])=>[key,contact[target]]))
    const {prepareMeasurementConversion}=await import('../../src/lib/growth/measurement/prepare')
    const {decryptMeasurementPayload}=await import('../../src/lib/growth/measurement/crypto')
    // Ephemeral test encryption key: exercise the real policy/mapping path without persisting a queue item.

    stage='policy-projection'

    const prepared=await prepareMeasurementConversion({scope,fields,measurementContext,...visitor,now,eventId},
      {...process.env,GROWTH_MEASUREMENT_CAPTURE_ENABLED:'true',GROWTH_MEASUREMENT_PAYLOAD_KEY_SECRET_REF:undefined,GROWTH_MEASUREMENT_PAYLOAD_KEY:testKey})

    if(!prepared || prepared.policyRevisionId!==scope.policy.revisionId) throw Error('policy_projection_required')
    if(prepared.eventId!==eventId) throw Error('occurrence_id_mismatch')
    stage='decrypt-projection'
    const built=decryptMeasurementPayload(prepared.encryptedPayload,testKey,eventId) as NonNullable<ReturnType<typeof buildMeasurementPayloads>>

    stage='verify-projection'
    if (!built?.meta || built.google) throw Error('test_projection_invalid')
    const payload = { ...built.meta, test_event_code: testCode }
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(preview ? { 'X-Gtm-Server-Preview': preview } : {}) }

    const send = async (body: unknown, credentialHeaders = headers) => {
      const response = await fetch(origin + '/efeonce/lead-enrichment', { method: 'POST', headers: credentialHeaders, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000), redirect: 'error' })
      const result = await response.json() as { meta_tag_status?: string }

      return { status: response.status, metaTagStatus: result.meta_tag_status }
    }

    stage='send-test-only'
    const first = await send(payload)

    if (first.status !== 200 || first.metaTagStatus !== 'success') throw Error('meta_test_delivery_failed_' + first.status)
    const replay = await send(payload)

    if (replay.status !== 200 || replay.metaTagStatus !== 'success') throw Error('meta_test_replay_failed')
    const denied = await send({ ...payload, meta_ads_consent: 'denied' })
    const rawIdentity = await send({ ...payload, 'x-fb-ud-external_id': 'synthetic.lead@example.com' })

    if (denied.status !== 400 || rawIdentity.status !== 400) throw Error('negative_gate_failed')
    receipts.push({ eventId, sourceKind: scope.sourceKind, host: scope.origin, eventSourceUrl: payload.page_location,
      actionSource: payload.action_source, eventTimeSeconds: Number.isInteger(payload.event_time),
      suppliedFields: Object.entries({client_ip_address:'ip_override',client_user_agent:'user_agent',fbp:'x-fb-ck-fbp',fbc:'x-fb-ck-fbc',external_id:'x-fb-ud-external_id',em:'x-fb-ud-em',ph:'x-fb-ud-ph',fn:'x-fb-ud-fn',ln:'x-fb-ud-ln'}).filter(([,key])=>key in payload).map(([key])=>key),
      policyProjectionVerified:true,
      first, replay, deniedStatus: denied.status, rawIdentityStatus: rawIdentity.status, testEventsOnly: true, preview: Boolean(preview),
    })
  }

  const receipt = { checkedAt: new Date().toISOString(), dataset: '708931297255942', synthetic: true, receipts }

  if (process.env.META_TEST_RECEIPT_FILE) writeFileSync(process.env.META_TEST_RECEIPT_FILE, JSON.stringify(receipt, null, 2) + '\n')
  console.log(JSON.stringify(receipt))
}

main().finally(async()=>{const {closeGreenhousePostgres}=await import('../../src/lib/db');

await closeGreenhousePostgres()}).catch((error) => { console.error('meta_test_validation_failed_no_sensitive_payload_logged',{stage,failureType:error instanceof Error?error.name:'unknown',authTagMismatch:error instanceof Error&&error.message.includes('authenticate'),missingFunction:error instanceof Error&&error.message.includes('not a function'),code:error instanceof Error&&/^[a-z_0-9]{1,80}$/.test(error.message)?error.message:'failure'}); process.exitCode = 1 })
