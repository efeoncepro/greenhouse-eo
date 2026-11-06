async (page) => {
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  const response=await page.goto('https://efeoncepro.com/glitch/glitch-flash-images-2-6/',{waitUntil:'domcontentloaded'});
  const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,iframes:document.querySelectorAll('.entry-content iframe[src*="player.vimeo.com"]').length,oldButtons:document.querySelectorAll('.entry-content .wp-block-button').length,bodyImages:document.querySelectorAll('.entry-content .wp-block-image').length,drops:document.querySelectorAll('aside.gh-glitch-drop').length,canonical:document.querySelector('link[rel=canonical]')?.href,robots:document.querySelector('meta[name=robots]')?.content,cover:document.querySelector('meta[property="og:image"]')?.content}));
  const videos=[];
  for(const id of ['1243362697','1242918503']){
   const selector='.entry-content iframe[src*="'+id+'"]';const iframe=page.locator(selector);
   await iframe.scrollIntoViewIfNeeded();
   await page.frameLocator(selector).getByRole('button',{name:'Reproducir',exact:true}).first().click();
   const frame=page.frames().find(f=>f.url().includes('player.vimeo.com/video/'+id));
   await frame.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>1&&v.readyState>=3},null,{timeout:15000});
   const rect=await iframe.evaluate(f=>({w:f.getBoundingClientRect().width,h:f.getBoundingClientRect().height,style:f.getAttribute('style')}));
   const state=await frame.locator('video').evaluate(v=>({currentTime:v.currentTime,paused:v.paused,readyState:v.readyState,error:v.error?.message||null,videoWidth:v.videoWidth,videoHeight:v.videoHeight}));
   await iframe.locator('xpath=ancestor::figure[1]').screenshot({path:'output/playwright/glitch-images26-review/embedded-final-'+id+'-'+width+'.png'});
   videos.push({id,...rect,...state});await frame.locator('video').evaluate(v=>v.pause());
  }
  results.push({status:response.status(),...metrics,videos});
 }
 return {results,pageErrors:errors};
}
