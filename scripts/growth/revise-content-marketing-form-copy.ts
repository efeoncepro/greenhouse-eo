/** Operator-requested copy only; immutable version through the governed author/review/publish lifecycle. */
import assert from 'node:assert/strict'
import { readFileSync,writeFileSync } from 'node:fs'

import { authorDraftForm,reviewForm,publishForm,deprecateForm } from '@/lib/growth/forms/commands'
import { getFormDefinitionByKey,getPublishedVersionBySlug,getFormVersionById,listDestinationsForVersion,getHostSurfaceById } from '@/lib/growth/forms/store'
import { getPublishedRenderContractByRef } from '@/lib/growth/forms/readers'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'
import { loadGreenhouseToolEnv,applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv();applyGreenhousePostgresProfile('ops')
const key='18b228e9-106a-402e-a6f2-a8c5469e73d7',surfaceId='fhsf-efeonce-content-marketing'

async function main(){
 const baseline=JSON.parse(readFileSync('tmp/content-marketing-form-before.json','utf8'))
 const definition=await getFormDefinitionByKey(key)

 assert(definition&&definition.slug==='efeonce-content-marketing'&&definition.status==='active')
 const current=await getPublishedVersionBySlug(definition.slug)

 assert(current&&current.form_version_id==='fver-94c14bc6-6ba8-4b4b-82f9-24fe7470abea')
 assert.deepEqual(JSON.parse(JSON.stringify(current)),baseline.version)
 const surface=await getHostSurfaceById(surfaceId)

 assert.deepEqual(JSON.parse(JSON.stringify(surface)),baseline.surface)
 const destinations=await listDestinationsForVersion(current.form_version_id)

 assert.equal(destinations.length,0,'Copy edit must not create or change a destination')
 const fields=structuredClone(current.field_schema_json) as Array<Record<string,unknown>>

 const fieldCopy:Record<string,Record<string,string>>={
  fullName:{label:'Nombre y apellido',placeholder:'Tu nombre completo'},
  email:{label:'Correo de trabajo'},
  companyName:{placeholder:'Nombre de tu empresa'},
  mode:{label:'Modalidad de trabajo',placeholder:'Prefiero definirlo con ustedes'},
  challenge:{label:'¿Qué necesitas resolver?',placeholder:'Por ejemplo: publicar con más frecuencia, coordinar las revisiones o adaptar el contenido a otros canales.'}
 }

 for(const field of fields)Object.assign(field,fieldCopy[String(field.key)])
 const refs=structuredClone(current.copy_refs_json) as any

 refs.copy={...refs.copy,submit:'Enviar mi consulta','step.identity.help':'Para responderte y conocer tu empresa.','step.context.help':'La modalidad y el contexto son opcionales.','mode.help':'Si aún no lo tienes claro, lo definimos contigo.'}
 const ui=structuredClone(current.ui_policy_json) as any

 ui.steps[0].label='Tus datos de contacto';ui.steps[1].label='Hablemos de tus contenidos'
 const success=structuredClone(current.success_behavior_json) as any

 success.title='Recibimos tu consulta'
 success.body='Revisaremos lo que compartiste para responderte sobre cómo podemos apoyar a tu equipo. Si prefieres elegir un horario, puedes consultar nuestra agenda.'
 success.actions[0].label='Consultar la agenda'
 const preserved=preserveFormVersionFields(current)
 const input={slug:definition.slug,name:definition.name,formKind:definition.form_kind,purpose:definition.purpose,riskProfile:definition.risk_profile,...preserved,fieldSchema:fields,copyRefs:refs,uiPolicy:ui,successBehavior:success,createdBy:'operator-content-marketing-copy-20260831'}

 writeFileSync('tmp/content-marketing-form-copy-plan.json',JSON.stringify({fieldCopy,copy:refs.copy,steps:ui.steps,success},null,2),{mode:0o600})

 if(!process.argv.includes('--apply')){console.log(JSON.stringify({status:'dry_run_verified',previous:current.form_version_id,fields:fields.length,preserved:'keys, options/values, validation, consent/privacy, security, surface, destinations and policies'}));

return}

 const {formVersionId}=await authorDraftForm(input as Parameters<typeof authorDraftForm>[0])

 writeFileSync('tmp/content-marketing-form-copy-draft.json',JSON.stringify({previous:current.form_version_id,formVersionId},null,2),{mode:0o600})
 const draft=await getFormVersionById(formVersionId);

assert(draft)
 assert.deepEqual(preserveFormVersionFields(draft),{...preserved,copyRefs:refs,uiPolicy:ui,successBehavior:success})
 assert.deepEqual(draft.field_schema_json,fields)
 const review=await reviewForm(formVersionId);

assert(review.ok,'Governed review blocked; inspect draft')
 // Guard again immediately before publishing: no concurrent version/identity/surface change.
 assert.equal((await getPublishedVersionBySlug(definition.slug))?.form_version_id,current.form_version_id)
 assert.deepEqual(await getHostSurfaceById(surfaceId),surface)
 const result=await publishForm(formVersionId);

assert(result.ok,'Governed publish blocked; inspect draft')
 const active=await getPublishedVersionBySlug(definition.slug);

assert.equal(active?.form_version_id,formVersionId)
 assert.equal((await getFormDefinitionByKey(key))?.form_key,key)
 assert.equal((await listDestinationsForVersion(formVersionId)).length,0)
 const contract=await getPublishedRenderContractByRef(key,{surfaceId,origin:'https://efeoncepro.com'});

assert(contract)
 assert.equal(contract.copy?.submit,'Enviar mi consulta')
 writeFileSync('tmp/content-marketing-form-copy-public-contract.json',JSON.stringify(contract,null,2),{mode:0o600})
 await deprecateForm(current.form_version_id)
 const evidence={status:'published_verified',formKey:key,previous:current.form_version_id,version:formVersionId,number:active?.version,surfaceId,destinations:0}

 writeFileSync('tmp/content-marketing-form-copy-published.json',JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify(evidence))
}

main().catch(()=>{console.error('Copy publication stopped. Inspect saved draft and governed state before retrying; no private payload printed.');process.exitCode=1}).finally(()=>closeGreenhousePostgres())
