/**
 * Maqueta de la portada de artículo del blog, variante centrada (aprobada el 2026-10-24; pendiente en AXIS).
 * Manual: docs/manual-de-uso/creative/producir-portada-de-articulo-del-blog.md
 * Copia el catálogo manzanitas a un directorio temporal, cambia sólo la x de cabecera, voz y firma
 * (72 → 312 px, el 26 % del ancho, dentro del cuadrado central 285–915) y renderiza 1200×630 con Playwright.
 * ESCALA=2 renderiza a 2400×1260 (entrega final). FIRMA=0 compone sin el logo de Efeonce (decisión del operador del
 * 2026-10-24 para las portadas del blog: la cabecera de Manzanitas identifica la pieza y la marca ya está en la ropa).
 * Uso: node componer-centrada.cjs <plate.png> <linea> <pregunta> <respuesta> <salida.png>
 */
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os')
const repo = path.resolve(__dirname, '../../..')
const req = require('node:module').createRequire(path.join(repo, 'package.json'))
const sharp = req('sharp'); const { chromium } = req('playwright')
const [plate, line, question, answer, out] = process.argv.slice(2)
const X = 312
;(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcm-centrada-'))
  fs.cpSync(path.join(repo, 'src/lib/artifact-composer/catalogs/manzanitas'), tmp, { recursive: true })
  const m = await sharp(plate).metadata()
  const h = Math.round(m.width * 630 / 1200)
  // 16:9 → 1,9:1 quitando la parte de ARRIBA (el lecho queda entero abajo).
  await sharp(plate).extract({ left: 0, top: m.height - h, width: m.width, height: h }).resize(2400, 1260).png().toFile(path.join(tmp, 'foto.png'))
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  let html = fs.readFileSync(path.join(tmp, 'blog-banner.html'), 'utf8')
  html = html.replace(/left: 72px/g, `left: ${X}px`)
    .replace('mcm-line-engine', `mcm-line-${line}`)
    .replace('src="assets/manzanitas-apple-navy-engine.svg"', 'src="foto.png"')
    .replace('manzanitas-logo-negative-engine.svg', `manzanitas-logo-negative-${line}.svg`)
    .replace('¿La pregunta?', esc(question)).replace('>Respuesta<', `>${esc(answer)}<`)
    .replace(/<p class="mcm-sub"[^]*?<\/p>/, '')
  fs.writeFileSync(path.join(tmp, 'centrada.html'), html)
  const browser = await chromium.launch(); const scale = Number(process.env.ESCALA || 1); const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: scale })
  await page.goto('file://' + path.join(tmp, 'centrada.html')); await page.waitForTimeout(500)
  if (process.env.FIRMA === '0') await page.evaluate(() => document.querySelector('.mcm-signature')?.remove())
  const boxes = await page.evaluate(() => Object.fromEntries(['.mcm-masthead', '.mcm-voice', '.mcm-signature', '.mcm-a'].map(s => { const e = document.querySelector(s); if (!e) return [s, null]; const r = e.getBoundingClientRect(); return [s, [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]] })))
  const overflow = await page.evaluate(() => { const a = document.querySelector('.mcm-a [data-slot-field="answer"]'); return a.scrollWidth - a.clientWidth })
  await page.screenshot({ path: out }); await browser.close()
  const crop = out.replace(/\.png$/, '-recorte-movil.png')
  await sharp(out).extract({ left: 285 * scale, top: 0, width: 630 * scale, height: 630 * scale }).toFile(crop)
  console.log(JSON.stringify({ out, crop, boxes, answerOverflowPx: overflow, cuadrado: [285, 915] }))
})().catch(e => { console.error(e); process.exit(1) })
