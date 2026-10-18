// Tras el acabado del modelo: repone la interfaz exacta dentro de cada panel (el modelo reescribe el texto)
// y conserva del acabado el borde de vidrio, la luz en la escena y los reflejos suaves (diferencia de luz desenfocada).
// Uso: node reponer-paneles.mjs <plate-original.png> <compuesta-raw.png> <acabado.png> <salida.png>
import { createRequire } from 'node:module'; const require=createRequire('/Users/jreye/Documents/greenhouse-eo/package.json'); const sharp=require('sharp');
const [plate,raw,acab,out]=process.argv.slice(2);
const P=await sharp(plate).raw().toBuffer({resolveWithObject:true});const W=P.info.width,H=P.info.height,C=P.info.channels;
const ok=(i)=>{const r=P.data[i],g=P.data[i+1],b=P.data[i+2];return Math.min(r,g,b)>205&&Math.max(r,g,b)-Math.min(r,g,b)<38;};
const m=Buffer.alloc(W*H);for(let p=0;p<W*H;p++)m[p]=ok(p*C)?255:0;
// interior: el panel encogido 3 px, con borde suave; el bisel del acabado queda por fuera
const inner=await sharp(m,{raw:{width:W,height:H,channels:1}}).blur(2.2).extractChannel(0).raw().toBuffer();
const R=await sharp(raw).removeAlpha().resize(W,H).raw().toBuffer(), A=await sharp(acab).removeAlpha().resize(W,H).raw().toBuffer();
const Rb=await sharp(raw).removeAlpha().resize(W,H).blur(7).raw().toBuffer(), Ab=await sharp(acab).removeAlpha().resize(W,H).blur(7).raw().toBuffer();
const o=Buffer.alloc(W*H*3);
for(let p=0;p<W*H;p++){const t=inner[p]/255;const a=t<0.75?0:Math.min(1,(t-0.75)/0.2);
 for(let k=0;k<3;k++){const i=p*3+k;const exact=R[i]+Math.max(0,Ab[i]-Rb[i])*0.8;o[i]=Math.round(Math.min(255,exact)*a+A[i]*(1-a));}}
await sharp(o,{raw:{width:W,height:H,channels:3}}).png().toFile(out);console.log(out);
