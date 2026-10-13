import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { createHash, randomBytes } from 'node:crypto'

import { GoogleAuth, Impersonated } from 'google-auth-library'

const parent = 'accounts/6068297031/containers/191286361'
const str = (string: string) => ({ type: 1, string })
const bool = (boolean: boolean) => ({ type: 8, boolean })
const param = (key: string, value: unknown) => ({ key, value })
const headerRows = (names: string[]) => ({ type: 2, listItem: names.map(name => ({ type: 3, mapKey: [str('headerName')], mapValue: [str(name)] })) })
const permission = (publicId: string, params: unknown[] = []) => ({ instance: { key: { publicId, versionId: '1' }, param: params }, clientAnnotations: { isEditedByUser: true }, isRequired: true })

const permissions = [
  permission('read_request', [param('requestAccess', str('specific')), param('bodyAllowed', bool(true)), param('pathAllowed', bool(true)), param('headersAllowed', bool(true)), param('headerAccess', str('specific')), param('headerWhitelist', headerRows(['authorization']))]),
  permission('run_container'), permission('read_event_metadata'),
  permission('access_response', [param('writeResponseAccess', str('specific')), param('writeStatusAllowed', bool(true)), param('writeBodyAllowed', bool(true)), param('writeHeadersAllowed', bool(true)), param('writeHeaderAccess', str('specific')), param('writeHeaderWhitelist', headerRows(['content-type']))]),
  permission('return_response'),
]

const code = readFileSync('scripts/measurement/sgtm-lead-client.js', 'utf8')

const templateData = [
  '___TERMS_OF_SERVICE___\n\n',
  '___INFO___\n'+JSON.stringify({type:'CLIENT',id:'efeonce-backend-lead',version:1,displayName:'Efeonce backend Lead ingress',description:'Authenticated, scoped Meta Lead ingress; hashes only. TASK-2034.',containerContexts:['SERVER']}, null, 2),
  '___TEMPLATE_PARAMETERS___\n'+JSON.stringify([{type:'TEXT',name:'tokenDigest',displayName:'SHA256 digest of bearer token',simpleValueType:true},{type:'TEXT',name:'metaTagId',displayName:'Meta CAPI tag ID',simpleValueType:true}],null,2),
  '___SANDBOXED_JS_FOR_SERVER___\n'+code,
  '___SERVER_PERMISSIONS___\n'+JSON.stringify(permissions,null,2),
  '___TESTS___\n\nscenarios: []',
  '___NOTES___\n\nSource: scripts/measurement/sgtm-lead-client.js. All compilation and runtime verification required before publication.',
].join('\n\n')

async function main(){
 const a=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']})
 const i=new Impersonated({sourceClient:await a.getClient(),targetPrincipal:'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com',targetScopes:['https://www.googleapis.com/auth/tagmanager.edit.containers','https://www.googleapis.com/auth/tagmanager.edit.containerversions'],lifetime:600})
 const {token}=await i.getAccessToken()

 if(!token)throw Error('auth_unavailable')

 const req=async(p:string,method='GET',body?:unknown)=>{
  await new Promise(r=>setTimeout(r,4500))
  const r=await fetch('https://tagmanager.googleapis.com/tagmanager/v2/'+p,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})

  if(!r.ok){const e=await r.json();

throw Error('gtm_'+r.status+'_'+(e.error?.message||'unknown'))}

return r.json()
 }

 const live=await req(parent+'/versions:live')

 if(live.containerVersionId!=='5')throw Error('unexpected_live_version')
 const workspaces=await req(parent+'/workspaces')
 const name='lead-matching-backend-20261013'
 const workspace=workspaces.workspace?.find((w:any)=>w.name===name)??await req(parent+'/workspaces','POST',{name,description:'TASK-2034 backend enrichment. Draft only; preserve PageView; Meta Lead sender cutover requires backend rollout.'})
 const base=workspace.path

 console.log(JSON.stringify({phase:'workspace',id:workspace.workspaceId,liveVersion:'5',published:false}))
 mkdirSync('.auth',{recursive:true,mode:0o700})
 const credentialPath='.auth/task-2034-ingress-token'

 if(!existsSync(credentialPath))writeFileSync(credentialPath,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'})
 if((statSync(credentialPath).mode&0o077)!==0)throw Error('credential_mode_invalid')
 const ingressToken=readFileSync(credentialPath,'utf8')

 if(!/^[a-f0-9]{64}$/.test(ingressToken))throw Error('credential_invalid')
 const digest=createHash('sha256').update(ingressToken).digest('hex')
 const list=await req(base+'/templates')
 let template=list.customTemplate?.find((t:any)=>t.name==='Efeonce backend Lead ingress')

 if(!template)template=await req(base+'/templates','POST',{name:'Efeonce backend Lead ingress',templateData})
 else template=await req(template.path+'?fingerprint='+encodeURIComponent(template.fingerprint),'PUT',{name:template.name,templateData})
 console.log(JSON.stringify({phase:'template',id:template.templateId}))
 const clients=await req(base+'/clients')
 const clientSpec={name:'Efeonce backend Lead ingress',type:`cvt_191286361_${template.templateId}`,priority:100,parameter:[{type:'template',key:'tokenDigest',value:digest},{type:'template',key:'metaTagId',value:'6'}]}
 let client=clients.client?.find((c:any)=>c.name===clientSpec.name)

 if(!client)client=await req(base+'/clients','POST',clientSpec)
 else client=await req(client.path+'?fingerprint='+encodeURIComponent(client.fingerprint),'PUT',clientSpec)
 const variables=await req(base+'/variables')
 const variable=variables.variable?.find((v:any)=>v.name==='ED - backend_verified')??await req(base+'/variables','POST',{name:'ED - backend_verified',type:'ed',parameter:[{type:'template',key:'keyPath',value:'backend_verified'}]})
 const condition=(type:string,ref:string,value:string)=>({type,parameter:[{type:'template',key:'arg0',value:ref},{type:'template',key:'arg1',value}]})
 const triggerSpec={name:'Meta CAPI - Lead - authenticated backend',type:'always',filter:[condition('equals','{{Client Name}}','Efeonce backend Lead ingress'),condition('equals','{{ED - backend_verified}}','1'),condition('equals','{{ED - meta_ads_consent}}','granted'),condition('equals','{{Event Name}}','generate_lead'),condition('matchRegex','{{ED - event_id}}','^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$')]}
 const triggers=await req(base+'/triggers')
 const trigger=triggers.trigger?.find((t:any)=>t.name===triggerSpec.name)??await req(base+'/triggers','POST',triggerSpec)
 const tags=await req(base+'/tags')
 const tag=tags.tag?.find((t:any)=>t.tagId==='6')

 if(!tag||!tag.parameter.some((p:any)=>p.key==='pixelId'&&p.value==='708931297255942'))throw Error('meta_tag_mismatch')
 // Add backend trigger in draft; remove browser Lead triggers only at approved production cutover.
 const firing=Array.from(new Set([...tag.firingTriggerId,trigger.triggerId]))

 await req(tag.path+'?fingerprint='+encodeURIComponent(tag.fingerprint),'PUT',{name:tag.name,type:tag.type,parameter:tag.parameter,firingTriggerId:firing,consentSettings:tag.consentSettings})
 const preview=await req(base+':quick_preview','POST',{})
 const receipt={workspace:workspace.workspaceId,baseVersion:'5',templateId:template.templateId,clientId:client.clientId,variableId:variable.variableId,triggerId:trigger.triggerId,sourceSha256:createHash('sha256').update(code).digest('hex'),compilerError:Boolean(preview.compilerError),syncStatusOk:!preview.syncStatus?.mergeConflict&&!preview.syncStatus?.syncError,published:false,legacyLeadTriggersRetained:true}

 writeFileSync('.captures/meta-capi-diagnostic-2026-10-13/lead-matching-server-draft.json',JSON.stringify(receipt,null,2)+'\n')
 console.log(JSON.stringify(receipt))
 if(receipt.compilerError||!receipt.syncStatusOk)throw Error('draft_compile_rejected')
}

main().catch(e=>{console.error(e.message);process.exitCode=1})
