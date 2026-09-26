import fs from 'node:fs';
import sharp from 'sharp';
const dir='ai-generations/2026-09-22_aeo-fuente-preferida/v02-grafica';
const plan=JSON.parse(fs.readFileSync(`${dir}/piezas.json`));
for(const suffix of ['916','169']){
 const items=plan.filter(s=>s.id.endsWith(suffix));const w=suffix==='916'?390:780,h=suffix==='916'?693:439;
 const layers=await Promise.all(items.map(async(s,i)=>({input:await sharp(`${dir}/out/${s.id}.png`).resize(w,h).toBuffer(),left:16+(i%2)*(w+16),top:16+Math.floor(i/2)*(h+16)})));
 await sharp({create:{width:2*w+48,height:2*h+48,channels:3,background:'#d7d7d7'}}).composite(layers).jpeg({quality:94}).toFile(`${dir}/out/contacto-${suffix}.jpg`);
}
