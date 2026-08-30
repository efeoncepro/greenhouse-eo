/** Focused live renderer audit for the operator's four follow-up annotations. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditAgencyPolish(tab,{directory,label}){
  await fs.mkdir(directory,{recursive:true});

  for(const section of ['ecosystem','social-proof','faq','agenda']){
    const id=await tab.playwright.locator('[data-capture="'+section+'"]').getAttribute('id');
    const target='https://efeoncepro.com/#'+id;

    if(await tab.url()!==target)await tab.goto(target);
    let top=Infinity;

    for(let i=0;i<30;i++){
      await new Promise(r=>setTimeout(r,150));
      top=await tab.playwright.locator('[data-capture="'+section+'"]').evaluate(e=>e.getBoundingClientRect().top);
      if(Math.abs(top)<2)break;
    }

    assert.ok(Math.abs(top)<2,'Anchor position '+section);
    await new Promise(r=>setTimeout(r,1100));
    await fs.writeFile(path.join(directory,label+'-'+section+'.png'),await tab.screenshot({fullPage:false}));
  }

  const read=()=>tab.playwright.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();

return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};};

    const button=document.querySelector('[data-capture="agenda"] .gh-agency-agenda-button');
    const contact=document.querySelector('.gh-agency-faq-contact');

    
return{
      width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
      darkHeadings:['reframe','proof-engine','ecosystem','agenda'].map(m=>({module:m,color:getComputedStyle(document.querySelector('[data-capture="'+m+'"] h2')).color})),
      cta:{background:getComputedStyle(button).backgroundColor,color:getComputedStyle(button).color,href:button.href},
      hubspot:[...document.querySelectorAll('.gh-agency-module img[src$="/agency/hubspot.svg"]')].map(e=>({module:e.closest('[data-agency-module]').dataset.agencyModule,src:e.src,loaded:e.complete&&e.naturalWidth>0})),
      faq:{position:getComputedStyle(document.querySelector('.gh-agency-faq-aside')).position,aside:rect(document.querySelector('.gh-agency-faq-aside')),questions:rect(document.querySelector('.gh-agency-faq-questions')),contact:rect(contact),button:rect(document.querySelector('.gh-agency-faq-button')),contained:contact.contains(document.querySelector('.gh-agency-faq-button'))}
    };
  });

  const report=await read();

  assert.equal(report.width,report.scrollWidth);
  assert.ok(report.darkHeadings.every(e=>e.color==='rgb(234, 242, 255)'));
  assert.equal(report.cta.background,'rgb(20, 184, 166)');assert.equal(report.cta.color,'rgb(4, 34, 61)');
  assert.equal(report.cta.href,'https://efeoncepro.com/agenda/');
  for(const moduleName of ['stack','social-proof'])assert.ok(report.hubspot.some(e=>e.module===moduleName&&e.loaded&&e.src.startsWith('https://')));

  function contained(f){assert.ok(f.contained);assert.ok(f.button.bottom<=f.contact.bottom&&f.button.right<=f.contact.right&&f.button.left>=f.contact.left);}

  contained(report.faq);
  if(report.width<=1024){assert.equal(report.faq.position,'static');assert.ok(report.faq.questions.top>report.faq.aside.bottom);}
  else assert.ok(report.faq.questions.left>report.faq.aside.right);
  const last=tab.playwright.locator('[data-faq]').last();

  await last.locator('summary').click();
  await new Promise(r=>setTimeout(r,800));
  assert.notEqual(await last.getAttribute('open'),null);
  report.faqScrolled=(await read()).faq;contained(report.faqScrolled);
  await fs.writeFile(path.join(directory,label+'-faq-scrolled.png'),await tab.screenshot({fullPage:false}));
  await last.locator('summary').click();
  report.errors=await tab.dev.logs({levels:['error'],limit:20});assert.equal(report.errors.length,0);
  report.status='PASS';
  await fs.writeFile(path.join(directory,label+'-audit.json'),JSON.stringify(report,null,2));
  
return report;
}
