// Lleva a la lámina aprobada (con logo de Pibank) sólo los píxeles que cambian entre la composición anterior y la nueva.
import sharp from 'sharp'
const [approved,oldRaw,newRaw,out]=process.argv.slice(2)
const r=async p=>(await sharp(p).removeAlpha().raw().toBuffer({resolveWithObject:true}))
const A=await r(approved),O=await r(oldRaw),N=await r(newRaw);const W=A.info.width,H=A.info.height
let n=0,x0=W,y0=H,x1=0,y1=0
for(let i=0;i<W*H;i++){const k=i*3;if(Math.abs(O.data[k]-N.data[k])+Math.abs(O.data[k+1]-N.data[k+1])+Math.abs(O.data[k+2]-N.data[k+2])>0){for(let c=0;c<3;c++)A.data[k+c]=N.data[k+c];n++;const x=i%W,y=(i/W)|0;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}}
await sharp(A.data,{raw:A.info}).png().toFile(out);console.log('px',n,'bbox',x0,y0,x1,y1)
