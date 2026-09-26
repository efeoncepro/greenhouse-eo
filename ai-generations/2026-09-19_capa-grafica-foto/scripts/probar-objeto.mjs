import sharp from 'sharp'
const lum=(r,g,b)=>{const f=c=>((c/=255)<=0.03928?c/12.92:((c+0.055)/1.055)**2.4);return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)}
const L=h=>lum(parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16))
const ratio=(a,b)=>Math.round(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05))*100)/100
const T=L('#a6cdf5')
const file='ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S1-panaderia-45-plate.png'
const {width:W,height:H}=await sharp(file).metadata()
const candidatos={
  'rig de cámara':{x0:0.70,y0:0.60,x1:0.90,y1:0.78},
  'cámara + operador':{x0:0.66,y0:0.55,x1:0.92,y1:0.80},
  'canasto izquierdo':{x0:0.02,y0:0.66,x1:0.16,y1:0.78}
}
for(const [n,r] of Object.entries(candidatos)){
  const caja={left:r.x0*W,top:r.y0*H,right:r.x1*W,bottom:r.y1*H}
  const g=Math.max(6,(caja.bottom-caja.top)*0.08)
  let peor=Infinity
  for(const b of [{...caja,top:caja.top-g,bottom:caja.top+g},{...caja,top:caja.bottom-g,bottom:caja.bottom+g},
                  {...caja,left:caja.left-g,right:caja.left+g},{...caja,left:caja.right-g,right:caja.right+g}]){
    const left=Math.max(0,Math.floor(b.left)),top=Math.max(0,Math.floor(b.top))
    const width=Math.max(1,Math.min(W-left,Math.ceil(b.right-b.left))),height=Math.max(1,Math.min(H-top,Math.ceil(b.bottom-b.top)))
    const {data}=await sharp(file).extract({left,top,width,height}).removeAlpha().raw().toBuffer({resolveWithObject:true})
    const ls=[];for(let i=0;i<data.length;i+=3)ls.push(lum(data[i],data[i+1],data[i+2]))
    ls.sort((a,b2)=>a-b2)
    peor=Math.min(peor,ratio(T,ls[Math.floor(ls.length*0.98)]))
  }
  console.log(n.padEnd(20), 'peor lado del perímetro', peor, peor>=3?'✓ el trazo se ve':'✗')
}
