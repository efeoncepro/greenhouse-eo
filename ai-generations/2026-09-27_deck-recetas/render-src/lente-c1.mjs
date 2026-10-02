import { composeGraphicLine } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const W = 3000, H = 1000
const buf = await sharp('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_ooh-caminero-lente/plates/C2-caminero-medicion-compacta.png').resize(W, H).jpeg({ quality: 92 }).toBuffer()
const photo = 'data:image/jpeg;base64,' + buf.toString('base64')
const circles = process.argv[2] ? { lens: JSON.parse(process.argv[2]) } : undefined
const r = composeGraphicLine({ canvas: { width: W, height: H, line: 'growth', surface: 'dark', channel: 'print' }, elements: [{ kind: 'lens', id: 'lens', photoId: 'c1', alt: 'Analista señala la línea que sube en un monitor', region: 'center-end', subjectRegion: 'center-end', accentSphere: 'upper-start' }] }, { photos: { c1: photo }, background: true, idPrefix: 'c1', circles })
console.log(JSON.stringify(r.circles))
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: W, height: H } })
await p.setContent(`<html><body style="margin:0">${r.svg}</body></html>`, { waitUntil: 'load' }); await p.screenshot({ path: 'out-lente/c1-fondo.png' }); await b.close()
await sharp('out-lente/c1-fondo.png').resize(1500).jpeg().toFile('out-lente/v-c1.jpg')
