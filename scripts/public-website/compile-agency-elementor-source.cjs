/** One-time source-led compiler. Emits an apply_patch patch; never changes WordPress. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const cheerio = require('cheerio');
const postcss = require('postcss');

const sourceDir = '/Users/jreye/Documents/agencia/Landing - Agencia';
const targetDir = '/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets';
const input = fs.readFileSync('.captures/task-1358-claude-source-audit/rendered-body.html', 'utf8');
const source = fs.readFileSync(path.join(sourceDir, 'Landing Agencia.dc.html'), 'utf8');
const $ = cheerio.load(input, { decodeEntities: false }, false);
const names = {hero:'Hero · Orquestación',trust:'Marcas · Confianza',problem:'Diagnóstico · Fragmentación',reframe:'Declaración · Reencuadre',motor:'Motor · Capacidades conectadas',work:'Trabajos · Marquee multimedia',servicios:'Servicios · Catálogo filtrable',stack:'Stack · Integraciones', 'proof-engine':'Greenhouse · Demostración',ecosystem:'Ecosistema · Software propio',method:'Método · Squad',cases:'Casos · Resultados','social-proof':'Testimonio · Prueba social',comparison:'Comparación · Modelos',faq:'Preguntas frecuentes',agenda:'Conversión · Agenda visual',experience:'Experiencia · Modal y CTA móvil'};
const dark = new Set(['hero','reframe','motor','proof-engine','ecosystem']);
let outputs = [];
const emit = (file, value) => outputs.push({file:path.join(targetDir,file),value});
const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,28);
const token = key => '%%' + key + '%%';
const textLabel = (tag, value) => ({h1:'Título principal',h2:'Título',h3:'Subtítulo',p:'Descripción',button:'Botón',summary:'Pregunta',blockquote:'Testimonio',option:'Opción'}[tag] || 'Texto') + ' · ' + value.replace(/\s+/g,' ').trim().slice(0,45);

function compileFragment(html, module) {
  const q = cheerio.load(html, {decodeEntities:false}, false);
  const fields = [], defaults = {};
  let serial=0;

  function field(type,label,value,extra={}) {
    const key='f'+String(++serial).padStart(3,'0')+'_'+slug(label.split(' · ')[0]);

    fields.push({key,type,label,...extra}); defaults[key]=value; 

return token(key);
  }

  // Preserve layout in versioned templates; expose content, media and destinations only.
  q('script,style').remove();
  q('*').each((_,el)=> {
    for (const attr of Object.keys(el.attribs||{})) if (/^on/i.test(attr)) q(el).removeAttr(attr);
    q(el).removeAttr('data-dc-tpl');
    if (q(el).is('[data-svc-card]')) q(el).attr('data-cat',field('select','Categoría',q(el).attr('data-cat'),{options:{mkt:'Marketing',tech:'Tecnología'}}));

    if (q(el).is('[data-reveal]')) {
      const s=(q(el).attr('style')||'').replace(/opacity:\s*0\s*;/g,'opacity: 1;').replace(/transform:\s*(?:translate[XY]\([^;]+|scale\([^;]+);/g,'transform: none;');

      q(el).attr('style',s);
    }

    if (q(el).is('[data-count]')) {
      q(el).attr('data-count',field('number','Valor del contador',Number(q(el).attr('data-count'))));
      for(const a of ['data-prefix','data-suffix']) if(q(el).attr(a)) q(el).attr(a,field('text',a==='data-prefix'?'Prefijo del contador':'Sufijo del contador',q(el).attr(a)));
    }

    if(q(el).is('[data-grow]')) q(el).attr('data-grow',field('number','Altura de barra (%)',Number(q(el).attr('data-grow')),{min:0,max:100}));
    for(const a of ['href','data-scroll-to']) if(q(el).attr(a) && !q(el).is('use')) q(el).attr(a,field('url','Destino · '+q(el).text().trim().slice(0,35),{url:q(el).attr(a)}));

    if(el.tagName==='img') {
      let src=q(el).attr('src')||'';

      if(src.startsWith('assets/')) src='@agency/'+src.slice(7);
      q(el).attr('src',field('media','Imagen · '+(q(el).attr('alt')||module),{url:src,id:0}));
      q(el).attr('alt',field('text','Texto alternativo',q(el).attr('alt')||''));
    }

    if(q(el).is('.gh-agency-media-slot')) {
      const media=field('slot','Multimedia · '+q(el).attr('data-slot-id'),{url:'',id:0});

      q(el).replaceWith(media);
      
return;
    }

    if(el.tagName==='i' && /^ti ti-/.test(q(el).attr('class')||'')) q(el).attr('class',field('icon','Icono Tabler',q(el).attr('class')));
    for(const a of ['placeholder','aria-label']) if(q(el).attr(a)) q(el).attr(a,field('text',a==='placeholder'?'Placeholder':'Nombre accesible',q(el).attr(a)));
  });

  // All non-decorative source text gets its own escaped Elementor content setting.
  function visit(node) {
    if(node.type==='text') {
      const value=node.data;

      if(!value.trim() || /%%/.test(value)) return;
      const parent=node.parent;

      if(!parent || ['style','script','svg','path'].includes(parent.tagName)) return;
      if(q(parent).closest('svg').length) return;
      const label=textLabel(parent.tagName,value);

      node.data=field(value.trim().length>95?'textarea':'text',label,value);
      
return;
    }

    (node.children||[]).forEach(visit);
  }

  q.root().contents().each((_,el)=>visit(el));
  let template=q.html();

  // Namespaced IDs inside vector artwork cannot collide when a widget is duplicated.
  q('svg [id]').each((_,el)=>{const id=q(el).attr('id');

template=template.replaceAll('id="'+id+'"','id="'+id+'-%%instance%%"').replaceAll('url(#'+id+')','url(#'+id+'-%%instance%%)').replaceAll('href="#'+id+'"','href="#'+id+'-%%instance%%"');});
  
return {template,fields,defaults};
}

function compileModule(key) {
  const root = key==='experience' ? $('<div></div>').append($('[data-progress]').clone(),$('[data-sticky-cta]').clone(),$('[data-tour]').clone()) : $('[data-capture="'+key+'"]').clone();

  root.find('[aria-hidden="true"][data-work]').remove();
  let repeatGroups=[];

  if(key==='servicios') repeatGroups.push({key:'services',label:'Servicios',nodes:root.find('[data-svc-card]')});
  if(key==='faq') repeatGroups.push({key:'questions',label:'Preguntas y respuestas',nodes:root.find('[data-faq]')});
  if(key==='work') root.find('[data-marquee]').each((i,el)=>repeatGroups.push({key:'work_'+i,label:'Trabajos · Fila '+(i+1),nodes:$(el).children('[data-work]')}));
  if(key==='cases') repeatGroups.push({key:'cases',label:'Casos',nodes:root.find('article')});

  if(key==='method') {
    const steps=root.find('h3').filter((_,el)=>/Escuchamos|Orquestamos|Operamos|Componemos/.test($(el).text())).parent();

    repeatGroups.push({key:'steps',label:'Pasos del método',nodes:steps});
  }

  if(key==='trust') {const brand=root.find('span').filter((_,el)=>['Sky','Bresler','BEREL','S.Silva'].includes($(el).text().trim()));

 if(brand.length) repeatGroups.push({key:'brands',label:'Marcas',nodes:brand});}

  const repeats=[];

  for(const group of repeatGroups) {
    if(!group.nodes.length) continue;
    const rows=[], fields=new Map(), variants={};

    group.nodes.each((i,el)=> {
      const compiled=compileFragment($.html(el),key);
      const variant='layout_'+i;

      variants[variant]={label:$(el).find('h3,summary').first().text().trim().slice(0,45)||$(el).text().trim().slice(0,35)||'Presentación '+(i+1),template:key+'--'+group.key+'-'+i+'.html'};
      emit('includes/agency/templates/'+variants[variant].template,compiled.template);
      compiled.fields.forEach(f=>{if(!fields.has(f.key)) fields.set(f.key,f);});
      rows.push({_id:crypto.createHash('sha1').update(key+group.key+i).digest('hex').slice(0,7),_layout:variant,...compiled.defaults});
    });
    group.nodes.first().before(token('repeat_'+group.key));group.nodes.remove();
    repeats.push({key:group.key,label:group.label,fields:[...fields.values()],variants,defaults:rows});
  }

  const compiled=compileFragment($.html(root),key);
  const definition={schema:'agencyModule.v1',module:key,title:names[key],scheme:dark.has(key)?'dark':'light',fields:compiled.fields,defaults:compiled.defaults,repeaters:repeats,sourceSha256:crypto.createHash('sha256').update(source).digest('hex')};

  emit('includes/agency/templates/'+key+'.html',compiled.template);
  emit('includes/agency/schemas/'+key+'.json',JSON.stringify(definition,null,2)+'\n');
}

const key=process.argv[2];

if(key==='assets') {
  const ds=path.join(sourceDir,'_ds/axis-efeonce-greenhouse-design-system-9781a697-bb43-4e35-ae5e-0dba6a7a08d2/tokens');
  let css=['fonts','colors','typography','spacing'].map(n=>fs.readFileSync(path.join(ds,n+'.css'),'utf8')).join('\n')+'\n'+source.match(/<style>([\s\S]*?)<\/style>/)[1];
  const ast=postcss.parse(css);

  ast.walkRules(rule=>{let p=rule.parent;

while(p){if(p.type==='atrule' && /keyframes/.test(p.name)) return;p=p.parent;}rule.selectors=rule.selectors.map(s=>{s=s.replace(/:root|\bbody\b/g,'.gh-agency-claude');

return s.startsWith('.gh-agency-claude')?s:'.gh-agency-claude '+s;});});
  emit('assets/css/agency-landing.css',ast.toString());
  for(const f of ['efeonce-white.svg','efeonce-navy.svg','greenhouse-full.svg','greenhouse-iso.svg']) emit('assets/img/agency/'+f,fs.readFileSync(path.join(sourceDir,'assets',f),'utf8'));
} else if(names[key]) compileModule(key);
else throw new Error('Pass a module key or assets.');
let patch='*** Begin Patch\n';

for(const o of outputs){
  if(fs.existsSync(o.file)) {
    const old=fs.readFileSync(o.file,'utf8');

    if(old.trimEnd()===o.value.trimEnd()) continue;
    patch+='*** Update File: '+o.file+'\n@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+o.value.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';
  } else patch+='*** Add File: '+o.file+'\n'+o.value.split('\n').map(l=>'+'+l).join('\n')+'\n';
}

process.stdout.write(patch+'*** End Patch\n');
