/**
 * Renderiza el manual de la línea gráfica de Efeonce («La órbita», V1) como PDF A4.
 *
 * Fuente editable: `docs/operations/brand-graphic-line/deliverables/linea-grafica-efeonce.src.html`.
 * Contrato: `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` y el estándar
 * `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` (membrete, pie en todas las hojas, A4).
 * Las láminas del anexo salen de las capturas del canvas en
 * `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/canvas/laminas-full/` (locales, no versionadas).
 *
 *   node scripts/documents/render-efeonce-graphic-line.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import sharp from 'sharp'
import { chromium } from 'playwright'

const root = process.cwd()
const dir = path.join(root, 'docs/operations/brand-graphic-line/deliverables')
const src = path.join(dir, 'linea-grafica-efeonce.src.html')
const out = path.join(dir, 'Efeonce-Linea-Grafica-La-Orbita-V1.pdf')
const expl = path.join(root, 'ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/canvas')
const laminas = path.join(expl, 'laminas-full')

const b64 = p => fs.readFileSync(path.isAbsolute(p) ? p : path.join(root, p)).toString('base64')
const svgUri = rel => `data:image/svg+xml;base64,${b64(rel)}`

const lightFont = path.join(os.homedir(), 'Library/Fonts/Poppins-Light.ttf')

const fonts = [
  ['Poppins', '300', 'normal', fs.existsSync(lightFont) ? lightFont : 'src/assets/fonts/Poppins-Regular.ttf'],
  ['Poppins', '400', 'normal', 'src/assets/fonts/Poppins-Regular.ttf'],
  ['Poppins', '500', 'normal', 'src/assets/fonts/Poppins-Medium.ttf'],
  ['Poppins', '600', 'normal', 'src/assets/fonts/Poppins-SemiBold.ttf'],
  ['Poppins', '700', 'normal', 'src/assets/fonts/Poppins-Bold.ttf'],
  ['Bricolage Grotesque', '200 800', 'normal', 'src/assets/fonts/BricolageGrotesque-Variable.ttf']
]

const fontCss = fonts
  .map(
    ([family, weight, style, p]) =>
      `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url(data:font/ttf;base64,${b64(p)}) format('truetype');}`
  )
  .join('\n')

// Recorta una región de una lámina (coordenadas del canvas, 1600 px de ancho) y la entrega como data URI.
const fig = async (file, y0, y1) => {
  const img = sharp(path.join(laminas, file))
  const { width } = await img.metadata()
  const k = width / 1600

  const buf = await img
    .extract({ left: 0, top: Math.round(y0 * k), width, height: Math.round((y1 - y0) * k) })
    .resize(1600)
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// Anexo: una lámina por hoja, en el orden de lectura del canvas.
const canvas = JSON.parse(
  fs.readFileSync(
    path.join(root, 'ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/canvas/project/canvas.json'),
    'utf8'
  )
)

const annex = []

for (const [i, f] of canvas.order.entries()) {
  const file = f.replace('.dc.html', '.jpg')
  const buf = await sharp(path.join(laminas, file)).resize(1500).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
  const title = canvas.boards[f].title

  annex.push(
    `<section class="sheet lam"${i === 0 ? ' id="anexo"' : ''}><div class="body"><div class="ttl">Anexo · ${esc(title)}</div>` +
      `<div class="frame"><img src="data:image/jpeg;base64,${buf.toString('base64')}" alt="Lámina ${esc(title)}"></div></div></section>`
  )
}

const assets = {
  LOGO_FULL: svgUri('public/branding/logo-full.svg'),
  LOGO_NEG: svgUri('public/branding/logo-negative.svg'),
  // Burbuja con la fusión de luminosidad horneada (fórmula W3C): clara #848484 y sobre navy #6F89A2.
  URL_BUBBLE: svgUri('docs/operations/brand-graphic-line/deliverables/assets/url-lum-light.svg'),
  URL_BUBBLE_DARK: svgUri('docs/operations/brand-graphic-line/deliverables/assets/url-lum-dark.svg'),
  LOCK_NEG: `data:image/png;base64,${b64(path.join(expl, 'assets/lockup-claim-neg.png'))}`,
  FIG_FAMILIA: await fig('O-03-orbita-familia.jpg', 250, 1100),
  FIG_BANCO: await fig('O-08-orbita-fotografia.jpg', 670, 925),
  FIG_ISOTIPO: await fig('D-05-isotipo.jpg', 280, 880),
  FIG_OBJETOS: await fig('M-01-merch-foto-llevar.jpg', 280, 640),
  FIG_BIENVENIDA: await fig('M-02-merch-foto-identificarse.jpg', 280, 1140),
  FIG_OFICINA: await fig('M-04-oficina-foto.jpg', 262, 1560),
  FIG_SINO: await fig('D-03-elementos-si-no.jpg', 280, 960),
  ANNEX: annex.join('\n')
}

// Contacto: dueño canónico = slot contactDetails del catálogo deck-axis (ver estándar de informes).
const slots = JSON.parse(
  fs.readFileSync(path.join(root, 'src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json'), 'utf8')
)

const contact = slots.slots.contactDetails.value

let html = fs.readFileSync(src, 'utf8').replace('{{FONTS}}', fontCss)

for (const [key, value] of Object.entries(assets)) html = html.split(`{{${key}}}`).join(value)

const browser = await chromium.launch()

try {
  const page = await browser.newPage()

  await page.setContent(html, { waitUntil: 'load' })
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })

  const report = await page.evaluate(
    async ({ assets, contact }) => {
      await document.fonts.ready

      const fontsOk = ['300 12px Poppins', '600 12px Poppins', '700 12px "Bricolage Grotesque"'].every(f =>
        document.fonts.check(f)
      )

      const sheets = [...document.querySelectorAll('.sheet')]
      const total = sheets.length
      const phoneHref = `tel:${contact.chilePhone.replace(/[^+\d]/g, '')}`

      sheets.forEach((sheet, i) => {
        const isCover = sheet.dataset.cover === '1'
        const isBack = sheet.dataset.back === '1'

        if (!isCover && !isBack) {
          const hdr = document.createElement('header')

          hdr.className = 'hdr'
          hdr.innerHTML = `<img src="${assets.LOGO_FULL}" alt="Efeonce"><div class="r"><b>La órbita · Línea gráfica Efeonce</b>Confidencial · Uso interno</div>`
          sheet.prepend(hdr)
        }

        const ftr = document.createElement('footer')

        ftr.className = 'ftr'
        ftr.innerHTML =
          `<span class="rule"></span>` +
          `<a class="bubble" href="https://efeoncepro.com"><img src="${isCover || isBack ? assets.URL_BUBBLE_DARK : assets.URL_BUBBLE}" alt="efeoncepro.com"></a>` +
          `<span>${contact.address}</span>` +
          `<a href="${phoneHref}">${contact.chilePhone}</a>` +
          `<span class="pn">${isCover || isBack ? '' : `Página ${i + 1} de ${total}`}</span>`
        sheet.append(ftr)
      })

      for (const link of document.querySelectorAll('[data-toc]')) {
        const target = document.getElementById(link.dataset.toc)
        const idx = sheets.indexOf(target?.closest('.sheet'))

        link.parentElement.querySelector('.num').textContent = idx >= 0 ? String(idx + 1) : '??'
      }

      // Las imágenes deben estar decodificadas antes de medir: sin alto, una hoja desbordada pasa por buena.
      await Promise.all([...document.images].map(img => img.decode().catch(() => null)))

      const overflow = []

      sheets.forEach((sheet, i) => {
        const body = sheet.querySelector('.body')

        if (!body) return
        const dy = body.scrollHeight - body.clientHeight
        const dx = body.scrollWidth - body.clientWidth

        if (dy > 1 || dx > 1) overflow.push({ page: i + 1, dy, dx })
      })

      const images = [...document.images].map(img => ({ ok: img.complete && img.naturalWidth > 0, alt: img.alt }))

      return { total, fontsOk, overflow, brokenImages: images.filter(i => !i.ok).length }
    },
    { assets, contact }
  )

  console.log(JSON.stringify(report))
  if (!report.fontsOk) throw new Error('Fuentes de marca no cargaron')
  if (report.brokenImages) throw new Error(`${report.brokenImages} imágenes rotas`)

  const tmp = `${out}.tmp`

  await page.pdf({ path: tmp, preferCSSPageSize: true, printBackground: true, outline: true, tagged: true })
  fs.renameSync(tmp, out)
  console.log(`✓ ${path.relative(root, out)} · ${(fs.statSync(out).size / 1024).toFixed(0)} KB`)

  if (report.overflow.length) {
    console.error('✗ Desborde:', JSON.stringify(report.overflow))
    process.exitCode = 2
  }
} finally {
  await browser.close()
}
