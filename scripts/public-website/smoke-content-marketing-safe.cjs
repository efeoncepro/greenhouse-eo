/** Safe production smoke: rejection boundaries + explicitly synthetic generic GA4 tag.
 * Never submits an acceptable payload, bypasses captcha, or claims a persisted conversion.
 * Run the read-only ledger check before/after; synthetic GA4 is not an accepted form submission.
 */
const fs = require('node:fs')
const assert = require('node:assert/strict')

const {chromium} = require('playwright')

const url = 'https://efeoncepro.com/servicio-marketing-de-contenidos/'
const dir = '.captures/content-marketing/technical-closure'

fs.mkdirSync(dir,{recursive:true})
;(async()=>{
 const browser=await chromium.launch()
 const report={url,checkedAt:new Date().toISOString(),syntheticTagOnly:true,acceptedSubmissionTested:false,api:[],collect:[]}

 try {
  const p=await browser.newPage({viewport:{width:1440,height:1000}})

  p.on('response',async r=>{
   if(!r.url().includes('/g/collect'))return
   const query=new URL(r.url()).searchParams,body=new URLSearchParams(r.request().postData()||'')

   if((query.get('en')||body.get('en'))!=='generate_lead')return
   report.collect.push({event:'generate_lead',measurementId:query.get('tid'),status:r.status(),formSlug:query.get('ep.form_slug')||body.get('ep.form_slug'),formKind:query.get('ep.form_kind')||body.get('ep.form_kind'),surface:query.get('ep.surface_id')||body.get('ep.surface_id')})
  })
  await p.goto(url,{waitUntil:'domcontentloaded'})
  await p.locator('greenhouse-form [name=fullName]').waitFor()

  const endpoint=await p.evaluate(()=>{
   const match=performance.getEntriesByType('resource').find(r=>r.name.includes('/api/public/growth/forms/'))

   if(!match)throw Error('Public form contract request not observed')
   const u=new URL(match.name);

u.search='';

return u.href+'/submit'
  })

  report.api=await p.evaluate(async endpoint=>{
   const out=[]

   for(const [name,body]of [['honeypot',{consent:false,fields:{},honeypot:'technical-smoke'}],['missing captcha',{consent:false,fields:{}}]]){
    const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,surfaceId:'fhsf-efeonce-content-marketing'})})

    out.push({name,status:r.status,body:await r.json()})
   }

   
return out
  },endpoint)
  assert.equal(report.api[0].body.outcome,'spam_rejected')
  assert.equal(report.api[1].body.outcome,'captcha_failed')
  assert(report.api.every(r=>!r.body.submissionId))
  report.acceptedEventsBeforeSmoke=await p.evaluate(()=>(window.dataLayer||[]).filter(x=>x.event==='gh_form_submission_accepted').length)
  assert.equal(report.acceptedEventsBeforeSmoke,0)
  await p.evaluate(()=>{if(window.gtag)window.gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})})
  await p.mouse.wheel(0,600)
  await p.waitForTimeout(2000)
  await p.evaluate(()=>window.dataLayer.push({event:'gh_form_submission_accepted',form_slug:'smoke-test',form_kind:'smoke',surface_id:'measurement-smoke-content-marketing'}))
  await p.waitForTimeout(5000)
  report.dataLayerSmoke=await p.evaluate(()=>(window.dataLayer||[]).filter(x=>x.event==='gh_form_submission_accepted').map(x=>({event:x.event,form_slug:x.form_slug,form_kind:x.form_kind,surface_id:x.surface_id})))
  fs.writeFileSync(dir+'/safe-smoke.json',JSON.stringify(report,null,2))
  console.log(JSON.stringify(report))
  assert(report.collect.some(r=>r.measurementId==='G-KYPPY57M14'&&r.status===204&&r.formSlug==='smoke-test'))
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exit(1)})
