/** Native HubSpot consent UI regression, fresh contexts; transport intercepted to avoid synthetic destination events. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {resolve,dirname} from 'node:path'
import assert from 'node:assert/strict'

import {chromium} from 'playwright'
import axe from 'axe-core'

const injected=process.argv.includes('--inject-local')

if(!injected&&!process.argv.includes('--live'))throw new Error('Choose --live or --inject-local explicitly')
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const dir=resolve(root,'../efeonce-think/public/measurement/consent-ui')+'/'
const out=new URL('file://'+resolve(root,'.captures/cookie-ui-'+(injected?'injected':'live'))+'/');

mkdirSync(out,{recursive:true})
const b=await chromium.launch(),results=[]

try{for(const host of ['think.efeoncepro.com','efeoncepro.com'])for(const mobile of [false,true]){
 const context=await b.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},reducedMotion:'reduce'})
 const p=await context.newPage(),network=[],errors=[];

p.setDefaultTimeout(12000)
 p.on('pageerror',()=>errors.push('page_error'))
 // Verify gates without emitting synthetic analytics/advertising PageViews during repetitive QA.
 await p.route(/\/g\/collect(?:\?|$)/,async route=>{const u=new URL(route.request().url()),q=u.searchParams;const body=new URLSearchParams(route.request().postData()||'');

network.push({host:u.hostname,event:q.get('en')||body.get('en'),gcs:q.get('gcs')||body.get('gcs'),meta:q.get('ep.meta_ads_consent')||body.get('ep.meta_ads_consent'),metaPageView:q.get('ep.meta_capi_page_view')||body.get('ep.meta_capi_page_view')});await route.fulfill({status:204})})
 if(injected)await p.route(/\/(bricolage|poppins-(400|500))-latin\.woff2(?:\?|$)/,route=>route.fulfill({body:readFileSync(dir+new URL(route.request().url()).pathname.split('/').at(-1)),contentType:'font/woff2'}))
 await p.goto('https://'+host+'/',{waitUntil:'domcontentloaded'})
 await p.locator('#hs-eu-confirmation-button').waitFor({timeout:30000})
 if(injected){await p.addStyleTag({content:readFileSync(dir+'consent-ui.v1.css','utf8')});await p.addScriptTag({content:readFileSync(dir+'consent-ui.v1.js','utf8')})}
 await p.locator('[data-eo-consent-ui="1"]#hs-eu-cookie-confirmation').waitFor()
 await p.evaluate(()=>document.fonts.ready)
 await p.addScriptTag({content:axe.source})

 const audit=async()=>p.evaluate(async()=>{const result=await window.axe.run(document.querySelector('#hs-banner-parent'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});

return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))})

 assert.equal(await p.locator('#eo-consent-banner-title').innerText(),'Tu visita.\nTus reglas.')
 assert.equal(await p.locator('html').getAttribute('data-efeonce-ads-consent'),'denied')
 console.log(JSON.stringify({host,mobile,beforeChoice:network}))
 assert(network.every(r=>r.gcs==='G100'&&r.meta!=='granted'&&r.metaPageView!=='1'))
 const box=await p.locator('#hs-eu-cookie-confirmation').boundingBox();

assert(box.x>=0&&box.x+box.width<=(mobile?390:1440))
 const name=host.split('.')[0]+'-'+(mobile?'mobile':'desktop')

 await p.screenshot({path:new URL(name+'-banner.png',out).pathname})
 assert.deepEqual(await audit(),[])
 await p.locator('#hs-eu-cookie-settings-button').click()
 await p.locator('#hs-modal-content[data-eo-consent-ui="1"]').waitFor()
 assert.equal(await p.locator('#hs-category-toggle-advertisement').isChecked(),false)
 assert.equal(await p.locator('#hs-category-toggle-analytics').isChecked(),false)
 await p.locator('#hs-category-toggle-advertisement').check()
 await p.locator('#hs-modal-save-settings').click()
 await p.waitForFunction(()=>document.documentElement.dataset.efeonceAdsConsent==='granted')
 assert.equal(await p.locator('#hs-eu-cookie-confirmation').isVisible(),false)
 assert.equal(await p.locator('html').getAttribute('data-efeonce-analytics-consent'),'denied')
 if(!injected){await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.documentElement.dataset.efeonceAdsConsent==='granted');assert.equal(await p.locator('#hs-eu-cookie-confirmation').isVisible(),false);await p.addScriptTag({content:axe.source})}
 // Reopen through the existing legal-footer control; let HubSpot retain its own state.
 const footer=p.locator('[data-efeonce-cookie-settings]');

await footer.scrollIntoViewIfNeeded();await footer.click()
 if(await p.locator('#hs-eu-cookie-settings-button').isVisible())await p.locator('#hs-eu-cookie-settings-button').click()
 await p.locator('#hs-modal-content').waitFor()
 await p.locator('#hs-modal-close-button').focus()
 await p.locator('#hs-modal-content').evaluate(e=>{e.scrollTop=0})
 assert(await p.locator('#hs-category-toggle-advertisement').isChecked())
 assert.equal(await p.locator('#hs-category-toggle-analytics').isChecked(),false)
 await p.screenshot({path:new URL(name+'-preferences.png',out).pathname})
 assert.deepEqual(await audit(),[])
 await p.locator('#hs-modal-decline-all').click()
 await p.waitForFunction(()=>document.documentElement.dataset.efeonceAdsConsent==='denied')
 assert.equal(await p.locator('html').getAttribute('data-efeonce-analytics-consent'),'denied')
 const cookieNames=(await context.cookies()).map(c=>c.name)

 assert(cookieNames.some(n=>n.startsWith('__hs_cookie_cat')))
 assert.equal(await p.evaluate(()=>localStorage.getItem('efeonce-consent')),null)
 results.push({host,viewport:mobile?'mobile':'desktop',status:'PASS',consentAuthority:'HubSpot',checks:['automatic-banner','branded-title','contained-banner','default-denied','no-consented-transport-before-choice','ads-only','analytics-remains-denied','legal-footer-reopen','native-choice-preserved','revoke','HubSpot-cookie-present'],pageErrors:errors})
 await context.close()
}

writeFileSync(new URL('result.json',out),JSON.stringify({injected,status:'PASS',results},null,2)+'\n');console.log(JSON.stringify({status:'PASS',surfaces:results.length,injected}))
}finally{await b.close()}
