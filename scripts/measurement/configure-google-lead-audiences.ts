import { writeFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'

import { GoogleAuth, Impersonated } from 'google-auth-library'

const property = 'properties/486264460'

const dimension = (fieldName: string, values: string[]) => ({ dimensionOrMetricFilter: {
  fieldName: fieldName.replace(/^customEvent:/, ''), atAnyPointInTime: true,
  ...(values.length === 1 ? { stringFilter: { matchType: 'EXACT', value: values[0], caseSensitive: true } } : { inListFilter: { values, caseSensitive: true } }),
} })

const clause = (groups: unknown[][]) => {
  // Live Admin API requires singleton OR wrappers inside event-parameter AND groups.
  // Put alternative qualified events in the outer OR so parameters stay bound to generate_lead.
  const combinations = groups.slice(1).reduce<unknown[][]>((sets, alternatives) =>
    sets.flatMap(set => alternatives.map(alternative => [...set, alternative])), [[]])

  return { clauseType: 'INCLUDE', simpleFilter: {
    scope: 'AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS',
    filterExpression: { andGroup: { filterExpressions: [{ orGroup: { filterExpressions: combinations.map(filterExpressions => ({ eventFilter: {
      eventName: 'generate_lead', eventParameterFilterExpression: { andGroup: { filterExpressions: filterExpressions.map(filter => ({ orGroup: { filterExpressions: [filter] } })) } },
    } })) } }] } },
  } }
}

const lead = { eventFilter: { eventName: 'generate_lead' } }
const forms = ['efeonce-aeo-diagnostic','efeonce-seo-diagnostic','efeonce-desarrollo-web-cotizacion','efeonce-lead-gen-web','efeonce-social-audit','ai-visibility-grader']

const specifications = [
  { name:'EO · Leads AEO · 90 días', groups:[[lead],[dimension('customEvent:form_slug',['efeonce-aeo-diagnostic','ai-visibility-grader'])]] },
  { name:'EO · Leads SEO · 90 días', groups:[[lead],[dimension('customEvent:form_slug',['efeonce-seo-diagnostic'])]] },
  { name:'EO · Leads proyectos web · 90 días', groups:[[lead],[dimension('customEvent:form_slug',['efeonce-desarrollo-web-cotizacion'])]] },
  { name:'EO · Leads contacto · 90 días', groups:[[lead],[dimension('customEvent:form_slug',['efeonce-lead-gen-web'])]] },
  { name:'EO · Leads redes sociales · 90 días', groups:[[lead],[dimension('customEvent:form_slug',['efeonce-social-audit'])]] },
  { name:'EO · Reuniones confirmadas · 90 días', groups:[[lead],[dimension('customEvent:lead_source',['meeting_booking'])],[dimension('customEvent:scheduler_key',['efeonce-discovery-30'])],[dimension('customEvent:surface_id',['fhsf-efeonce-lead-gen-web'])]] },
  { name:'EO · Leads comerciales · 90 días', groups:[[lead],[dimension('customEvent:form_slug',forms),dimension('customEvent:lead_source',['meeting_booking'])]] },
]

async function main(){
 const auth = new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']})
 const imp = new Impersonated({sourceClient:await auth.getClient(),targetPrincipal:'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com',targetScopes:['https://www.googleapis.com/auth/analytics.edit'],lifetime:600})
 const {token}=await imp.getAccessToken()

 const req=async(p:string,method='GET',body?:unknown)=>{
  const r=await fetch('https://analyticsadmin.googleapis.com/'+p,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const result=await r.json()

  if(!r.ok)throw Error('ga4_'+r.status+'_'+(result.error?.message||'unknown'))

return result
 }

 const settings=await req('v1alpha/'+property+'/userProvidedDataSettings')

 if(settings.userProvidedDataCollectionEnabled!==true)throw Error('upd_not_enabled')
 const links=await req('v1beta/'+property+'/googleAdsLinks')
 const link=links.googleAdsLinks?.find((l:any)=>l.customerId==='9531478329')

 if(!link||!link.adsPersonalizationEnabled)throw Error('ads_link_not_ready')
 const dimensions=await req('v1beta/'+property+'/customDimensions')
 const addedDimensions=[]

 for(const key of ['lead_source','scheduler_key']){
  const existing=dimensions.customDimensions?.find((d:any)=>d.parameterName===key&&d.scope==='EVENT')
  const d=existing??await req('v1beta/'+property+'/customDimensions','POST',{parameterName:key,displayName:key==='lead_source'?'Origen del Lead':'Agendador',description:'Clasificador comercial sin PII. TASK-2034.',scope:'EVENT'})

  addedDimensions.push({parameterName:key,name:d.name,created:!existing})
 }

 const current=await req('v1alpha/'+property+'/audiences')
 const receipts=[]

 for(const spec of specifications){
  const desired={displayName:spec.name,description:'Lead comercial confirmado; clasificadores del mismo evento. TASK-2034.',membershipDurationDays:90,adsPersonalizationEnabled:true,filterClauses:[clause(spec.groups)]}
  const existing=current.audiences?.find((a:any)=>a.displayName===spec.name)
  const created=existing??await req('v1alpha/'+property+'/audiences','POST',desired)
  const read=await req('v1alpha/'+created.name)

  if(read.membershipDurationDays!==90||read.adsPersonalizationEnabled!==true||!isDeepStrictEqual(read.filterClauses,desired.filterClauses))throw Error('audience_readback_mismatch_'+spec.name)
  receipts.push({name:read.name,displayName:read.displayName,membershipDurationDays:read.membershipDurationDays,adsPersonalizationEnabled:read.adsPersonalizationEnabled,created:!existing,filterClauses:read.filterClauses})
  console.log(JSON.stringify({phase:'audience',name:read.name,displayName:read.displayName}))
 }

 const receipt={propertyId:'486264460',measurementId:'G-KYPPY57M14',googleAdsCustomerId:link.customerId,updEnabled:true,automaticCollectionEnabled:settings.automaticallyDetectedDataCollectionEnabled===true,dimensions:addedDimensions,audiences:receipts,createdAt:new Date().toISOString(),servingEligibilityVerified:false,contactDataUploaded:false}

 writeFileSync('.captures/meta-capi-diagnostic-2026-10-13/google-lead-audiences-receipt.json',JSON.stringify(receipt,null,2)+'\n')
 console.log(JSON.stringify({updEnabled:true,audienceCount:receipts.length,readbackVerified:true,servingEligibilityVerified:false}))
}

main().catch(e=>{console.error(e.message);process.exitCode=1})
