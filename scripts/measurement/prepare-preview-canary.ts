import { writeFileSync } from 'node:fs'

import { GoogleAuth, Impersonated } from 'google-auth-library'

const workspace = process.env.META_TEST_WORKSPACE_ID

if (!workspace || !/^\d+$/.test(workspace)) throw Error('META_TEST_WORKSPACE_ID_required')
const base = 'accounts/6068297031/containers/191286361/workspaces/' + workspace

async function main(){
 const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']})
 const imp=new Impersonated({sourceClient:await auth.getClient(),targetPrincipal:'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com',targetScopes:['https://www.googleapis.com/auth/tagmanager.edit.containers','https://www.googleapis.com/auth/tagmanager.edit.containerversions'],lifetime:600})
 const {token}=await imp.getAccessToken()

 const req=async(path:string,method='GET',body?:unknown)=>{
  const r=await fetch('https://tagmanager.googleapis.com/tagmanager/v2/'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})

  if(!r.ok)throw Error('gtm_http_'+r.status);

return r.json()
 }

 // Test code belongs to an authenticated request, never to a shared tag parameter.
 const preview=await req(base+':quick_preview','POST',{})

 if(preview.compilerError)throw Error('compile_error')
 writeFileSync('.auth/task-2034-preview.json',JSON.stringify(preview),{mode:0o600})
 console.log({compiled:true,published:false,testCodeInDraft:false,debugUrlAvailable:Boolean(preview.containerVersion?.container?.taggingServerUrls||preview.debugUrl)})
}

main().catch(e=>{console.error(e.message);process.exitCode=1})
