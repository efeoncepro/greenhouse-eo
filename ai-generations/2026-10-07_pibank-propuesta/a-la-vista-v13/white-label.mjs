// «Aprobar» en blanco: recolorea el texto navy del botón azul conservando el antialias.
import sharp from 'sharp'
const [inp,out]=process.argv.slice(2)
const {data,info}=await sharp(inp).removeAlpha().raw().toBuffer({resolveWithObject:true});const W=info.width
const bg=[4,117,219],tx=[6,25,39];let n=0
for(let y=518;y<570;y++)for(let x=1628;x<1768;x++){const i=(y*W+x)*3,g=data[i+1];const t=Math.min(1,(bg[1]-g)/(bg[1]-tx[1]));if(t<=0.02)continue
 for(let c=0;c<3;c++)data[i+c]=Math.round(bg[c]*(1-t)+255*t);n++}
await sharp(data,{raw:info}).png().toFile(out);console.log('px',n)
