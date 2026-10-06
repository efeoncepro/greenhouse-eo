// Arma el PDF del brochure HubSpot desde las láminas aprobadas en el canvas (mismo sha256), en su orden.
// La portada lleva la insignia Gold (readback 2026-10-06). El sprocket 3D no va: uso interno hasta aprobación de HubSpot.
import fs from 'node:fs'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'

const [filesJson, out] = process.argv.slice(2)
const files = JSON.parse(fs.readFileSync(filesJson, 'utf8'))
const ORDER = ['B01-portada','B02-propuesta','B04-encaje','B03-uno','B19-crm-solo','B05-servicios','B20-datos','B21-integraciones',
  'B09-migracion','B22-automatizacion','B06-agentes','B07-aprobacion','B17-licencias','B18-creditos','B24-ley','B23-seguridad',
  'B25-residencia','B08-permiso','B26-salida','B10-evaluacion','B12-dia-a-dia','B13-adopcion','B14-operacion','B15-medicion',
  'B29-caso-anam','B28-clientes','B16-contraportada']

const pdf = await PDFDocument.create()
pdf.setTitle('Efeonce · Servicios HubSpot')
pdf.setAuthor('Efeonce Group')
pdf.setSubject('Brochure de servicios HubSpot 2026')
pdf.setCreator('Efeonce')

for (const key of ORDER) {
  let img = sharp(files[key]).resize(1920, 1080, { fit: 'fill' })
  if (key === 'B01-portada') {
    const badge = await sharp(files.BADGE).resize(160, 159, { fit: 'fill' }).png().toBuffer()
    img = sharp(await img.png().toBuffer()).composite([{ input: badge, left: 140, top: 856 }])
  }
  const jpg = await img.jpeg({ quality: 88, chromaSubsampling: '4:4:4' }).toBuffer()
  const embedded = await pdf.embedJpg(jpg)
  const page = pdf.addPage([960, 540])
  page.drawImage(embedded, { x: 0, y: 0, width: 960, height: 540 })
}
fs.writeFileSync(out, await pdf.save())
console.log('páginas', ORDER.length, '→', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB')
