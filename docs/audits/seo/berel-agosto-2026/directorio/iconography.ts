import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here=path.dirname(fileURLToPath(import.meta.url))
export async function enhanceIconography(page:any,slide:any){
 const pack=JSON.parse(await fs.readFile(path.join(here,'assets/platform-icons.json'),'utf8'))
 const assets=pack.assets
 await page.evaluate(({assets,id}:any)=>{
  const icon=(name:string,cls='topic-icon')=>assets[name].replace('<svg ',`<svg class="${cls}" aria-hidden="true" `)
  const brand=(name:string,label:string,cls='platform-logo')=>`<img class="${cls}" alt="${label}" src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(assets[name])))}">`
  if(id==='balance')document.querySelectorAll('.metric').forEach((n,i)=>{n.classList.add('metric-branded');n.insertAdjacentHTML('afterbegin',brand(i===0?'google-analytics':'google-icon',i===0?'Google Analytics':'Google'))})
  if(id==='google'||id==='editorial')document.querySelector('.plot-heading span')?.insertAdjacentHTML('afterbegin',brand('google-icon','Google','plot-logo'))
  if(id==='comercial'){
   document.querySelectorAll('.commercial-route').forEach((n,i)=>n.insertAdjacentHTML('afterbegin',icon(i===0?'map-pin':'brush','route-icon')))
   document.querySelector('.commercial-bridge')?.insertAdjacentHTML('afterbegin',brand('google-icon','Google','plot-logo'))
  }
  if(id==='ia'){
   document.querySelector('.evidence-primary')?.insertAdjacentHTML('beforeend',`<div class="google-mark">${brand('google-icon','Google')}</div>`)
   document.querySelector('.evidence-secondary .label')?.insertAdjacentHTML('afterbegin',brand('google-analytics','Google Analytics','label-logo'))
   document.querySelector('.evidence-calibration')?.insertAdjacentHTML('beforeend',`<div class="engine-marks">${[['openai-icon','OpenAI'],['perplexity-icon','Perplexity'],['google-gemini','Gemini'],['google-icon','AI Mode']].map(([key,label])=>`<span>${brand(key,label,'engine-logo')}<small>${label}</small></span>`).join('')}</div>`)
  }
  if(id==='mes')document.querySelectorAll('.metric').forEach((n,i)=>{n.classList.add('metric-illustrated');n.insertAdjacentHTML('afterbegin',icon(['article','palette','video'][i],'production-icon'))})
  if(id==='acumulado')document.querySelector('.examples-label')?.insertAdjacentHTML('afterbegin',icon('palette','small-icon'))
  if(id==='puntualidad')document.querySelectorAll('.ontime-step').forEach((n,i)=>n.insertAdjacentHTML('afterbegin',icon(i===0?'clock-check':'checklist','step-icon')))
  if(id==='continuidad')document.querySelectorAll('.register-number').forEach((n,i)=>{n.innerHTML=icon(['sitemap','robot','file-text'][i],'register-icon')})
  if(id==='conexiones')document.querySelector('.diagnostic-heading span')?.insertAdjacentHTML('afterbegin',icon('route','small-icon'))
  if(id==='medicion')document.querySelector('.stage-observed .stage-marker')!.innerHTML=brand('google-analytics','Google Analytics','stage-logo')
  if(id==='ejecucion')document.querySelectorAll('.card .tag').forEach((n,i)=>n.insertAdjacentHTML('afterbegin',i===0?brand('efeonce-isotype','Isotipo Efeonce','action-isotype'):icon(['file-text','route','brush'][i],'action-icon')))
  if(id==='decisiones')document.querySelector('.next-review')?.insertAdjacentHTML('afterbegin',icon('calendar','calendar-icon'))
 },{assets,id:slide.slideId})
}
