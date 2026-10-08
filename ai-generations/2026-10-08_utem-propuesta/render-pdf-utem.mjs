// Renderiza las láminas del canvas en el orden del índice y arma el PDF 16:9 con las imágenes locales (blobs.json).
// Uso: node render-pdf-utem.mjs <carpeta project del canvas> <salida.pdf>
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
const [dir, out] = process.argv.slice(2)
const map = JSON.parse(fs.readFileSync(new URL('./blobs.json', import.meta.url)))
const order = JSON.parse(fs.readFileSync(path.join(dir, 'canvas.json'))).order
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const pdf = await PDFDocument.create()
for (const f of order) {
  let html = fs.readFileSync(path.join(dir, f), 'utf8').replace('<script src="./support.js"></script>', '').replace(/<\/?helmet>/g, '')
  html = html.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => { if (!map[id]) throw new Error('falta ' + id + ' en ' + f); return 'file://' + map[id] })
  const tmp = path.join(dir, '..', '_render.html'); fs.writeFileSync(tmp, html)
  await p.goto('file://' + tmp, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  const buf = await p.screenshot({ type: 'jpeg', quality: 90 })
  const j = await pdf.embedJpg(buf); const pg = pdf.addPage([960, 540]); pg.drawImage(j, { x: 0, y: 0, width: 960, height: 540 })
}
pdf.setTitle('UTEM · Propuesta técnica SEO, GEO y AEO'); pdf.setAuthor('Efeonce')
fs.writeFileSync(out, await pdf.save()); await b.close(); console.log('láminas', order.length)
