import { chromium } from 'playwright'
const D='/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-23_umbral-fintech/neon'
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1700,height:1700} })
for (const k of ['lima','cian','magenta']) {
  await p.goto(`file://${D}/marca-${k}.html`); await p.evaluate(()=>document.fonts.ready)
  for (const [id,out,t] of [['card',`tarjeta-${k}.png`,true],['logo',`logo-${k}.png`]]) {
    await p.evaluate(i=>{document.querySelectorAll('body>div').forEach(d=>d.style.display='none');const e=document.getElementById(i);e.style.display=i==='card'?'block':'flex'},id)
    await p.locator('#'+id).screenshot({path:`${D}/${out}`,omitBackground:!!t})
  }
}
await b.close()
