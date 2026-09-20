// Arma la tanda de plates del catálogo PIDIENDO las reservas, no sólo traduciendo el formato.
//
// Por qué se rearmó: la ola 1 tradujo cuatro fichas de 4:5 a 16:9 cambiando el porcentaje del lecho
// y la regla de encuadre, que es lo correcto, y aun así **sólo 1 de 4 quedó utilizable**. El
// verbatim de cada ficha describe SU composición en 4:5; al cambiar de formato la escena se
// reorganiza y el costado se llena. La única que pasó —marco en marco— pasó porque su toma ya es
// «desde un pasillo oscuro»: el campo oscuro era la toma, no una reserva pedida.
//
// Conclusión: la reserva se PIDE en el prompt o no aparece. Este script la compone.
//
// Incompatibilidades declaradas (no se fuerzan, se saltan):
//   · MARGIN FIELD: tomas 4, 5, 10 y 14 [sesión de fotografía, leído del catálogo].
//   · LECHO: NINGUNA. Retiré la toma 19 de esta lista. La había metido por una sola observación
//     (ola 1, nitidez 0.0043) y generalicé «en picado la mesa no se disuelve». La sesión de
//     fotografía midió su propio picado 60° en 4:5 con nitidez 0.0002 — veinte veces mejor. Peor
//     aún: en la ola 2 le quité el lecho POR esa conclusión, salió 0.0089 y eso parecía
//     confirmarla. Fabriqué la evidencia de mi propio error. El lecho se pide siempre; si falla
//     con el bloque explícito, ahí sí entra a la lista.
//   · SELECTION TARGET: tomas 11, 13, 17, 18 y 19 tienen lecho claro contiguo al objeto y están
//     bajo el conflicto abierto; no se generan pidiendo las dos cosas hasta que el operador decida.
import fs from 'node:fs'
import path from 'node:path'
import { MATERIAS } from './materias.mjs'

const VARIANTE = (process.argv[4] ?? '').replace('--variante=', '')

const REPO = '/Users/jreye/Documents/greenhouse-eo'
const CATALOGO = path.join(REPO, 'docs/operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md')
// 🔴 Los bloques se leen de scripts/foto/bloques/, que es donde viven ahora — no de la carpeta
// fechada. Y son DOS: realismo e IMPACTO. Yo venía armando sin el de impacto, y ése es el que
// carga la dirección de fotografía: «LIGHT WITH CHARACTER — a hard, directional beam… crisp
// graphic shadows and rich but detailed darks (never flat, never evenly lit)», momento decisivo,
// composición gráfica, tres planos de profundidad, paleta contenida con un solo campo azul.
// 34 planchas salieron sin él. El operador lo vio de inmediato: «siento que perdiste mucho de lo
// que construimos en iluminación, calidad de la escena». Y ese bloque traía escrita, desde antes
// de todo esto, la regla anti-losa: darks RICOS Y CON DETALLE, nunca planos.
const REALISMO = path.join(REPO, 'scripts/foto/bloques/bloque-realismo-v2.txt')
const IMPACTO = path.join(REPO, 'scripts/foto/bloques/bloque-impacto-v1.txt')
const RUN = path.join(REPO, 'ai-generations/2026-09-20_formatos-catalogo')

const LECHO = { '4:5': '18%', '9:16': '22%', '16:9': '16%', '1:1': '18%' }
const SIZE = { '4:5': '1152x1440', '9:16': '1152x2048', '16:9': '2048x1152', '1:1': '1152x1152' }
const ENCUADRE = {
  '9:16': 'VERTICAL composition. All heads and hands stay BELOW 36% of the frame height.',
  '1:1': 'SQUARE composition. All heads and hands stay BELOW 36% of the frame height.',
  '16:9': 'HORIZONTAL composition. All people and objects stay entirely inside the RIGHT 55% of the frame.'
}

// ZONA DE TEXTO Y MARGIN FIELD — se declara la MATERIA por toma; el tono sale de ella.
//
// 🔴 El defecto que el operador rechazó el 2026-09-20 en T13 y T19: «pones un objeto oscuro
// para que permita poner el texto pero se siente extremadamente forzado».
// El bloque canónico (§3.8.2) tiene DOS huecos:
//     «one single <TONO> surface of the scene itself (<materia de la escena>)»
// y yo rellené <TONO> con «DEEP … dark» fijo y BORRÉ <materia> entero. Un prompt que pide un
// tono sin decir DE QUÉ está hecha la cosa obliga al modelo a inventar el objeto, y lo que
// inventa es un panel liso. Medido en T19 ola2: desvío 0,8 y rango p95-p05 de 2 niveles.
//
// 🔴 Y después me pasé al otro lado: concluí «15 de 19 tomas son claras, entonces la reserva
// va clara». El operador lo corrigió: «No no todo tiene que ser claro, de hecho faltaba probar
// los oscuros, el tema era que el modelo estaba poniendo un objeto sin sentido para lograrlo».
// Tiene razón. El tono no es el problema ni la solución: LA MATERIA lo es. Una reserva oscura
// está perfecta cuando la superficie oscura existe de verdad en la escena y tiene nombre.
// El clasificador (scripts-nombra-oscuro.mjs) no dice «esta toma va clara»: dice si la ficha YA
// tiene una superficie oscura o si hay que ESCRIBIRLA en la escena para que exista por algo.
const TONO = {
  oscuro: 'DEEP, warm, evenly toned shadow, dark enough for white text',
  claro: 'VERY LIGHT, warm white, evenly lit, light enough for dark text'
}

// Las materias viven en materias.mjs, revisadas por el operador el 2026-09-20.
// Regla de tono cuando una toma tiene las dos: se genera la OSCURA. El operador señaló que
// «faltaba probar los oscuros»; la clara queda disponible con --variante=claro.
const resolverMateria = n => {
  const e = MATERIAS[n]
  if (!e) return null
  if (e.sinReserva) return { motivo: e.nota }
  if (e.estado === 'identidad') return { motivo: 'identidad real: necesita imágenes de referencia' }
  const tono = VARIANTE || (e.oscuro ? 'oscuro' : 'claro')
  return e[tono] ? { tono, materia: e[tono] } : { motivo: `no tiene variante «${tono}»` }
}

const zonaTexto = (fmt, m) =>
  `TEXT SPACE (planned, essential): the ${fmt === '16:9' ? 'LEFT 42%' : 'UPPER 30%'} of the frame is ${TONO[m.tono]}, on one single plain surface of the scene itself (${m.materia}), with no windows, frames, prints, plants, light beams or bright spots in it.`

// §3.8.2 MARGIN FIELD, verbatim del doc, con sus dos huecos rellenos por toma.
const marginField = m =>
  `MARGIN FIELD (planned): down the LEFT side of the frame, a continuous vertical band about 30% of the frame width runs unbroken from the top of the frame to BELOW the 40% mark of the frame height. That whole band is one single ${TONO[m.tono]} surface of the scene itself (${m.materia}), evenly lit and even in tone from top to bottom, with NOTHING crossing it: no person, no furniture edge, no window, no cable, no light beam, no bright highlight and no change of material anywhere inside it.`

const SIN_MARGIN = new Set(['4', '5', '10', '14'])
const SIN_LECHO = new Set()

const doc = fs.readFileSync(CATALOGO, 'utf8')
const realismo = fs.readFileSync(REALISMO, 'utf8').trim()
const impacto = fs.readFileSync(IMPACTO, 'utf8').trim()

if (/Vertical 4:5/.test(realismo)) throw new Error('el bloque de realismo todavía trae «Vertical 4:5.»')

const fichas = doc.split(/\n### 3\.(\d+) /).slice(1)
const tomas = {}

for (let i = 0; i < fichas.length; i += 2) {
  const n = fichas[i]
  const cuerpo = fichas[i + 1]
  const cita = cuerpo.split('**Prompt verbatim**')[1]

  if (!cita) continue
  const lineas = cita.split('\n').filter(l => l.trimStart().startsWith('>')).map(l => l.replace(/^\s*>\s?/, '').trim()).filter(Boolean)
  const texto = lineas.join('\n')
  const scene = (texto.match(/SCENE[^\n]*/) ?? [])[0]
  const fg = (texto.match(/FOREGROUND[^\n]*/) ?? [])[0]
  const identidad = /\bJulio\b|\bNexa\b|Clawd|Codex/i.test(cuerpo)

  if (scene) tomas[n] = { n, titulo: cuerpo.split('\n')[0].trim(), scene, fg, identidad }
}

const slug = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 26)
const OLA = (process.argv[2] ?? '').split(',').filter(Boolean)
const FORMATOS = (process.argv[3] ?? '9:16,16:9,1:1').split(',')
const saltadas = []
const batches = {}

for (const fmt of FORMATOS) {
  batches[fmt] = []
  const horizontal = fmt === '16:9'

  for (const [n, t] of Object.entries(tomas)) {
    if (OLA.length && !OLA.includes(n)) continue
    const m = resolverMateria(n)
    if (!m) { saltadas.push(`${n} ${fmt} · sin entrada en MATERIAS: nadie dijo de qué está hecha su reserva`); continue }
    if (m.motivo) { saltadas.push(`${n} ${fmt} · ${m.motivo}`); continue }

    const partes = [impacto, realismo, ENCUADRE[fmt], t.scene, zonaTexto(fmt, m)]

    if (!horizontal) { /* en vertical la reserva es la banda superior: MARGIN FIELD no aplica */ }
    else if (SIN_MARGIN.has(n) || MATERIAS[n]?.sinMargen) saltadas.push(`${n} ${fmt} · sin MARGIN FIELD (el catálogo excluye esta toma)`)
    else partes.push(marginField(m))
    // 🔴 El alto del lecho es POR FORMATO y algunas fichas no lo escriben en %: T16 y T17 dicen
    // «over the bottom quarter of the frame». Un reemplazo que sólo busca `bottom \d+%` las deja
    // con un 25% fijo en los tres formatos — la misma clase de bug que «Vertical 4:5.» viviendo
    // dentro de un bloque compartido. Se normalizan las dos escrituras.
    if (t.fg && !SIN_LECHO.has(n)) {
      partes.push(t.fg
        .replace(/bottom \d+%/g, `bottom ${LECHO[fmt]}`)
        .replace(/bottom (quarter|third|fifth|half)(?= of the frame)/g, `bottom ${LECHO[fmt]}`))
    }
    else if (SIN_LECHO.has(n)) saltadas.push(`${n} ${fmt} · sin lecho (medido: no se disuelve en este ángulo)`)

    batches[fmt].push({
      filename: `T${n}-${slug(t.titulo)}-${fmt.replace(':', '')}-plate.png`,
      prompt: partes.join('\n\n').replace(/\s*Vertical 4:5\.\s*/g, ' ').trim()
    })
  }
  fs.writeFileSync(path.join(RUN, 'brief', `batch-${fmt.replace(':', '')}.json`), `${JSON.stringify(batches[fmt], null, 1)}\n`)
}

console.log('Tomas con verbatim utilizable:', Object.keys(tomas).length, '· sin identidad real:', Object.values(tomas).filter(t => !t.identidad).length, '\n')
for (const [fmt, b] of Object.entries(batches)) console.log(`${fmt.padEnd(6)} size ${SIZE[fmt].padEnd(10)} lecho ${LECHO[fmt].padEnd(4)} · ${b.length} prompts`)
console.log('\nSaltadas / recortadas:')
for (const s of saltadas) console.log('  ·', s)
const todos = Object.values(batches).flat()

console.log('\nVerificación de los', todos.length, 'prompts:')
console.log('  ¿alguno con «Vertical 4:5»?', todos.some(b => /Vertical 4:5/.test(b.prompt)) ? '🔴 SÍ' : 'no')
console.log('  ¿alguno sin el bloque de impacto?', todos.some(b => !b.prompt.includes('VISUAL IMPACT')) ? '🔴 SÍ' : 'no')
console.log('  ¿alguno sin TEXT SPACE?', todos.some(b => !b.prompt.includes('TEXT SPACE')) ? '🔴 SÍ' : 'no')
console.log('  ¿alguno con la reserva sin materia nombrada?', todos.some(b => /surface of the scene itself,/.test(b.prompt)) ? '🔴 SÍ' : 'no')
console.log('  ¿alguno pidiendo sombra a una toma clara?',
  todos.some(b => b.prompt.includes('VERY LIGHT, warm white') && b.prompt.includes('DEEP, warm, evenly toned shadow')) ? '🔴 SÍ' : 'no')
console.log('  ¿algún lecho con fracción literal sin parametrizar?',
  todos.some(b => /bottom (quarter|third|fifth|half) of the frame/.test(b.prompt)) ? '🔴 SÍ' : 'no')
console.log('  ¿alguno con lecho que no corresponde?',
  Object.entries(batches).some(([f, b]) => b.some(x => x.prompt.includes('FOREGROUND') && !x.prompt.includes(`bottom ${LECHO[f]}`))) ? '🔴 SÍ' : 'no')
