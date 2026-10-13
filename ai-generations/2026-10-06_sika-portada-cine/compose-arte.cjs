// SK2: compone el Master Graphic EXACTO sobre el lightbox que la escena ya generó con el arte (homografía),
// respetando a la persona delante (máscara rmbg). Después se termina con `ai:inpaint image` (materia y luz).
const sharp = require('sharp')
const [,, PLATE, PERSON, GRAPHIC, OUT, MASKOUT] = process.argv
const QUAD = process.env.QUAD ? JSON.parse(process.env.QUAD) : [[813,43],[2361,7],[2361,851],[810,806]] // TL TR BR BL del área impresa, medidos en el plate
const PERSON_X0 = Number(process.env.PERSON_X0 ?? 1700), PERSON_Y0 = Number(process.env.PERSON_Y0 ?? 1e9), PERSON_X1 = Number(process.env.PERSON_X1 ?? 0)
const HANDBOX = process.env.HANDBOX ? process.env.HANDBOX.split(',').map(Number) : null // la máscara rmbg también toma parte del lightbox brillante: sólo vale donde está la persona
function solve(A,b){const n=b.length;for(let i=0;i<n;i++){let m=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;[A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i]}}const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i]}return x}
function H(from,to){const A=[],b=[];for(let i=0;i<4;i++){const[x,y]=from[i],[u,v]=to[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v)}const h=solve(A,b);return(x,y)=>{const d=h[6]*x+h[7]*y+1;return[(h[0]*x+h[1]*y+h[2])/d,(h[3]*x+h[4]*y+h[5])/d]}}
;(async()=>{
  const { data: base, info } = await sharp(PLATE).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, Hh = info.height, out = Buffer.from(base), mask = Buffer.alloc(W * Hh)
  const per = await sharp(PERSON).ensureAlpha().extractChannel(3).raw().toBuffer()
  const wTop = Math.hypot(QUAD[1][0]-QUAD[0][0], QUAD[1][1]-QUAD[0][1]), wBot = Math.hypot(QUAD[2][0]-QUAD[3][0], QUAD[2][1]-QUAD[3][1]), hL = Math.hypot(QUAD[3][0]-QUAD[0][0], QUAD[3][1]-QUAD[0][1]), hR = Math.hypot(QUAD[2][0]-QUAD[1][0], QUAD[2][1]-QUAD[1][1])
  const sw = 1920, sh = Math.round(1920 / ((wTop + wBot) / (hL + hR)))
  const g = await sharp(GRAPHIC).resize(sw, sh, { fit: 'cover', position: process.env.FIT_POS ?? 'centre' }).removeAlpha().blur(0.8).raw().toBuffer()
  const hand = process.env.HANDMASK ? await (async () => { const r = await sharp(process.env.HANDMASK).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true }); return { a: r.data, w: r.info.width, h: r.info.height } })() : null
  const inv = H(QUAD, [[0,0],[sw,0],[sw,sh],[0,sh]])
  const xs = QUAD.map(q => q[0]), ys = QUAD.map(q => q[1])
  for (let y = Math.floor(Math.min(...ys)) - 2; y < Math.max(...ys) + 2; y++) for (let x = Math.floor(Math.min(...xs)) - 2; x < Math.max(...xs) + 2; x++) {
    let cov = 0; for (const [ox,oy] of [[.25,.25],[.75,.25],[.25,.75],[.75,.75]]) { const [u,v] = inv(x+ox,y+oy); if (u>=0&&v>=0&&u<=sw&&v<=sh) cov++ }
    if (!cov) continue
    let pa = x >= PERSON_X0 || (y >= PERSON_Y0 && x >= PERSON_X1) ? per[y * W + x] / 255 : 0
    if (hand && x >= HANDBOX[0] && y >= HANDBOX[1] && x < HANDBOX[0] + hand.w && y < HANDBOX[1] + hand.h) { // mano: rmbg sobre un recorte local (el rmbg de la toma entera toma el afiche como sujeto)
      pa = hand.a[(y - HANDBOX[1]) * hand.w + (x - HANDBOX[0])] / 255
    }
    const a = (cov / 4) * (1 - pa); if (a <= 0) continue
    const [u,v] = inv(x+.5,y+.5); const uu=Math.min(sw-1.001,Math.max(0,u-.5)), vv=Math.min(sh-1.001,Math.max(0,v-.5)); const ix=uu|0, iy=vv|0, fx=uu-ix, fy=vv-iy, o=(y*W+x)*3
    for (let c=0;c<3;c++){const p=(X,Y)=>g[(Y*sw+X)*3+c];const val=p(ix,iy)*(1-fx)*(1-fy)+p(ix+1,iy)*fx*(1-fy)+p(ix,iy+1)*(1-fx)*fy+p(ix+1,iy+1)*fx*fy;out[o+c]=Math.round(base[o+c]*(1-a)+val*a)}
    mask[y * W + x] = Math.round(a * 255)
  }
  await sharp(out, { raw: { width: W, height: Hh, channels: 3 } }).png().toFile(OUT)
  // máscara editable para el acabado: el área impresa sin la persona, encogida 3 px para no tocar el marco
  await sharp(mask, { raw: { width: W, height: Hh, channels: 1 } }).threshold(250).blur(1).threshold(250).png().toFile(MASKOUT)
  console.log('ok', sw, sh)
})()
