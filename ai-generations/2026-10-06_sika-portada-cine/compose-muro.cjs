// Muro POSIBLE: compone el Master Graphic aprobado sobre el lightbox del plate SK1 (homografía) y corre a Karo a la derecha.
const sharp = require('sharp')
const [,, PLATE, PERSON, GRAPHIC, OUT, DXs] = process.argv
const DX = Number(DXs || 320)
const QUAD = [[1152,61],[2511,65],[2511,848],[1158,853]] // TL TR BR BL medidos sobre el plate
const TABLE_Y = 1328
function solve(A,b){const n=b.length;for(let i=0;i<n;i++){let m=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;[A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i]}}const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i]}return x}
function H(from,to){const A=[],b=[];for(let i=0;i<4;i++){const[x,y]=from[i],[u,v]=to[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v)}const h=solve(A,b);return(x,y)=>{const d=h[6]*x+h[7]*y+1;return[(h[0]*x+h[1]*y+h[2])/d,(h[3]*x+h[4]*y+h[5])/d]}}
;(async()=>{
  const { data: orig, info } = await sharp(PLATE).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, Hh = info.height, out = Buffer.from(orig)
  // 1) hueco de la persona (sólo si el plate no viene ya limpio con `ai:inpaint erase`; CLEAN_PLATE=1)
  const per = await sharp(PERSON).ensureAlpha().raw().toBuffer()
  if (!process.env.CLEAN_PLATE) for (let y = 848; y < TABLE_Y; y++) for (let x = 1100; x < W; x++) {
    const a = per[(y * W + x) * 4 + 3]; if (a < 8) continue
    const sx = 700 + ((x - 1100) % 360), o = (y * W + x) * 3, so = (y * W + sx) * 3
    for (let c = 0; c < 3; c++) out[o + c] = orig[so + c]
  }
  // 2) el gráfico sobre el panel (cover 16:9 → proporción del panel), un leve desenfoque como el del plate
  const sw = 1920, sh = 1104
  const g = await sharp(GRAPHIC).resize(sw, sh, { fit: 'cover' }).removeAlpha().blur(0.9).raw().toBuffer()
  const inv = H(QUAD, [[0,0],[sw,0],[sw,sh],[0,sh]])
  for (let y = 50; y < 870; y++) for (let x = 1140; x < W; x++) {
    let cov = 0; for (const [ox, oy] of [[.25,.25],[.75,.25],[.25,.75],[.75,.75]]) { const [u,v] = inv(x+ox, y+oy); if (u>=0&&v>=0&&u<=sw&&v<=sh) cov++ }
    if (!cov) continue
    const [u,v] = inv(x+.5,y+.5); const uu=Math.min(sw-1.001,Math.max(0,u-.5)), vv=Math.min(sh-1.001,Math.max(0,v-.5)); const ix=uu|0, iy=vv|0, fx=uu-ix, fy=vv-iy, a=cov/4, o=(y*W+x)*3
    for (let c=0;c<3;c++){const p=(X,Y)=>g[(Y*sw+X)*3+c];const val=p(ix,iy)*(1-fx)*(1-fy)+p(ix+1,iy)*fx*(1-fy)+p(ix,iy+1)*(1-fx)*fy+p(ix+1,iy+1)*fx*fy;out[o+c]=Math.round(out[o+c]*(1-a)+val*a)}
  }
  // 3) Karo corrida DX a la derecha (cortada por el borde del cuadro), detrás de la mesa
  for (let y = 0; y < TABLE_Y; y++) for (let x = 0; x < W - DX; x++) {
    const a = per[(y * W + x) * 4 + 3] / 255; if (!a) continue
    const o = (y * W + x + DX) * 3, po = (y * W + x) * 4
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(out[o + c] * (1 - a) + per[po + c] * a)
  }
  // 4) la mesa del primer plano vuelve encima, tal cual el plate
  for (let y = TABLE_Y; y < Hh; y++) orig.copy(out, y * W * 3, y * W * 3, (y + 1) * W * 3)
  await sharp(out, { raw: { width: W, height: Hh, channels: 3 } }).png().toFile(OUT)
  console.log('ok', OUT)
})()
