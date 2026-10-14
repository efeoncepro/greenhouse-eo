const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const source = fs.readFileSync('scripts/measurement/hubspot-consent-bridge.js', 'utf8');
function browser({ cookies = new Map(), storage = new Map(), url = 'https://efeoncepro.com/?fbclid=fixture-click', gpc = false, blockCookies = false, blockStorage = false } = {}) {
  const attributes = {};
  const document = { documentElement: { setAttribute: (k,v) => attributes[k] = v, getAttribute: k => attributes[k] }, addEventListener() {} };
  Object.defineProperty(document, 'cookie', {
    get() { return blockCookies ? '' : [...cookies].map(([k,v]) => k+'='+v).join('; '); },
    set(value) { if (blockCookies) throw Error('unavailable'); const [pair] = value.split(';'); const at = pair.indexOf('='); const key = pair.slice(0,at); if (value.includes('Max-Age=0;')) cookies.delete(key); else cookies.set(key,pair.slice(at+1)); }
  });
  const window = { URL, location: new URL(url), navigator: { globalPrivacyControl:gpc }, crypto:require('node:crypto').webcrypto, efeonceConsentMeasurementEnabled:true,
    sessionStorage:{getItem:k=>{if(blockStorage)throw Error('unavailable');return storage.get(k)||null;},setItem:(k,v)=>{if(blockStorage)throw Error('unavailable');storage.set(k,v);},removeItem:k=>storage.delete(k)} };
  vm.runInNewContext(source, { window,document });
  return { window,document,cookies,storage,grant(ads=true) { window._hsp.find(x=>x[0]==='addPrivacyConsentListener')[1]({ categories:{ advertisement:ads,analytics:false } }); }, read:()=>window.efeonceReadMetaAttribution() };
}
test('no advertising storage before consent; no fabricated click',()=>{const b=browser({url:'https://efeoncepro.com/'});assert.equal(b.cookies.size,0);assert.equal(b.storage.size,0);b.grant();assert.match(b.read().fbp,/^fb\.1\.\d{13}\.\d{1,20}$/);assert.equal(b.read().fbc,undefined);});
test('landing click and browser ID survive navigation and the shared public domain',()=>{const b=browser();b.grant();const first=b.read();const next=browser({cookies:b.cookies,storage:b.storage,url:'https://think.efeoncepro.com/web-agentica/'});next.grant();assert.equal(next.read().fbc,first.fbc);assert.equal(next.read().fbp,first.fbp);assert.match(first.fbc,/^fb\.1\.\d{13}\.fixture-click$/);});
test('cookie values from the visitor are preserved un-hashed',()=>{const now=Date.now();const b=browser({url:'https://efeoncepro.com/contacto/',cookies:new Map([['_fbp',`fb.1.${now}.1234`],['_fbc',`fb.1.${now}.actual-click`]])});b.grant();assert.equal(b.read().fbp,`fb.1.${now}.1234`);assert.equal(b.read().fbc,`fb.1.${now}.actual-click`);});
test('session storage fallback survives navigation when cookies are blocked',()=>{const b=browser({blockCookies:true});b.grant();const first=b.read();const next=browser({blockCookies:true,storage:b.storage,url:'https://efeoncepro.com/contacto/'});next.grant();assert.equal(next.read().fbc,first.fbc);assert.equal(next.read().fbp,first.fbp);});
test('blocked storage never interrupts consent or a submission context read',()=>{const b=browser({blockCookies:true,blockStorage:true});b.grant();assert.ok(b.read().fbp);assert.equal(b.read().fbp,b.read().fbp);});
test('revocation clears attribution, and GPC veto never generates IDs',()=>{const b=browser();b.grant();b.grant(false);assert.equal(b.cookies.size,0);assert.equal(b.storage.size,0);assert.equal(b.read().fbp,undefined);const g=browser({gpc:true});g.grant();assert.equal(g.cookies.size,0);assert.equal(g.read().fbc,undefined);});
test('latest actual ad click replaces older click without changing browser ID',()=>{const b=browser();b.grant();const first=b.read();b.window.location=new URL('https://efeoncepro.com/?fbclid=next-real-click');assert.notEqual(b.read().fbc,first.fbc);assert.equal(b.read().fbp,first.fbp);});
test('advertising IDs never enter dataLayer/GA4 ordinary events',()=>{const b=browser();b.grant();const raw=JSON.stringify(b.window.dataLayer);assert.ok(!raw.includes('fixture-click'));assert.ok(!raw.includes(b.read().fbp));});
