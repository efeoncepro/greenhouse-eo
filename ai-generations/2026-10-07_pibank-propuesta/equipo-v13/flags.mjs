// Banderas circulares (Perú / Chile) junto al nombre de cada ficha del equipo. Mide el nombre en la imagen y alinea la insignia.
import sharp from 'sharp'
const [inp,out]=process.argv.slice(2)
const {data,info}=await sharp(inp).removeAlpha().raw().toBuffer({resolveWithObject:true});const W=info.width
const cards=[['Andrés','pe',[800,560,945,590]],['Valentina','pe',[965,570,1100,598]],['Julio','cl',[1172,590,1440,622]],['Daniela','cl',[1466,568,1640,596]],['Por asignar','pe',[1716,537,1872,566]]]
const box=([x0,y0,x1,y1])=>{let a=1e9,b=1e9,c=0,d=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*W+x)*3;if(data[i]>200&&data[i+1]>200&&data[i+2]>200){a=Math.min(a,x);b=Math.min(b,y);c=Math.max(c,x);d=Math.max(d,y)}}return{x0:a,y0:b,x1:c,y1:d}}
const flag=(k,D)=>{const r=D/2;const pe=`<rect x="0" y="0" width="${D/3}" height="${D}" fill="#D91023"/><rect x="${D/3}" y="0" width="${D/3}" height="${D}" fill="#ffffff"/><rect x="${2*D/3}" y="0" width="${D/3}" height="${D}" fill="#D91023"/>`
const s=D*0.16,cx=D*0.25,cy=D*0.25;const star=[...Array(10)].map((_,i)=>{const a=-Math.PI/2+i*Math.PI/5,rr=i%2?s*0.42:s;return `${(cx+rr*Math.cos(a)).toFixed(2)},${(cy+rr*Math.sin(a)).toFixed(2)}`}).join(' ')
const cl=`<rect x="0" y="0" width="${D}" height="${D/2}" fill="#ffffff"/><rect x="0" y="${D/2}" width="${D}" height="${D/2}" fill="#D52B1E"/><rect x="0" y="0" width="${D/2}" height="${D/2}" fill="#0039A6"/><polygon points="${star}" fill="#ffffff"/>`
return `<svg xmlns="http://www.w3.org/2000/svg" width="${D+6}" height="${D+6}"><defs><clipPath id="c"><circle cx="${r}" cy="${r}" r="${r}"/></clipPath></defs><g transform="translate(3,3)"><circle cx="${r}" cy="${r+1}" r="${r+1.5}" fill="rgba(0,8,30,.45)"/><g clip-path="url(#c)">${k==='pe'?pe:cl}</g><circle cx="${r}" cy="${r}" r="${r-0.6}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.4"/></g></svg>`}
const comp=[]
for(const [n,k,reg] of cards){const b=box(reg);const desc=n==='Por asignar';const h=desc?Math.round((b.y1-b.y0+1)*0.76):b.y1-b.y0+1;const D=n==='Julio'?24:(n==='Valentina'||n==='Andrés')?19:18;const left=b.x1+(desc?8:10),top=Math.round(b.y0+h/2-D/2)-3
console.log(n,k,JSON.stringify(b),'D',D,'at',left,top);comp.push({input:Buffer.from(flag(k,D)),left,top})}
await sharp(inp).composite(comp).png().toFile(out);console.log('ok')
