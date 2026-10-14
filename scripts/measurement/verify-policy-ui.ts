/** TASK-2037: real metadata-only UI commands; scopes every write to a controlled fixture. */
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { resolveStagingAccess } from '../lib/vercel-staging-access.mjs'
import { ensureStorageStateFresh } from '../frontend/lib/auth'
import { launchCaptureSession } from '../frontend/lib/browser'
import { analyzeFrameQuality } from '../frontend/lib/quality'
import type { EnvConfig } from '../frontend/lib/env'
import type { MeasurementPolicyRevision } from '../../src/lib/growth/measurement/policy-contract'
import type { MeasurementCatalog } from '../../src/views/greenhouse/admin/growth/forms/measurement-policy-client'
import { GH_GROWTH_MEASUREMENT as C } from '../../src/lib/copy/growth-measurement'

let stage='init'

async function main() {
  assert(process.argv.includes('--apply') && process.env.MEASUREMENT_FIXTURE_RECEIPT, 'explicit_fixture_apply_required')
  const fixture=JSON.parse(readFileSync(process.env.MEASUREMENT_FIXTURE_RECEIPT,'utf8')) as {sourceKey:string;surfaceId:string;slug:string}

  assert(fixture.slug.startsWith('measurement-ui-proof-') && !('cleanupVerifiedAt' in fixture))
  const access=await resolveStagingAccess()
  const envConfig:EnvConfig={baseUrl:access.stagingUrl,storageStatePath:'.auth/storageState.staging-'+new URL(access.stagingUrl).hostname+'.json',agentEmail:access.email,bypassSecret:access.bypassSecret,isProduction:false}

  assert(new URL(envConfig.baseUrl).hostname.endsWith('.vercel.app'),'staging_only')
  ensureStorageStateFresh('staging',envConfig)
  const outputDir=resolve('.captures/meta-lead-fix-2026-10-14/policy-ui-live')

  mkdirSync(outputDir,{recursive:true})
  const session=await launchCaptureSession({envConfig,viewport:{width:1440,height:1000},recordVideoDir:outputDir})
  const {page}=session
  const allowedPolicies=new Set<string>()
  const commands:string[]=[],frames:Array<{state:string;findings:unknown[];overflow:boolean}>=[]
  let blockedWrites=0
  const fixturePolicy=(data:MeasurementCatalog)=>data.policies.filter(p=>p.scope.sourceKey===fixture.sourceKey&&p.scope.surfaceId===fixture.surfaceId)

  page.on('response',async response=>{
    if(new URL(response.url()).pathname!=='/api/admin/growth/measurement' || response.request().method()!=='GET' || !response.ok()) return

    try {for(const policy of fixturePolicy(await response.json()))allowedPolicies.add(policy.policyId)} catch {/* no raw payload logs */}
  })
  await page.route('**/api/admin/growth/measurement',async route=>{
    const request=route.request()

    if(request.method()==='POST') {
      const body=request.postDataJSON()
      const allowed=body.action==='draft'?body.scope?.sourceKey===fixture.sourceKey&&body.scope?.surfaceId===fixture.surfaceId:allowedPolicies.has(body.policyId)

      if(!allowed){blockedWrites++;await route.abort();

return}

      commands.push(body.action)
    }

    await route.fallback()
  })
  const selector='[data-capture="measurement-policy-panel"]'
  const panel=page.locator(selector+':visible')

  const mark=async(state:string)=>{
    stage='capture-'+state
    await page.getByRole('listbox').waitFor({state:'hidden',timeout:5000})
    await panel.scrollIntoViewIfNeeded()
    // Leave the fixed app header above the clipped section; evaluate reads only DOM geometry.
    const top=await panel.evaluate(element=>element.getBoundingClientRect().top)

    if(top<100) await page.evaluate(()=>window.scrollBy(0,-100))
    const framePath=resolve(outputDir,state+'.png')

    await panel.screenshot({path:framePath})
    const findings=await analyzeFrameQuality(page,{frameLabel:state,framePath,accessibility:{enabled:true,includeSelector:selector,failOnViolations:true},layout:{enabled:true,includeSelector:selector,failOnViolations:true,minTargetSize:24},allowErrorBoundary:state.includes('error')||state.includes('denied')||state.includes('conflict')})
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)

    frames.push({state,findings,overflow})
    assert(!overflow && !findings.some(finding=>finding.severity==='error'),'frame_quality_failed_'+state)
  }

  const readCatalog=async()=>page.evaluate(async()=>{const response=await fetch('/api/admin/growth/measurement',{cache:'no-store'});

if(!response.ok)throw Error('catalog_unavailable');

return response.json()}) as Promise<MeasurementCatalog>

  try {
    stage='navigate'
    await page.goto(envConfig.baseUrl+'/admin/growth/forms',{waitUntil:'domcontentloaded'})
    await panel.getByRole('combobox',{name:C.source}).waitFor({timeout:60000})
    const initial=await readCatalog()
    const source=initial.sources.find(value=>value.scope.sourceKey===fixture.sourceKey&&value.scope.surfaceId===fixture.surfaceId)

    assert(source?.name==='TEST — Measurement UI proof','controlled_fixture_only')
    const previous=fixturePolicy(initial)
    const expectedRevision=Math.max(0,...previous.map(policy=>policy.revision))+1

    if(previous.length) assert(process.argv.includes('--revise-fixture'),'explicit_fixture_revision_required')
    stage='select-source'
    await panel.getByRole('combobox',{name:C.source}).click()
    await page.getByRole('option',{name:/TEST — Measurement UI proof/}).click()
    await mark(previous.length?'01-current':'01-empty')
    if(previous.length) await panel.getByRole('button',{name:C.edit,exact:true}).click()

    if(!previous.length) {
    await panel.getByRole('combobox',{name:C.email,exact:true}).click()
    await page.getByRole('option',{name:'businessEmail',exact:true}).click()

    for(const target of ['phone','firstName','lastName'] as const) {
      assert(source.fields.some(field=>field.key===target))
      await panel.getByRole('combobox',{name:C[target],exact:true}).click()
      await page.getByRole('option',{name:target,exact:true}).click()
    }

    }

    stage='enable-meta'
    if(!(await panel.getByRole('switch',{name:C.meta,exact:true}).isChecked())) await panel.getByRole('switch',{name:C.meta,exact:true}).check()
    assert(!(await panel.getByRole('switch',{name:C.google_upd,exact:true}).isChecked()))
    stage='save-draft'
    await panel.getByRole('button',{name:C.save,exact:true}).click()
    await panel.getByRole('button',{name:C.review,exact:true}).waitFor({timeout:30000})
    const draft=fixturePolicy(await readCatalog())[0]

    assert(draft?.state==='draft');allowedPolicies.add(draft.policyId)
    await mark('02-draft')
    stage='review'
    await panel.getByRole('button',{name:C.review,exact:true}).click()
    await panel.getByRole('button',{name:C.publish,exact:true}).waitFor({timeout:30000})
    await mark('03-review')
    stage='publish'
    await panel.getByRole('button',{name:C.publish,exact:true}).click()
    await panel.getByText(C.activeRevision(expectedRevision),{exact:true}).waitFor({timeout:30000})
    const published=fixturePolicy(await readCatalog()).find(policy=>policy.state==='published')

    assert(published?.revisionId===published?.publishedRevisionId && published?.config.mapping.email==='businessEmail')
    assert.deepEqual(published.config.destinations,['meta'])
    await mark('04-published')
    await page.setViewportSize({width:390,height:844})
    await page.reload({waitUntil:'domcontentloaded'})
    await panel.getByRole('combobox',{name:C.source}).waitFor({timeout:60000})
    await panel.getByRole('combobox',{name:C.source}).click()
    await page.getByRole('option',{name:/TEST — Measurement UI proof/}).click()
    await mark('05-mobile-published')
    await page.emulateMedia({reducedMotion:'reduce'})
    await mark('06-reduced-motion')
    await panel.getByRole('button',{name:C.disable,exact:true}).click()
    await mark('07-disable-confirmation')
    await panel.getByRole('button',{name:C.cancel,exact:true}).click()
    assert.equal(blockedWrites,0)
    assert.deepEqual(commands,['draft','review','publish'])
    // Browser-local presentation fixtures only: no simulated command reaches the server.
    const presentationCatalog:MeasurementCatalog={...initial,sources:[source],policies:[published]}

    const showCatalog=async(data:MeasurementCatalog,status=200)=>{
      await page.route('**/api/admin/growth/measurement',async route=>{
        if(route.request().method()==='GET') await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
        else await route.fallback()
      })
      await page.reload({waitUntil:'domcontentloaded'})
      await panel.waitFor()
    }

    await showCatalog({...presentationCatalog,policies:[{...published,state:'disabled',publishedRevisionId:null} as MeasurementPolicyRevision]})
    await panel.getByText(C.noActive,{exact:true}).waitFor({timeout:30000})
    await mark('08-disabled-presentation')
    await showCatalog({...presentationCatalog,sources:[{...source,blockingReasons:['source_version_changed']}]})
    await panel.getByText(C.blockers.source_version_changed,{exact:true}).waitFor({timeout:30000})
    await mark('09-blocked-presentation')
    await showCatalog(presentationCatalog)
    await panel.getByRole('button',{name:C.edit,exact:true}).click()
    await panel.getByRole('switch',{name:C.google_upd,exact:true}).check()
    await page.route('**/api/admin/growth/measurement',async route=>{
      if(route.request().method()==='POST') await route.fulfill({status:409,contentType:'application/json',body:'{"ok":false,"error":"conflict","blockingReasons":[]}'})
      else await route.fallback()
    })
    await panel.getByRole('button',{name:C.save,exact:true}).click()
    await panel.getByText(C.conflict,{exact:true}).waitFor({timeout:30000})
    await mark('10-conflict-presentation')
    await panel.getByRole('button',{name:C.reload,exact:true}).click()
    assert(await panel.getByRole('switch',{name:C.google_upd,exact:true}).isChecked())
    await showCatalog(presentationCatalog,503)
    await panel.getByText(C.unavailable,{exact:true}).waitFor({timeout:30000})
    await mark('11-error-presentation')
    await showCatalog(presentationCatalog,403)
    await panel.getByText(C.denied,{exact:true}).waitFor({timeout:30000})
    await mark('12-denied-presentation')
    writeFileSync(resolve(outputDir,'receipt.json'),JSON.stringify({checkedAt:new Date().toISOString(),stagingUrl:envConfig.baseUrl,sourceKey:fixture.sourceKey,policyId:published.policyId,revisionId:published.revisionId,commands,frames,blockedWrites,commercialSubmissions:0,bookings:0,providerRequests:0,newSourceConfiguredThroughUIWithoutCodeOrGtmChange:previous.length===0,revisionConfiguredThroughUIWithoutCodeOrGtmChange:true},null,2))
    console.log(JSON.stringify({ok:true,policyId:published.policyId,sourceKey:fixture.sourceKey,commands,frames:frames.length,providerRequests:0,commercialSubmissions:0}))
  } catch(error) {await page.screenshot({path:resolve(outputDir,'failure-context.png'),fullPage:false}).catch(()=>{});throw error}
  finally {await session.stopTracing(null);await session.finalizeRecording();await session.browser.close()}
}

main().catch((error)=>{console.error('policy_ui_verification_failed_no_sensitive_payload_logged',{stage,operation:error instanceof Error&&/^[a-zA-Z.]+: Timeout/.test(error.message)?error.message.split('\n')[0]:'',kind:error instanceof Error&&error.message.includes('strict mode violation')?'ambiguous_locator':error instanceof Error&&error.message.includes('Timeout')?'timeout':'quality_or_assertion'});process.exitCode=1})
