/** Anonymous production QA. No auth state, request interception, fake success, or accepted lead. */
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');

const {chromium}=require('playwright');

const url='https://efeoncepro.com/servicios-contratar-hubspot/';const out=path.resolve('.captures/hubspot-live-2026-08-30');

fs.mkdirSync(out,{recursive:true});

(async()=>{const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();const result={url,checkedAt:new Date().toISOString(),pageErrors:[],failedResponses:[],viewports:[],panels:{}};

 page.on('pageerror',e=>result.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)result.failedResponses.push({url:r.url(),status:r.status()})});

 try{assert.equal((await page.goto(url,{waitUntil:'domcontentloaded'})).status(),200);await page.locator('greenhouse-form .ghf-choice-group').first().waitFor();await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('[data-hubspot-module]').count(),11);assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('header').count(),1);assert.equal(await page.locator('footer').count(),1);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),url);

 for(const motion of ['no-preference','reduce']){await page.emulateMedia({reducedMotion:motion});

for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>document.documentElement.scrollWidth===innerWidth,{},{timeout:8000});const row=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,heroX:document.querySelector('[data-hubspot-module]').getBoundingClientRect().x,h1Size:getComputedStyle(document.querySelector('h1')).fontSize}));

row.motion=motion;result.viewports.push(row);await page.screenshot({path:path.join(out,`hero-${width}-${motion}.png`),scale:'css'});}}

 for(const width of [1440,390]){await page.setViewportSize({width,height:900});

for(const kind of ['hubs','sectors','delivery']){const root=page.locator(`[data-hsx-tabs="${kind}"]`),tabs=root.locator('[data-hsx-select]');

for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();assert.equal(await root.locator('[data-hsx-panel]:visible').getAttribute('data-hsx-panel'),String(i));}result.panels[`${width}-${kind}`]=await tabs.count();await tabs.first().click();await root.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`${kind}-${width}.png`),scale:'css'});}}

 const hubTabs=page.locator('[data-hsx-tabs="hubs"] [data-hsx-select]');

await hubTabs.first().focus();await page.keyboard.press('End');assert.equal(await hubTabs.last().getAttribute('aria-pressed'),'true');await page.keyboard.press('Home');assert.equal(await hubTabs.first().getAttribute('aria-pressed'),'true');result.keyboard=true;
 await page.locator('.hsx-faq summary').first().click();assert.equal(await page.locator('details[open]').count(),1);result.faq=true;
 await page.getByRole('button',{name:'Continuar',exact:true}).click();assert(await page.locator('[data-ghf-error-summary]').count());await page.getByText('Lo tenemos y no está rindiendo',{exact:true}).click();await page.locator('greenhouse-form label').filter({hasText:'Marketing Hub'}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.locator('greenhouse-form label').filter({hasText:'Sales Hub'}).click();await page.locator('greenhouse-form label').filter({hasText:'11 a 50'}).click();await page.locator('greenhouse-form label').filter({hasText:'Este trimestre'}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();assert.equal(await page.locator('[data-ghf-error-summary]').count(),0);await page.getByRole('button',{name:'Solicitar la reunión',exact:true}).click();assert(await page.locator('[data-ghf-error-summary]').count());await page.getByRole('button',{name:'Atrás',exact:true}).click();assert(await page.locator('input[name=interests][value="Sales Hub"]').isChecked());result.form={steps:3,emptySubmitBlocked:true,backPreservesValues:true,noAcceptedLeadSent:true};
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.locator('[data-capture=hubspot-conversion]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`form-${width}.png`),scale:'css'});await page.locator('footer').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`footer-${width}.png`),scale:'css'});}
 result.assets=await page.evaluate(()=>({brokenImages:[...document.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),insecureModuleAssets:[...document.querySelectorAll('[data-hubspot-module] img')].filter(i=>i.getAttribute('src').startsWith('http:')).map(i=>i.src)}));assert.equal(result.assets.brokenImages.length,0);assert.equal(result.assets.insecureModuleAssets.length,0);
 const nojs=await browser.newContext({javaScriptEnabled:false});const np=await nojs.newPage();

await np.goto(url,{waitUntil:'domcontentloaded'});assert.equal(await np.locator('[data-hubspot-module]').count(),11);assert.equal(await np.locator('[data-hsx-panel]').count(),23);result.serverRendered={sections:11,panels:23,h1:await np.locator('h1').textContent()};await nojs.close();
 const api=await context.request.post('https://greenhouse.efeoncepro.com/api/public/growth/forms/bb220383-530e-4b3c-891f-bbdc75d7d112/submit',{headers:{Origin:'https://efeoncepro.com'},data:{surfaceId:'fhsf-efeonce-hubspot-scope',fields:{},consent:false,pageUri:url}});

result.rejectedRequest={status:api.status(),body:await api.json()};assert.notEqual(result.rejectedRequest.body.outcome,'accepted');assert.equal(result.pageErrors.length,0);result.status='PASS';
 }catch(e){result.status='FAIL';result.failure=e.message;process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();}})();
