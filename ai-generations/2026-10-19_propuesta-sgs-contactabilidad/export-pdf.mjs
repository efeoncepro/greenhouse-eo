// Exporta el deck a un PDF 16:9 (texto vectorial): una página por lámina, en el orden de boards.json.
// Uso: node export-pdf.mjs <project> <salida.pdf>
import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'
const HERE = path.dirname(new URL(import.meta.url).pathname)
const [dir, out] = process.argv.slice(2)
const src = fs.readFileSync(`${HERE}/render-shots.mjs`, 'utf8')
const local = eval('(' + src.match(/const local = (\{[\s\S]*?\})\n/)[1].replace(/\$\{HERE\}/g, HERE).replace(/\$\{ASSETS\}/g, '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets').replace(/`/g, "'") + ')')
const blobs = JSON.parse(fs.readFileSync(`${HERE}/blobs.json`, 'utf8'))
const map = Object.fromEntries(Object.entries(blobs).map(([k, v]) => [v, `file://${local[k]}`]))
const order = JSON.parse(fs.readFileSync(`${HERE}/boards.json`, 'utf8')).order
const tmp = fs.mkdtempSync(path.join(path.dirname(out), '.pdf-'))
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const parts = []
for (const [i, f] of order.entries()) {
  let h = fs.readFileSync(`${dir}/${f}`, 'utf8').replace('<script src="./support.js"></script>', '').replace(/<\/?helmet>/g, '').replace(/<\/?x-dc>/g, '')
  h = h.replace(/\/_blob\/[0-9a-f]{32}/g, m => { if (!map[m]) throw new Error(`blob sin archivo local: ${m} en ${f}`); return map[m] })
  h = h.replace('</head>', '<style>@page{size:1920px 1080px;margin:0}html,body{margin:0}</style></head>')
  fs.writeFileSync(`${tmp}/_t.html`, h); await p.goto(`file://${tmp}/_t.html`, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready)
  const part = `${tmp}/${String(i).padStart(2, '0')}.pdf`
  await p.pdf({ path: part, width: '1920px', height: '1080px', printBackground: true, pageRanges: '1' }); parts.push(part)
}
await b.close()
execFileSync('pdfunite', [...parts, out]); fs.rmSync(tmp, { recursive: true })
console.log(out, parts.length, 'páginas')
