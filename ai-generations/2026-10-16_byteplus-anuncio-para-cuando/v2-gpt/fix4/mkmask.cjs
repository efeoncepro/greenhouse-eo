// uso: node mkmask.cjs base.png out.png 'add:x,y;x,y;...' 'sub:x0,y0,x1,y1' ...
const sharp=require('sharp')
const [base,out,...ops]=process.argv.slice(2)
;(async()=>{const m=await sharp(base).metadata();const W=m.width,H=m.height
const d=Buffer.alloc(W*H)
const inPoly=(p,x,y)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c}return c}
for(const op of ops){const [k,v]=op.split(':')
 if(k==='add'){const p=v.split(';').map(s=>s.split(',').map(Number)).map(([a,b])=>[a*W,b*H])
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inPoly(p,x,y))d[y*W+x]=255}
 if(k==='sub'){const [x0,y0,x1,y1]=v.split(',').map(Number);for(let y=Math.floor(y0*H);y<y1*H;y++)for(let x=Math.floor(x0*W);x<x1*W;x++)d[y*W+x]=0}
 if(k==='and'){const s=await sharp(v).greyscale().raw().toBuffer();for(let i=0;i<W*H;i++)if(s[i]<128)d[i]=0}}
await sharp(d,{raw:{width:W,height:H,channels:1}}).png().toFile(out);console.log('ok',out)})()
