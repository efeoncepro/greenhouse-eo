/** Initial equivalence only. Future source enablement uses policy data, never this seed list. */
import { createHash } from 'node:crypto'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv(); applyGreenhousePostgresProfile('ops')

async function main() {
  const {closeGreenhousePostgres}=await import('../../src/lib/db')

  try {
    const {listMeasurementSources}=await import('../../src/lib/growth/measurement/policy-source')
    const {listMeasurementPolicies}=await import('../../src/lib/growth/measurement/policy-store')
    const {executeMeasurementPolicyCommand}=await import('../../src/lib/growth/measurement/policy-command')
    const {getFormDefinitionByKey}=await import('../../src/lib/growth/forms/store')
    const legacy=new Set(['efeonce-aeo-diagnostic','efeonce-seo-diagnostic','efeonce-desarrollo-web-cotizacion','efeonce-lead-gen-web','efeonce-social-audit','ai-visibility-grader'])
    const sources=await listMeasurementSources()
    const candidates=[]

    for(const source of sources) {
      if(source.blockingReasons.length) continue
      if(source.scope.sourceKind==='form_submission') {
        const form=await getFormDefinitionByKey(source.scope.sourceKey)

        if(!form || !legacy.has(form.slug)) continue
      } else if(source.scope.sourceKey!=='discovery'||source.scope.surfaceId!=='fhsf-efeonce-lead-gen-web') continue
      const mapping:Record<string,string>={}

      for(const target of ['email','phone','firstName','lastName']) if(source.fields.some(f=>f.key===target)) mapping[target]=target
      candidates.push({source,config:{purpose:'commercial_lead' as const,sourceVersion:source.sourceVersion,origins:source.origins,mapping,destinations:['meta','google_upd'] as const}})
    }

    if(candidates.length!==7 || new Set(candidates.filter(c=>c.source.scope.sourceKind==='form_submission').map(c=>c.source.scope.sourceKey)).size!==6) throw Error('equivalence_seed_scope_mismatch')
    const apply=process.argv.includes('--apply')

    if(apply) {
      const actorId=process.env.MEASUREMENT_POLICY_ACTOR_ID

      if(!actorId || !/^[A-Za-z0-9_:@./-]{1,160}$/.test(actorId)) throw Error('explicit_MEASUREMENT_POLICY_ACTOR_ID_required')
      // Trusted local ops CLI, not an HTTP-provided actor. DB profile+operator authorization
      // govern this seed; UI/API derive the actor from the canonical authenticated session.
      const actor={userId:actorId,tenantType:'efeonce_internal' as const,roleCodes:['efeonce_admin'],primaryRoleCode:'efeonce_admin',routeGroups:['internal'],authorizedViews:[]}
      const policies=await listMeasurementPolicies()

      const key=(value:string)=>{const h=createHash('sha256').update(value).digest('hex');

return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`}

      for(const {source,config} of candidates) {
        const current=policies.find(p=>p.state==='published'&&p.publishedRevisionId===p.revisionId&&p.scope.sourceKind===source.scope.sourceKind&&p.scope.sourceKey===source.scope.sourceKey&&p.scope.surfaceId===source.scope.surfaceId)

        if(current) {
          if(current.config.sourceVersion!==config.sourceVersion) throw Error('existing_policy_version_drift')
          continue // Never overwrite an operator-managed existing configuration.
        }

        const prefix='TASK-2036:'+source.scope.sourceKind+':'+source.scope.sourceKey+':'+source.scope.surfaceId+':'+source.sourceVersion
        const draft=await executeMeasurementPolicyCommand(actor,{action:'draft',scope:source.scope,config,expectedPublishedRevisionId:null,idempotencyKey:key(prefix+':draft')})

        if(!draft.ok||!draft.policy) throw Error('seed_draft_failed')

        for(const action of ['review','publish'] as const) {
          const result=await executeMeasurementPolicyCommand(actor,{action,policyId:draft.policy.policyId,revisionId:draft.policy.revisionId,expectedPublishedRevisionId:null,idempotencyKey:key(prefix+':'+action)})

          if(!result.ok) throw Error('seed_'+action+'_failed')
        }
      }
    }

    console.log(JSON.stringify({applied:apply,forms:6,meetingBindings:1,items:candidates.map(c=>({scope:c.source.scope,sourceVersion:c.source.sourceVersion,mapping:c.config.mapping,origins:c.config.origins}))}))
  } finally {await closeGreenhousePostgres()}
}

main().catch(()=>{console.error('measurement_policy_seed_failed_no_sensitive_payload_logged');process.exitCode=1})
