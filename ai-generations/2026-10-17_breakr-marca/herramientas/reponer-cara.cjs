// Repone una cara aprobada en un plano nuevo buscando posición y escala.
// uso: node faceswap2.cjs <src> cx cy rx ry <dst> <out> [x0 y0 x1 y1] [smin smax]
const sharp=require("/Users/jreye/Documents/greenhouse-eo/node_modules/sharp")
const a=process.argv.slice(2)
const [src,cx,cy,rx,ry,dst,out]=[a[0],+a[1],+a[2],+a[3],+a[4],a[5],a[6]]
const win=a[7]?a.slice(7,11).map(Number):null, smin=+(a[11]||0.75), smax=+(a[12]||1.35)
;(async()=>{
 const S=await sharp(src).removeAlpha().raw().toBuffer({resolveWithObject:true})
 const D=await sharp(dst).removeAlpha().raw().toBuffer({resolveWithObject:true})
 const DW=D.info.width,DH=D.info.height
 const pw=rx*2,ph=ry*2,px0=cx-rx,py0=cy-ry
 const patch=await sharp(src).removeAlpha().extract({left:px0,top:py0,width:pw,height:ph}).raw().toBuffer()
 const gray=(buf,i)=>0.3*buf[i]+0.59*buf[i+1]+0.11*buf[i+2]
 const [x0,y0,x1,y1]=win||[0,0,DW,DH]
 let best={s:-2}
 for(let sc=smin;sc<=smax+1e-9;sc+=0.025){
  const w=Math.round(pw*sc),h=Math.round(ph*sc)
  const pr=await sharp(patch,{raw:{width:pw,height:ph,channels:3}}).resize(w,h).raw().toBuffer()
  // muestras dentro de la elipse interior (ojos, nariz, boca)
  const pts=[];for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){const e=((x-w/2)/(w/2))**2+((y-h/2)/(h/2))**2;if(e<0.6)pts.push([x,y,gray(pr,(y*w+x)*3)])}
  const m=pts.reduce((s,p)=>s+p[2],0)/pts.length;const sd=Math.sqrt(pts.reduce((s,p)=>s+(p[2]-m)**2,0)/pts.length)
  for(let ty=Math.max(0,y0);ty+h<=Math.min(DH,y1);ty+=4)for(let tx=Math.max(0,x0);tx+w<=Math.min(DW,x1);tx+=4){
   let s=0,ss=0,sp=0;for(const [x,y,g] of pts){const v=gray(D.data,((ty+y)*DW+tx+x)*3);s+=v;ss+=v*v;sp+=v*g}
   const n=pts.length,mv=s/n,sv=Math.sqrt(Math.max(1e-6,ss/n-mv*mv));const ncc=(sp/n-mv*m)/(sv*sd)
   if(ncc>best.s)best={s:ncc,sc,tx,ty,w,h}}
 }
 // refinamiento fino ±4 px
 const {sc,w,h}=best;const pr=await sharp(patch,{raw:{width:pw,height:ph,channels:3}}).resize(w,h).raw().toBuffer()
 let fb=best;const pts=[];for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const e=((x-w/2)/(w/2))**2+((y-h/2)/(h/2))**2;if(e<0.6)pts.push([x,y,gray(pr,(y*w+x)*3)])}
 const m=pts.reduce((s,p)=>s+p[2],0)/pts.length;const sd=Math.sqrt(pts.reduce((s,p)=>s+(p[2]-m)**2,0)/pts.length)
 for(let ty=best.ty-4;ty<=best.ty+4;ty++)for(let tx=best.tx-4;tx<=best.tx+4;tx++){let s=0,ss=0,sp=0;for(const [x,y,g] of pts){const v=gray(D.data,((ty+y)*DW+tx+x)*3);s+=v;ss+=v*v;sp+=v*g}
  const n=pts.length,mv=s/n,sv=Math.sqrt(Math.max(1e-6,ss/n-mv*mv));const ncc=(sp/n-mv*m)/(sv*sd);if(ncc>fb.s)fb={...best,s:ncc,tx,ty}}
 // corrección de color por anillo y pegado con elipse difusa
 let ma=[0,0,0],mb=[0,0,0],n=0
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const e=((x-w/2)/(w/2))**2+((y-h/2)/(h/2))**2;if(e>1||e<0.7)continue;const i=(y*w+x)*3,j=((fb.ty+y)*DW+fb.tx+x)*3;for(let c=0;c<3;c++){ma[c]+=pr[i+c];mb[c]+=D.data[j+c]}n++}
 const off=[0,1,2].map(c=>(mb[c]-ma[c])/n);const o=Buffer.from(D.data)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const e=Math.sqrt(((x-w/2)/(w/2))**2+((y-h/2)/(h/2))**2);const wt=e<0.75?1:e>1?0:(1-(e-0.75)/0.25);if(!wt)continue;const i=(y*w+x)*3,j=((fb.ty+y)*DW+fb.tx+x)*3;for(let c=0;c<3;c++)o[j+c]=Math.max(0,Math.min(255,Math.round(D.data[j+c]*(1-wt)+(pr[i+c]+off[c])*wt)))}
 await sharp(o,{raw:{width:DW,height:DH,channels:3}}).png().toFile(out)
 console.log(JSON.stringify({ncc:+fb.s.toFixed(3),scale:+sc.toFixed(3),x:fb.tx,y:fb.ty,w,h,off:off.map(v=>+v.toFixed(1))}))
})()
