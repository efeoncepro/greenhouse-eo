// Animación «Capas que se arman» — Efeonce | Adobe. setT(t) en segundos.
const Z=[-360,-180,0,180,360]
const FROM=[ // desde dónde llega cada capa (px, deg)
  {x:900,y:-500,z:1600,ry:70,rx:-30,rz:25},   // Pintura
  {x:-1100,y:300,z:1400,ry:-60,rx:20,rz:-30},  // Vector
  {x:300,y:1100,z:1800,ry:40,rx:60,rz:10},     // Foto
  {x:-700,y:-1000,z:1500,ry:-40,rx:-50,rz:-20},// Tipografía
  {x:1200,y:800,z:2000,ry:80,rx:30,rz:35}]     // Selección
const T0=0.30, GAP=0.30, DUR=0.42, LOCK=T0+4*GAP+DUR // 1.92 s: calza la última capa
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v))
const easeOutBack=t=>{const c1=1.35,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)}
const easeOut=t=>1-Math.pow(1-t,3)
const $=id=>document.getElementById(id)
window.setT=function(t){
  // cámara: el stack gira suave hasta su ángulo final
  const cam=easeOut(clamp(t/LOCK))
  const ry=-40+(-52+40)*cam, rx=10+(16-10)*cam, rz=-2+(-5+2)*cam
  // sacudidas: en cada llegada y fuerte al calzar
  let sx=0,sy=0
  for(let i=0;i<5;i++){const ta=T0+i*GAP+DUR;const d=t-ta;if(d>=0&&d<0.12){const a=(i===4?0:5)*(1-d/0.12);sx+=a*Math.sin(d*90);sy+=a*Math.cos(d*70)}}
  const dl=t-LOCK; if(dl>=0&&dl<0.22){const a=14*(1-dl/0.22);sx+=a*Math.sin(dl*80);sy+=a*Math.cos(dl*60)}
  $('stack').style.transform=`translate(${sx}px,${sy}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`
  for(let i=0;i<5;i++){
    const p=clamp((t-(T0+i*GAP))/DUR), e=easeOutBack(p), k=1-e, f=FROM[i], el=$('L'+(i+1))
    el.style.opacity=p<=0?0:clamp(p*4)
    el.style.transform=`translate3d(${f.x*k}px,${f.y*k}px,${Z[i]+f.z*k}px) rotateX(${f.rx*k}deg) rotateY(${f.ry*k}deg) rotateZ(${f.rz*k}deg)`
  }
  // estallido de pintura al calzar
  const ps=clamp((t-LOCK+0.03)/0.28), sp=$('splash')
  sp.style.opacity=ps<=0?0:0.95*clamp(ps*5)
  sp.style.transform=`translate(-50%,-50%) rotate(-8deg) scale(${0.25+0.75*easeOut(ps)})`
  // flash: pequeños en cada llegada, grande al calzar
  let fl=0
  for(let i=0;i<4;i++){const d=t-(T0+i*GAP+DUR);if(d>=0&&d<0.1)fl=Math.max(fl,0.22*(1-d/0.1))}
  if(dl>=0)fl=Math.max(fl,[0.75,0.5,0.32,0.18,0.08,0.03][Math.floor(dl*30)]||0)
  $('flash').style.opacity=fl
  // fundido al fijo con acabado, oculto bajo el flash
  $('fin').style.opacity=clamp((dl-0.02)/0.16)
  // firma: golpe del lockup
  const h=t-(LOCK+0.22), tl=clamp(h/0.3)
  const lk=$('lk'); lk.style.opacity=clamp(tl*1.8); lk.style.transform=`scale(${1.18-0.18*easeOut(tl)})`
  const te=clamp((h-0.25)/0.27), tr=clamp((h-0.4)/0.27)
  $('eb').style.opacity=te; $('eb').style.transform=`translateY(${8*(1-easeOut(te))}px)`
  $('row').style.opacity=tr; $('row').style.transform=`translateY(${8*(1-easeOut(tr))}px)`
}
window.setT(0)
