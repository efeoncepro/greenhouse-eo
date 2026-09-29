// PDF de la propuesta Salesforce (orden narrativo aprobado). Con badge Salesforce Partner por defecto (autorizado por
// Salesforce, declarado por el operador 2026-09-29); SIN_BADGE=1 genera la variante sin badge.
import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
const O = 'ai-generations/2026-09-29_deck-salesforce/out/'
const SB = process.env.SIN_BADGE === '1' ? '-sin-badge' : ''
// DOC=brochure: portada de brochure y cierre de brochure (SF20, close-brochure orbit); por defecto, propuesta.
const BRO = process.env.DOC === 'brochure'
const order = [BRO ? `SF0-portada${SB}` : `SF0-portada${SB}-propuesta`, 'SF6-propuesta-cine', 'SF1-una-operacion', 'SF4-el-que-encaje', 'SF3-engagement-next',
  'SF8-servicios', 'SF9-dreamforce-2026', 'SF2-agentes-supervisor', 'SF18-supervision-vivo', 'SF16-crm-en-claude',
  'SF12-data-consentimiento', 'SF13-migracion', 'SF5-diagnostico-decision', 'SF10-equipo-hibrido', 'SF14-dia-a-dia',
  'SF15-adopcion-loom', 'SF11-operacion', 'SF17-que-medimos', BRO ? 'SF20-contraportada-brochure' : `SF19-contraportada${SB}`]
const pages = []
for (const id of order) {
  const buf = await sharp(O + id + '.png').jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer()
  pages.push(`<div class="p"><img src="data:image/jpeg;base64,${buf.toString('base64')}"></div>`)
}
const html = `<html><head><style>@page{size:1920px 1080px;margin:0}html,body{margin:0}.p{width:1920px;height:1080px;page-break-after:always;overflow:hidden}.p:last-child{page-break-after:auto}img{width:1920px;height:1080px;display:block}</style></head><body>${pages.join('')}</body></html>`
const br = await chromium.launch({ channel: 'chrome' }); const pg = await br.newPage()
await pg.setContent(html, { waitUntil: 'load' })
const out = O + `Efeonce-${BRO ? 'Brochure' : 'Propuesta'}-Servicios-Salesforce${SB}.pdf`
await pg.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true })
await br.close(); console.log('ok', out, order.length, 'páginas')
