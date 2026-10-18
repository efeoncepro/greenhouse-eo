// Ficha del rótulo de portada, mismo método que el brochure 360 (ai-generations/2026-10-12_brochure-efeonce-360/native-growth/chip-tramos.mjs):
// contorno 2 px en el acento Voice (#f83902), sin relleno, ajustado a la caja medida del eyebrow.
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js';
const [src,out]=process.argv.slice(2);
const col='#f83902',ya=490,yb=516,xa=120,xb=700;
const {data,info}=await sharp(src).removeAlpha().raw().toBuffer({resolveWithObject:true});
let x0=9999,x1=0,y0=9999,y1=0;
for(let y=ya;y<yb;y++)for(let x=xa;x<xb;x++){const i=(y*info.width+x)*3;if(data[i]>160&&data[i+1]>160&&data[i+2]>160){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
const padX=18,padY=11,rx0=x0-padX,ry0=y0-padY,w=x1-x0+2*padX,h=y1-y0+2*padY;
const svg=`<svg width="${info.width}" height="${info.height}" xmlns="http://www.w3.org/2000/svg"><rect x="${rx0}" y="${ry0}" width="${w}" height="${h}" rx="${h/2}" fill="none" stroke="${col}" stroke-width="2"/></svg>`;
await sharp(src).composite([{input:Buffer.from(svg)}]).png().toFile(out);
console.log({x0,x1,y0,y1,w,h});
await sharp(out).extract({left:40,top:430,width:900,height:170}).png().toFile(out.replace('.png','-zoom.png'));
