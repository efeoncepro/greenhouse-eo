/** Runs through the selected Browser plugin tab; no standalone browser or login bypass. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditAgencyTab(tab, {outputDirectory, label, publication = 'home'}) {
  await fs.mkdir(outputDirectory,{recursive:true});

  const report = await tab.playwright.evaluate(() => ({
    width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
    widgets:[...document.querySelectorAll('[data-widget_type]')].map(e=>e.getAttribute('data-widget_type')),
    modules:document.querySelectorAll('[data-agency-ready]').length,
    sections:document.querySelectorAll('[data-capture]').length,
    h1:document.querySelectorAll('h1').length,
    robots:document.querySelector('meta[name="robots"]')?.content,
    canonical:document.querySelector('link[rel="canonical"]')?.href,
    header:!!document.querySelector('#masthead'),footer:!!document.querySelector('footer'),
    unresolved:/%%(?:f\d|repeat_)/.test(document.body.textContent)
  }));

  assert.equal(report.modules,17);assert.equal(report.sections,16);assert.equal(report.h1,1);
  assert.equal(report.width,report.scrollWidth);assert.equal(report.unresolved,false);
  assert.ok(report.header&&report.footer);

  if(publication==='preview') assert.match(report.robots,/noindex/);
  else {assert.doesNotMatch(report.robots,/noindex/);assert.equal(report.canonical,'https://efeoncepro.com/');}

  assert.equal(report.widgets.filter(x=>x==='html.default').length,0);

  for(const section of ['hero','trust','reframe','motor','work','servicios','stack','proof-engine','comparison','agenda']) {
    const target=await tab.playwright.locator('[data-capture="'+section+'"]').evaluate(el=>({id:el.id,url:location.href.split('#')[0]}));

    await tab.goto(target.url+'#'+target.id);
    // Native anchor navigation can animate. Read back the actual position before capture.
    let top=Infinity;

    for(let attempt=0;attempt<30;attempt++) {
      await new Promise(resolve=>setTimeout(resolve,150));
      top=await tab.playwright.locator('[data-capture="'+section+'"]').evaluate(el=>el.getBoundingClientRect().top);
      if(Math.abs(top)<2) break;
    }

    assert.ok(Math.abs(top)<2,section+' did not reach the viewport');
    // The source reveals have delays as well as a 720ms transition.
    await new Promise(resolve=>setTimeout(resolve,1500));

    if(section==='work'){
      const visible=await tab.playwright.evaluate(()=>[...document.querySelectorAll('[data-capture="work"] img')].filter(e=>{const r=e.getBoundingClientRect();

return r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight;}).map(e=>e.complete&&e.naturalWidth>0));

      assert.ok(visible.length>0&&visible.every(Boolean),'Visible carousel artwork must load');
    }

    await fs.writeFile(path.join(outputDirectory,label+'-'+section+'.png'),await tab.screenshot({fullPage:false}));
  }

  report.annotations=await tab.playwright.evaluate(()=>({
    headingColors:['reframe','proof-engine'].map(section=>getComputedStyle(document.querySelector('[data-capture="'+section+'"] h2')).color),
    work:[...document.querySelectorAll('[data-capture="work"] img')].map(e=>({src:e.src,alt:e.alt,loaded:e.complete&&e.naturalWidth>0})),
    placeholders:document.querySelectorAll('[data-capture="work"] [data-media-placeholder]').length,
    logos:[...document.querySelectorAll('[data-capture="trust"] .gh-logo-marquee-set:not([aria-hidden]) img')].map(e=>({alt:e.alt,loaded:e.complete&&e.naturalWidth>0})),
    logoStylesheet:!!document.querySelector('link[href*="/logo-marquee.css"]'),
    sprocket:[...document.querySelectorAll('[data-capture="stack"] img')].filter(e=>e.src.endsWith('/agency/hubspot.svg')).map(e=>({src:e.src,loaded:e.complete&&e.naturalWidth>0})),
    agendaForms:document.querySelectorAll('[data-capture="agenda"] form').length,
    agendaHref:document.querySelector('[data-capture="agenda"] .gh-agency-agenda-button').href,
    agendaColumns:[...document.querySelector('.gh-agency-agenda-card').children].map(e=>({left:e.getBoundingClientRect().left,top:e.getBoundingClientRect().top})),
    finalWidth:document.documentElement.clientWidth,finalScrollWidth:document.documentElement.scrollWidth
  }));
  const a=report.annotations;

  assert.equal(a.headingColors.length,2);assert.ok(a.headingColors.every(color=>color==='rgb(234, 242, 255)'));
  assert.equal(a.placeholders,0);assert.equal(new Set(a.work.map(e=>e.src)).size,10);assert.ok(a.work.every(e=>e.alt));
  // Off-screen lazy originals may remain unloaded while their visible duplicate is decoded.
  assert.equal(new Set(a.work.filter(e=>e.loaded).map(e=>e.src)).size,10);
  assert.equal(a.logos.length,7);assert.ok(a.logos.every(e=>e.loaded&&e.alt));assert.ok(a.logoStylesheet);
  assert.equal(a.sprocket.length,1);assert.ok(a.sprocket[0].loaded);
  assert.ok(a.sprocket[0].src.startsWith('https://'));
  assert.equal(a.agendaForms,0);assert.equal(a.agendaHref,'https://efeoncepro.com/agenda/');
  if(report.width>760)assert.ok(a.agendaColumns[1].left>a.agendaColumns[0].left);
  else assert.ok(a.agendaColumns[1].top>a.agendaColumns[0].top);
  assert.equal(a.finalWidth,a.finalScrollWidth);
  await tab.playwright.locator('[data-svc-filter="tech"]').click();
  report.filter=await tab.playwright.evaluate(()=>({selected:document.querySelector('[data-svc-filter="tech"]').getAttribute('aria-selected'),dimmed:document.querySelectorAll('[data-svc-card][data-dim="1"]').length,count:document.querySelector('[data-svc-count]').textContent}));
  assert.equal(report.filter.selected,'true');assert.equal(report.filter.dimmed,6);
  await tab.playwright.locator('[data-svc-filter="all"]').click();
  const faq=tab.playwright.locator('[data-faq]').first();

  await faq.locator('summary').click();assert.notEqual(await faq.getAttribute('open'),null);
  await faq.locator('summary').click();
  await tab.playwright.getByRole('button',{name:'Mira cómo operamos',exact:true}).click();
  assert.equal(await tab.playwright.locator('[data-tour]').getAttribute('aria-hidden'),'false');
  await tab.playwright.locator('[data-tour-close]').press('Escape');
  assert.equal(await tab.playwright.locator('[data-tour]').getAttribute('aria-hidden'),'true');
  report.focusReturn=await tab.playwright.evaluate(()=>document.activeElement?.textContent.trim());
  assert.equal(report.focusReturn,'Mira cómo operamos');
  report.errors=await tab.dev.logs({levels:['error'],limit:30});
  assert.equal(report.errors.length,0);
  report.status='PASS';
  await fs.writeFile(path.join(outputDirectory,label+'-audit.json'),JSON.stringify(report,null,2));
  
return report;
}
