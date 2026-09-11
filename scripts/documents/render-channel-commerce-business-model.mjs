/**
 * Renderiza el documento interno del modelo de negocio de Channel & Commerce (HTML → PDF A4).
 *
 * La fuente editable es `docs/business-models/channel-commerce/deliverables/channel-commerce-modelo-de-negocio.src.html`.
 * Este script inyecta fuentes y assets oficiales como data URI, agrega encabezado y pie institucional a cada
 * hoja, numera páginas e índice, y falla si alguna hoja desborda su área de contenido.
 *
 *   node scripts/documents/render-channel-commerce-business-model.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

import { chromium } from 'playwright'

const root = process.cwd()
const dir = path.join(root, 'docs/business-models/channel-commerce/deliverables')
const src = path.join(dir, 'channel-commerce-modelo-de-negocio.src.html')
const out = path.join(dir, 'Efeonce-Channel-Commerce-Modelo-de-Negocio.pdf')

const b64 = rel => fs.readFileSync(path.join(root, rel)).toString('base64')
const svgUri = rel => `data:image/svg+xml;base64,${b64(rel)}`

const fonts = [
  ['Geist', 400, 'normal', 'src/assets/fonts/Geist-Regular.ttf'],
  ['Geist', 500, 'normal', 'src/assets/fonts/Geist-Medium.ttf'],
  ['Geist', 600, 'normal', 'src/assets/fonts/Geist-SemiBold.ttf'],
  ['Geist', 700, 'normal', 'src/assets/fonts/Geist-Bold.ttf'],
  ['Poppins', 600, 'normal', 'src/assets/fonts/Poppins-SemiBold.ttf'],
  ['Poppins', 700, 'normal', 'src/assets/fonts/Poppins-Bold.ttf'],
  ['Poppins', 800, 'normal', 'src/assets/fonts/Poppins-ExtraBold.ttf'],
  ['Poppins', 800, 'italic', 'src/assets/fonts/Poppins-ExtraBoldItalic.ttf'],
  ['Poppins', 900, 'italic', 'src/assets/fonts/Poppins-BlackItalic.ttf']
]

const fontCss = fonts
  .map(
    ([family, weight, style, rel]) =>
      `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url(data:font/ttf;base64,${b64(rel)}) format('truetype');}`
  )
  .join('\n')

const assets = {
  LOGO_FULL: svgUri('public/branding/logo-full.svg'),
  LOGO_NEG: svgUri('public/branding/logo-negative.svg'),
  URL_BUBBLE: svgUri('src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg')
}

// Datos de contacto: dueño canónico = slot contactDetails del catálogo deck-axis.
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

      const fontsOk = ['600 12px Poppins', '700 12px Poppins', '400 12px Geist', '600 12px Geist'].every(f =>
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
          hdr.innerHTML = `<img src="${assets.LOGO_FULL}" alt="Efeonce"><div class="r"><b>Channel &amp; Commerce · Modelo de negocio</b>Confidencial · Uso interno</div>`
          sheet.prepend(hdr)
        }

        const ftr = document.createElement('footer')

        ftr.className = 'ftr'
        ftr.innerHTML =
          `<span class="rule"></span>` +
          `<a class="bubble" href="https://efeoncepro.com"><img src="${assets.URL_BUBBLE}" alt="efeoncepro.com"></a>` +
          `<span>${contact.address}</span>` +
          `<a href="${phoneHref}">${contact.chilePhone}</a>` +
          `<span class="pn">${isCover ? '' : `Página ${i + 1} de ${total}`}</span>`
        sheet.append(ftr)
      })

      // Índice: página real de cada destino.
      for (const link of document.querySelectorAll('[data-toc]')) {
        const target = document.getElementById(link.dataset.toc)
        const idx = sheets.indexOf(target?.closest('.sheet'))

        link.parentElement.querySelector('.num').textContent = idx >= 0 ? String(idx + 1) : '??'
      }

      // Guarda de desborde: ninguna hoja puede cortar contenido.
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
