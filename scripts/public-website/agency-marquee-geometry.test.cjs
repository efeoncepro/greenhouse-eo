const assert=require('node:assert/strict');
const fs=require('node:fs');

const {JSDOM}=require('jsdom');

const source=fs.readFileSync('/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/js/agency-landing.js','utf8');
// Simulated layout tests the algorithm; real browser phase/paint tests remain mandatory.
const dom=new JSDOM('<div class="gh-agency-module"><section data-capture="work"><div data-rails><div data-marquee="-1" style="column-gap:14px">'+Array.from({length:5},()=>'<article><img loading="lazy" src="https://example.test/art.png"></article>').join('')+'</div></div></section></div>',{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;let viewportWidth=1920,itemWidth=200,resize;

w.matchMedia=()=>({matches:false});
w.ResizeObserver=class{constructor(cb){resize=cb;}observe(){}disconnect(){}};
w.IntersectionObserver=class{constructor(cb){this.cb=cb;}observe(target){this.cb([{target,isIntersecting:true}]);}disconnect(){}unobserve(){}};
Object.defineProperty(w.HTMLElement.prototype,'offsetLeft',{get(){return Array.from(this.parentNode.children).indexOf(this)*(itemWidth+14);}});
Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return this.hasAttribute('data-rails')?viewportWidth:0;}});
w.eval(source);
setTimeout(()=>{
 try{
  const track=w.document.querySelector('[data-marquee]');

  const verify=()=>{const distance=parseFloat(track.style.getPropertyValue('--gh-marquee-distance'));

assert.equal(distance,5*(itemWidth+14));assert.ok(track.children.length*(itemWidth+14)-14-distance>=viewportWidth);assert.equal(track.querySelectorAll('[data-marquee-clone][aria-hidden="true"]').length,track.children.length-5);assert.ok([...track.querySelectorAll('img')].every(img=>img.loading==='eager'));};

  verify();assert.equal(track.children.length,15);
  viewportWidth=390;itemWidth=175;resize([{contentRect:{width:viewportWidth}}]);verify();assert.equal(track.children.length,10);
  viewportWidth=2560;itemWidth=230;resize([{contentRect:{width:viewportWidth}}]);verify();assert.equal(track.children.length,20);
  w.EOAgencyModules.scan();assert.equal(track.children.length,20,'idempotent mount');
  console.log(JSON.stringify({status:'PASS',exactPeriod:true,wideCoverage:true,resizeRebuild:true,lazyPaintPreparation:true,cloneAccessibility:true}));
 }finally{w.close();}
},30);
