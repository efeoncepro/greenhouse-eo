/** Complete industry/method copy: real preview and anonymous live rendering, every panel. */
const fs = require('fs');
const assert = require('assert/strict');

const {JSDOM} = require('jsdom');
const {chromium} = require('playwright');










const all=require('./hubspot-editorial-copy.json'),modules=['sectors','assessment','delivery'],preview=process.argv.includes('--preview'),mode=preview?'preview':'live',url='https://efeoncepro.com/servicios-contratar-hubspot/',out='.captures/hubspot-section-copy-20260831';

fs.mkdirSync(out,{recursive:true});const baselinePath=process.argv.find(a=>a.startsWith('--baseline='))?.slice('--baseline='.length);
const normalize=s=>s.replace(/\s+/g,' ').trim();

(async()=>{const html=await(await fetch(url)).text(),d=new JSDOM(html).window.document;let body=html;

if(preview){fs.writeFileSync('tmp/hubspot-copy-sections/before.html',html);const local=new JSDOM(fs.readFileSync('tmp/hubspot-copy-sections/rendered.html','utf8')).window.document;

for(const m of modules)d.querySelector(`[data-hubspot-module="${m}"]`).innerHTML=local.querySelector(`[data-hubspot-module="${m}"]`).innerHTML.replaceAll('http://127.0.0.1:8768','https://efeoncepro.com/wp-content/plugins/eo-elementor-widgets');body=d.documentElement.outerHTML;}

const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1414,height:909}}),errors=[],states=[];

page.on('pageerror',e=>errors.push(e.message));

try{if(preview)await page.route(url,r=>r.fulfill({body,contentType:'text/html'}));assert.equal((await page.goto(url,{waitUntil:'domcontentloaded'})).status(),200);await page.evaluate(()=>document.fonts.ready);

for(const m of modules){const text=normalize(await page.locator(`[data-hubspot-module="${m}"]`).textContent());

for(const value of Object.values(all[m].defaults))assert(text.includes(normalize(value)),`${m}: ${value}`);for(const variants of Object.values(all[m].repeaters||{}))for(const values of Object.values(variants))for(const value of Object.values(values))assert(text.includes(normalize(value)),`${m}: ${value}`);}

for(const width of [1414,878,390]){await page.setViewportSize({width,height:909});await page.mouse.move(16,890);

for(const motion of ['no-preference','reduce']){await page.emulateMedia({reducedMotion:motion});

for(const [m,count]of [['sectors',4],['delivery',5],['assessment',1]]){const section=page.locator(`[data-hubspot-module="${m}"]`);

for(let i=0;i<count;i++){if(m!=='assessment'){const group=section.locator(`[data-hsx-tabs="${m}"]`),tab=group.locator(`[data-hsx-select="${i}"]`);

await tab.click();const bounds=await tab.boundingBox();

await page.mouse.move(bounds.x+bounds.width/2,Math.min(bounds.y+bounds.height+12,900));assert.equal(await tab.getAttribute('aria-pressed'),'true');assert.equal(await group.locator('[data-hsx-panel]:visible').count(),1);}

await section.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.documentElement.scrollWidth===innerWidth,null,{timeout:8000});const over=await section.evaluate(e=>[...e.querySelectorAll('p,h2,h3,button')].filter(x=>x.getBoundingClientRect().width>0&&x.scrollWidth>x.clientWidth+2).map(x=>x.textContent.slice(0,60)));

assert.deepEqual(over,[],`${m} ${width} ${i}`);if(motion==='no-preference')await section.screenshot({path:`${out}/${mode}-${m}-${i}-${width}.png`,animations:'disabled'});states.push({width,motion,module:m,panel:i,pass:true});}}}}

for(const m of ['sectors','delivery']){const group=page.locator(`[data-hsx-tabs="${m}"]`);

await group.locator('[data-hsx-select="0"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await group.locator('[data-hsx-select="1"]').getAttribute('aria-pressed'),'true');}

assert.equal(await page.title(),'Implementación y operación de HubSpot | Efeonce');assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),'Implementamos y migramos tu HubSpot, Hub por Hub, y lo operamos contigo. Trabaja con Efeonce, Solutions Partner Gold.');assert.deepEqual(errors,[]);

if(!preview&&baselinePath){const before=new JSDOM(fs.readFileSync(baselinePath,'utf8')).window.document,after=new JSDOM(html).window.document;

for(const el of before.querySelectorAll('[data-hubspot-module]')){const m=el.getAttribute('data-hubspot-module');

if(!modules.includes(m))assert.equal(after.querySelector(`[data-hubspot-module="${m}"]`).outerHTML,el.outerHTML,`${m} changed`);}}

if(!preview){const nojs=await browser.newPage({javaScriptEnabled:false});

await nojs.goto(url);for(const m of ['sectors','delivery'])assert.equal(await nojs.locator(`[data-hsx-tabs="${m}"] [data-hsx-panel]:visible`).count(),m==='sectors'?4:5);await nojs.close();}

const result={status:'PASS',mode,checkedAt:new Date().toISOString(),states,keyboard:true,errors,otherEightModulesUnchanged:!preview&&baselinePath?true:null,metadataUnchanged:true};

fs.writeFileSync(`${out}/${mode}.json`,JSON.stringify(result,null,2));console.log({...result,states:states.length});}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
