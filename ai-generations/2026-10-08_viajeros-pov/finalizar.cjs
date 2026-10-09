const fs=require('fs');const path=require('path');const crypto=require('crypto');const sharp=require('sharp');
const root=__dirname;const scenes=JSON.parse(fs.readFileSync(path.join(root,'scenes.json'),'utf8'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async()=>{
 const assets=[];const tiles=[];
 for(let i=0;i<scenes.length;i++){
  const s=scenes[i];const master=path.join(root,s.id+'.png');const meta=await sharp(master).metadata();
  const log=fs.readFileSync(path.join(root,s.id+'.log'),'utf8');const u=/usage: in (\d+) \(img (\d+) · txt (\d+)\) · out (\d+) · total (\d+)/.exec(log);
  if(!/✓/.test(log)||!log.includes('gpt-image-2.5-sunburst · 3840x2160 · max'))throw Error('Unexpected generation status '+s.id);
  if(meta.width!==3840||meta.height!==2160)throw Error('Unexpected raster '+s.id);
  assets.push({...s,file:s.id+'.png',model:'gpt-image-2.5-sunburst',quality:'max',actualWidth:meta.width,actualHeight:meta.height,format:meta.format,space:meta.space,bytes:fs.statSync(master).size,sha256:sha(master),promptSha256:sha(path.join(root,'prompts',s.id+'.txt')),usage:u?{input_tokens:+u[1],image_input_tokens:+u[2],text_input_tokens:+u[3],output_tokens:+u[4],total_tokens:+u[5]}:null,postprocess:'none',reviewState:'visual-review-complete',releaseState:'proof-only'});
  const photo=await sharp(master).resize(960,540).png().toBuffer();
  const caption=Buffer.from(`<svg width="960" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="960" height="64" fill="#f5f3ef"/><text x="20" y="25" font-family="Arial,sans-serif" font-size="18" fill="#191919">${String(i+1).padStart(2,'0')} · ${esc(s.place)}</text><text x="20" y="49" font-family="Arial,sans-serif" font-size="16" fill="#555">${esc(s.moment)}</text></svg>`);
  tiles.push({input:photo,left:(i%2)*960,top:Math.floor(i/2)*604},{input:caption,left:(i%2)*960,top:Math.floor(i/2)*604+540});
 }
 await sharp({create:{width:1920,height:1812,channels:3,background:'#f5f3ef'}}).composite(tiles).png().toFile(path.join(root,'contacto-6.png'));
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({date:'2026-10-08',scope:'Six fictional adult candid traveler POV explorations',nativeResolution:true,assets,totalOutputTokens:assets.reduce((sum,a)=>sum+(a.usage?.output_tokens??0),0)},null,2)+'\n');
 const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Viajeros POV · 6 microescenas</title><style>body{margin:0;background:#f5f3ef;color:#252525;font-family:system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:32px}h1{font-size:28px;margin:0 0 8px}p{color:#666;margin:0 0 28px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0}img{width:100%;display:block}figcaption{padding:12px 0;line-height:1.5}a{color:inherit}small{display:block;color:#666}@media(max-width:800px){main{padding:18px}.grid{grid-template-columns:1fr}}</style><main><h1>Viajeros POV</h1><p>Seis microescenas · Sunburst max · 3840 × 2160 px · personas adultas ficticias. Abre una foto para verla completa.</p><div class="grid">${assets.map((a,i)=>`<figure><a href="${a.file}"><img src="${a.file}" alt="${esc(a.place+' — '+a.moment)}"></a><figcaption><strong>${String(i+1).padStart(2,'0')} · ${esc(a.place)}</strong><small>${esc(a.moment)} · <a href="${a.file}" download>PNG 4K</a> · <a href="prompts/${a.id}.txt">Prompt</a></small></figcaption></figure>`).join('')}</div></main></html>`;
 fs.writeFileSync(path.join(root,'index.html'),html);
 console.log(JSON.stringify({images:assets.length,actualSize:'3840x2160',totalOutputTokens:assets.reduce((s,a)=>s+(a.usage?.output_tokens??0),0)}));
})();
