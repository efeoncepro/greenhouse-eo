// Variante "mirando hacia" de un Spark 2D oficial, con la misma lógica del rig de AXIS (lookAt):
// la cara LED (ojos y boca) se desplaza dentro del visor, recortada por él, y el cuerpo se inclina apenas.
// No agrega formas ni colores y nunca espeja: el anillo y la lupa quedan donde están.
// uso: node spark-mirada.cjs <svg-oficial> <salida.svg> <x -1..1> <y -1..1>
const fs = require('fs')
const [entrada, salida, xs, ys] = process.argv.slice(2)
const x = Math.max(-1, Math.min(1, parseFloat(xs))), y = Math.max(-1, Math.min(1, parseFloat(ys)))
let s = fs.readFileSync(entrada, 'utf8')
const cara = [
  /<circle cx="163" cy="198" r="12" fill="#0375db"\/>/,
  /<circle cx="237" cy="198" r="12" fill="#0375db"\/>/,
  /<path d="M189,220 Q200,228 211,220"[^>]*\/>/
]
const piezas = cara.map(re => { const m = s.match(re); if (!m) throw new Error('cara no encontrada: ' + re); s = s.replace(m[0], ''); return m[0] })
// Proporción del rig: la cara viaja hasta ±60/±28 sobre un visor de ~±200/±100 → ~30 % y ~28 % del semieje.
const dx = (x * 0.3 * 96).toFixed(1), dy = (y * 0.28 * 48).toFixed(1)
const clip = '<clipPath id="visor-mirada"><ellipse cx="200" cy="196" rx="96" ry="48"/></clipPath>'
const visorFin = s.match(/<ellipse cx="150" cy="167" rx="30" ry="6"[^>]*\/>/)
if (!visorFin) throw new Error('reflejo del visor no encontrado')
s = s.replace(visorFin[0], `<g clip-path="url(#visor-mirada)"><g transform="translate(${dx} ${dy})">${piezas.join('')}</g></g>${visorFin[0]}`)
const roll = (x * 5).toFixed(1) // se inclina hacia donde mira
s = s.replace(/(<svg[^>]*>)(<title>[^<]*<\/title>)?/, (m0, a, t = '') => `${a}${t}<defs>${clip}</defs><g transform="rotate(${roll} 200 215)">`)
s = s.replace(/<\/svg>\s*$/, '</g></svg>')
fs.writeFileSync(salida, s)
console.log('ok', salida, { dx, dy, roll })
