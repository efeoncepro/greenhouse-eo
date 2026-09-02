/** Build-time compiler for the operator-approved Claude export. Never executes in WordPress. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const cheerio = require('cheerio');
const postcss = require('postcss');

const sourceDir = '/Users/jreye/Documents/landing hubspot/HubSpot services offer';
const targetDir = '/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets';
const source = fs.readFileSync(path.join(sourceDir, 'Landing HubSpot Pillar.dc.html'), 'utf8');
const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
const context = vm.createContext({setTimeout:()=>0,clearTimeout:()=>{},document:{getElementById:()=>null},window:{scrollTo:()=>{},scrollY:0}});

vm.runInContext(`class DCLogic { props={}; setState(v){this.state={...this.state,...(typeof v==='function'?v(this.state):v)};} }\n${source.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]}\nglobalThis.component=new Component();`,context);
const component=context.component;
const src=cheerio.load(source,{decodeEntities:false},false);
const escape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function evaluate(expr,scope){return Function('scope',`with(scope){return (${expr});}`)(scope);}

function resolve(s,scope){return String(s||'').replace(/{{\s*([\s\S]*?)\s*}}/g,(_,expr)=>{const v=evaluate(expr,scope);

return typeof v==='function'?'':String(v??'');});}

const voids=new Set(['img','br','hr','input','meta','link','source']);

function render(node,scope){
 if(node.type==='text')return escape(resolve(node.data,scope));
 if(node.type!=='tag')return '';
 const tag=node.tagName,a=node.attribs||{};

 if(tag==='sc-for'){const list=evaluate(a.list.replace(/{{|}}/g,''),scope);

return list.map((item,i)=>(node.children||[]).map(n=>render(n,{...scope,[a.as]:item,$index:i})).join('')).join('');}

 if(tag==='sc-if')return evaluate(a.value.replace(/{{|}}/g,''),scope)?(node.children||[]).map(n=>render(n,scope)).join(''):'';
 let attrs='';

 for(const [k,v] of Object.entries(a)){
  if(/^on|^ref$|^hint-/.test(k))continue;
  attrs+=' '+k+'="'+escape(resolve(v,scope))+'"';
 }

 
return '<'+tag+attrs+'>'+(voids.has(tag)?'':(node.children||[]).map(n=>render(n,scope)).join('')+'</'+tag+'>');
}

function renderSource(selector,state={}){const prev=component.state;

component.state={...prev,...state};const vals=component.renderVals();const html=src(selector).toArray().map(n=>render(n,vals)).join('');

component.state=prev;

return html;}

const modules={hero:'Declaración · Hero',proof:'Situación · Tres escenarios',hubs:'Plataforma · Hubs y capacidades',atlas:'Resultados · Seis familias',sectors:'Sectores · Rutas de implementación',licensing:'Licencias y operación',assessment:'Primer paso · Alcance y Blueprint',delivery:'Método · Cinco etapas','proof-ledger':'Caso · Customer Agent',faq:'Preguntas frecuentes',conversion:'Conversión · Reunión de alcance'};
const sections=src('section[data-capture]').toArray();

console.log('Source sections:',sections.map(n=>n.attribs['data-capture']).join(', '));
const rendered={};

for(const node of sections){const capture=node.attribs['data-capture'];

rendered[capture.replace('hubspot-','')]=renderSource('[data-capture="'+capture+'"]');}

// Preserve all content server-side; JS only selects panels, never manufactures their copy.
for(const [key,stateKey,count] of [['hubs','hub',14],['sectors','sector',4],['delivery','stg',5]]){
 if(!rendered[key])continue;
 const q=cheerio.load(rendered[key],{},false),panels=[];

 for(let i=0;i<count;i++){
  const p=cheerio.load(renderSource('[data-capture="hubspot-'+key+'"]',{[stateKey]:i}),{},false);
  const panel=p('.hsx-panel').first();

panel.attr('data-hsx-panel',String(i));panel.attr('id','hsx-'+key+'-panel-'+i);panel.attr('tabindex','-1');
  panels.push(p.html(panel));
 }

 q('.hsx-panel').first().replaceWith(panels.join(''));
 const buttons=key==='hubs'?q('.hsx-band-grid > button'):key==='sectors'?q('[aria-label="Sector"] > button'):q('[data-hsx-stations] button');
 const actual=key==='delivery'?q('button').filter((_,el)=>/Mirar|Diseñar|Implementar|Adoptar|Operar/.test(q(el).text())).slice(0,5):buttons;

 actual.each((i,el)=>q(el).attr('data-hsx-select',String(i)).attr('aria-controls','hsx-'+key+'-panel-'+i).attr('aria-pressed',i===0?'true':'false'));
 q('section').attr('data-hsx-tabs',key);
 rendered[key]=q.html();
}

// Export all state data for the governed Growth Forms authoring script (not a browser submit handler).
const formStates=[1,2,3].map(step=>{const old=component.state;

component.state={...old,step,f:{...old.f,escenario:'Lo tenemos y no está rindiendo'}};const v=component.renderVals();

component.state=old;

return JSON.parse(JSON.stringify(v));});

fs.mkdirSync('tmp/hubspot-source',{recursive:true});
fs.writeFileSync('tmp/hubspot-source/form-states.json',JSON.stringify(formStates,null,2));
fs.writeFileSync('tmp/hubspot-source/source.sha256',sourceHash+'\n');
// These defaults are approved design content, not claims newly authored by this compiler.
const names=Object.fromEntries(Object.keys(rendered).map(k=>[k,modules[k]||k]));
const output=[];const emit=(file,value)=>output.push({file:path.join(targetDir,file),value});
const slug=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,28);
const token=key=>'%%'+key+'%%';
const textLabel=(tag,value)=>({h1:'Título principal',h2:'Título',h3:'Subtítulo',p:'Descripción',button:'Botón',summary:'Pregunta'}[tag]||'Texto')+' · '+value.replace(/\s+/g,' ').trim().slice(0,45);
// Reuse the established source-to-native-control compiler (build-time only).
let fragment=fs.readFileSync('scripts/public-website/compile-agency-elementor-source.cjs','utf8').split('function compileFragment')[1].split('\nfunction compileModule')[0];
const compileFragment=Function('cheerio','slug','token','textLabel','return function compileFragment'+fragment)(cheerio,slug,token,textLabel);

for(const [key,html] of Object.entries(rendered)){
 const q=cheerio.load(html,{},false);

 q('a').addClass('-undash');
 q('img').each((_,el)=>{const url=q(el).attr('src');

if(url.startsWith('public/'))q(el).attr('src','@hubspot/'+path.basename(url));else if(url.includes('simpleicons.org/hubspot'))q(el).attr('src','@hubspot/hubspot.svg');});
 if(key==='hero')q('.hsx-cols-6 > button').each((i,el)=>q(el).attr('data-hsx-family',String(i)));
 if(key==='proof')q('.hsx-cols-3 > a').addClass('hsx-scenario-card');
 if(key==='atlas')q('.hsx-cols-3 > a').each((i,el)=>q(el).attr('data-hsx-goto-hub',String([1,2,6,3,0,7][i])).addClass('hsx-family-card'));
 if(key==='sectors')q('[data-hsx-panel] button').each((_,el)=>{const n=q(el).text().trim().match(/^0([1-6])/);

if(n)q(el).attr('data-hsx-goto-hub',String([1,2,6,3,0,7][Number(n[1])-1]));});
 if(key==='licensing')q('h3').parent().addClass('hsx-license-item');

 if(key==='conversion'){
  // Keep the approved outer card; fields/validation/submission remain renderer-owned.
  const stepTitle=q('*').filter((_,el)=>q(el).children().length===0&&q(el).text().trim()==='Tu situación').first();
  let card=stepTitle.parent();

  while(card.length&&!card.find('button').length)card=card.parent();

  // Card is identified by its shared source structure, not a pixel selector.
  const formCard=q('[style]').filter((_,el)=>{const s=q(el).attr('style')||'';

return s.includes('box-shadow')&&q(el).find('button').length>0;}).last();

  if(!formCard.length)throw new Error('Missing source form card');
  formCard.addClass('gh-hubspot-form-card').html('%%growth_form%%');
  q('h2').attr('tabindex','-1');
 }

 // Repeated cards, panels and FAQ remain native Elementor collections.
 const groups=[];

 if(key==='proof')groups.push({key:'scenarios',label:'Escenarios',nodes:q('.hsx-scenario-card')});
 if(key==='atlas')groups.push({key:'families',label:'Familias de resultados',nodes:q('.hsx-family-card')});
 if(key==='faq')groups.push({key:'questions',label:'Preguntas y respuestas',nodes:q('details')});
 if(['hubs','sectors','delivery'].includes(key))groups.push({key:'panels',label:'Paneles y contenidos',nodes:q('[data-hsx-panel]')});
 const repeaters=[];

 for(const g of groups){
  const fields=new Map(),variants={},defaults=[];

  g.nodes.each((i,el)=>{const c=compileFragment(q.html(el),key);const variant='layout_'+i;const file=key+'--'+g.key+'-'+i+'.html';

variants[variant]={label:q(el).find('h3,summary').first().text().trim().slice(0,65)||'Panel '+(i+1),template:file};require('./hubspot-brand-assets.cjs').panel(key,i,c);emit('includes/hubspot/templates/'+file,c.template);c.fields.forEach(f=>{if(!fields.has(f.key))fields.set(f.key,f);});defaults.push({_id:crypto.createHash('sha1').update(key+g.key+i).digest('hex').slice(0,7),_layout:variant,...c.defaults});});
  g.nodes.first().before(token('repeat_'+g.key));g.nodes.remove();repeaters.push({key:g.key,label:g.label,fields:[...fields.values()],variants,defaults});
 }

 const c=compileFragment(q.html(),key);

 // Additive native SEO control: append after compilation so existing field keys never shift.
 if(key==='proof-ledger'){
  c.fields.push({key:'f032_destino',type:'url',label:'Fuente · perfil oficial de HubSpot'});
  c.defaults.f032_destino={url:'https://ecosystem.hubspot.com/es/marketplace/solutions/efeoncepro'};
  c.template=c.template.replace('%%f028_descripcion%%</p>','<a class="hsx-proof-source" href="%%f032_destino%%">%%f028_descripcion%%</a></p>');
  // Operator revision 2026-08-31: retain only partner + directory, enlarge official badge.
  // Apply after control extraction so all remaining native field keys stay stable.
  const adjusted=cheerio.load(c.template,{},false),row=adjusted('.hsx-band > .hsx-cols-3').last();

  row.removeAttr('style').attr('class','hsx-partner-proof');
  row.children().last().remove();row.children().removeAttr('style');
  row.find('img').removeAttr('style').attr('class','hsx-partner-badge').attr('width','116').attr('height','116');
  c.template=adjusted.html();
  const retired=new Set(['f029_descripcion','f030_descripcion','f031_descripcion']);

  c.fields=c.fields.filter(f=>!retired.has(f.key));retired.forEach(k=>delete c.defaults[k]);
 }

 if(key==='delivery'){
  // Dynamic stage presentation belongs to the progressively enhanced timeline, not frozen inline state.
  const adjusted=cheerio.load(c.template,{},false),grid=adjusted('.hsx-cols-5'),stations=grid.parent();

  stations.removeAttr('style').attr('class','hsx-stations');
  stations.children('span').eq(0).removeAttr('style').addClass('hsx-stage-track');
  stations.children('span').eq(1).removeAttr('style').addClass('hsx-stage-fill').attr('data-hsx-stage-fill','');
  grid.removeAttr('style').attr('class','hsx-stations-grid');
  grid.children('button').each((_,el)=>{const b=adjusted(el);

b.removeAttr('style');b.children('span').eq(0).removeAttr('style').addClass('hsx-stage-dot');b.children('span').eq(1).removeAttr('style').addClass('hsx-stage-label');});
  c.template=adjusted.html();
 }

 require('./hubspot-brand-assets.cjs')(key,c);
 require('./hubspot-editorial-copy.cjs')(key,c,repeaters);
 emit('includes/hubspot/templates/'+key+'.html',c.template);
 emit('includes/hubspot/schemas/'+key+'.json',JSON.stringify({schema:'hubspotModule.v1',module:key,title:names[key],scheme:['hero','hubs','licensing','conversion'].includes(key)?'dark':'light',fields:c.fields,defaults:c.defaults,repeaters,sourceSha256:sourceHash},null,2)+'\n');
}

const ds=path.join(sourceDir,'_ds/axis-efeonce-greenhouse-design-system-9781a697-bb43-4e35-ae5e-0dba6a7a08d2/tokens');
let css=['fonts','colors','typography','spacing'].map(n=>fs.readFileSync(path.join(ds,n+'.css'),'utf8')).join('\n')+'\n'+source.match(/<style>([\s\S]*?)<\/style>/)[1];
const ast=postcss.parse(css);

// Fonts are registered as head dependencies by the native widget registry.
ast.walkAtRules('import',rule=>rule.remove());
ast.walkRules(rule=>{let p=rule.parent;

while(p){if(p.type==='atrule'&&/keyframes/.test(p.name))return;p=p.parent;}rule.selectors=rule.selectors.map(s=>{s=s.replace(/:root|\bbody\b/g,'.gh-hubspot-module');

return s.startsWith('.gh-hubspot-module')?s:'.gh-hubspot-module '+s;});});
emit('assets/css/hubspot-landing.css',ast.toString().replaceAll('public/branding/partners/hubspot/solution-partner/','../img/hubspot/'));
for(const name of ['badge-orange-spp-hubspot.svg','badge-light-spp-hubspot.svg','badge-dark-spp-hubspot.svg'])emit('assets/img/hubspot/'+name,fs.readFileSync(path.join(sourceDir,'public/branding/partners/hubspot/solution-partner',name),'utf8'));
emit('assets/img/hubspot/hubspot.svg',fs.readFileSync(path.join(targetDir,'assets/img/agency/hubspot.svg'),'utf8').replace('<svg ', '<svg fill="#ff7a59" '));
for(const o of output){fs.mkdirSync(path.dirname(o.file),{recursive:true});fs.writeFileSync(o.file,o.value);}
fs.writeFileSync('tmp/hubspot-source/modules.json',JSON.stringify(Object.keys(rendered)));
console.log(JSON.stringify({modules:Object.keys(rendered),files:output.length,sourceHash}));
