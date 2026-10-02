const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');const {PDFDocument}=require('/Users/jreye/Documents/greenhouse-eo/node_modules/pdf-lib');const fs=require('fs');const path=require('path');
const A='/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/';const S=process.argv[2];const OUT=process.argv[3];
const vb=f=>{const m=fs.readFileSync(A+f+'.svg','utf8').match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);return m[2]/m[3]};
const L=(logo,x=140,y=44,h=40)=>({logo,x,y,h});
const docs={
 completo:{file:'Efeonce-Deck-SEO-AEO-Completo',fam:5,ins:14,srv:6,ov:{1:L('sv360-logo-negative',140,790,64),5:L('sv360-lockup-negative'),7:L('sv360-lockup-negative'),9:L('aeo-lockup-negative',140,112),10:L('aeo-lockup-negative'),11:L('aeo-assessment-lockup-negative'),12:L('ai-visibility-report-lockup-negative'),14:L('insights-lockup-negative')}},
 brochure:{file:'Efeonce-Brochure-SEO-AEO',fam:4,ins:9,srv:5,ov:{1:L('sv360-logo-negative',140,790,64),4:L('sv360-lockup-negative'),5:L('sv360-lockup-negative'),7:L('aeo-lockup-negative',140,112),9:L('insights-lockup-negative'),11:L('ai-visibility-report-lockup-negative')}},
 propuesta:{file:'Efeonce-Propuesta-SEO-AEO',fam:5,ins:10,srv:7,ov:{1:L('sv360-logo-negative',140,880,56),5:L('sv360-lockup-negative'),7:L('sv360-lockup-negative'),8:L('aeo-lockup-negative'),10:L('insights-lockup-negative'),15:L('ai-visibility-report-lockup-negative')}}};
(async()=>{for(const [n,d] of Object.entries(docs)){const dir=path.join(S,'out-'+n);const files=fs.readdirSync(dir).filter(f=>/^\d\d-.*\.png$/.test(f)).sort();
 const pdf=await PDFDocument.create();const pages=[];
 for(const f of files){const i=+f.slice(0,2);let img=sharp(path.join(dir,f));const o=d.ov[i];if(o){const w=Math.round(o.h*vb(o.logo));const svg=await sharp(A+o.logo+'.svg',{density:600}).resize(w,o.h).png().toBuffer();img=sharp(await img.composite([{input:svg,left:o.x,top:o.y}]).png().toBuffer())}
  pages.push(await img.jpeg({quality:92}).toBuffer());if(i===d.fam)pages.push(await sharp(path.join(S,'familia.png')).jpeg({quality:92}).toBuffer());if(i===d.srv)pages.push(await sharp(path.join(S,'SEO-Servicios.png')).jpeg({quality:92}).toBuffer());if(i===d.ins){for(const n of ['Insights-Llega','Insights-Formatos'])pages.push(await sharp(path.join(S,n+'.png')).jpeg({quality:92}).toBuffer())}}
 for(const b of pages){const j=await pdf.embedJpg(b);const p=pdf.addPage([960,540]);p.drawImage(j,{x:0,y:0,width:960,height:540})}
 fs.writeFileSync(path.join(OUT,d.file+'.pdf'),await pdf.save());console.log(n,pages.length)}})();
