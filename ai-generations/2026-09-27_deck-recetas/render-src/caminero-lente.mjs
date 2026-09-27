// Caminero 12 × 4 m con la lente de la línea gráfica, pintada por @efeoncepro/axis-graphic-line (no a mano).
// 3:1 no es una pieza medida del canvas (pieces.lens no la tiene): la geometría la resuelve el contrato desde los tokens.
import { composeGraphicLine, textCrossesRing } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const OUT = new URL('./out-lente/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const W = 3000, H = 1000
const photo = 'data:image/webp;base64,' + readFileSync('/Users/jreye/Documents/axis-design-system/apps/lab/public/media/graphic-line/assets/L5-cenital-informe.webp').toString('base64')
const intent = { canvas: { width: W, height: H, line: 'growth', surface: 'dark', channel: 'print' }, elements: [
  { kind: 'lens', id: 'lens', photoId: 'l5', alt: 'Vista cenital de un informe impreso con la línea que sube', region: 'center-end', accentSphere: 'upper-start' }
] }
const res = composeGraphicLine(intent, { photos: { l5: photo }, background: true, idPrefix: 'caminero' })
const circle = res.circles?.lens
console.log('circle', JSON.stringify(circle), 'keys', Object.keys(res))

// Columna de texto como la receta (place): margen = 9 % del lado corto; aire = r × ringAirRatio + margen / 2.
const margin = Math.min(W, H) * GL.signature.marginOfShortSide
const ring = { ...circle, r: circle.r * (1 + GL.orbit.ringAirRatio) }
const air = ring.r * GL.orbit.ringAirRatio + margin * 0.5
const colW = ring.cx - ring.r - air - margin
writeFileSync(OUT + 'geometry.json', JSON.stringify({ circle, ring, margin, air, colW }, null, 2))

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: W, height: H } })
await page.setContent(`<html><body style="margin:0;background:${GL.color.dark}">${res.svg}</body></html>`, { waitUntil: 'load' })
await page.screenshot({ path: OUT + 'caminero-lente-fondo.png' })
await browser.close()
await sharp(OUT + 'caminero-lente-fondo.png').jpeg({ quality: 90 }).toFile(OUT + 'caminero-lente-fondo.jpg')
console.log('col', Math.round(margin), Math.round(colW), 'crosses test', textCrossesRing({ x: margin, y: 300, w: colW, h: 300 }, ring))
