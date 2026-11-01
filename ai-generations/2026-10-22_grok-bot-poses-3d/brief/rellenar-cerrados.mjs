// Rellena TODO hueco transparente encerrado por la figura con los píxeles del original.
// Para Grok es seguro: la esfera es opaca, no hay fondo real dentro de la silueta.
// Se usa porque los ojos (#F5F5F5) casi igualan el fondo de estudio y el matting los perfora.
import sharp from 'sharp';
const [,, original, recorte, out] = process.argv;
const o = await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const r = await sharp(recorte).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const W=r.info.width, H=r.info.height, A=(i)=>r.data[i*4+3];
const fuera = new Uint8Array(W*H), pila=[];
for (let x=0;x<W;x++){pila.push(x, (H-1)*W+x);} for (let y=0;y<H;y++){pila.push(y*W, y*W+W-1);}
while (pila.length){ const i=pila.pop(); if(fuera[i]||A(i)>=128) continue; fuera[i]=1; const x=i%W,y=(i/W)|0;
  if(x>0)pila.push(i-1); if(x<W-1)pila.push(i+1); if(y>0)pila.push(i-W); if(y<H-1)pila.push(i+W); }
// Banda de borde: píxeles a <= 6 px del fondo conservan su alfa (antialias del contorno).
const borde = new Uint8Array(W*H); const R=6;
for (let i=0;i<W*H;i++){ if(!fuera[i]) continue; const x=i%W,y=(i/W)|0;
  for(let dy=-R;dy<=R;dy++) for(let dx=-R;dx<=R;dx++){ const xx=x+dx,yy=y+dy; if(xx>=0&&yy>=0&&xx<W&&yy<H) borde[yy*W+xx]=1; } }
let n=0; for (let i=0;i<W*H;i++){ if(!fuera[i] && !borde[i] && A(i)<255){ for(let c=0;c<3;c++) r.data[i*4+c]=o.data[i*4+c]; r.data[i*4+3]=255; n++; } }
await sharp(r.data,{raw:{width:W,height:H,channels:4}}).png().toFile(out);
console.log(out.split('/').pop(), 'pixeles rellenados', n);
