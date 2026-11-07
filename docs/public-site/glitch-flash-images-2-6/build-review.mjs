// Local review only. This never writes to WordPress or fabricates attachment IDs.
import fs from 'node:fs';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import {glitchLine} from '@efeoncepro/axis-tokens';

const root=process.cwd();
const base=path.join(root,'docs/public-site/glitch-flash-images-2-6');
const out=path.join(root,'ai-generations/2026-11-05_glitch-flash-images-2-6');
const md=new MarkdownIt({html:true});
const esc=md.utils.escapeHtml;
const raw=fs.readFileSync(path.join(base,'articulo.md'),'utf8');
const savedInventory=path.join(out,'media-inventory.json');
const publicationFile=path.join(out,'wp-publication.json');
const published=fs.existsSync(publicationFile)&&JSON.parse(fs.readFileSync(publicationFile,'utf8')).status==='publish';
const inventory=JSON.parse(fs.readFileSync(fs.existsSync(savedInventory)?savedInventory:'/tmp/glitch-image26-media/inventory.json','utf8'));
fs.mkdirSync(path.join(out,'media'),{recursive:true});
for(const a of inventory.assets){
  const dest=path.join(out,'media',path.basename(a.local));
  const origin=path.isAbsolute(a.local)?a.local:path.join(out,a.local);
  if(origin!==dest)fs.copyFileSync(origin,dest);
  a.local=path.relative(out,dest);
}
const alts={
 'markup-vase-input-gpt-image-2-6':'Cocina con un círculo rojo sobre el florero que se pide editar.',
 'markup-vase-gpt-image-2-6-sunburst':'La misma cocina con el florero azul y sin la anotación roja.',
 'monkey-lantern-gpt-image-2-6-sunburst':'Personaje con abrigo verde que levanta una linterna frente a una cabaña nevada.',
 'field-and-flour-gpt-image-2-6-sunburst':'Ejemplo SVG de Field & Flour con un pan, espigas y un rodillo.',
 'infographic-coffee-machine-sp-gpt-image-2-6-sunburst':'Diagrama de una cafetera con etiquetas en español.',
 'billboard-winter-gpt-image-2-6-sunburst':'Cartel publicitario de un champú en una escena invernal.',
 'images-2-6-gif-montage-poster':'Letras de colores con el nombre Images 2.6 en el anuncio oficial.'
};
for(const a of inventory.assets) a.alt=alts[a.id]||a.alt;
fs.writeFileSync(savedInventory,JSON.stringify(inventory,null,2)+'\n');
const assets=Object.fromEntries(inventory.assets.map(a=>[a.id,a]));
const wpMediaFile=path.join(out,'wp-media.json');
const wpMedia=fs.existsSync(wpMediaFile)?JSON.parse(fs.readFileSync(wpMediaFile,'utf8')):{};
const videos={
 'launch-motion':inventory.videos.find(v=>v.title==='GIF montage'),
 'launch-speed':inventory.videos.find(v=>v.title==='Images 2.6 latency comparison')
};
const customs=[];
const source=raw.replace(/:::(drop|destacado)\n([\s\S]*?)\n:::/g,(_,kind,text)=>{
 const id=customs.push({kind,text})-1;return `<!-- custom: ${id} -->`;
});
const tokens=md.parse(source,{});
function rich(t){
 let strong=false,href;
 const segments=[];
 for(const c of t.children||[]){
  if(c.type==='strong_open')strong=true;
  else if(c.type==='strong_close')strong=false;
  else if(c.type==='link_open')href=c.attrGet('href');
  else if(c.type==='link_close')href=undefined;
  else if(['text','code_inline','softbreak','hardbreak'].includes(c.type)){
   const text=['softbreak','hardbreak'].includes(c.type)?' ':c.content;
   segments.push({text,...(strong?{strong:true}:{}),...(href?{href}:{})});
  }
 }
 return segments;
}
const spec={title:tokens[1].content,slug:'glitch-flash-images-2-6',
 excerpt:'Probamos Images 2.6 con Nexa: dos escenas cinematográficas y dos correcciones sucesivas. Resultados propios, ejemplos oficiales, precios, GIF y SVG.',
 seo:{title:'Images 2.6: edición, GIF, SVG y precios | Glitch Flash',description:'Qué cambia con Images 2.6 de OpenAI: Flare, Sunburst, edición guiada, GIF, SVG, precios y una prueba práctica para equipos creativos.',inLanguage:'es-CL',indexPolicy:published?'index':'noindex',...(published?{canonicalUrl:'https://efeoncepro.com/glitch/glitch-flash-images-2-6/'}:{})},
 intro:[],sections:[],tableOfContents:true};
let section=null;
const mediaPlan=[];
const add=b=>{if(section)section.blocks.push(b);else if(b.kind==='paragraph')spec.intro.push(b.text);else throw Error('Unsupported intro block');};
for(let i=3;i<tokens.length;i++){
 const t=tokens[i];
 if(t.type==='heading_open'){
  section={heading:tokens[i+1].content,level:Number(t.tag.slice(1)),blocks:[]};
  spec.sections.push(section);i+=2;
 }else if(t.type==='paragraph_open'){add({kind:'paragraph',text:rich(tokens[++i])});i++;}
 else if(t.type==='html_block'){
  const custom=t.content.match(/custom: (\d+)/);
  const media=t.content.match(/media: ([\w-]+)/);
  if(custom){
   const c=customs[Number(custom[1])];
   add(c.kind==='drop'?{kind:'glitchDrop',lines:c.text.split('\n')}:{kind:'pullquote',variant:'destacado',text:[{text:c.text,strong:true}]});
  }else if(media){
   const id=media[1],asset=assets[id],video=videos[id];
   if(!asset&&!video)throw Error('Unknown media '+id);
   mediaPlan.push({id,section:section.heading,blockOffset:section.blocks.length,
    required:video?'Official Vimeo embedded with native core/embed, preserving the source URL and intrinsic video aspect ratio.':'Upload after press-use approval, then insert real native image block with returned attachment ID.',
    ...(asset?{asset:{...asset,alt:alts[id]||asset.alt}}:{video})});
   // Real attachment IDs only, from independent WordPress import readback.
   if(asset&&wpMedia[id]){
    const w=wpMedia[id];
    add({kind:'image',mediaId:w.id,url:w.url,alt:asset.alt,width:w.width||asset.width||1024,height:w.height||asset.height||1024,sizeSlug:'full',align:'center',linkDestination:'media',caption:[{text:asset.captionEs||asset.alt},{text:` Crédito: ${asset.credit}.`,href:asset.source}]});
   }else if(video){
    add({kind:'embed',provider:'vimeo',url:video.embedUrl,caption:[{text:video.captionEs+' '},{text:`Fuente: ${video.credit}.`,href:video.source}]});
   }else{
    add({kind:'paragraph',text:[{text:asset.owned?'Prueba propia: ':'Ejemplo oficial: ',strong:true},{text:asset.captionEs||asset.alt,...(asset.url?{href:asset.url}:{})},{text:` Crédito: ${asset.credit}.`,href:asset.source}]});
   }
  }
 }else if(t.type==='table_open'){
  const rows=[];let cells;
  for(i++;tokens[i].type!=='table_close';i++){
   if(tokens[i].type==='tr_open')cells=[];
   else if(tokens[i].type==='inline')cells.push(rich(tokens[i]));
   else if(tokens[i].type==='tr_close')rows.push(cells);
  }
  add({kind:'table',style:'efeonce',headers:rows[0],rows:rows.slice(1)});
 }else if(['ordered_list_open','bullet_list_open'].includes(t.type)){
  const ordered=t.type==='ordered_list_open',end=ordered?'ordered_list_close':'bullet_list_close',items=[];
  for(i++;tokens[i].type!==end;i++)if(tokens[i].type==='inline')items.push(rich(tokens[i]));
  add({kind:'list',ordered,...(ordered?{style:'steps'}:{}),items});
 }
}
fs.writeFileSync(path.join(base,'article-spec.json'),JSON.stringify(spec,null,2)+'\n');
fs.writeFileSync(path.join(base,'media-plan.json'),JSON.stringify({status:published?'published; real WordPress media IDs verified':Object.keys(wpMedia).length?'real WordPress media IDs resolved; private article staging':'local review; media not uploaded',mediaPlan},null,2)+'\n');

let html=md.render(source);
html=html.replace(/<!-- custom: (\d+) -->/g,(_,i)=>{
 const c=customs[Number(i)];
 return c.kind==='drop'?`<aside class="drop"><b>GLITCH DROP</b>${c.text.split('\n').map(l=>`<p>${esc(l)}</p>`).join('')}</aside>`:`<blockquote>${esc(c.text)}</blockquote>`;
});
function figure(a){
 const width=a.width||1024,height=a.height||1024;
 return `<figure><img loading="lazy" src="${esc(a.local)}" width="${width}" height="${height}" alt="${esc(a.alt)}"><figcaption>${esc(a.captionEs||a.alt)} <a href="${esc(a.source)}">Crédito: ${esc(a.credit)}</a>.</figcaption></figure>`;
}
html=html.replace(/<!-- media: ([\w-]+) -->/g,(_,id)=>{
 if(assets[id])return figure(assets[id]);
 const v=videos[id];
 return `<figure class="video"><iframe src="${esc(v.embedUrl)}&dnt=1" title="${esc(v.title)}" loading="lazy" allow="fullscreen; picture-in-picture" style="aspect-ratio:${v.aspectRatio.replace(':','/')}"></iframe><figcaption>${esc(v.captionEs)} <a href="${esc(v.source)}">Crédito: ${esc(v.credit)}</a>. <a href="${esc(v.embedUrl)}">Abrir video oficial</a>.</figcaption></figure>`;
});
let heading=0;
const toc=[];
html=html.replace(/<h2>(.*?)<\/h2>/g,(_,text)=>{const id='seccion-'+(++heading);toc.push(`<li><a href="#${id}">${text}</a></li>`);return `<h2 id="${id}">${text}</h2>`;});
html=html.replace(/<h2 /,`<nav aria-label="Índice"><details><summary>En este Flash · ${toc.length} secciones</summary><ol>${toc.join('')}</ol></details></nav><h2 `);
html=html.replace(/<h1>.*?<\/h1>/,`<h1>${esc(spec.title)}</h1><p class="byline">${published?'Julio Reyes':'Propuesta editorial para Julio Reyes'} · 5 de noviembre de 2026 · ${Math.ceil(raw.split(/\s+/).length/220)} min de lectura</p>${figure(assets['own-cover']||assets['images-2-6-gif-montage-poster'])}`);
const fonts=path.join(root,'src/lib/artifact-composer/brand-packs/axis/fonts');
for(const f of ['bricolage-grotesque-variable.ttf','poppins-400.ttf','poppins-600.ttf'])fs.copyFileSync(path.join(fonts,f),path.join(out,'media',f));
const c=glitchLine.color;
const css=`@font-face{font-family:Bricolage;src:url(media/bricolage-grotesque-variable.ttf)}@font-face{font-family:Poppins;src:url(media/poppins-400.ttf);font-weight:400}@font-face{font-family:Poppins;src:url(media/poppins-600.ttf);font-weight:600}*{box-sizing:border-box}body{margin:0;background:#fff;color:${c.onLight};font:17px/1.85 Poppins,Arial,sans-serif}main{max-width:860px;margin:auto;padding:40px 32px 80px}.review{background:#f1f3f5;font:13px/1.6 Poppins,Arial,sans-serif;padding:14px 24px;text-align:center}.kicker{font-size:13px;letter-spacing:.08em;font-weight:600}h1,h2,blockquote{font-family:Bricolage,Arial,sans-serif;line-height:1.15}h1{font-size:clamp(38px,6vw,64px);letter-spacing:-.035em;margin:22px 0}h2{font-size:34px;letter-spacing:-.02em;margin:68px 0 22px;scroll-margin-top:30px}p{margin:22px 0}a{color:inherit;text-decoration-thickness:1px;text-underline-offset:4px}a:hover{text-decoration-thickness:2px}.byline,figcaption{font-size:12px;line-height:1.7;color:#485968}figure{margin:32px 0}figure img{display:block;max-width:100%;height:auto;margin:auto}figcaption{margin:12px 0 0}iframe{width:100%;display:block;border:0}table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.7}th,td{text-align:left;border-bottom:1px solid #cbd3db;padding:14px 10px;vertical-align:top;overflow-wrap:anywhere}th{background:#f1f3f5}.drop{background:${c.ground};color:${c.text};padding:30px 34px;margin:38px 0;border-left:5px solid ${c.accent}}.drop b{color:${c.accent};font-size:12px;letter-spacing:.12em}.drop p{margin:14px 0 0;font-size:18px;line-height:1.6}blockquote{margin:40px 0;padding:26px 0;border-top:2px solid ${c.line};border-bottom:2px solid ${c.line};font-size:34px}nav{background:#f1f3f5;padding:18px 22px;margin:32px 0}summary{cursor:pointer;font-weight:600}li{padding:5px 0}nav li{font-size:14px}@media(max-width:600px){main{padding:24px 20px 50px}body{font-size:16px}h2{font-size:29px}.drop{padding:24px 22px}.drop p{font-size:17px}table{font-size:11px}th,td{padding:9px 6px}blockquote{font-size:28px}}@media(prefers-reduced-motion:reduce){img[src$='.gif']{display:none}}`;
fs.writeFileSync(path.join(out,'revision.html'),`<!doctype html><html lang="es-CL"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="icon" href="data:,"><title>Revisión · ${esc(spec.title)}</title><style>${css}</style></head><body><div class="review">${published?'COPIA LOCAL · Publicado en el blog de Efeonce':'VISTA LOCAL DE REVISIÓN · Texto y medios candidatos · No publicado en WordPress'}</div><main><p class="kicker">GLITCH FLASH · NO ESPERA AL LUNES</p>${html}</main></body></html>`);
console.log(JSON.stringify({words:raw.split(/\s+/).length,sections:spec.sections.length,drops:customs.filter(x=>x.kind==='drop').length,previewImages:(html.match(/<img /g)||[]).length,previewVideos:(html.match(/<iframe /g)||[]).length,spec:path.relative(root,path.join(base,'article-spec.json')),preview:path.relative(root,path.join(out,'revision.html'))},null,2));
