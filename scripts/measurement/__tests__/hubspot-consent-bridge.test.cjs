const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');

const source=fs.readFileSync('scripts/measurement/hubspot-consent-bridge.js','utf8');

function setup({enabled=true,gpc=false,host='efeoncepro.com'}={}){const attributes={},handlers={};const window={location:{hostname:host},navigator:{globalPrivacyControl:gpc},crypto:require('node:crypto').webcrypto,efeonceConsentMeasurementEnabled:enabled};const document={documentElement:{setAttribute:(k,v)=>attributes[k]=v,getAttribute:k=>attributes[k]},addEventListener:(k,v)=>handlers[k]=v};const ctx={window,document};

vm.runInNewContext(source,ctx);

return {window,attributes,handlers,run:()=>vm.runInNewContext(source,ctx),consent:value=>window._hsp.find(x=>x[0]==='addPrivacyConsentListener')[1](value),views:()=>window.dataLayer.filter(x=>x.event==='gh_consent_page_view')};}

let count=0;

function test(name,fn){fn();count++;console.log('PASS '+name)}

test('deny by default before listener',()=>{const s=setup();

assert.equal(s.window.dataLayer[0][0],'consent');assert.equal(s.window.dataLayer[0][1],'default');assert.equal(s.attributes['data-efeonce-ads-consent'],'denied');assert.equal(s.views().length,0)});
test('unknown / legacy allowed never grants',()=>{const s=setup();

s.consent({allowed:true});s.consent(undefined);assert.equal(s.views().length,0);assert.equal(s.attributes['data-efeonce-ads-consent'],'denied')});
test('analytics-only cannot send Meta',()=>{const s=setup();

s.consent({categories:{analytics:true,advertisement:false}});assert.equal(s.views().length,1);assert.equal(s.views()[0].meta_capi_page_view,'0');assert.equal(s.views()[0].meta_only,'0')});
test('advertisement-only bypasses GA4 forwarding',()=>{const s=setup();

s.consent({categories:{analytics:false,advertisement:true}});assert.equal(s.views()[0].meta_only,'1');assert.equal(s.views()[0].meta_capi_page_view,'1')});
test('both grants one combined PageView',()=>{const s=setup();

s.consent({categories:{analytics:true,advertisement:true}});assert.equal(s.views().length,1);assert.equal(s.views()[0].meta_only,'0');assert.equal(s.views()[0].meta_capi_page_view,'1')});
test('later advertisement grant produces only Meta view',()=>{const s=setup();

s.consent({categories:{analytics:true,advertisement:false}});s.consent({categories:{analytics:true,advertisement:true}});assert.equal(s.views().length,2);assert.equal(s.views()[1].meta_only,'1')});
test('repeat/revoke/regrant never recounts this navigation',()=>{const s=setup();

s.consent({categories:{analytics:true,advertisement:true}});s.consent({categories:{analytics:true,advertisement:true}});s.consent({categories:{analytics:false,advertisement:false}});assert.equal(s.attributes['data-efeonce-ads-consent'],'denied');s.consent({categories:{analytics:true,advertisement:true}});assert.equal(s.views().length,1)});
test('GPC overrides advertiser consent',()=>{const s=setup({gpc:true});

s.consent({categories:{analytics:true,advertisement:true}});assert.equal(s.views()[0].meta_capi_page_view,'0');assert.equal(s.attributes['data-efeonce-ads-consent'],'denied')});
test('inactive coordinated transport cannot emit views',()=>{const s=setup({enabled:false});

s.consent({categories:{analytics:true,advertisement:true}});assert.equal(s.views().length,0);assert.equal(s.attributes['data-efeonce-ads-consent'],'granted')});
test('duplicate installation adds no listener/default',()=>{const s=setup();

s.run();assert.equal(s.window._hsp.length,1)});
test('other hosts are inert',()=>{const s=setup({host:'invalid.example'});

assert.equal(s.window.dataLayer,undefined)});
test('preferences button reopens native banner',()=>{const s=setup();let prevented=false;

s.handlers.click({target:{closest:()=>({})},preventDefault:()=>prevented=true});assert.ok(prevented);assert.equal(s.window._hsp.at(-1)[0],'showBanner')});
test('meeting identity is a fresh opaque UUID',()=>{const s=setup();const a=s.window.efeonceMeetingConversionId(31),b=s.window.efeonceMeetingConversionId(32);

assert.match(a,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.notEqual(a,b)});
test('same GTM event retains the nonce',()=>{const s=setup();

assert.equal(s.window.efeonceMeetingConversionId(31),s.window.efeonceMeetingConversionId(31))});
test('missing counter and failed entropy fail closed',()=>{const s=setup();

assert.equal(s.window.efeonceMeetingConversionId(undefined),'');s.window.crypto={randomUUID:()=>{throw Error('blocked')}};assert.equal(s.window.efeonceMeetingConversionId(31),'')});
test('legacy getRandomValues generates UUID v4',()=>{const s=setup();

s.window.crypto={getRandomValues:require('node:crypto').webcrypto.getRandomValues.bind(require('node:crypto').webcrypto)};assert.match(s.window.efeonceMeetingConversionId(31),/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)});
console.log(count+' tests passed');
