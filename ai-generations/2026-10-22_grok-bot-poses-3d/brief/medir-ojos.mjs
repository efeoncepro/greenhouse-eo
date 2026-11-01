import sharp from 'sharp';
for (const f of process.argv.slice(2)) {
  const {data, info} = await sharp(f).greyscale().raw().toBuffer({resolveWithObject:true});
  const W=info.width,H=info.height; let dark={x0:W,x1:0,y0:H,y1:0}, white=0;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++){const v=data[y*W+x]; if(v<40){dark.x0=Math.min(dark.x0,x);dark.x1=Math.max(dark.x1,x);dark.y0=Math.min(dark.y0,y);dark.y1=Math.max(dark.y1,y);} }
  const d=dark.x1-dark.x0; let n=0;
  for (let y=dark.y0;y<=dark.y1;y++) for(let x=dark.x0;x<=dark.x1;x++){ if(data[y*W+x]>200){ const cx=(dark.x0+dark.x1)/2, cy=(dark.y0+dark.y1)/2; if(((x-cx)**2+(y-cy)**2) < (d/2*0.95)**2) n++; } }
  console.log(f.split('/').pop(), 'diametro', d, 'area ojos/area esfera', (n/(Math.PI*(d/2)**2)*100).toFixed(2)+'%');
}
