import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { efeonceGraphicLine as gl } from '../../../axis-design-system/packages/tokens/dist/index.js'
const root=path.dirname(fileURLToPath(import.meta.url));
const list=JSON.parse(await fs.readFile(path.join(root,'flat/selection.json'),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>fs.readFile(path.join(root,p));
const text=async p=>(await read(p)).toString();
const exists=async p=>fs.access(path.join(root,p)).then(()=>true,()=>false);
const runs=[];
for(const lane of ['flare','seedream','seedream-smooth']) for(const g of list){
 const file=`${lane}/${g.key}.png`; if(!await exists(file))continue;
 const bytes=await read(file), m=await sharp(bytes).metadata();
 const log=await text(`logs/${lane}-${g.key}.log`), run=JSON.parse(await text(`logs/${lane}-${g.key}.json`));
 let cost,usage,requestId;
 if(lane==='flare'){
  const match=log.match(/usage: in (\d+) \(img (\d+) · txt (\d+)\) · out (\d+) · total (\d+)/);
  if(!match)throw Error('missing usage '+file);
  const [,it,im,tx,ot,tt]=match.map(Number);
  usage={inputTokens:it,imageInputTokens:im,textInputTokens:tx,outputTokens:ot,totalTokens:tt}; cost=(im*8+tx*5+ot*30)/1e6;
 }else{const receipt=JSON.parse(await text(`${lane==='seedream'?'receipts':'receipts-smooth'}/${g.key}/receipt.json`));cost=receipt.estimatedUsd;usage=receipt.usage;requestId=receipt.requestId;}
 const alpha=`alpha/${lane==='seedream-smooth'?'seedream-smooth-clean':lane}/${g.key}.png`;let alphaMetadata=null;
 if(await exists(alpha)){
  const a=await read(alpha),am=await sharp(a).metadata(),decoded=await sharp(a).ensureAlpha().raw().toBuffer();let transparent=0,partial=0;
  for(let i=3;i<decoded.length;i+=4){if(decoded[i]===0)transparent++;else if(decoded[i]<255)partial++;}
  alphaMetadata={file:alpha,sha256:sha(a),width:am.width,height:am.height,hasAlpha:am.hasAlpha,transparentPixels:transparent,partialPixels:partial,method:lane==='seedream-smooth'?'canonical color-key plus source-chroma alpha cleanup; not native provider alpha':'canonical color-key, derived; not native provider alpha'};
 }
 runs.push({lane,icon:g.key,file,pngSha256:sha(bytes),bytes:bytes.length,width:m.width,height:m.height,format:m.format,nativeHasAlpha:m.hasAlpha,quality:lane==='flare'?'max':'standard',model:lane==='flare'?'gpt-image-2.5-flare':'dola-seedream-5-0-pro-260628',estimatedUsd:cost,usage,requestId:requestId??null,elapsedSeconds:run.elapsedSeconds,promptSha256:sha(await read(`prompts/${lane==='seedream-smooth'?'surface-finish':g.key}.txt`)),referenceSha256:sha(await read(lane==='seedream-smooth'?`seedream/${g.key}.png`:`references/${g.key}.png`)),parent:lane==='seedream-smooth'?`seedream/${g.key}.png`:null,alpha:alphaMetadata});
}
const totals=Object.fromEntries(['flare','seedream','seedream-smooth'].map(l=>[l,+runs.filter(r=>r.lane===l).reduce((s,r)=>s+r.estimatedUsd,0).toFixed(6)]));
const roundSelection=await exists('selection.json')?JSON.parse(await text('selection.json')):null;
const manifest={date:'2026-10-12',roundSelection,status:roundSelection?'flare-selected-this-round-unpublished':'flat-approved-volume-candidates-unpublished',approvedIcons:list.map(g=>g.key),flatApproval:'Sí, continuar con las cuatro',catalogSnapshotCount:JSON.parse(await text('catalog-live.json')).entries?.length??134,axisHead:'de34866',nativeSize:'2048x2048',sameFirstPassPrompts:true,firstPassReferenceImagesPerRequest:1,flatSheetEstimatedUsd:0.438502,volumeEstimatedUsd:totals,seedreamTwoPassEstimatedUsd:+(totals.seedream+totals['seedream-smooth']).toFixed(6),allThisStudyEstimatedUsd:+(0.438502+Object.values(totals).reduce((a,b)=>a+b,0)).toFixed(6),costBasis:'usage at configured Standard OpenAI token rates and BytePlus contract estimator; not settled invoices',runs};
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const W=2048,H=1360,bg=gl.color.dark;
async function sheet(lane,out,subtitle){
 const layers=[];
 const labels=list.map((g,i)=>`<text x="${i*512+256}" y="113" text-anchor="middle" font-size="26">${g.label}</text>`).join('');
 const overlay=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${bg}"/><g fill="white" font-family="${gl.type.question.family}"><text x="32" y="48" font-size="32">Efeonce · volumen suave y mate uniforme</text><text x="32" y="80" font-size="19">${subtitle}</text>${labels}<text x="32" y="157" font-size="22">Flare · max · una pasada</text><text x="32" y="706" font-size="22">Seedream 5 Pro · standard · ${lane==='seedream'?'una pasada':'dos pasadas: volumen + acabado'}</text><text x="32" y="1313" font-size="18">Propuestas 3D · bases planas aprobadas · originales PNG 2048 × 2048 · catálogo sin publicar</text></g></svg>`;
 layers.push({input:Buffer.from(overlay),left:0,top:0});
 for(const [row,l] of ['flare',lane].entries())for(const [i,g] of list.entries())layers.push({input:await sharp(path.join(root,`${l}/${g.key}.png`)).resize(492,492).png().toBuffer(),left:i*512+10,top:180+row*549});
 const logo=await sharp(path.join(root,'../../public/branding/logo-negative.svg')).resize(132).png().toBuffer(); layers.push({input:logo,left:W/2-66,top:1330});
 await sharp({create:{width:W,height:H,channels:3,background:bg}}).composite(layers).png().toFile(path.join(root,out));
}
await sheet('seedream','comparison-first-pass.png','Comparación controlada · mismos prompts y referencias · salidas originales');
if(runs.filter(r=>r.lane==='seedream-smooth').length===4)await sheet('seedream-smooth','comparison.png','Flare directo / Seedream con ajuste adicional de superficie · salidas originales');
console.log(JSON.stringify({totals,allThisStudyEstimatedUsd:manifest.allThisStudyEstimatedUsd,runs:runs.length}));
