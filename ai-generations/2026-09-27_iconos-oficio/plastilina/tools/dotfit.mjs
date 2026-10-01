// Mide dónde cabe la esfera: distancia al fondo (en u de la grilla 48) y el punto más interior de una región.
// Uso: node dotfit.mjs glifo.json [x0 y0 x1 y1] [--at x y]
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire('/Users/jreye/Documents/axis-design-system/package.json')
const sharp = require('sharp')
const a = process.argv.slice(2)
const g = JSON.parse(readFileSync(a[0], 'utf8'))
const PX = 10, N = 480
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="0 0 48 48"><rect width="48" height="48" fill="#000"/><path d="${g.d}" transform="${g.t}" fill="#fff"/></svg>`
const { data } = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const m = new Uint8Array(N * N); for (let i = 0; i < m.length; i++) m[i] = data[i * 3] > 127 ? 1 : 0
const bg = []; for (let y = 0; y < N; y += 2) for (let x = 0; x < N; x += 2) if (!m[y * N + x]) bg.push([x, y])
const dist = (x, y) => { let d = 1e9; for (const [bx, by] of bg) { const q = (bx - x) ** 2 + (by - y) ** 2; if (q < d) d = q } return Math.sqrt(d) / PX }
const at = a.indexOf('--at')
if (at > -1) { const x = +a[at + 1], y = +a[at + 2]; console.log(`en (${x}, ${y}): silueta=${m[Math.round(y*PX)*N+Math.round(x*PX)]} distancia al fondo ${dist(x*PX, y*PX).toFixed(2)} u`) }
else {
  const [x0, y0, x1, y1] = a.slice(1, 5).map(Number)
  let best = null
  for (let y = y0 * PX; y <= y1 * PX; y += 4) for (let x = x0 * PX; x <= x1 * PX; x += 4) {
    if (!m[y * N + x]) continue
    const d = dist(x, y); if (!best || d > best.d) best = { x: x / PX, y: y / PX, d }
  }
  console.log(best ? `punto más interior en región: (${best.x.toFixed(1)}, ${best.y.toFixed(1)}) a ${best.d.toFixed(2)} u del fondo` : 'sin silueta')
}
