import fs from 'node:fs';import sharp from 'sharp';
const root=new URL('.',import.meta.url).pathname, p=root+'out';
const ids=['a-texto-cursor','b-contorno-redondeado','c-boton-lima'];
const report=[];
for(const id of ids){
 const {data,info}=await sharp(`${p}/${id}-overlay.svg`).ensureAlpha().raw().toBuffer({resolveWithObject:true});let last=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>12)last=y;
 const layout=JSON.parse(fs.readFileSync(`${p}/${id}-layout.json`));
 const boxes=Object.fromEntries(layout.elements.map(e=>[e.id,e.box]));
 const cta=JSON.parse(fs.readFileSync(`${p}/${id}-cta-evidence.json`));
 const clearance=585-last;
 if(clearance<64)throw Error('Graphics encroach upon crown reserve');
 report.push({id,lastGraphicInkRow:last,crownReserveY:585,clearancePx:clearance,clearanceAt390:clearance*390/1152,gaps:{closureToBenefit:boxes.nota.top-boxes['cierre-frase'].bottom,benefitToSurface:cta.surface.top-boxes.nota.bottom,surfaceToDescriptor:boxes.descriptor.top-cta.surface.bottom},nativeImageUnchanged:true});
}
fs.writeFileSync(`${p}/revision-espaciados.json`,JSON.stringify(report,null,2));
async function sheet(items,name,w=390){const h=Math.round(w*1.25),parts=[];for(let i=0;i<items.length;i++){const it=items[i];parts.push({input:await sharp(it.file).resize(w,h).png().toBuffer(),left:12+i*(w+12),top:40});}const width=12+items.length*(w+12);const header=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40"><style>text{font-family:Arial;font-size:16px;fill:white}</style>${items.map((it,i)=>`<text x="${12+i*(w+12)}" y="27">${it.label}</text>`).join('')}</svg>`);await sharp({create:{width,height:h+52,channels:4,background:'#151820'}}).composite([...parts,{input:header,left:0,top:0}]).png().toFile(`${p}/${name}.png`)}
await sheet(ids.map((id,i)=>({file:`${p}/${id}.png`,label:['A · Texto — v02','B · Contorno — v02','C · Relleno — v02'][i]})),'comparativa');
await sheet([{file:root+'../2026-09-22_cta-p1/out/c-boton-lima.png',label:'Antes · v01'},{file:`${p}/c-boton-lima.png`,label:'Ahora · v02'}],'antes-despues');
const study=[];for(const [i,id] of ['cerrado','equilibrado','abierto'].entries())study.push({input:await sharp(root+`estudio-tracking/out/${id}.png`).extract({left:55,top:110,width:970,height:158}).resize(776).png().toBuffer(),left:0,top:i*138});
await sharp({create:{width:776,height:414,channels:4,background:'#151820'}}).composite(study).png().toFile(`${p}/tracking-estudio.png`);
console.log(JSON.stringify(report));
