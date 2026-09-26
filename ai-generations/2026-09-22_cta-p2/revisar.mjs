import fs from 'node:fs';import sharp from 'sharp';
const root=new URL('.',import.meta.url).pathname,p=root+'out',ids=['a-texto-cursor','b-contorno-redondeado','c-boton-lima'];
const report=[];
for(const id of ids){const {data,info}=await sharp(`${p}/${id}-overlay.svg`).ensureAlpha().raw().toBuffer({resolveWithObject:true});let last=-1;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>12)last=y;
const clearance=588-last;if(clearance<64)throw Error('Graphic layer invades subject reserve');report.push({id,lastGraphicInkRow:last,protectedSubjectTop:588,clearancePx:clearance,clearanceAt390:clearance*390/1152});}
fs.writeFileSync(`${p}/revision-espaciados.json`,JSON.stringify(report,null,2));
async function sheet(rows,out){const w=390,h=488,parts=[];for(let row=0;row<rows.length;row++)for(let col=0;col<3;col++){parts.push({input:await sharp(rows[row].path+'/'+ids[col]+'.png').resize(w,h).png().toBuffer(),left:12+col*402,top:40+row*540});const lab=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="390" height="36"><text x="0" y="25" fill="white" font-family="Arial" font-size="16">${rows[row].label} · ${['A — Texto','B — Contorno','C — Relleno'][col]}</text></svg>`);parts.push({input:lab,left:12+col*402,top:row*540});}await sharp({create:{width:1218,height:rows.length*540,channels:4,background:'#151820'}}).composite(parts).png().toFile(`${p}/${out}.png`)}
await sheet([{path:p,label:'No te leyó'}],'comparativa');
await sheet([{path:root+'../2026-09-22_cta-p1-v02/out',label:'No fuiste tú'},{path:p,label:'No te leyó'}],'comparativa-dos-piezas');
console.log(JSON.stringify(report));
