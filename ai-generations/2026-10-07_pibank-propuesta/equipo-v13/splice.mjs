import sharp from 'sharp'
const [oldP,newP,out]=process.argv.slice(2)
const raw=async p=>{const {data,info}=await sharp(p).removeAlpha().raw().toBuffer({resolveWithObject:true});return {data,info}}
const A=await raw(oldP),B=await raw(newP);const W=A.info.width
const maxDiff=(x0,y0,x1,y1)=>{let m=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)for(let c=0;c<3;c++){const i=(y*W+x)*3+c;m=Math.max(m,Math.abs(A.data[i]-B.data[i]))}return m}
console.log('arriba',maxDiff(0,0,740,650),'abajo',maxDiff(0,850,740,1080),'caja',maxDiff(100,660,760,840),"franja",maxDiff(560,660,700,840),"borde",maxDiff(100,840,700,850))
if(out){const crop=await sharp(newP).extract({left:100,top:660,width:600,height:180}).toBuffer()
await sharp(oldP).composite([{input:crop,left:100,top:660}]).png().toFile(out);console.log('ok',out)}
