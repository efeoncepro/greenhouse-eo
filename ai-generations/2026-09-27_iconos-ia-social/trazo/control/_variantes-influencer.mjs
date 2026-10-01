// Variantes de influencer para decidir a ojo (no son candidatos: se escriben en control/_var/)
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-27_iconos-ia-social/trazo/control/_var'
mkdirSync(OUT, { recursive: true })
const f = (n) => +(+n).toFixed(2), P = (x, y) => `${f(x)} ${f(y)}`
const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0`
const w = (key, rest, response, dot, mode) => writeFileSync(`${OUT}/${key}.json`, JSON.stringify({ key, label: 'Influencer', use: 'x', mode, rest, response, dot }))
// V1: aro concéntrico a la cabeza, cortado por los hombros; la esfera ocupa un corte del aro (replace)
{
  const cx = 12, cy = 9, R = 7, hr = 3
  const body = 'M5 21v-.5a4.5 4.5 0 0 1 4.5 -4.5h5a4.5 4.5 0 0 1 4.5 4.5v.5'
  const at = (deg) => [cx + R * Math.cos((deg * Math.PI) / 180), cy + R * Math.sin((deg * Math.PI) / 180)]
  // extremos del aro sobre los hombros: y = 15 (1 sobre el cuerpo)
  const yb = 14.6, dx = Math.sqrt(R * R - (yb - cy) ** 2)
  const full = `M${P(cx - dx, yb)}A${R} ${R} 0 1 1 ${P(cx + dx, yb)}`
  const dotA = -45, dot = at(dotA)
  const gap = (3.0 / R) * 180 / Math.PI + 0.5
  const a1 = at(dotA - gap), a2 = at(dotA + gap)
  const cut = [`M${P(cx - dx, yb)}A${R} ${R} 0 1 1 ${P(...a1)}`, `M${P(...a2)}A${R} ${R} 0 0 1 ${P(cx + dx, yb)}`]
  w('v1-halo', [full, circle(cx, cy, hr), body], [...cut, circle(cx, cy, hr), body], dot.map(f), 'replace')
}
// V2: persona + estrella de cinco puntas; la estrella se vuelve esfera (replace)
{
  const star = (cx, cy, Ro, Ri) => { let d = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? Ri : Ro, a = -Math.PI / 2 + (i * Math.PI) / 5; d += `${i ? 'L' : 'M'}${P(cx + r * Math.cos(a), cy + r * Math.sin(a))}` } return d + 'z' }
  const head = circle(9, 8, 3.25), body = 'M3 21v-1a4.5 4.5 0 0 1 4.5 -4.5h3a4.5 4.5 0 0 1 4.5 4.5v1'
  w('v2-estrella', [head, body, star(18, 6.25, 4, 1.7)], [head, body], [18, 6.5], 'replace')
}
// V3: persona dentro del aro, aro detrás arriba a la derecha (como la luna), esfera en el centro del aro (complete)
{
  const cx = 14.5, cy = 8, R = 6.25, hx = 9, hy = 10.25, hr = 3
  const body = 'M3 21v-.5a4.5 4.5 0 0 1 4.5 -4.5h3a4.5 4.5 0 0 1 4.5 4.5v.5'
  // el aro se corta donde lo tapa la cabeza (radio hr+1)
  const d = Math.hypot(cx - hx, cy - hy), r0 = hr + 1.1
  const a = (R * R - r0 * r0 + d * d) / (2 * d), h = Math.sqrt(R * R - a * a), ux = (hx - cx) / d, uy = (hy - cy) / d
  const p1 = [cx + a * ux - h * uy, cy + a * uy + h * ux], p2 = [cx + a * ux + h * uy, cy + a * uy - h * ux]
  const ring = `M${P(...p2)}A${R} ${R} 0 1 1 ${P(...p1)}`
  w('v3-luna', [ring, circle(hx, hy, hr), body], [ring, circle(hx, hy, hr), body], [cx, cy], 'complete')
}
console.log('ok')
