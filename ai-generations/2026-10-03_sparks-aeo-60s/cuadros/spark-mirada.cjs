// Variante "mirando hacia" de un Spark 2D oficial, con la misma lógica del rig de AXIS (lookAt):
// la cara LED (todo lo que va entre el reflejo del visor y los botones) se desplaza dentro del visor,
// recortada por él, y el cuerpo se inclina apenas hacia donde mira. No agrega formas ni colores y nunca
// espeja: el anillo, el accesorio y la lupa quedan donde están. Sirve para el Spark base y el plantel.
// uso: node spark-mirada.cjs <svg-oficial> <salida.svg> <x -1..1> <y -1..1>
const fs = require('fs')
const [entrada, salida, xs, ys] = process.argv.slice(2)
const x = Math.max(-1, Math.min(1, parseFloat(xs))), y = Math.max(-1, Math.min(1, parseFloat(ys)))
let s = fs.readFileSync(entrada, 'utf8')
const reflejo = s.match(/<ellipse cx="150" cy="167" rx="30" ry="6"[^>]*\/>/)
if (!reflejo) throw new Error('reflejo del visor no encontrado')
const ini = s.indexOf(reflejo[0]) + reflejo[0].length
const fin = s.indexOf('<circle cx="168" cy="311"', ini)
if (fin < 0) throw new Error('botones no encontrados')
const cara = s.slice(ini, fin)
if (!cara.trim()) throw new Error('cara vacía')
// Proporción del rig: la cara viaja hasta ±60/±28 sobre un visor de ~±200/±100 → ~30 % y ~28 % del semieje.
const dx = (x * 0.3 * 96).toFixed(1), dy = (y * 0.28 * 48).toFixed(1)
const clip = '<clipPath id="visor-mirada"><ellipse cx="200" cy="196" rx="96" ry="48"/></clipPath>'
// cara desplazada y recortada; el reflejo del vidrio va encima y no se mueve
s = s.slice(0, s.indexOf(reflejo[0])) + `<g clip-path="url(#visor-mirada)"><g transform="translate(${dx} ${dy})">${cara}</g></g>${reflejo[0]}` + s.slice(fin)
const roll = (x * 5).toFixed(1) // se inclina hacia donde mira
s = s.replace(/(<svg[^>]*>)(<title>[^<]*<\/title>)?/, (m0, a, t = '') => `${a}${t}<defs>${clip}</defs><g transform="rotate(${roll} 200 215)">`)
s = s.replace(/<\/svg>\s*$/, '</g></svg>')
fs.writeFileSync(salida, s)
console.log('ok', salida, { dx, dy, roll })
