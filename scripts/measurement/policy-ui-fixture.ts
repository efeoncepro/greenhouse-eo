/** Controlled configuration fixture only. Never accepts a commercial submission or creates an embed key. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv(); applyGreenhousePostgresProfile('ops')

const actor={userId:'operator-approved:TASK-2035:ui-verification',tenantType:'efeonce_internal' as const,roleCodes:['efeonce_admin'],primaryRoleCode:'efeonce_admin',routeGroups:['internal'],authorizedViews:[]}
const receiptFile=process.env.MEASUREMENT_FIXTURE_RECEIPT
let stage='init'

type Receipt={formId:string;formVersionId:string;sourceKey:string;slug:string;surfaceId?:string;createdAt:string;cleanupVerifiedAt?:string}

async function main() {
  assert(process.argv.includes('--apply') && receiptFile, 'explicit_apply_and_private_receipt_required')
  const {closeGreenhousePostgres}=await import('../../src/lib/db')
  const {authorDraftForm,publishForm,archiveForm,createHostSurface,setHostSurfaceStatusCommand}=await import('../../src/lib/growth/forms/commands')
  const {getPublishedVersionBySlug,getFormDefinitionById,getHostSurfaceById}=await import('../../src/lib/growth/forms/store')
  const {listMeasurementPolicies}=await import('../../src/lib/growth/measurement/policy-store')
  const {executeMeasurementPolicyCommand}=await import('../../src/lib/growth/measurement/policy-command')
  const save=(value:Receipt)=>writeFileSync(receiptFile!,JSON.stringify(value,null,2),{mode:0o600})

  try {
    if(process.argv.includes('prepare')) {
      assert(!existsSync(receiptFile), 'reuse_existing_fixture_receipt')
      const original=await getPublishedVersionBySlug('efeonce-lead-gen-web')

      assert(original)
      stage='author'
      const sourceKey=randomUUID(),slug='measurement-ui-proof-'+randomUUID().slice(0,8)

      const fixture=await authorDraftForm({slug,formKey:sourceKey,name:'TEST — Measurement UI proof',formKind:'contact',purpose:'Controlled configuration-only UI proof',riskProfile:'low',
        fieldSchema:(original.field_schema_json as Array<Record<string,unknown>>).map(field=>({...field,key:field.key==='email'?'businessEmail':field.key})),
        validationSchema:original.validation_schema_json,uiPolicy:original.ui_policy_json,copyRefs:original.copy_refs_json,successBehavior:original.success_behavior_json,
        consentPolicyVersion:original.consent_policy_version!,retentionPolicy:{retentionDays:1,purpose:'metadata-only-test'},destinationPolicy:{mode:'greenhouse_only'},createdBy:actor.userId})

      const receipt:Receipt={...fixture,sourceKey,slug,createdAt:new Date().toISOString()}

      save(receipt)
      stage='publish-source'
      assert((await publishForm(fixture.formVersionId)).ok)
      stage='surface'
      const surface=await createHostSurface({surfaceKind:'generic_html',surfaceName:'TEST — measurement UI proof, no embed key',originAllowlist:['https://efeoncepro.com'],allowedFormSlugs:[slug]})

      receipt.surfaceId=surface.surface_id; save(receipt)
      console.log(JSON.stringify({stage:'prepared',...receipt,embedKeys:0,commercialSubmissions:0,providerRequests:0}))
    } else if(process.argv.includes('cleanup')) {
      const receipt=JSON.parse(readFileSync(receiptFile,'utf8')) as Receipt
      const definition=await getFormDefinitionById(receipt.formId)

      assert(definition?.form_key===receipt.sourceKey && definition.slug===receipt.slug && receipt.slug.startsWith('measurement-ui-proof-'))
      stage='disable'
      const published=(await listMeasurementPolicies()).filter(policy=>policy.scope.sourceKey===receipt.sourceKey && policy.scope.surfaceId===receipt.surfaceId && policy.state==='published')

      for(const policy of published) assert((await executeMeasurementPolicyCommand(actor,{action:'disable',policyId:policy.policyId,revisionId:policy.revisionId,expectedPublishedRevisionId:policy.revisionId,idempotencyKey:randomUUID()})).ok)
      stage='archive'
      await archiveForm(receipt.formVersionId,receipt.formId)
      if(receipt.surfaceId) await setHostSurfaceStatusCommand(receipt.surfaceId,'archived')
      stage='readback'
      assert.equal((await getFormDefinitionById(receipt.formId))?.status,'archived')
      if(receipt.surfaceId) assert.equal((await getHostSurfaceById(receipt.surfaceId))?.status,'archived')
      assert(!(await listMeasurementPolicies()).some(policy=>policy.scope.sourceKey===receipt.sourceKey && policy.state==='published'))
      receipt.cleanupVerifiedAt=new Date().toISOString();save(receipt)
      console.log(JSON.stringify({stage:'cleaned',sourceKey:receipt.sourceKey,cleanupVerifiedAt:receipt.cleanupVerifiedAt,independentReadback:true}))
    } else throw Error('prepare_or_cleanup_required')
  } finally {await closeGreenhousePostgres()}
}

main().catch(()=>{console.error('measurement_ui_fixture_failed_no_sensitive_payload_logged',{stage});process.exitCode=1})
