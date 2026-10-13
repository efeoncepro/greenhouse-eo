import sharp from 'sharp'
for (const f of ['RG1-regiones.png','RG1b-regiones.png']) {
  const p='ai-generations/2026-10-06_deck-hubspot/fotos/plates/'+f
  const {data,info}=await sharp(p).raw().toBuffer({resolveWithObject:true})
  const W=info.width,C=info.channels, pts=[]
  for (let y=80;y<1000;y+=30){ for(let x=400;x<W-20;x++){ let ok=0; for(let k=0;k<15;k++){ if(data[(y*W+x+k)*C+2]>40) ok++ } if(data[(y*W+x)*C+2]>60 && ok>=12){pts.push([x,y]);break} } }
  // fit circle (least squares, Kasa)
  let Sx=0,Sy=0,n=pts.length; for(const[x,y]of pts){Sx+=x;Sy+=y}
  const mx=Sx/n,my=Sy/n; let Suu=0,Svv=0,Suv=0,Suuu=0,Svvv=0,Suvv=0,Svuu=0
  for(const[x,y]of pts){const u=x-mx,v=y-my;Suu+=u*u;Svv+=v*v;Suv+=u*v;Suuu+=u*u*u;Svvv+=v*v*v;Suvv+=u*v*v;Svuu+=v*u*u}
  const b1=(Suuu+Suvv)/2,b2=(Svvv+Svuu)/2,det=Suu*Svv-Suv*Suv
  const uc=(b1*Svv-b2*Suv)/det,vc=(Suu*b2-Suv*b1)/det,cx=uc+mx,cy=vc+my,r=Math.sqrt(uc*uc+vc*vc+(Suu+Svv)/n)
  const res=pts.map(([x,y])=>Math.hypot(x-cx,y-cy)-r)
  console.log(f,`r=${r.toFixed(0)} c=(${cx.toFixed(0)},${cy.toFixed(0)}) n=${n} resid max=${Math.max(...res.map(Math.abs)).toFixed(1)} rms=${Math.sqrt(res.reduce((a,b)=>a+b*b,0)/n).toFixed(1)}`)
  console.log('  ', res.map(v=>v.toFixed(0)).join(' '))
}
