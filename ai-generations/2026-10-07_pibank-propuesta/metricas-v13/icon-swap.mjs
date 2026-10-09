// Reemplaza el glifo provisional de la métrica 2 por autoridad-marca (AXIS 0.17.0, Trazo, 52 px, blanco, trazo 1.5).
import sharp from 'sharp'
const [inp,out]=process.argv.slice(2)
const X=1134,Y=210,S=52,P=4
const {data,info}=await sharp(inp).removeAlpha().raw().toBuffer({resolveWithObject:true});const W=info.width
for(let y=Y-P;y<Y+S+P;y++){const l=((y*W)+(X-P-1))*3,r=((y*W)+(X+S+P))*3
 for(let x=X-P;x<X+S+P;x++){const t=(x-(X-P-1))/((S+2*P)+1),i=(y*W+x)*3;for(let c=0;c<3;c++)data[i+c]=Math.round(data[l+c]*(1-t)+data[r+c]*t)}}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 24 24"><g fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 7h4a4 4 0 0 1 4 4v4a4 4 0 0 1 -4 4h-4a4 4 0 0 1 -4 -4v-4a4 4 0 0 1 4 -4z"/><path d="M4 8a8 8 0 0 0 0 10"/><path d="M20 8a8 8 0 0 1 0 10"/><path d="M12 2v2"/><path d="M5 3.5l1.5 1.5"/><path d="M19 3.5l-1.5 1.5"/><path d="M10 13h4"/></g></svg>`
await sharp(data,{raw:info}).composite([{input:Buffer.from(svg),left:X,top:Y}]).png().toFile(out);console.log('ok',out)
