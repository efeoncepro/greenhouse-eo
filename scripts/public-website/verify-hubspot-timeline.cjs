/** Real browser regression for approved timeline state + two-column partner revision.
 * --preview substitutes only these local fragments/assets; default verifies public delivery without interception.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const {chromium} = require('playwright');
const {JSDOM} = require('jsdom');

const preview=process.argv.includes('--preview'),mode=preview?'preview':'live';
const url='https://efeoncepro.com/servicios-contratar-hubspot/';
const plugin=path.resolve('../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets');
const out=path.resolve('.captures/hubspot-visual-fix-20260831');

fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1414,height:909}});
 const result={mode,url,checkedAt:new Date().toISOString(),states:[],pageErrors:[]};

 page.on('pageerror',e=>result.pageErrors.push(e.message));

 try{
  if(preview){
   const html=await(await fetch(url)).text(),d=new JSDOM(html).window.document;
   const local=new JSDOM(fs.readFileSync('tmp/hubspot-visual-fix/rendered.html','utf8')).window.document;

   for(const module of ['delivery','proof-ledger']){
    const selector=`[data-hubspot-module="${module}"]`;

    d.querySelector(selector).innerHTML=local.querySelector(selector).innerHTML.replaceAll('http://127.0.0.1:8768','https://efeoncepro.com/wp-content/plugins/eo-elementor-widgets');
   }

   await page.route(url,r=>r.fulfill({contentType:'text/html',body:d.documentElement.outerHTML}));
   for(const [file,type] of [['assets/css/hubspot-elementor.css','text/css'],['assets/js/hubspot-landing.js','application/javascript']])await page.route('**/'+file+'*',r=>r.fulfill({path:path.join(plugin,file),contentType:type}));
  }

  assert.equal((await page.goto(url,{waitUntil:'domcontentloaded'})).status(),200);
  await page.locator('.hsx-enhanced .hsx-stations').waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.title(),'Implementación y operación de HubSpot | Efeonce');
  assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),'Implementamos y migramos tu HubSpot, Hub por Hub, y lo operamos contigo. Trabaja con Efeonce, Solutions Partner Gold.');
  assert.equal(await page.locator('[data-hubspot-module]').count(),11);
  assert.equal(await page.locator('.hsx-partner-proof > div').count(),2);
  assert.equal(await page.getByText('Trazabilidad, no promesas',{exact:true}).count(),0);
  const section=page.locator('[data-hsx-tabs="delivery"]'),tabs=section.locator('[data-hsx-select]');

  for(const motion of ['no-preference','reduce']){
   await page.emulateMedia({reducedMotion:motion});

   for(const width of [1414,768,390]){
    await page.setViewportSize({width,height:909});

    for(let i=0;i<5;i++){
     await tabs.nth(i).click();
     // Move below the station without crossing the global header's hover menus.
     const bounds=await tabs.nth(i).boundingBox();

await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height+12);
     await page.waitForTimeout(360);
     await page.waitForFunction(()=>document.documentElement.scrollWidth===innerWidth,null,{timeout:8000});

     const state=await section.evaluate(root=>{
      const buttons=[...root.querySelectorAll('[data-hsx-select]')];

      
return {selected:buttons.findIndex(b=>b.getAttribute('aria-pressed')==='true'),visible:[...root.querySelectorAll('[data-hsx-panel]')].filter(p=>!p.hidden).map(p=>Number(p.dataset.hsxPanel)),progress:parseFloat(root.querySelector('[data-hsx-stage-fill]').style.width),backgrounds:buttons.map(b=>getComputedStyle(b).backgroundColor),dots:buttons.map(b=>({size:parseFloat(getComputedStyle(b.firstElementChild).width),color:getComputedStyle(b.firstElementChild).backgroundColor,halo:getComputedStyle(b.firstElementChild).boxShadow})),overflow:document.documentElement.scrollWidth>innerWidth};
     });

     assert.equal(state.selected,i);assert.deepEqual(state.visible,[i]);assert.equal(state.progress,i*25);assert.equal(state.overflow,false);
     assert(state.backgrounds.every(b=>b==='rgba(0, 0, 0, 0)'));
     state.dots.forEach((dot,n)=>{assert.equal(dot.size,n===i?16:10);assert.equal(dot.color,n<=i?'rgb(184, 67, 31)':'rgb(248, 247, 250)');assert.equal(dot.halo==='none',n!==i);});
     result.states.push({width,motion,index:i,passed:true});
     if(motion==='no-preference'&&width!==768&&[0,2,4].includes(i))await section.screenshot({path:path.join(out,`${mode}-timeline-${width}-${i}.png`),animations:'disabled'});
    }

    const geometry=await page.locator('.hsx-partner-proof').evaluate(row=>({columns:getComputedStyle(row).gridTemplateColumns.split(' ').length,badge:row.querySelector('img').getBoundingClientRect().width,broken:!row.querySelector('img').naturalWidth}));

    assert.equal(geometry.columns,width<=700?1:2);assert.equal(geometry.badge,width<=700?96:116);assert.equal(geometry.broken,false);
    if(motion==='no-preference'&&width!==768)await page.locator('.hsx-partner-proof').screenshot({path:path.join(out,`${mode}-partner-${width}.png`),animations:'disabled'});
   }
  }

  await tabs.first().focus();await page.keyboard.press('End');assert.equal(await tabs.last().getAttribute('aria-pressed'),'true');await page.keyboard.press('Home');assert.equal(await tabs.first().getAttribute('aria-pressed'),'true');await page.keyboard.press('ArrowRight');assert.equal(await tabs.nth(1).getAttribute('aria-pressed'),'true');
  assert.notEqual(await tabs.nth(1).evaluate(el=>getComputedStyle(el).outlineStyle),'none');result.keyboard=true;
  assert.equal(result.pageErrors.length,0);result.status='PASS';

  if(!preview){const nojs=await browser.newPage({javaScriptEnabled:false});

await nojs.goto(url);assert.equal(await nojs.locator('[data-hsx-tabs="delivery"] [data-hsx-panel]:visible').count(),5);assert.equal(await nojs.locator('.hsx-partner-proof > div').count(),2);result.noJs=true;await nojs.close();}

  if(preview){const sourcePage=await browser.newPage({viewport:{width:1414,height:909},reducedMotion:'reduce'});

await sourcePage.setContent(fs.readFileSync('tmp/hubspot-visual-fix/source-delivery.html','utf8'));await sourcePage.evaluate(()=>document.fonts.ready);await sourcePage.locator('section').screenshot({path:out+'/approved-timeline-1414.png',animations:'disabled'});await sourcePage.close();}
 }finally{fs.writeFileSync(out+`/${mode}-verification.json`,JSON.stringify(result,null,2));await browser.close();}

 console.log(JSON.stringify({mode,status:result.status,states:result.states.length,keyboard:result.keyboard,pageErrors:result.pageErrors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
