/** Source-preserving DOM enhancement runtime. Bundled with build-time compiled module render functions. */
const fs = require('node:fs')

const header = `(()=>{'use strict';
class DCLogic { props={}; setState(update,done){this.state={...this.state,...(typeof update==='function'?update(this.state):update)};if(this.update)this.update();if(done)done();} }
`

const runtime = require('./content-marketing-cms-logos.cjs').clientSource + String.raw`
if(window.__eoContentMarketing){window.__eoContentMarketing.refresh();return;}
const live=new Map();
const cssStyle=o=>typeof o==='object'?Object.entries(o).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+(typeof v==='number'&&v!==0&&!/^(opacity|zIndex|flex|flexGrow|flexShrink|fontWeight|lineHeight|order|scale)$/.test(k)?v+'px':v)).join(';'):String(o||'');
const flat=a=>a.flat(Infinity).filter(x=>x!==null&&x!==undefined&&x!==false).reduce((out,x)=>{if(typeof x==='string'&&typeof out[out.length-1]==='string')out[out.length-1]+=x;else out.push(x);return out;},[]);
function mount(root){
 if(live.has(root))return;
 const configNode=root.querySelector('script[data-cm-config]');if(!configNode)return;
 const config=JSON.parse(configNode.textContent),module=root.dataset.contentModule;
 const component=new Component();component.module=module;component.root=root;component.motion=root.dataset.motion!=='no';
 component.editor=!!(window.elementorFrontend?.isEditMode?.());
 const formHost=root.querySelector('[data-cm-form-host]');
 const lookup=(type,value)=>config.values[type+'|'+String(value)]??String(value??'');
 const T=v=>lookup(String(v??'').trim().length>110?'textarea':'text',v);
 // Copy the same native editorial values that render the memo, with real paragraph breaks.
 if(module==='business')component.copyMemo=()=>{
  const text=[T('Asunto:')+T(' Propuesta de operación de contenidos'),...component.renderVals().memoLines.map(line=>T(line.text))].join('\n\n');
  const done=()=>{component.setState({memoCopied:true});clearTimeout(component._memoT);component._memoT=setTimeout(()=>component.setState({memoCopied:false}),2400);};
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(done,()=>component.copyFallback(text,done));
  else component.copyFallback(text,done);
 };
 const H=(tag,attrs,children)=>({tag,attrs,children:flat(children)});
 const boolean=new Set(['autoplay','loop','muted','playsinline','controls','disabled','required','hidden','open']);
 function values(attrs){const out={};for(let [k,v]of Object.entries(attrs)){
  k=k.toLowerCase();if(k.startsWith('on')){out[k]=v;continue;}if(v===false||v==null){continue;}
  if(k==='style')v=cssStyle(v).replace(/url\(["']?(assets\/[\w/.-]+)["']?\)/g,(_,u)=>'url("'+lookup('media',u)+'")');
  else if(['src','poster'].includes(k))v=lookup('media',v);
  else if(k==='href'){const routes={'/servicios/seo/':'/servicios/posicionamiento-seo/','/servicios/aeo/':'/aeo-2/','/servicios/agencia-creativa/':'/agencia-creativa-v2/','/servicios/inbound-marketing/':'/agencia-inbound-marketing/','/servicios/influencer-marketing/':'/servicios/agencia-de-influencers/'};v=lookup('url',routes[v]||v);}
  else if(['alt','aria-label','title'].includes(k))v=lookup('text',v);
  else if(k==='class'&&/^ti ti-/.test(v))v=lookup('icon',v);
  out[k]=boolean.has(k)?'':String(v);
 }return out;}
 function patch(parent,old,node){
  if(typeof node==='string'){if(old?.nodeType===3){if(old.data!==node)old.data=node;return old;}const n=document.createTextNode(node);old?parent.replaceChild(n,old):parent.append(n);return n;}
  if(!node)return null;
  if(formHost&&Object.hasOwn(node.attrs,'data-cm-form-host')){if(old!==formHost){old?parent.replaceChild(formHost,old):parent.append(formHost);}return formHost;}
  let el=old;if(!el||el.nodeType!==1||el.localName!==node.tag.toLowerCase()){
   el=document.createElement(node.tag);old?parent.replaceChild(el,old):parent.append(el);
  }
  const next=values(node.attrs);
  for(const a of [...el.attributes])if(!(a.name in next)&&!a.name.startsWith('data-cm-')&&!['tabindex'].includes(a.name))el.removeAttribute(a.name);
  for(const [k,v]of Object.entries(next)){
   if(k.startsWith('on')){el[k]=typeof v==='function'?v:null;continue;}
   if(el.getAttribute(k)!==v)el.setAttribute(k,v);
  }
  // Canonical capture is an opaque host: state updates must never recreate it or its fields.
  if('data-cm-form-host' in next)return el;
  const oldChildren=[...el.childNodes];node.children.forEach((child,i)=>patch(el,oldChildren[i],child));
  for(let i=node.children.length;i<oldChildren.length;i++){if(oldChildren[i].nodeName==='VIDEO')oldChildren[i].pause();oldChildren[i].remove();}
  return el;
 }
 function accessibility(){
  root.querySelectorAll('[role="tablist"]').forEach((list,li)=>{const tabs=[...list.querySelectorAll('[role="tab"]')];tabs.forEach((tab,i)=>{tab.tabIndex=tab.getAttribute('aria-selected')==='true'?0:-1;tab.id=tab.id||config.instance+'-tabs-'+li+'-'+i;});list.onkeydown=e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const current=tabs.indexOf(document.activeElement);const index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[index].click();tabs[index].focus();};});
  root.querySelectorAll('video').forEach(v=>{v.muted=true;v.defaultMuted=true;v.playsInline=true;v.controls=true;v.preload='metadata';if(component.reduce||component.editor){v.autoplay=false;v.pause();}else if(v.hasAttribute('autoplay'))v.play().catch(()=>{});});
  if(module==='review')component._revVideo=root.querySelector('video');
 }
 component.update=()=>{const tree=renderers[module](component.renderVals(),H,T);if(module==='editorial')injectCmsLogos(tree,H,T);patch(root,root.querySelector(':scope > section'),tree);accessibility();};
 component.update();component.componentDidMount();accessibility();if(module==='hero'){root.style.setProperty('--cm-header-offset',headerH()+'px');}
 root.dataset.cmReady='true';live.set(root,component);
 if(module==='modes'){
  const original=component.pickMode.bind(component);component.pickMode=i=>{original(i);document.dispatchEvent(new CustomEvent('content-marketing-mode',{detail:{mode:component.state.f.modo}}));};
 }
 let onMode=null,onFormInput=null;if(module==='conversion'){const form=root.querySelector('greenhouse-form');let started=false;onFormInput=()=>{started=true;};form?.addEventListener('input',onFormInput);onMode=e=>{if(form&&!started)form.setAttribute('initial-values',JSON.stringify({mode:e.detail.mode}));};document.addEventListener('content-marketing-mode',onMode);}
 const media=window.matchMedia('(prefers-reduced-motion: reduce)');const reduced=()=>{component.componentWillUnmount();component.componentDidMount();component.update();};media.addEventListener('change',reduced);
 component.dispose=()=>{if(onMode)document.removeEventListener('content-marketing-mode',onMode);if(onFormInput)root.querySelector('greenhouse-form')?.removeEventListener('input',onFormInput);media.removeEventListener('change',reduced);component.componentWillUnmount();root.querySelectorAll('video').forEach(v=>v.pause());live.delete(root);};
}
function refresh(){for(const [root,c]of live)if(!root.isConnected)c.dispose();document.querySelectorAll('[data-content-module]').forEach(mount);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
window.__eoContentMarketing={refresh};
const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-content-module],.elementor-element')||n.querySelector?.('[data-content-module]')))))queueMicrotask(refresh);});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pagehide',()=>{observer.disconnect();for(const c of live.values())c.dispose();},{once:true});
})();
`

fs.writeFileSync(
  '/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/js/content-marketing.js',
  header +
    fs.readFileSync('tmp/content-marketing-build/logic.js', 'utf8') +
    '\n' +
    fs.readFileSync('tmp/content-marketing-build/renderers.js', 'utf8') +
    '\n' +
    runtime
)
