// Vista previa local de las láminas del canvas (sustituye los blobs por los archivos fuente) y hojas de contacto.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-10_propuesta-sky-social-care'
const PROJ = path.join(ROOT, 'canvas/project')
const OUT = process.argv[2]
const only = process.argv.slice(3)
const A = f => 'file://' + path.join(ROOT, 'assets', f)
const BLOBS = {
  a7bde70c6e07b8783a9401be4139c49c: A('url-burbuja.svg'), f2aa62aa738c981679016e0e5e991b7d: A('contraportada.jpg'),
  '984f07456836005bc64abe27c186d49f': A('foto-social-care.jpg'), '4e6c979a9d08213a960bd200f548c5d8': A('foto-contener.jpg'),
  ab4a87daa9a163e16eddb8e0812c47df: A('foto-medicion.jpg'), e8662dc4c9319f860d6aaf8e28332427: A('foto-empezar.jpg'),
  '0a92afefe7607e1a904f8f870cf43362': A('foto-en-vivo.jpg'), '9e6271db2ae922a961ed059caad49b2c': A('escalera-agentes.jpg'),
  '8696058c54dc286871b31e5cc8fe3032': A('spark-brand.png'), '857479f09a2f93dc464ef7622baf669b': A('ico-comentario.svg'),
  '446e253ad8cd7d7b9c57ab6ebf6b8de9': A('ico-lapiz.svg'), df8b8d138dad35c412262ec44f066a13: A('ico-cursor.svg'),
  acca95370f359c1227c5c0986dc77152: A('ico-corazon.svg'), a25241b8ddd3f226dab8030adf457ce4: A('ico-carpeta.svg'),
  acd0ddeb3d5baa47590ff6502de5d8d3: A('ico-rayo.svg'), '09487c5abd4946d931c07a0decfb0a06': A('ico-trofeo.svg'),
  '6731acbc32bc0b802f329cd0aa8c5184': A('ico-conversacion.svg'), c91e7ad4e68550af23ce720fbe3a25b0: A('ico-audifonos.svg'),
  e9547c547b375d09dace5e9b2dc2d975: A('ico-megafono.svg'), '174bad56a37c6c2c88e3038a674b99a7': A('ico-busqueda.svg'),
  '69856ec99e80ac79aa49f6b7bc76a973': A('ico-telefono.svg'), fd60f44822d879a2d1ea1becdc005370: A('ico-idea.svg'),
  '09b92728c6aa9bb9a5baf6eac5089a89': A('ico-estrella.svg'), db931e069d8b0aceb52ffe157278916d: A('red-instagram.svg'),
  '556555665fe4ec5df51fffe38cba039b': A('red-facebook.svg'), e263d9f4ba54b0e506a4e86bf09d8d20: A('red-tiktok.svg'),
  '029e746d5bc40ded16a44702c566c265': A('red-linkedin.svg'), '9f0c81e4cfdc5ed01979b017af5d7c5f': A('red-x.svg'),
  '5c618b50edd135b41e816773f85d1827': A('foto-campanas-equipo.jpg'), '15c6475008940df398a85bd975fc704b': A('foto-campanas-accion.jpg'), '4f0e8c0bf111e2911a29827f7458f234': A('foto-campanas-mismo-punto.jpg'), '0a55139651dbb9d1b8fcf43fcd89f7a8': A('sky-on-dark.svg'),
  d4e8828cd04c6ffb7f9fb4f348889be7: A('sparks/spark-investigacion-01-heroe.png'), '9c504f3a6656923e74648dbfa53a1dc9': A('sparks/spark-servicio-01-heroe.png'),
  '503823171b96284f634ef670092872d3': A('insights/efeonce-logo-negative-inline.svg'), ad9b07614674548d6a8179314a25daca: A('insights/efeonce-logo-positive-inline.svg'),
  '4284342dc6ba10089960a3c528b87930': A('mascotas/codex.png'), '39a5c56c082173eef7e2b78d317b4774': A('mascotas/clawd.png'), '1b0af1c192ef6fe4b85fa06a4861be7c': A('mascotas/gigi.png'),
  '8b93bc5ae9eaaf4505bb1282c221b555': A('isotipos/chatgpt.svg'), '2836b667c49049cb7897ceaa1d4bca6d': A('isotipos/claude.svg'), df0dadae560ee15325eceb0b17ac47b2: A('isotipos/gemini.svg'),
  '6426e902e1cd4e6b6afd45b6e56279c4': A('isotipos/microsoft-copilot.png'), '53ccc81e0d50f2b7d56710291bfea5b9': A('isotipos/sprout-social-recorte.png'), dd83a96a7f7b831c24c9e080e6ded8e0: A('insights/insights-isotype-positive.svg'), e049b1b50443f77efc55c5b616513462: A('insights/insights-isotype-negative.svg'),
  ea442590e8eb589de204ec7288963c31: A('insights/insights-lockup-negative.svg'), '3bfa2f0635523b3b044aed391a64c745': A('insights/efeonce-logo-negative.svg'),
  ec766f85e15932a74482f855661cac61: A('insights/efeonce-logo-positive.svg'), cbdda01a58239fbcb86b97a7fe3a1e35: A('insights/url-bubble-baked-light.svg'),
}
const portada = fs.readdirSync(path.join(ROOT, 'out/P01')).find(f => /\.(png|jpg)$/.test(f))
BLOBS['4ae4060d93b325e0bc79ee178961533b'] = 'file://' + path.join(ROOT, 'out/P01', portada)
BLOBS['eb6cdd3ef5eacc1127800f96efda6d6c'] = A('portada-equipo-hibrido.png')
for (const f of fs.readdirSync(path.join(ROOT, 'assets'))) BLOBS['local:' + f] = A(f)

const canvas = JSON.parse(fs.readFileSync(path.join(PROJ, 'canvas.json'), 'utf8'))
fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const shots = []
// PDF_OUT=<archivo.pdf>: además de las capturas, arma un solo PDF vectorial con las láminas del deck, en el orden del canvas.
const PDF_OUT = process.env.PDF_OUT
const pdfPages = []
let n = 0
for (const file of canvas.order) {
  n += 1
  const b = canvas.boards[file]
  const tag = String(n).padStart(2, '0')
  const png = path.join(OUT, `${tag}-${file.replace('.dc.html', '')}.png`)
  shots.push({ png, title: b.title, w: b.w, h: b.h })
  if (only.length && !only.some(o => file.includes(o))) continue
  let src = fs.readFileSync(path.join(PROJ, file), 'utf8')
  let body = src.slice(src.indexOf('<x-dc>') + 6, src.indexOf('</x-dc>')).replace(/<\/?helmet>/g, '')
  const missing = new Set()
  body = body.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => BLOBS[id] ?? (missing.add(id), m))
  if (missing.size) console.log('sin archivo local:', file, [...missing].join(','))
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${body}</body></html>`
  const tmp = path.join(OUT, `_${tag}.html`)
  fs.writeFileSync(tmp, html)
  const page = await browser.newPage({ viewport: { width: b.w, height: b.h } })
  await page.goto('file://' + tmp)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  await page.screenshot({ path: png })
  if (PDF_OUT && (!b.page || b.page === 'propuesta') && b.w === 1920) {
    await page.emulateMedia({ media: 'screen' })
    await page.addStyleTag({ content: '@page{size:1920px 1080px;margin:0} html,body{width:1920px;height:1080px;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact}' })
    pdfPages.push(await page.pdf({ width: '1920px', height: '1080px', printBackground: true, pageRanges: '1' }))
  }
  await page.close()
  fs.unlinkSync(tmp)
}
if (PDF_OUT && pdfPages.length) {
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  for (const buf of pdfPages) {
    const src = await PDFDocument.load(buf)
    const [pg] = await doc.copyPages(src, [0])
    doc.addPage(pg)
  }
  doc.setTitle('Propuesta de social care 2027 para SKY Airline')
  doc.setAuthor('Efeonce')
  doc.setSubject('Social care 2027')
  fs.writeFileSync(PDF_OUT, await doc.save())
  console.log('pdf', PDF_OUT, pdfPages.length, 'páginas')
}
// hojas de contacto (sólo láminas 1920×1080)
const deck = shots.filter(s => s.w === 1920)
const per = 12
for (let i = 0; i < deck.length; i += per) {
  const group = deck.slice(i, i + per)
  const cells = group.map(s => `<figure style="margin:0"><img src="file://${s.png}" style="width:620px;display:block"><figcaption style="font:13px sans-serif;color:#fff;padding:4px 0 10px">${s.title}</figcaption></figure>`).join('')
  const html = `<body style="margin:0;background:#222;padding:12px"><div style="display:grid;grid-template-columns:repeat(3,620px);gap:12px">${cells}</div></body>`
  const tmp = path.join(OUT, '_sheet.html')
  fs.writeFileSync(tmp, html)
  const page = await browser.newPage({ viewport: { width: 1908, height: 1560 } })
  await page.goto('file://' + tmp)
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(OUT, `hoja-${String(i / per + 1).padStart(2, '0')}.png`), fullPage: true })
  await page.close()
  fs.unlinkSync(tmp)
}
await browser.close()
console.log('listo', shots.length)
