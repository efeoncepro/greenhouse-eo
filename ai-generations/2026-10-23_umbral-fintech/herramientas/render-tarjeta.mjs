import { chromium } from 'playwright'
const U='/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-23_umbral-fintech'
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1700,height:1700}})
await p.goto(`file://${U}/herramientas/marca.html`); await p.evaluate(()=>document.fonts.ready); await p.addStyleTag({content:'#card,#back{border-radius:0!important} html,body{background:#070708!important}'})
const shot=async(id,out,mask)=>{
  await p.evaluate(([i,m])=>{document.querySelectorAll('body>div').forEach(d=>d.style.display='none');const e=document.getElementById(i);e.style.display='block';
    e.querySelectorAll('*').forEach(x=>x.style.visibility='');
    if(m){e.style.background='#000';e.querySelectorAll('*').forEach(x=>{const keep=x.classList.contains('slit')||x.classList.contains('bar');x.style.visibility=keep?'visible':'hidden'})}else{e.style.background=''}},[id,mask])
  await p.locator('#'+id).screenshot({path:`${U}/tarjeta/${out}`})
}
await shot('card','tex-frente.png',false); await shot('card','tex-frente-emision.png',true)
await shot('back','tex-reverso.png',false); await shot('back','tex-reverso-emision.png',true)
await b.close()
