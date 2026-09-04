import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeArtifact, type ArtifactCatalog, type DeckPlan } from '@/lib/artifact-composer'

import { enhanceEvidence } from './evidence-premium'
import { enhanceCommercialAndOnTime } from './commercial-premium'
import { enhanceEditorial } from './editorial-premium'
import { enhanceIconography } from './iconography'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../../..')
const hook: NonNullable<ArtifactCatalog['layoutHooks']>[string] = async (page, slide, plan) => {
  await page.evaluate(() => document.fonts.ready)
  const icons = JSON.parse(await fs.readFile(path.join(here, '../assets/report-icons.json'), 'utf8')).icons
  const slots = slide.slots as Record<string, any>
  const bars = slots.bars as Array<{ amount: string }> | undefined
  await page.evaluate(({ bars, diagnostic, slideId, icons }) => {
    document.querySelector('.slide')!.classList.add('slide-' + slideId)
    if (bars && bars.length === 4) document.querySelector('.slide')!.classList.add('multi-series')
    if (bars) {
      const values = bars.map(x => Number(x.amount))
      const maximum = diagnostic ? 115 : Math.max(...values)
      document.querySelectorAll<HTMLElement>('.bar-item .fill').forEach((el, i) => {
        el.style.width = `${values[i]! / maximum * 100}%`
      })
    }
    const svg = (body: string, viewBox: string, cls: string, label: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${cls}" role="img" aria-label="${label}">${body}</svg>`
    const metricNodes = [...document.querySelectorAll<HTMLElement>('.metric')]
    if (slideId === 'mes') {
      const values=metricNodes.map(n=>Number(n.querySelector('.value')!.textContent))
      const extra=Number(document.querySelector('.insight')!.textContent!.match(/(\d+) cargas/)![1]);values.push(extra)
      const sum=values.reduce((a,b)=>a+b,0), colors=['#023c70','#0375d9','#7fb4df','#d5e4ef'], labels=['Editorial','Gráficos','Video','Cargas en el sitio']
      let x=0
      const rects=values.map((v,i)=>{const width=v/sum*995;const out=`<rect x="${x}" y="0" width="${width}" height="36" fill="${colors[i]}"/>`;x+=width;return out}).join('')
      const chart=svg(rects,'0 0 995 36','delivery-chart',`${sum} tareas: ${values.map((v,i)=>v+' '+labels[i]).join(', ')}`)
      document.querySelector('.metrics')!.insertAdjacentHTML('afterend',chart+`<div class="delivery-key">${labels.map((l,i)=>`<span><i style="--series:${colors[i]}"></i>${values[i]} ${l}</span>`).join('')}</div>`)
    }
    if (slideId === 'continuidad' || slideId === 'medicion') {
      const names=slideId==='continuidad'?['file','search','file']:['chart','link','check']
      document.querySelectorAll('.card').forEach((node,i)=>node.insertAdjacentHTML('afterbegin',svg(icons[names[i]!]??icons['chart'],'0 0 24 24','section-icon','')))
    }
    const content = document.querySelector('.content')
    if (content && content.getBoundingClientRect().bottom > 672) throw new Error(slideId + ': Content reaches source/footer area: ' + content.getBoundingClientRect().bottom)
    const insight = document.querySelector<HTMLElement>('.insight')
    if (insight && insight.getBoundingClientRect().bottom > 672) throw new Error(slideId + ': Insight reaches source/footer area: ' + insight.getBoundingClientRect().bottom)
  }, { bars, slideId:slide.slideId, icons, diagnostic: slide.contentType === 'diagnostic' })
  await enhanceCommercialAndOnTime(page,slide)
  await enhanceEvidence(page,slide)
  await enhanceEditorial(page,slide)
  await enhanceIconography(page,slide)
  await page.evaluate(async()=>{
    await document.fonts.ready
    await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))
    for(const selector of ['.content','.insight']){
      const node=document.querySelector(selector)
      if(node && node.getBoundingClientRect().bottom>672)throw new Error(selector+': final composition exceeds content area '+node.getBoundingClientRect().bottom)
    }
  })
  await fs.mkdir(path.join(here,'render/html'),{recursive:true})
  let html=await page.content()
  for(const match of [...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)]) {
    const file=path.join(here,'catalog',path.basename(match[1]!))
    html=html.replace(match[0],'<style>'+await fs.readFile(file,'utf8')+'</style>')
  }
  await fs.writeFile(path.join(here,'render/html',slide.slideId+'.html'),html)
}
async function main() {
  const plan: DeckPlan = JSON.parse(await fs.readFile(path.join(here, 'deck-plan.json'), 'utf8'))
  const registry = JSON.parse(await fs.readFile(path.join(here, 'catalog/registry.json'), 'utf8'))
  const catalog: ArtifactCatalog = {
    name: 'efeonce-board-report-a4', ownerOrgId: 'efeonce', templatesDir: path.join(here, 'catalog'),
    outputTarget: 'pdf-merged', resolvers: {},
    layoutHooks: Object.fromEntries(registry.templates.map((t: {name: string}) => [t.name, hook])),
    semanticValidators: [{name:'board-report-contract',version:'1.0',validate: plan => {
      const errors = []
      if (plan.slides.length > 15 || plan.slides[0]?.contentType !== 'cover' || plan.slides.at(-1)?.contentType !== 'back-cover') errors.push({code:'structure',message:'Maximum 15 slides including both covers'})
      for(const slide of plan.slides) {
        const slots = slide.slots as Record<string, any>
        if (!slots.source && !['cover', 'back-cover'].includes(slide.contentType)) errors.push({code:'source',slideId:slide.slideId,message:'Evidence reference required'})
        for(const item of slots.bars ?? []) if (!Number.isFinite(Number(item.amount)) || Number(item.amount)<0) errors.push({code:'geometry',slideId:slide.slideId,message:'Bar requires a nonnegative numeric amount'})
      }
      return errors
    }}],
    brand: {packName:'axis-berel-approved', compiledFiles:['board.css','fonts.css','interior-premium.css','charts-premium.css','cover-premium.css','performance-premium.css','evidence-premium.css','editorial-premium.css','iconography.css'],fontsManifestPath:path.join(root,'src/lib/artifact-composer/brand-packs/axis/fonts.json')}
  }
  const result = await composeArtifact(catalog, plan, path.join(here, 'render'))
  const bodies=await Promise.all(plan.slides.map(async slide=> {
    const html=await fs.readFile(path.join(here,'render/html',slide.slideId+'.html'),'utf8')
    const srcdoc=html.replaceAll('&','&amp;').replaceAll('"','&quot;')
    return `<iframe title="${slide.slideId}" srcdoc="${srcdoc}" loading="eager"></iframe>`
  }))
  await fs.writeFile(path.join(here,'BEREL_DIRECTORIO_AGOSTO_2026.html'),`<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><title>Berel · Informe mensual · Agosto 2026</title><style>*{box-sizing:border-box}body{margin:0;background:#e9edf2;display:grid;justify-content:center;gap:24px;padding:24px}iframe{border:0;width:1123px;height:794px;background:white;box-shadow:0 8px 36px #023c7015}@page{size:A4 landscape;margin:0}@media print{body{display:block;padding:0;background:white}iframe{display:block;break-after:page;box-shadow:none;margin:0}}</style></head><body>${bodies.join('')}</body></html>`)
  console.log(JSON.stringify({pages:result.slidePaths.length,pdf:result.pdfPath,warnings:result.warnings}))
}
main().catch(error => { console.error(error); process.exit(1) })
