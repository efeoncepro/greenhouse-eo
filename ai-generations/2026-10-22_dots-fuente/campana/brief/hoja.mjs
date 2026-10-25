// Hoja de contacto con rótulo por celda. Uso: node hoja.mjs <salida.png> <columnas> <celda_px> <lista.txt>
// lista.txt: una línea por imagen, "ruta|rótulo". Fondo claro, imagen contenida en la celda.
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import fs from 'node:fs'

const [out, colsArg, cellArg, lista, titulo = ''] = process.argv.slice(2)
const cols = Number(colsArg), cell = Number(cellArg), labelH = 44, pad = 12, head = titulo ? 70 : 0
const items = fs.readFileSync(lista, 'utf8').split('\n').filter(Boolean).map((l) => { const [p, ...r] = l.split('|'); return { p, label: r.join('|') || p.split('/').pop() } })
const rows = Math.ceil(items.length / cols)
const W = cols * (cell + pad) + pad, H = head + rows * (cell + labelH + pad) + pad
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const comps = []
for (const [i, it] of items.entries()) {
  const x = pad + (i % cols) * (cell + pad), y = head + pad + Math.floor(i / cols) * (cell + labelH + pad)
  const img = await sharp(it.p).flatten({ background: '#ecebe8' }).resize(cell, cell, { fit: 'contain', background: '#ecebe8' }).png().toBuffer()
  comps.push({ input: img, left: x, top: y })
  const lbl = `<svg width="${cell}" height="${labelH}"><text x="2" y="18" font-family="Helvetica" font-size="15" fill="#1d2127">${esc(it.label.slice(0, 60))}</text><text x="2" y="38" font-family="Helvetica" font-size="15" fill="#1d2127">${esc(it.label.slice(60, 120))}</text></svg>`
  comps.push({ input: Buffer.from(lbl), left: x, top: y + cell })
}
if (titulo) comps.push({ input: Buffer.from(`<svg width="${W}" height="${head}"><text x="${pad}" y="46" font-family="Helvetica" font-weight="bold" font-size="30" fill="#1d2127">${esc(titulo)}</text></svg>`), left: 0, top: 0 })
await sharp({ create: { width: W, height: H, channels: 3, background: '#fafaf8' } }).composite(comps).png().toFile(out)
console.log(out, W, H, items.length)
