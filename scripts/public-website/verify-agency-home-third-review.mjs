/** Real Browser renderer/interaction checks; invoke with the existing in-app tab. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const pause=ms=>new Promise(r=>setTimeout(r,ms));

export async function auditAgencyThirdReview(tab,{directory,label}){
 await fs.mkdir(directory,{recursive:true});
 const cdp=await tab.capabilities.get('cdp');
 const report={};
 const capture=async name=>fs.writeFile(path.join(directory,label+'-'+name+'.png'),await tab.screenshot({fullPage:false}));

 for(const section of ['hero','ecosystem','servicios','comparison','faq','agenda']){
  const id=await tab.playwright.locator('[data-capture="'+section+'"]').getAttribute('id');
  const url='https://efeoncepro.com/#'+id;

  if(await tab.url()!==url)await tab.goto(url);
  let top=Infinity;

  for(let i=0;i<40;i++){await pause(150);top=await tab.playwright.locator('[data-capture="'+section+'"]').evaluate(e=>e.getBoundingClientRect().top);if(Math.abs(top)<2)break;}
  assert.ok(Math.abs(top)<2,'Section anchor '+section);await pause(900);
  await capture(section);

  if(section==='hero'){
   report.hero=await tab.playwright.evaluate(()=>{
    const r=e=>e.getBoundingClientRect().toJSON();const s=document.querySelector('[data-capture="hero"]');
    const core=[...s.querySelectorAll('circle')].find(e=>e.getAttribute('fill')?.startsWith('url(#heroCore-'));
    const mark=s.querySelector('.gh-agency-hero-mark');

return {core:r(core),mark:r(mark),depth:mark.parentElement.dataset.depth};
   });
   const {core,mark}=report.hero;
   const offset=Math.hypot(mark.x+mark.width/2-core.x-core.width/2,mark.y+mark.height/2-core.y-core.height/2);

   assert.ok(offset+Math.hypot(mark.width,mark.height)/2<core.width/2,'Mark corners must fit inside core circle');
  }

  if(section==='agenda'){
   const b=await tab.playwright.locator('[data-capture="agenda"] .gh-agency-agenda-button').evaluate(e=>e.getBoundingClientRect().toJSON());

   if(b.y<130||b.y+b.height>850){await cdp.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:20,y:450,deltaX:0,deltaY:b.y-350});await pause(700);}
   const rect=await tab.playwright.locator('[data-capture="agenda"] .gh-agency-agenda-button').evaluate(e=>e.getBoundingClientRect().toJSON());

   await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+rect.width/2,y:rect.y+rect.height/2});
   // Longer than Ohio's 400 ms underline animation: first-frame color alone missed the defect.
   await pause(1200);
   report.hover=await tab.playwright.locator('[data-capture="agenda"] .gh-agency-agenda-button').evaluate(e=>({hover:e.matches(':hover'),background:getComputedStyle(e).backgroundColor,image:getComputedStyle(e).backgroundImage,color:getComputedStyle(e).color,animation:getComputedStyle(e).animationName,text:e.textContent.trim(),iconColor:getComputedStyle(e.querySelector('i')).color}));
   assert.equal(report.hover.hover,true);assert.equal(report.hover.background,'rgb(94, 234, 212)');assert.equal(report.hover.image,'none');assert.equal(report.hover.color,'rgb(4, 34, 61)');assert.equal(report.hover.iconColor,report.hover.color);assert.equal(report.hover.animation,'none');
   await capture('agenda-hover');
   await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:450});
  }
 }

 report.dom=await tab.playwright.evaluate(()=>({
  width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
  faqMail:document.querySelector('[data-capture="faq"] a[href^="mailto:"]')!==null,
  faqCopy:document.querySelector('.gh-agency-faq-contact p').textContent.trim(),
  agendaMail:document.querySelector('.gh-agency-agenda-contact a').getAttribute('href'),
  closing:document.querySelector('[data-capture="comparison"] > div > div:last-child > p:last-child').textContent.trim(),
  glow:{background:getComputedStyle(document.querySelector('.gh-agency-ecosystem-glow')).backgroundImage,width:document.querySelector('.gh-agency-ecosystem-glow').getBoundingClientRect().width,sectionWidth:document.querySelector('#ecosistema').getBoundingClientRect().width},
  hubspot:[...document.querySelectorAll('.gh-agency-module img[src$="/agency/hubspot.svg"]')].map(e=>({module:e.closest('[data-agency-module]').dataset.agencyModule,loaded:e.complete&&e.naturalWidth>0,url:e.src}))
 }));
 assert.equal(report.dom.width,report.dom.scrollWidth);assert.equal(report.dom.faqMail,false);assert.equal(report.dom.agendaMail,'mailto:hola@efeoncepro.com');
 assert.equal(report.dom.closing,'Marketing, tecnología y datos. Conectados en una misma operación.');
 assert.equal(report.dom.faqCopy,'Conversemos sobre tu pregunta en una reunión de 30 minutos.');
 assert.equal(report.dom.glow.width,report.dom.glow.sectionWidth);
 for(const moduleName of ['servicios','stack','social-proof'])assert.ok(report.dom.hubspot.some(e=>e.module===moduleName&&e.loaded&&e.url.startsWith('https://')));
 report.errors=await tab.dev.logs({levels:['error'],limit:20});assert.equal(report.errors.length,0);
 report.status='PASS';await fs.writeFile(path.join(directory,label+'-audit.json'),JSON.stringify(report,null,2));

return report;
}
