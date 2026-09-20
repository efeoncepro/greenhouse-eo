// ¿La ficha NOMBRA una SUPERFICIE oscura donde pueda aterrizar la reserva de texto?
//
// Por qué: MARGIN FIELD y TEXT SPACE piden «una superficie oscura de la escena misma» pero
// nunca dicen CUÁL. Si la ficha ya tiene una (pasillo en penumbra, parteluz de vidrio), la
// reserva aterriza sobre algo con nombre y se lee natural. Si la toma es clara por diseño,
// el modelo INVENTA el objeto oscuro y lo que inventa es un panel liso sin información.
// Eso es lo que el operador rechazó en T13 y T19 el 2026-09-20.
//
// Primera versión de esto fallaba en 2 de 4 casos con veredicto real. El motivo: contaba
// «charcoal knit» (un suéter) y «silhouette» (una persona) como si fueran superficies. Un
// suéter no aloja texto. La palabra oscura sólo cuenta si cuelga de una SUPERFICIE, y hay
// que leer SCENE *y* FOREGROUND (el parteluz oscuro de T8 vive en FOREGROUND).
import fs from 'node:fs'

const OSCURO = '(?:dim(?:ly)?|dark(?:ened)?|shadow(?:ed)?|unlit|night|nocturnal|charcoal|black|walnut|deep|moody|low-light)'
const SUPERFICIE = '(?:wall|walls|corridor|hallway|floor|table|panel|glass|window|mullion|sill|door|doorway|frame|ceiling|backdrop|curtain|screen|console|counter|column|beam|partition|shelf|surface|area|areas|space)'
// la palabra oscura a ≤4 palabras de una superficie, en cualquiera de los dos órdenes
const CERCA = new RegExp(`${OSCURO}(?:\\s+\\w+){0,4}\\s+${SUPERFICIE}|${SUPERFICIE}(?:\\s+\\w+){0,4}\\s+${OSCURO}`, 'gi')
const PERSONA = /\b(knit|shirt|sweater|blazer|jacket|hair|silhouett\w*|skin|dress|linen|suit)\b/i

const doc = fs.readFileSync('docs/operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md', 'utf8')
const fichas = doc.split(/\n### 3\.(\d+) /).slice(1)
const CALIBRACION = { 8: 'nombra', 12: 'nombra', 13: 'clara', 19: 'clara' }
let fallos = 0
const veredictos = {}

for (let i = 0; i < fichas.length; i += 2) {
  const n = fichas[i]
  const cita = fichas[i + 1].split('**Prompt verbatim**')[1]
  if (!cita) continue
  const texto = cita.split('\n').filter(l => l.trimStart().startsWith('>')).map(l => l.replace(/^\s*>\s?/, '').trim()).join('\n')
  const campo = [(texto.match(/SCENE[^\n]*/) ?? [''])[0], (texto.match(/FOREGROUND[^\n]*/) ?? [''])[0]].join(' ')
  if (!campo.trim()) continue

  const halladas = (campo.match(CERCA) ?? []).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => !PERSONA.test(s))
  const juicio = halladas.length ? 'nombra' : 'clara'
  veredictos[n] = juicio

  const esp = CALIBRACION[n]
  if (esp && esp !== juicio) fallos++
  console.log(
    `T${n}`.padEnd(4),
    juicio.padEnd(6),
    (esp ? (esp === juicio ? '✓calib ' : `✗CALIB(${esp}) `) : '       ').padEnd(9),
    '│', halladas.length ? halladas.join(' · ').slice(0, 92) : '— ninguna superficie oscura nombrada'
  )
}
const claras = Object.entries(veredictos).filter(([, v]) => v === 'clara').map(([n]) => 'T' + n)
console.log(
  fallos
    ? `\n✗ falla en ${fallos} caso(s) con veredicto real del operador: no sirve todavía`
    : `\n✓ calibrado contra los 4 casos con veredicto real del operador\n  NO pedir reserva oscura a: ${claras.join(' ')}  (${claras.length} de ${Object.keys(veredictos).length})`
)
