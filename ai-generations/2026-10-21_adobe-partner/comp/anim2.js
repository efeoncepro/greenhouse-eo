// «Capas que se arman» v2 — se compone, respira, se descompone y vuelve a su lugar. setT(t) en segundos.
const Z=[-360,-180,0,180,360]
const FROM=[
  {x:900,y:-500,z:1600,ry:70,rx:-30,rz:25},
  {x:-1100,y:300,z:1400,ry:-60,rx:20,rz:-30},
  {x:300,y:1100,z:1800,ry:40,rx:60,rz:10},
  {x:-700,y:-1000,z:1500,ry:-40,rx:-50,rz:-20},
  {x:1200,y:800,z:2000,ry:80,rx:30,rz:35}]
// Tiempos (s)
const T0=0.5, GAP=0.45, DUR=0.7          // llegadas en 1.20, 1.65, 2.10, 2.55, 3.00
const COMPOSED=T0+4*GAP+DUR              // 3.00 pieza compuesta
const SEP=3.6, SEP_PEAK=4.2, FREEZE=4.7  // se separa, llega al máximo, vuelve y se congela
const SIGN=FREEZE+0.2                    // 4.90 firma
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v))
const easeOutBack=t=>{const c1=1.25,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)}
const easeOut=t=>1-Math.pow(1-t,3)
const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2
const $=id=>document.getElementById(id)
window.setT=function(t){
  // separación entre capas: 0.03 compuesta → 1.6 al máximo → 1.0 en su lugar
  let sep=0.03
  if(t>=SEP&&t<SEP_PEAK) sep=0.03+(1.6-0.03)*easeOut((t-SEP)/(SEP_PEAK-SEP))
  else if(t>=SEP_PEAK&&t<FREEZE){const p=(t-SEP_PEAK)/(FREEZE-SEP_PEAK);sep=1.6-0.6*easeInOut(p)}
  else if(t>=FREEZE) sep=1
  // cámara: casi de frente mientras se compone, gira al ángulo final al separarse
  const push=t<SEP?0.04*easeInOut(clamp((t-COMPOSED+0.4)/1.0)):0.04*(1-easeOut(clamp((t-SEP)/0.4)))
  const c=easeInOut(clamp((t-SEP)/(FREEZE-SEP)))
  const ry=-16+(-52+16)*c, rx=6+(16-6)*c, rz=-1+(-5+1)*c
  let sx=0,sy=0
  for(let i=0;i<5;i++){const d=t-(T0+i*GAP+DUR);if(d>=0&&d<0.14){const a=4*(1-d/0.14);sx+=a*Math.sin(d*90);sy+=a*Math.cos(d*70)}}
  const ds=t-SEP; if(ds>=0&&ds<0.18){const a=9*(1-ds/0.18);sx+=a*Math.sin(ds*85);sy+=a*Math.cos(ds*65)}
  const df=t-FREEZE; if(df>=0&&df<0.22){const a=14*(1-df/0.22);sx+=a*Math.sin(df*80);sy+=a*Math.cos(df*60)}
  $('stack').style.transform=`translate(${sx}px,${sy}px) scale(${1+push}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`
  for(let i=0;i<5;i++){
    const p=clamp((t-(T0+i*GAP))/DUR), e=easeOutBack(p), k=1-e, f=FROM[i], el=$('L'+(i+1))
    el.style.opacity=p<=0?0:clamp(p*4)
    el.style.transform=`translate3d(${f.x*k}px,${f.y*k}px,${Z[i]*sep+f.z*k}px) rotateX(${f.rx*k}deg) rotateY(${f.ry*k}deg) rotateZ(${f.rz*k}deg)`
  }
  // etiquetas: aparecen cuando las capas se separan
  const tg=clamp((t-SEP-0.15)/0.3); document.querySelectorAll('.tag').forEach(e=>e.style.opacity=tg)
  // estallido de pintura: nace al separarse y crece hasta el congelado
  const ps=clamp((t-SEP+0.02)/(FREEZE-SEP)), sp=$('splash')
  sp.style.opacity=ps<=0?0:0.95*clamp(ps*6)
  sp.style.transform=`translate(-50%,-50%) rotate(-8deg) scale(${0.2+0.8*easeOut(ps)})`
  // flashes: suaves en llegadas, medio al separarse, fuerte al congelar
  let fl=0
  for(let i=0;i<5;i++){const d=t-(T0+i*GAP+DUR);if(d>=0&&d<0.1)fl=Math.max(fl,(i===4?0.3:0.16)*(1-d/0.1))}
  if(ds>=0&&ds<0.12)fl=Math.max(fl,0.35*(1-ds/0.12))
  if(df>=0)fl=Math.max(fl,[0.75,0.5,0.32,0.18,0.08,0.03][Math.floor(df*30)]||0)
  $('flash').style.opacity=fl
  $('fin').style.opacity=clamp((df-0.02)/0.16)
  const h=t-SIGN, tl=clamp(h/0.3)
  const lk=$('lk'); lk.style.opacity=clamp(tl*1.8); lk.style.transform=`scale(${1.18-0.18*easeOut(tl)})`
  const te=clamp((h-0.25)/0.27), tr=clamp((h-0.4)/0.27)
  $('eb').style.opacity=te; $('eb').style.transform=`translateY(${8*(1-easeOut(te))}px)`
  $('row').style.opacity=tr; $('row').style.transform=`translateY(${8*(1-easeOut(tr))}px)`
}
window.setT(0)
