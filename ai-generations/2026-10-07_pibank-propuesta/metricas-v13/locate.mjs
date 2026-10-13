import sharp from 'sharp'
const [a,b]=process.argv.slice(2)
const r=async p=>(await sharp(p).removeAlpha().raw().toBuffer({resolveWithObject:true}))
const A=await r(a),B=await r(b);const W=A.info.width,H=A.info.height
let x0=W,y0=H,x1=0,y1=0
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*3;if(Math.abs(A.data[i]-B.data[i])+Math.abs(A.data[i+1]-B.data[i+1])+Math.abs(A.data[i+2]-B.data[i+2])>12){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}}
console.log(JSON.stringify({x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1,W,H}))
