/** Local, reproducible proposal PDFs. Official assets/tokens and overflow guard; no publication. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { marked } from 'marked';
const root=process.cwd();
const caseDir=path.join(root,'docs/commercial/prospects/banco-pichincha-peru-seo-2026');
const out=process.argv[2]||'/Users/jreye/Documents/Banco Pichincha Peru — Prospect Case/01-Para-enviar/propuesta-tecnica-2027';
fs.mkdirSync(out,{recursive:true});
const metadata=path.join(caseDir,'reconstruccion-2027/render-metadata');fs.mkdirSync(metadata,{recursive:true});
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const data=(rel,mime)=>'data:'+mime+';base64,'+fs.readFileSync(path.join(root,rel)).toString('base64');
const roles=JSON.parse(read('src/lib/artifact-composer/brand-packs/axis/editorial-roles.json'));
const snapshot=JSON.parse(read('src/lib/artifact-composer/brand-packs/axis/axis-ppt-snapshot.json'));
const ledger=JSON.parse(read('src/lib/artifact-composer/catalogs/deck-axis/brand/color-ledger.json'));
const colors={...Object.fromEntries(Object.entries(snapshot.primitives).map(([k,v])=>['--axis-ppt-'+k.replaceAll('/','-'),v])),...Object.fromEntries(Object.entries(ledger.bases).filter(([,v])=>v.name.startsWith('--')).map(([k,v])=>[v.name,k])),...roles.colors};
for(const [k,v] of Object.entries(roles.roles))if(!colors[v])throw new Error('Missing token '+k);
const tokenCss=':root{'+Object.entries(colors).map(([k,v])=>k+':'+v).join(';')+';'+Object.entries(roles.roles).map(([k,v])=>'--'+k+':var('+v+')').join(';')+'}';
const fonts=[['Poppins',400,'Poppins-Regular.ttf'],['Poppins',600,'Poppins-SemiBold.ttf'],['Poppins',700,'Poppins-Bold.ttf'],['Geist',400,'Geist-Regular.ttf'],['Geist',600,'Geist-SemiBold.ttf']].map(([family,weight,f])=>`@font-face{font-family:${family};font-weight:${weight};src:url(${data('src/assets/fonts/'+f,'font/ttf')}) format('truetype')}`).join('');
const logo=data('public/branding/logo-full.svg','image/svg+xml');
const bank=data('docs/commercial/prospects/banco-pichincha-peru-seo-2026/propuesta/assets/pibank-logo-inverso.svg','image/svg+xml');
const bubble=data('docs/operations/brand-graphic-line/deliverables/assets/url-lum-light.svg','image/svg+xml');
const contact=JSON.parse(read('src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json')).slots.contactDetails.value;
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const css=`${tokenCss}${fonts}*{box-sizing:border-box}html,body{margin:0;color:var(--paperInk);background:var(--paper)}@page{size:A4;margin:0}.sheet{width:210mm;height:297mm;background:var(--axis-ppt-neutral-50);position:relative;page-break-after:always}.sheet:last-child{page-break-after:auto}.hdr{position:absolute;top:10mm;left:18mm;right:18mm;height:11mm;display:flex;align-items:center;justify-content:space-between;border-bottom:.25mm solid var(--rule);padding-bottom:3mm}.hdr .eo{width:34mm;height:8mm;object-fit:contain}.hdr .bank{width:32mm;height:8mm;object-fit:contain}.hdr span{font:500 8pt Geist;letter-spacing:.3pt;text-transform:uppercase}.body{position:absolute;top:29mm;left:18mm;width:174mm;height:240mm;overflow:visible;font:400 11pt/1.38 Poppins}h1{font:700 21pt/1.15 Poppins;margin:0 0 4mm;letter-spacing:-.45pt}h2{font:600 13pt/1.2 Poppins;color:var(--paperAccent);margin:4mm 0 2mm}h3{font:600 11pt/1.25 Poppins;margin:3mm 0 1.5mm}p{margin:0 0 2.3mm}strong,b{font-weight:600}a{color:var(--paperAccent);text-decoration:none}ul,ol{margin:1.5mm 0 3mm;padding-left:5mm}li{margin-bottom:1.3mm}code{font:400 9pt Geist;overflow-wrap:anywhere}table{border-collapse:collapse;table-layout:fixed;width:100%;font:400 9pt/1.34 Poppins;margin:2.5mm 0 3mm}th{background:var(--axis-deck-surface-70);text-align:left;font-weight:600}td,th{padding:2mm;border-bottom:.2mm solid var(--rule);vertical-align:top;overflow-wrap:anywhere}td code{font-size:8pt}thead{display:table-header-group}.faq-index td:first-child,.faq-index th:first-child{padding-left:1mm;padding-right:1mm;white-space:nowrap}.ftr{position:absolute;left:18mm;right:18mm;bottom:7mm;height:14mm;border-top:.25mm solid var(--rule);display:grid;grid-template-columns:30mm 1fr 26mm;gap:4mm;align-items:center;font:400 7pt/1.35 Geist}.ftr img{width:30mm;height:9mm;object-fit:contain}.ftr .page{text-align:right;white-space:nowrap}.toc{font:400 9pt/1.4 Poppins;margin:4mm 0}.toc ul{columns:2;column-gap:6mm;padding:0;list-style:none}.toc li{break-inside:avoid}.toc a{display:flex;justify-content:space-between;gap:2mm}.toc .toc-page{min-width:4mm;text-align:right}.continuation{font:600 9pt Geist;letter-spacing:.2pt;color:var(--paperAccent);margin-bottom:3mm}.annex .body{font-size:10pt;line-height:1.4}.annex h1{font-size:20pt}.annex td:nth-child(1),.annex th:nth-child(1){width:auto}.summary .body{font-size:9.5pt;line-height:1.3}.summary p{margin-bottom:2mm}.summary table{font-size:8.7pt}.summary td,.summary th{padding:1.7mm}`;
const skeleton=(label,cls)=>`<!doctype html><html lang="es-PE"><head><meta charset="utf-8"><title>${label}</title><style>${css}</style></head><body class="${cls}"><div id="source"></div></body></html>`;
const browser=await chromium.launch();
try{
 for(const [name,source,mode] of [['Pibank-Propuesta-tecnica-2027','PROPUESTA-PARA-PIBANK-2027.md','annex'],['Pibank-Resumen-para-gerencia-2027','RESUMEN-PARA-GERENCIA.md','annex']]){
  let md=fs.readFileSync(path.join(caseDir,'reconstruccion-2027',source),'utf8');
  if(mode==='annex')md=md.replace(' El [costeo interno](ALCANCE-Y-COSTEO-INTERNO.md) no constituye cotización.','');
  // Client-facing sources exclude internal costing; local links become readable labels.
  md=md.replace(/\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/g,'$1');
  const chunks=mode==='memo'?md.split('## Qué proponemos ejecutar').map((s,i)=>marked.parse(i?'## Qué proponemos ejecutar'+s:s)):[marked.parse(md)];
  const page=await browser.newPage({viewport:{width:794,height:1123}});
  await page.setContent(skeleton(name.includes('gerencia')?'Pibank Perú · Resumen para gerencia · 2027':'Pibank Perú · Propuesta técnica SEO/AEO · 2027',name.includes('gerencia')?mode+' summary':mode),{waitUntil:'load'});
  await page.emulateMedia({media:'print',reducedMotion:'reduce'});
  const report=await page.evaluate(async({chunks,mode,logo,bank,bubble,contact,label})=>{
   await Promise.all([document.fonts.load("400 11pt Poppins"),document.fonts.load("600 11pt Poppins"),document.fonts.load("700 21pt Poppins"),document.fonts.load("400 9pt Geist")]); await document.fonts.ready;
   const newSheet=()=>{const s=document.createElement('section');s.className='sheet';s.innerHTML=`<header class="hdr"><img class="eo" src="${logo}" alt="Efeonce"><span>${label}</span><img class="bank" src="${bank}" alt="Pibank Perú"></header><main class="body"></main>`;document.body.append(s);return s.querySelector('.body')};
   const over=b=>b.scrollHeight-b.clientHeight>1||b.scrollWidth-b.clientWidth>1;
   if(mode==='memo'){for(const html of chunks){const b=newSheet();b.innerHTML=html;}}
   else{
    const temp=document.createElement('div');temp.innerHTML=chunks[0];
    if(label.startsWith('Propuesta técnica')) {
     const headings=[...temp.querySelectorAll('h3')].filter(h=>/^\d+\./.test(h.textContent.trim()));
     headings.forEach((h,i)=>h.id='seccion-'+(i+1));
     const nav=document.createElement('nav');nav.className='toc';nav.innerHTML='<strong>Contenido</strong><ul>'+headings.map(h=>'<li><a href="#'+h.id+'"><span>'+h.textContent+'</span><span class="toc-page" data-target="'+h.id+'">00</span></a></li>').join('')+'</ul>';
     headings[0]?.before(nav);
    }
    let b=newSheet();
    for(const node of [...temp.children]){
     if(node.tagName==='TABLE'){
      const columns=node.querySelectorAll('thead th').length; const first=node.querySelector('thead th')?.textContent.trim()||''; const widths=columns===7?[4,21,5,18,19,14,19]:columns===5?(first==='Mes'?[7,24,25,25,19]:first==='Trimestre'?[8,22,25,25,20]:[25,20,20,22,13]):columns===4?(first.startsWith('Territorio')?[18,24,34,24]:first.startsWith('Cluster')?[16,24,30,30]:first==='Paquete'?[12,29,33,26]:first.startsWith('Decisión')?[25,20,25,30]:first.startsWith('Escenario')?[18,24,31,27]:[10,30,30,30]):columns===2?[24,76]:(first==='Mes'?[7,51,42]:first.startsWith('Evidencia')?[36,26,38]:first.startsWith('Entregable')?[24,38,38]:first.startsWith('Decisión')?[25,40,35]:first.startsWith('Etapa')?[17,46,37]:first.startsWith('Nivel')?[20,40,40]:first.startsWith('Responsabilidad')?[25,37,38]:[25,35,40]); if(columns===7)node.classList.add('faq-index'); const cg=document.createElement('colgroup'); for(const width of widths){const col=document.createElement('col');col.style.width=width+'%';cg.append(col)} node.prepend(cg); const rows=[...node.querySelectorAll('tbody tr')];let table=node.cloneNode(true);table.querySelector('tbody').innerHTML='';b.append(table);
      // Compact decision tables stay together with their introductory paragraph.
      if(rows.length<=3){table.replaceWith(node);if(over(b)){node.remove();const intro=[];if(b.lastElementChild?.tagName==='P'){intro.unshift(b.lastElementChild);b.lastElementChild.remove();}while(b.lastElementChild&&/^H[123]$/.test(b.lastElementChild.tagName)){intro.unshift(b.lastElementChild);b.lastElementChild.remove();}b=newSheet();b.append(...intro,node);if(over(b))throw new Error('Compact table cannot fit');}continue;}
      for(const row of rows){table.querySelector('tbody').append(row.cloneNode(true));if(over(b)){table.querySelector('tbody').lastElementChild.remove();const heads=[];if(!table.querySelector('tbody').children.length){table.remove();while(b.lastElementChild&&/^H[123]$/.test(b.lastElementChild.tagName)){const h=b.lastElementChild;heads.unshift(h);h.remove();}}b=newSheet();b.append(...heads);table=node.cloneNode(true);table.querySelector('tbody').innerHTML='';b.append(table);table.querySelector('tbody').append(row.cloneNode(true));if(over(b))throw new Error('Table row cannot fit');}}
     }else{b.append(node);if(over(b)){node.remove();const heads=[];while(b.lastElementChild&&/^H[123]$/.test(b.lastElementChild.tagName)){const h=b.lastElementChild;heads.unshift(h);h.remove();}b=newSheet();b.append(...heads,node);if(over(b))throw new Error('Node cannot fit '+node.tagName);}}
    }
    // Headings move with their first paragraph/table row during pagination.
   }
   const sheets=[...document.querySelectorAll('.sheet')]; const toc=[...document.querySelectorAll('.toc-page')].map(e=>{const h=document.getElementById(e.dataset.target);const page=sheets.indexOf(h.closest('.sheet'))+1;e.textContent=page;return{target:e.dataset.target,page,title:h.textContent}});
   sheets.forEach((s,i)=>{const f=document.createElement('footer');f.className='ftr';f.innerHTML=`<a href="https://efeoncepro.com"><img src="${bubble}" alt="efeoncepro.com"></a><span>${contact.address}<br>${contact.chilePhone}</span><span class="page">Propuesta · 06/10/26<br>${i+1} / ${sheets.length}</span>`;s.append(f)});
   await Promise.all([...document.images].map(i=>i.decode()));
   return{pages:sheets.length,toc,fontsOk:['400 11px Poppins','600 11px Poppins','400 11px Geist'].every(f=>document.fonts.check(f)),overflow:sheets.flatMap((s,i)=>over(s.querySelector('.body'))?[i+1]:[]),brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length};
  },{chunks,mode,logo,bank,bubble,contact,label:name.includes('gerencia')?'Resumen ejecutivo · 2027':'Propuesta técnica · 2027'});
  if(report.overflow.length||report.brokenImages||!report.fontsOk||(mode==='memo'&&report.pages!==2))throw new Error(name+' '+JSON.stringify(report));
  fs.writeFileSync(path.join(metadata,name+'.html'),await page.content());
  const pdf=path.join(out,name+'.pdf');await page.pdf({path:pdf+'.tmp',printBackground:true,preferCSSPageSize:true,tagged:true,outline:true}); fs.renameSync(pdf+'.tmp',pdf);
  const captures=path.join(root,'.captures/pibank-propuesta-cliente-2027/'+name);fs.mkdirSync(captures,{recursive:true});
  for(let i=0;i<report.pages;i++)await page.locator('.sheet').nth(i).screenshot({path:path.join(captures,`page-${String(i+1).padStart(2,'0')}.png`)});
  fs.writeFileSync(path.join(metadata,name+'-qa.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({name,...report,pdf}));await page.close();
 }
}finally{await browser.close()}
