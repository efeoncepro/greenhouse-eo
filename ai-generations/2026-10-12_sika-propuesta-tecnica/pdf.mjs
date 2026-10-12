// Arma el PDF 16:9 de la propuesta técnica desde out/png/NN.png (JPEG por lámina, 2880×1620).
// Uso: node pdf.mjs <salida.pdf>
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import fs from 'node:fs'
const out = process.argv[2]
const files = fs.readdirSync('out/png').filter(f => /^\d\d\.png$/.test(f)).sort()
const pdf = await PDFDocument.create()
pdf.setTitle('Efeonce · Propuesta técnica · Sika Mexicana · Wherex N.º 1164'); pdf.setAuthor('Efeonce Creative Studio'); pdf.setLanguage('es')
for (const f of files) {
  const jpg = await sharp('out/png/' + f).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer()
  const img = await pdf.embedJpg(jpg); const p = pdf.addPage([1920, 1080]); p.drawImage(img, { x: 0, y: 0, width: 1920, height: 1080 })
}
fs.writeFileSync(out, await pdf.save()); console.log(files.length, 'páginas', fs.statSync(out).size, 'bytes')
