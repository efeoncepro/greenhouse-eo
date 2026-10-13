import { readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { GoogleAuth, Impersonated } from 'google-auth-library'

import { parseEnvFile } from '../lib/load-greenhouse-tool-env'

const project = 'efeonce-group'
const identity = 'greenhouse-portal@efeonce-group.iam.gserviceaccount.com'

async function main(){
 const env = parseEnvFile(readFileSync('.auth/task-2034-production.env','utf8'))
 // Deployment metadata is sufficient to bind the scoped grant; never decode its private key.
 const runtimeIdentity = env.GCP_SERVICE_ACCOUNT_EMAIL

 if(runtimeIdentity!==identity)throw Error('production_runtime_identity_mismatch')
 const auth = new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']})
 const imp = new Impersonated({sourceClient:await auth.getClient(),targetPrincipal:'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com',targetScopes:['https://www.googleapis.com/auth/analytics.edit'],lifetime:600})
 const {token}=await imp.getAccessToken()

 const analyticsReq=async(path:string,method='GET',body?:unknown)=>{
  const r=await fetch('https://analyticsadmin.googleapis.com/'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const b=await r.json();

if(!r.ok)throw Error('ga4_secret_http_'+r.status+'_'+(b.error?.message||'unknown'));

return b
 }

 const stream='properties/486264460/dataStreams/10593675149'
 const listed=await analyticsReq('v1beta/'+stream+'/measurementProtocolSecrets')
 const displayName='Efeonce Lead UPD - backend'
 const mp=listed.measurementProtocolSecrets?.find((s:any)=>s.displayName===displayName)??await analyticsReq('v1beta/'+stream+'/measurementProtocolSecrets','POST',{displayName})

 if(!mp.secretValue)throw Error('mp_secret_value_unavailable')
 const secrets = new SecretManagerServiceClient({auth})

 const values = [
  {name:'greenhouse-measurement-payload-key',value:randomBytes(32).toString('hex')},
  {name:'greenhouse-measurement-ingress-token',value:readFileSync('.auth/task-2034-ingress-token','utf8')},
  {name:'greenhouse-measurement-ga4-api-secret',value:mp.secretValue},
 ]

 const receipts=[]

 for(const item of values){
  const name=`projects/${project}/secrets/${item.name}`
  let exists=true

  try{await secrets.getSecret({name})}catch(e:any){if(e.code!==5)throw Error('secret_metadata_'+e.code);exists=false}
  if(!exists)await secrets.createSecret({parent:`projects/${project}`,secretId:item.name,secret:{replication:{automatic:{}}}})
  let version

  if(!exists){[version]=await secrets.addSecretVersion({parent:name,payload:{data:Buffer.from(item.value,'utf8')}})}
  else {const [versions]=await secrets.listSecretVersions({parent:name,filter:'state=ENABLED',pageSize:1});

version=versions[0];if(!version)throw Error('existing_secret_has_no_enabled_version')}

  const [policy]=await secrets.getIamPolicy({resource:name})
  const member=`serviceAccount:${identity}`
  const accessor=policy.bindings?.find(b=>b.role==='roles/secretmanager.secretAccessor')

  if(!accessor?.members?.includes(member)){
   if(accessor)accessor.members=[...(accessor.members||[]),member]
   else policy.bindings=[...(policy.bindings||[]),{role:'roles/secretmanager.secretAccessor',members:[member]}]
   await secrets.setIamPolicy({resource:name,policy})
  }

  const [accessed]=await secrets.accessSecretVersion({name:version.name})
  const actual=Buffer.from(accessed.payload?.data as Uint8Array).toString('utf8')

  if(item.name.endsWith('ingress-token')&&actual!==item.value)throw Error('ingress_secret_draft_mismatch')
  if(item.name.endsWith('ga4-api-secret')&&actual!==item.value)throw Error('mp_secret_mismatch')
  if(item.name.endsWith('payload-key')&&!/^[a-f0-9]{64}$/.test(actual))throw Error('payload_key_invalid')
  receipts.push({secret:item.name,ref:version.name,created:!exists,runtimeAccessor:identity,readbackVerified:true})
 }

 const receipt={project,propertyId:'486264460',streamId:'10593675149',mpSecretName:mp.name,secrets:receipts,environmentConfigured:false,createdAt:new Date().toISOString()}

 writeFileSync('.captures/meta-capi-diagnostic-2026-10-13/matching-secrets-receipt.json',JSON.stringify(receipt,null,2)+'\n')
 console.log(JSON.stringify(receipt))
}

main().catch(e=>{console.error(e.message);process.exitCode=1})
