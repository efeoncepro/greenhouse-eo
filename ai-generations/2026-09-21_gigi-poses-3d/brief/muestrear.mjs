import sharp from 'sharp'
const f = process.argv[2]
const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true })
const { width:w, height:h, channels:c } = info
const at=(x,y)=>{const i=(y*w+x)*c; return [data[i],data[i+1],data[i+2]]}
const isInk=([r,g,b])=>r<70&&g<70&&b<70
const isBg =([r,g,b])=>r>240&&g>240&&b>240
let x0=w,y0=h,x1=0,y1=0
for (let y=0;y<h;y++) for (let x=0;x<w;x++){ if(!isBg(at(x,y))){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y } }
const bw=x1-x0+1, bh=y1-y0+1
console.log(`\n${f.split('/').pop()}  bbox ${bw}x${bh}`)
// 3x3 regiones: color medio de los píxeles de cuerpo (ni tinta ni fondo)
const names=[['sup-izq','sup-centro','sup-der'],['med-izq','centro','med-der'],['inf-izq','inf-centro','inf-der']]
for (let ry=0;ry<3;ry++){ const row=[]
  for (let rx=0;rx<3;rx++){ let R=0,G=0,B=0,n=0
    for (let y=y0+Math.floor(ry*bh/3); y<y0+Math.floor((ry+1)*bh/3); y++)
      for (let x=x0+Math.floor(rx*bw/3); x<x0+Math.floor((rx+1)*bw/3); x++){
        const p=at(x,y); if(isInk(p)||isBg(p)) continue; R+=p[0];G+=p[1];B+=p[2];n++ }
    row.push(n<50 ? `${names[ry][rx]}: —` : `${names[ry][rx]}: #${[R/n,G/n,B/n].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')}`)}
  console.log('  '+row.join('   ')) }
