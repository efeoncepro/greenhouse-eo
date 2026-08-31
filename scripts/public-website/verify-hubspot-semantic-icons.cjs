/** Real browser: selected product identity, brand correspondence, breakpoints and keyboard. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

const {chromium} = require('playwright');
const {JSDOM} = require('jsdom');










const preview=process.argv.includes('--preview'),url='https://efeoncepro.com/servicios-contratar-hubspot/',root=path.resolve('../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets'),out='.captures/hubspot-semantic-icons-20260831';

fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1414,height:909}}),errors=[],states=[];

page.on('pageerror',e=>errors.push(e.message));

try{if(preview){const d=new JSDOM(await(await fetch(url)).text()).window.document,local=new JSDOM(fs.readFileSync('tmp/hubspot-semantic-icons/rendered.html','utf8')).window.document;

for(const n of ['hubs','licensing'])d.querySelector(`[data-hubspot-module="${n}"]`).innerHTML=local.querySelector(`[data-hubspot-module="${n}"]`).innerHTML.replaceAll('http://127.0.0.1:8768','https://efeoncepro.com/wp-content/plugins/eo-elementor-widgets');await page.route(url,r=>r.fulfill({contentType:'text/html',body:d.documentElement.outerHTML}));await page.route('**/assets/css/hubspot-elementor.css*',r=>r.fulfill({path:root+'/assets/css/hubspot-elementor.css',contentType:'text/css'}));await page.route('**/assets/img/hubspot/*.svg',r=>r.fulfill({path:root+'/assets/img/hubspot/'+r.request().url().split('/').pop(),contentType:'image/svg+xml'}));}

assert.equal((await page.goto(url,{waitUntil:'domcontentloaded'})).status(),200);await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('.hsx-hub-brand-icon').count(),8);assert.equal(await page.locator('.hsx-panel-brand-icon').count(),8);assert.equal(await page.locator('.hsx-semantic-icon').count(),5);assert.equal(await page.locator('.hsx-panel-semantic-icon').count(),5);assert.equal(await page.title(),'Implementación y operación de HubSpot | Efeonce');assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),'Implementamos y migramos tu HubSpot, Hub por Hub, y lo operamos contigo. Trabaja con Efeonce, Solutions Partner Gold.');

for(const width of [1414,878,390]){await page.setViewportSize({width,height:909});await page.mouse.move(16,890);await page.waitForFunction(()=>document.documentElement.scrollWidth===innerWidth,null,{timeout:8000});

for(const motion of ['no-preference','reduce']){await page.emulateMedia({reducedMotion:motion});const hubs=page.locator('[data-hsx-tabs="hubs"]');

for(const i of [8,9,10,11,13]){const tile=hubs.locator(`[data-hsx-select="${i}"]`),panel=hubs.locator(`[data-hsx-panel="${i}"]`);

await tile.click();await panel.scrollIntoViewIfNeeded();await page.waitForTimeout(350);assert.equal(await tile.getAttribute('aria-pressed'),'true');assert.equal(await hubs.locator('[data-hsx-panel]:visible').count(),1);assert.equal(await panel.isVisible(),true);assert.equal(await panel.locator('img').count(),i===12?3:1);

if(i!==12){const icon=panel.locator('img');

await icon.evaluate(img=>new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth)return resolve();img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true});}));assert.equal(await icon.getAttribute('src'),await tile.locator('img').getAttribute('src'));

const g=await panel.evaluate(el=>{const img=el.querySelector('img').getBoundingClientRect(),row=el.querySelector('.hsx-panel-identity').getBoundingClientRect(),body=el.querySelector('.hsx-split').getBoundingClientRect(),label=el.querySelector('.hsx-panel-identity>p').getBoundingClientRect();

return {rightGap:row.right-img.right,overlap:img.bottom>body.top||label.right>img.left,overflow:document.documentElement.scrollWidth>innerWidth}});

assert(Math.abs(g.rightGap)<2);assert.equal(g.overlap,false,JSON.stringify({width,motion,i,g}));assert.equal(g.overflow,false,JSON.stringify({width,motion,i,g}));}

if(motion==='no-preference'&&[8,9,10,11,13].includes(i))await panel.screenshot({path:`${out}/${preview?'preview':'live'}-panel-${i}-${width}.png`,animations:'disabled'});states.push({width,motion,product:i,passed:true});}

if(motion==='no-preference')for(const [index,name] of [[2,'ai'],[3,'workspaces'],[4,'conversation']])await hubs.locator('.hsx-band-grid').nth(index).screenshot({path:`${out}/${preview?'preview':'live'}-${name}-${width}.png`});}

const logo=page.locator('.hsx-licensing-logo');

await logo.scrollIntoViewIfNeeded();await logo.evaluate(img=>new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth)return resolve();img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true});}));assert.equal(await logo.getAttribute('alt'),'HubSpot');assert(await logo.evaluate(i=>i.naturalWidth>0));await page.locator('[data-hubspot-module="licensing"] .hsx-split > div').first().screenshot({path:`${out}/${preview?'preview':'live'}-licensing-${width}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),true);}

const first=page.locator('[data-hsx-tabs="hubs"] [data-hsx-select="0"]');

await first.focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-hsx-tabs="hubs"] [data-hsx-select="1"]').getAttribute('aria-pressed'),'true');assert.deepEqual(errors,[]);

if(!preview){const nojs=await browser.newPage({javaScriptEnabled:false});

await nojs.goto(url);assert.equal(await nojs.locator('.hsx-panel-brand-icon:visible').count(),8);assert.equal(await nojs.locator('.hsx-panel-semantic-icon:visible').count(),5);await nojs.close();}

const result={mode:preview?'preview':'live',status:'PASS',states,errors,keyboard:true,checkedAt:new Date().toISOString()};

fs.writeFileSync(`${out}/${result.mode}.json`,JSON.stringify(result,null,2));console.log({...result,states:states.length});}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
