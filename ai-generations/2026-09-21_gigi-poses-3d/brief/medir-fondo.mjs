import sharp from 'sharp'
const f='ai-generations/2026-09-21_gigi-poses-3d/final/efeonce-gigi-3d-01-detective-lupa-1x1-1600x1600-v01-fondo-estudio.png'
const {data,info}=await sharp(f).raw().toBuffer({resolveWithObject:true})
const {width:W,height:H,channels:C}=info
const med=a=>{a.sort((x,y)=>x-y);return a[a.length>>1]}
const b=[[],[],[]]
for(let x=0;x<W;x+=4)for(const y of[0,H-1])for(let c=0;c<3;c++)b[c].push(data[(y*W+x)*C+c])
for(let y=0;y<H;y+=4)for(const x of[0,W-1])for(let c=0;c<3;c++)b[c].push(data[(y*W+x)*C+c])
const bg=b.map(med); console.log('fondo estudio (mediana borde):', bg, '#'+bg.map(v=>v.toString(16).padStart(2,'0')).join(''))
// muestra del gorro (zona superior-izq del sombrero) y del lente
for(const [n,x,y] of [['gorro',330,190],['gorro2',400,150],['lente',350,320],['aro lupa',300,250]]){
  const i=(y*W+x)*C; const p=[data[i],data[i+1],data[i+2]]
  console.log(n.padEnd(9), p, 'Δmax vs fondo =', Math.max(...p.map((v,c)=>Math.abs(v-bg[c]))))}
