const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const lin=c=>{c/=255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4}
const lab=(r,g,b)=>{const R=lin(r),G=lin(g),B=lin(b);let X=(.4124*R+.3576*G+.1805*B)/.95047,Y=.2126*R+.7152*G+.0722*B,Z=(.0193*R+.1192*G+.9505*B)/1.08883;const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;return [116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))]}
const q=(a,p)=>a[Math.min(a.length-1,Math.floor(p*a.length))]
;(async()=>{const rows=[]
for(const [k,f] of process.argv.slice(2).map(s=>s.split('='))){
 const {data,info}=await sharp(f).removeAlpha().resize(576).raw().toBuffer({resolveWithObject:true});const n=info.width*info.height
 const L=[],C=[],A=[],Bv=[],H=[];for(let i=0;i<n;i++){const l=lab(data[i*3],data[i*3+1],data[i*3+2]);L.push(l[0]);A.push(l[1]);Bv.push(l[2]);C.push(Math.hypot(l[1],l[2]));H.push((Math.atan2(l[2],l[1])*180/Math.PI+360)%360)}
 const Ls=[...L].sort((a,b)=>a-b),Cs=[...C].sort((a,b)=>a-b);const p5=q(Ls,.05),p95=q(Ls,.95),p10=q(Ls,.1)
 let hb=0,hn=0,sb=0,sn=0,sx=0,sy=0,cn=0,blue=0,orange=0,lime=0,skL=0,skC=0,skn=0
 for(let i=0;i<n;i++){if(L[i]>=p95){hb+=Bv[i];hn++}if(L[i]<=p10){sb+=Bv[i];sn++}
  if(C[i]>8){sx+=Math.cos(H[i]*Math.PI/180);sy+=Math.sin(H[i]*Math.PI/180);cn++}
  if(H[i]>250&&H[i]<300&&C[i]>30)blue++;if(H[i]>45&&H[i]<62&&C[i]>60&&L[i]>40)orange++;if(H[i]>110&&H[i]<135&&C[i]>40)lime++
  if(A[i]>8&&Bv[i]>10&&L[i]>35&&L[i]<85&&H[i]>40&&H[i]<70&&C[i]<40){skL+=L[i];skC+=C[i];skn++}}
 const R=Math.hypot(sx,sy)/cn,disp=Math.sqrt(-2*Math.log(R))*180/Math.PI
 rows.push({pieza:k,Lmedia:(L.reduce((a,b)=>a+b)/n).toFixed(0),p1:q(Ls,.01).toFixed(1),p99:q(Ls,.99).toFixed(0),quemado:(L.filter(v=>v>97).length/n*100).toFixed(2),aplastado:(L.filter(v=>v<2).length/n*100).toFixed(1),contraste:(p95-p5).toFixed(0),Cmedia:(C.reduce((a,b)=>a+b)/n).toFixed(1),Cp95:q(Cs,.95).toFixed(0),dispTono:disp.toFixed(0),bAltas:(hb/hn).toFixed(1),bSombras:(sb/sn).toFixed(1),azul:(blue/n*100).toFixed(1),naranja:(orange/n*100).toFixed(2),lima:(lime/n*100).toFixed(2),piel:skn>200?`${(skL/skn).toFixed(0)}/${(skC/skn).toFixed(0)}`:'—'})}
console.table(rows)})()
