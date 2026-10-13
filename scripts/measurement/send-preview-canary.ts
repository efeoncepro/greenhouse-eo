import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

import { buildMeasurementPayloads } from '../../src/lib/growth/measurement/payload'

const origin='https://efeonce-gtm-tagging-183008134038.us-central1.run.app'

async function main(){
 const token=readFileSync('.auth/task-2034-ingress-token','utf8')
 const preview=readFileSync('.auth/task-2034-preview-header','utf8')
 const now=new Date()
 const context={source:'hubspot_categories',policyVersion:'efeonce-categories-2026-10-13',capturedAt:now.toISOString(),advertisement:true,analytics:false,globalPrivacyControl:false}

 const fixtures=[
  {sourceKind:'form_submission' as const,sourceId:'synthetic-canary',origin:'https://efeoncepro.com',pageUri:'/aeo-2/',surfaceId:'fhsf-aeo',formSlug:'efeonce-aeo-diagnostic'},
  {sourceKind:'meeting_booking' as const,sourceId:'synthetic-canary',origin:'https://think.efeoncepro.com',pageUri:'/web-agentica/',surfaceId:'fhsf-efeonce-lead-gen-web',schedulerKey:'efeonce-discovery-30'},
 ]

 const receipt:any[]=[]

 for(const scope of fixtures){
  const id=randomUUID()
  const built=buildMeasurementPayloads({scope,contact:{email:'synthetic.lead@example.com',phone:'+12025550148',firstName:'Synthetic',lastName:'Fixture'},measurementContext:context,now,eventId:id})

  if(!built)throw Error('fixture_invalid')
  const body=JSON.stringify(built.meta)
  const r=await fetch(origin+'/efeonce/lead-enrichment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Gtm-Server-Preview':preview},body,signal:AbortSignal.timeout(20000),redirect:'error'})
  const response=await r.json();

receipt.push({kind:scope.sourceKind,host:scope.origin,eventId:id,status:r.status,response,synthetic:true,testEventsOnly:true})
  if(r.status!==200||response.meta_tag_status!=='success')throw Error('canary_failed_'+r.status+'_'+JSON.stringify(response))
  const replay=await fetch(origin+'/efeonce/lead-enrichment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Gtm-Server-Preview':preview},body,signal:AbortSignal.timeout(20000)})
  const replayResponse=await replay.json();

receipt.push({caseName:'same_id_replay',eventId:id,status:replay.status,response:replayResponse,synthetic:true,testEventsOnly:true})
  if(replay.status!==200)throw Error('replay_failed')

  for(const [caseName,payload,credential] of [
   ['bad_auth',built.meta,'0'.repeat(64)],
   ['denied',{...built.meta,meta_ads_consent:'denied'},token],
   ['raw_email',{...built.meta,'x-fb-ud-em':'synthetic.lead@example.com'},token],
  ] as const){
   const n=await fetch(origin+'/efeonce/lead-enrichment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+credential,'X-Gtm-Server-Preview':preview},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)})
   const response=await n.json();

receipt.push({caseName,host:scope.origin,status:n.status,response,synthetic:true})
   if(n.status!==400&&n.status!==401)throw Error('negative_not_blocked')
  }
 }

 writeFileSync('.captures/meta-capi-diagnostic-2026-10-13/matching-preview-canary.json',JSON.stringify(receipt,null,2)+'\n')
 console.log(JSON.stringify(receipt))
}

main().catch(e=>{console.error(e.message);process.exitCode=1})
