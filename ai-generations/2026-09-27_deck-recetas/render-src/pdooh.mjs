import { lensRecipe } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { writeFileSync, mkdirSync } from 'node:fs'
const P = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_ooh-caminero-lente/plates/'
mkdirSync('out-pdooh', { recursive: true })
const src = async (f, w, h) => 'data:image/jpeg;base64,' + (await sharp(P + f).resize(w, h).jpeg({ quality: 92 }).toBuffer()).toString('base64')
const pieces = {
  mupi: lensRecipe('story', { photoId: 'd1', photoSrc: await src('D1-mupi-rodaje-en-vivo.png', 1080, 1920), alt: 'Operador de cámara mira el monitor en vivo', question: '¿Cómo va?', answer: 'En vivo', idPrefix: 'pd-mupi' }),
  led: lensRecipe('wall', { photoId: 'd2', photoSrc: await src('D3-led-medicion-mira-izquierda.png', 1920, 1080), alt: 'Analista señala la curva que sube', answer: 'Siempre', idPrefix: 'pd-led' })
}
const b = await chromium.launch({ channel: 'chrome' })
for (const [k, r] of Object.entries(pieces)) {
  const p = await b.newPage({ viewport: { width: r.width, height: r.height } })
  await p.setContent(`<html><body style="margin:0">${r.svg}</body></html>`, { waitUntil: 'load' })
  await p.screenshot({ path: `out-pdooh/${k}-fondo.png` })
  await sharp(`out-pdooh/${k}-fondo.png`).jpeg({ quality: 88 }).toFile(`out-pdooh/${k}-fondo.jpg`)
  console.log(k, r.width, r.height, 'accent', r.accent, JSON.stringify(r.circle), JSON.stringify(r.texts.map(t => ({ role: t.role, fontPx: t.fontPx, box: t.box }))))
}
await b.close()
writeFileSync('out-pdooh/recipes.json', JSON.stringify(Object.fromEntries(Object.entries(pieces).map(([k, r]) => [k, { circle: r.circle, texts: r.texts, accent: r.accent }])), null, 2))
