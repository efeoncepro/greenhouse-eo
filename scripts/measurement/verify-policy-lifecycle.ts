/** Controlled metadata-only proof. No submission, CRM contact, queue item or provider request. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

import { sql } from 'kysely'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv(); applyGreenhousePostgresProfile('ops')

let stage='init'

async function main() {
  if(!process.argv.includes('--apply')) throw Error('explicit_apply_required')
  const {getDb,closeGreenhousePostgres}=await import('../../src/lib/db')
  const {authorDraftForm,publishForm,archiveForm,createHostSurface,setHostSurfaceStatusCommand}=await import('../../src/lib/growth/forms/commands')
  const {getPublishedVersionBySlug,getFormDefinitionById,getHostSurfaceById}=await import('../../src/lib/growth/forms/store')
  const {resolveMeasurementSource}=await import('../../src/lib/growth/measurement/policy-source')
  const {executeMeasurementPolicyCommand}=await import('../../src/lib/growth/measurement/policy-command')
  const {resolvePublishedMeasurementPolicy,measurementPolicyAllowsDelivery}=await import('../../src/lib/growth/measurement/policy-store')
  const {buildMeasurementPayloads}=await import('../../src/lib/growth/measurement/payload')
  const actor={userId:'operator-approved:TASK-2035:verification',tenantType:'efeonce_internal' as const,roleCodes:['efeonce_admin'],primaryRoleCode:'efeonce_admin',routeGroups:['internal'],authorizedViews:[]}
  let fixture:{formId:string;formVersionId:string}|undefined, surfaceId:string|undefined, published:{policyId:string;revisionId:string}|undefined
  let receipt: Record<string,unknown>|undefined

  try {
    const db=await getDb(),original=await getPublishedVersionBySlug('efeonce-lead-gen-web')

    assert(original)
    const slug='measurement-proof-'+randomUUID().slice(0,8),formKey=randomUUID()

    stage='author'
    fixture=await authorDraftForm({slug,formKey,name:'TEST — Measurement configuration proof',formKind:'contact',purpose:'Controlled metadata-only verification; no visitor submissions',riskProfile:'low',
      fieldSchema:(original.field_schema_json as Array<Record<string,unknown>>).map(f=>({...f,key:f.key==='email'?'businessEmail':f.key})),
      validationSchema:original.validation_schema_json,uiPolicy:original.ui_policy_json,copyRefs:original.copy_refs_json,
      successBehavior:original.success_behavior_json,consentPolicyVersion:original.consent_policy_version!,retentionPolicy:{retentionDays:1,purpose:'metadata-only-test'},
      destinationPolicy:{mode:'greenhouse_only'},createdBy:actor.userId})
    stage='publish-source'
    const sourcePublication=await publishForm(fixture.formVersionId)

    if(!sourcePublication.ok) console.log(JSON.stringify({stage,blockingReasons:sourcePublication.blockingReasons}))
    assert(sourcePublication.ok)
    stage='surface'
    const surface=await createHostSurface({surfaceKind:'generic_html',surfaceName:'TEST — measurement proof, no embed key',originAllowlist:['https://efeoncepro.com'],allowedFormSlugs:[slug]})

    surfaceId=surface.surface_id
    const scope={sourceKind:'form_submission' as const,sourceKey:formKey,surfaceId}
    const source=await resolveMeasurementSource(scope)

    assert(source);assert.deepEqual(source.blockingReasons,[])
    const config={purpose:'commercial_lead' as const,sourceVersion:source.sourceVersion,origins:['https://efeoncepro.com'] as const,mapping:{email:'businessEmail'},destinations:['meta'] as const}
    const draftInput={action:'draft' as const,scope,config,expectedPublishedRevisionId:null,idempotencyKey:randomUUID()}

    stage='draft'
    const draft=await executeMeasurementPolicyCommand(actor,draftInput)

    if(!draft.ok) console.log(JSON.stringify({stage,error:draft.error,blockingReasons:draft.blockingReasons}))
    assert(draft.ok&&draft.policy)
    const replay=await executeMeasurementPolicyCommand(actor,draftInput)

    assert.deepEqual(replay,draft)
    assert.equal((await executeMeasurementPolicyCommand(actor,{...draftInput,config:{...config,destinations:[]}})).error,'conflict')
    assert.equal((await executeMeasurementPolicyCommand({...actor,tenantType:'client' as const},draftInput)).error,'forbidden')
    const ids={policyId:draft.policy.policyId,revisionId:draft.policy.revisionId}

    assert.equal((await executeMeasurementPolicyCommand(actor,{action:'publish',...ids,expectedPublishedRevisionId:null,idempotencyKey:randomUUID()})).error,'conflict')
    for(const action of ['review','publish'] as const) assert((await executeMeasurementPolicyCommand(actor,{action,...ids,expectedPublishedRevisionId:null,idempotencyKey:randomUUID()})).ok)
    published=ids
    stage='published-readback'
    const policy=await resolvePublishedMeasurementPolicy(scope,source.sourceVersion,'https://efeoncepro.com')

    assert(policy);assert(await measurementPolicyAllowsDelivery(ids.revisionId,'meta'))
    assert.equal(await measurementPolicyAllowsDelivery(ids.revisionId,'google_upd'),false)
    const now=new Date()

    stage='payload'

    const payload=buildMeasurementPayloads({scope:{...scope,sourceVersion:source.sourceVersion,sourceId:'metadata-only-proof',origin:'https://efeoncepro.com',pageUri:'/measurement-proof/',formSlug:slug},
      policy,contact:{email:'synthetic.lead@example.com'},measurementContext:{source:'hubspot_categories',policyVersion:'efeonce-categories-2026-10-13',capturedAt:now.toISOString(),advertisement:true,analytics:false,globalPrivacyControl:false},now})

    assert(payload&&payload.meta.measurement_policy.source_key===formKey)
    assert.equal(payload.meta.action_source,'website')
    assert.equal((await executeMeasurementPolicyCommand(actor,{action:'disable',...ids,expectedPublishedRevisionId:randomUUID(),idempotencyKey:randomUUID()})).error,'conflict')
    let immutable=false

    try {await db.transaction().execute(async tx=>{await sql`UPDATE greenhouse_growth.measurement_policy_revision SET config_json='{}'::jsonb WHERE revision_id=${ids.revisionId}::uuid`.execute(tx)})} catch {immutable=true}
    assert(immutable)
    assert((await executeMeasurementPolicyCommand(actor,{action:'disable',...ids,expectedPublishedRevisionId:ids.revisionId,idempotencyKey:randomUUID()})).ok)
    published=undefined
    assert.equal(await measurementPolicyAllowsDelivery(ids.revisionId,'meta'),false)
    assert.equal(await resolvePublishedMeasurementPolicy(scope,source.sourceVersion,'https://efeoncepro.com'),null)
    const audit=await sql<{n:string}>`SELECT count(*)::text AS n FROM greenhouse_growth.measurement_policy_audit WHERE policy_id=${ids.policyId}::uuid`.execute(db)

    assert.equal(audit.rows[0].n,'4')
    receipt={checkedAt:new Date().toISOString(),sourceKey:formKey,sourceVersion:source.sourceVersion,policyId:ids.policyId,
      proof:{newSourceWithoutCodeChange:true,typedCustomEmail:true,idempotency:true,keyReuseConflict:true,clientDenied:true,publishRequiresReview:true,
      publishedReadback:true,independentDestinations:true,website:true,staleRevisionConflict:true,immutable:true,disabledBlocksDelivery:true,auditActions:4},
      providerRequests:0,commercialSubmissions:0}
  } finally {
    stage='cleanup'

    try {
      if(published) assert((await executeMeasurementPolicyCommand(actor,{action:'disable',...published,expectedPublishedRevisionId:published.revisionId,idempotencyKey:randomUUID()})).ok)

      if(fixture) {
        await archiveForm(fixture.formVersionId,fixture.formId)
        assert.equal((await getFormDefinitionById(fixture.formId))?.status,'archived')
      }

      if(surfaceId) {
        await setHostSurfaceStatusCommand(surfaceId,'archived')
        assert.equal((await getHostSurfaceById(surfaceId))?.status,'archived')
      }
    } finally { await closeGreenhousePostgres() }
  }

  console.log(JSON.stringify({...receipt,cleanup:'policy disabled; fixture and surface archived',independentCleanupReadback:true}))
}

main().catch((e)=>{console.error('measurement_policy_verification_failed_no_sensitive_payload_logged',{stage,code:typeof e.code==='string'?e.code:'assertion'});process.exitCode=1})
