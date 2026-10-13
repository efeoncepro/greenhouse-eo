import { writeFileSync } from 'node:fs'

import { GoogleAuth, Impersonated } from 'google-auth-library'

const base='accounts/6068297031/containers/191286361/workspaces/8'

async function main(){
 const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']})
 const imp=new Impersonated({sourceClient:await auth.getClient(),targetPrincipal:'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com',targetScopes:['https://www.googleapis.com/auth/tagmanager.edit.containers','https://www.googleapis.com/auth/tagmanager.edit.containerversions'],lifetime:600})
 const {token}=await imp.getAccessToken()

 const req=async(path:string,method='GET',body?:unknown)=>{
  const r=await fetch('https://tagmanager.googleapis.com/tagmanager/v2/'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})

  if(!r.ok)throw Error('gtm_http_'+r.status);

return r.json()
 }

 const tags=await req(base+'/tags');const tag=tags.tag.find((t:any)=>t.tagId==='6')

 if(!tag?.parameter.some((p:any)=>p.key==='pixelId'&&p.value==='708931297255942'))throw Error('dataset_mismatch')
 const clear=process.argv.includes('--clear')
 const params=tag.parameter.filter((p:any)=>p.key!=='testEventCode')

 if(!clear)params.push({type:'template',key:'testEventCode',value:'TEST26211'})
 await new Promise(r=>setTimeout(r,4500))
 await req(tag.path+'?fingerprint='+encodeURIComponent(tag.fingerprint),'PUT',{name:tag.name,type:tag.type,parameter:params,firingTriggerId:tag.firingTriggerId,consentSettings:tag.consentSettings})
 await new Promise(r=>setTimeout(r,4500))
 const preview=await req(base+':quick_preview','POST',{})

 if(preview.compilerError)throw Error('compile_error')
 if(!clear)writeFileSync('.auth/task-2034-preview.json',JSON.stringify(preview),{mode:0o600})
 console.log({compiled:true,published:false,testCodeInDraft:!clear,debugUrlAvailable:Boolean(preview.containerVersion?.container?.taggingServerUrls||preview.debugUrl)})
}

main().catch(e=>{console.error(e.message);process.exitCode=1})
