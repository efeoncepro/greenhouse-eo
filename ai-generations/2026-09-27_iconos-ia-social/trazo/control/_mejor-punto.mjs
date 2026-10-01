// Busca el centro de esfera con más aire dentro de una ventana: node _mejor-punto.mjs <clave> x0 x1 y0 y1
import { readFileSync } from 'node:fs'
const { samplePath } = await import('/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js')
const [key, x0, x1, y0, y1] = process.argv.slice(2)
const g = JSON.parse(readFileSync(`/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-27_iconos-ia-social/trazo/${key}.json`))
const pts = g.response.flatMap(samplePath)
const air = (x, y) => Math.min(...pts.map(([a, b]) => Math.hypot(a - x, b - y))) - 2.5
let best = [0, 0, -9]
for (let x = +x0; x <= +x1; x += 0.25) for (let y = +y0; y <= +y1; y += 0.25) { const a = air(x, y); if (a > best[2]) best = [x, y, +a.toFixed(3)] }
console.log('actual', g.dot, air(...g.dot).toFixed(3), '· mejor', best)
