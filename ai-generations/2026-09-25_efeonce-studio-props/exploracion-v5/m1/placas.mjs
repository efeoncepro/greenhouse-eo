// M1 · Objeto real: texturas del muro (papel cálido con la palabra impresa, línea base en el borde inferior).
import sharp from 'sharp';import {join} from 'node:path';
import {dir,svg,rect,text,width} from '../lib.mjs';
const PAPER='#ECE8E1',N='#023C70';const B={family:'brico',wght:760,tracking:-0.035};
const out=join(dir,'m1');
// Muro 4 m × 2 m → 4000 × 2000 px. Palabra con línea base 6 px sobre el borde inferior (unión muro-piso).
for(const [name,word,size,x] of [['muro-hacer','Hacer',900,420],['muro-siempre','Siempre',640,260]]){
 const s=svg(4000,2000,rect(0,0,4000,2000,PAPER)+text(word,x,2000-6,size,N,B));
 await sharp(Buffer.from(s)).png().toFile(join(out,name+'.png'));
 console.log(name,'fin palabra px',x+width(word,size,B));}
