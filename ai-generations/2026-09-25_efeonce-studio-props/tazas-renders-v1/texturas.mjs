import {svg,rect,text,im,N,B,W} from '../exploracion-v4/types.mjs';
import sharp from 'sharp';import {writeFile} from 'node:fs/promises';import{fileURLToPath}from'node:url';import{dirname,join}from'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
const colors=[['blanco','#F7F8F6',N,B],['azul',B,W,'#F7F8F6'],['magenta','#BB1954',W,'#F7F8F6'],['naranja','#FF6500',N,'#F7F8F6']];
const width=4096,height=1558,circ=2*Math.PI*41;
for(const[id,base,ink,interior]of colors){const px=width/circ;const wordw=76*px,logow=34*px,logoh=logow*196.68/837.07;
// U=.25 is word face (camera from -Y); U=.75 is opposite logo face (+Y).
const logoY=height*(1-18/98)-logoh/2;
let art=svg(width,height,rect(0,0,width,height,base)+text('Hacer.',width*.25-wordw/2,height*(1-39/98),26*px,ink,{weight:780,opsz:88,maxWidth:wordw})+im(ink===W?'negative':'logo',width*.75-logow/2,logoY,logow,logoh));
await writeFile(join(dir,'texturas',id+'.svg'),art);await sharp(Buffer.from(art)).png().toFile(join(dir,'texturas',id+'.png'));
}
await writeFile(join(dir,'colores.json'),JSON.stringify(colors.map(([id,base,ink,interior])=>({id,base,ink,interior})),null,2));
