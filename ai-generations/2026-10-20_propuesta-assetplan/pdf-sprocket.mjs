// Rearma el PDF de la propuesta: páginas vectoriales del compositor, salvo la 4 (alcance), que lleva
// las capas de HubSpot de OVERLAYS (sprocket 3D en la 4 y la insignia Gold en la 6).
import fs from 'node:fs'
import sharp from 'sharp'
import { PDFDocument, PDFName, PDFString } from 'pdf-lib'
const R = 'ai-generations/2026-10-20_propuesta-assetplan'
const keys = ['A01-portada','A02-necesidad','A04-alcance','A035-crm-completo','A036-integraciones','A037-desarrollo','A038-ejecucion','A039-agente-dudas','A0395-enablement-ia','A0396-capacitacion','A05-dia-a-dia','A055-vivelo-sprint','A057-vivelo-consola','A058-primeros-30','A06-ciclo','A059-seguridad','A07-por-que','A075-caso-anam','A076-caso-ssilva','A078-inversion-cotizacion','A08-pasos','A09-contraportada']
// Capas sobre la lámina compuesta: sprocket 3D (autorizado 2026-10-14) y la insignia Gold (readback 2026-10-06).
const OVERLAYS = {
  'A04-alcance': { suffix: 'sprocket', left: 1410, top: 470, make: () => sharp('ai-generations/2026-10-06_deck-hubspot/png/sprocket-3d-flotando-800.png').resize(380, 380).png().toBuffer() },
  'A09-contraportada': { suffix: 'badge', left: 140, top: 856, make: () => sharp('src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/hubspot-solutions-partner-gold-light.svg', { density: 300 }).resize(160, 159).png().toBuffer() },
  'A059-seguridad': { suffix: 'logo', left: 1447, top: 195, make: () => sharp('node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-positive.svg', { density: 300 }).resize(106, 25).png().toBuffer() },
  'A07-por-que': { suffix: 'badge', left: 140, top: 220, make: () => sharp('src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/hubspot-solutions-partner-gold-light.svg', { density: 300 }).resize(180, 179).png().toBuffer() },
}
// Láminas que van como imagen aprobada de otro documento (no se recomponen): el caso ANAM del brochure Efeonce 360°.
const RASTER = { 'A075-caso-anam': 'ai-generations/2026-10-12_brochure-efeonce-360/laminas-v9/62-ANM-revenue-caso-anam-tiempo.jpg' }
const out = await PDFDocument.create()
out.setTitle('Efeonce · Propuesta Operación HubSpot · Assetplan'); out.setAuthor('Efeonce Group'); out.setCreator('Efeonce')
for (const k of keys) {
  const dir = `${R}/out/${k}`
  const pdfFile = fs.readdirSync(dir).find(f => /^01-.*\.pdf$/.test(f))
  const overlay = OVERLAYS[k]
  if (RASTER[k]) {
    const img = await out.embedJpg(fs.readFileSync(RASTER[k]))
    const src = await PDFDocument.load(fs.readFileSync(`${dir}/${pdfFile}`))
    const { width, height } = src.getPage(0).getSize()
    out.addPage([width, height]).drawImage(img, { x: 0, y: 0, width, height })
  } else if (overlay) {
    const layer = await overlay.make()
    const png = await sharp(`${dir}/${fs.readdirSync(dir).find(f => /^01-.*\.png$/.test(f))}`).resize(1920, 1080, { fit: 'fill' }).composite([{ input: layer, left: overlay.left, top: overlay.top }]).png().toBuffer()
    fs.writeFileSync(`${R}/png/${k}-${overlay.suffix}.png`, png)
    const img = await out.embedPng(png)
    const src = await PDFDocument.load(fs.readFileSync(`${dir}/${pdfFile}`))
    const { width, height } = src.getPage(0).getSize()
    out.addPage([width, height]).drawImage(img, { x: 0, y: 0, width, height })
  } else {
    const src = await PDFDocument.load(fs.readFileSync(`${dir}/${pdfFile}`))
    const [p] = await out.copyPages(src, [0]); out.addPage(p)
  }
}
// Enlaces clicables (pedido del operador, 2026-10-20): la tarjeta de agenda y su botón llevan a efeoncepro.com/agenda.
// Cajas en px del lienzo 1920×1080; se escalan al tamaño real de la página (origen PDF abajo a la izquierda).
const LINKS = { 'A08-pasos': [{ url: 'https://efeoncepro.com/agenda/', box: [900, 310, 1580, 770] }] }
for (const [k, links] of Object.entries(LINKS)) {
  const page = out.getPage(keys.indexOf(k))
  const { width, height } = page.getSize()
  const sx = width / 1920, sy = height / 1080
  for (const { url, box: [x0, y0, x1, y1] } of links) {
    const annot = out.context.obj({
      Type: 'Annot', Subtype: 'Link', Border: [0, 0, 0],
      Rect: [x0 * sx, height - y1 * sy, x1 * sx, height - y0 * sy],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) }
    })
    const ref = out.context.register(annot)
    const annots = page.node.lookup(PDFName.of('Annots'))
    if (annots) annots.push(ref); else page.node.set(PDFName.of('Annots'), out.context.obj([ref]))
  }
}
fs.writeFileSync(`${R}/Efeonce-Propuesta-Assetplan-Operacion-HubSpot.pdf`, await out.save())
console.log('ok', out.getPageCount())
