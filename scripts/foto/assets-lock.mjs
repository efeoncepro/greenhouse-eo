// `pnpm foto:assets:lock` — huella de cada asset que el catálogo declara.
//
// Existe por un fallo concreto: los renders de referencia y los kits pesan 640 MB y viven fuera de
// git (`.gitignore`: `/ai-generations/**/*.png`). En CI no están, así que el test que verificaba que
// el catálogo apunta a archivos reales tuvo que apagarse, y un kit con la ruta mal escrita dejó de
// detectarse antes de gastar en una tanda.
//
// El lock es texto, pesa nada y SÍ entra al repositorio. Con él:
//   · CI vuelve a verificar que el catálogo esté completo, sin descargar un solo byte;
//   · una copia local que difiere de la aprobada se detecta ANTES de generar con la referencia vieja.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { OBJETOS, PERSONAS } from './build-prompt.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const LOCK = path.join(raiz, 'scripts/foto/assets.lock.json')

/**
 * Todo lo que el catálogo puede pedirle al disco: referencias de personas, sus vistas, expresiones y
 * vestuarios, y de cada kit
 * **las cuatro formas** en que declara un archivo — por patrón, por patrón de color, por nombre
 * completo y como asset de uso.
 *
 * 🔴 Recorrer sólo `objeto.patron` dejaba fuera justo lo que viaja a las escenas: `assetDeUso`,
 * `usoPorPersona` y `usoPorColor` son la prenda PUESTA, y las vistas de `patronPorColor` y
 * `vistasPorNombre` no pasan por el patrón por defecto. Medido el 2026-09-21: cablear el lanyard
 * determinístico dejó el lock en 66 sin moverse. Sustituir cualquiera de esos archivos no despertaba
 * ningún gate, que es exactamente el fallo para el que existe este lock. Hallazgo de la sesión
 * «Poses de Nexa en advertising y design studio».
 */
export function rutasDeclaradas() {
  const rutas = new Map()

  // Las TRES dimensiones de una persona, no sólo `vistas`: una expresión o un vestuario se antepone a las
  // referencias igual que un ángulo, así que sustituirlos cambia la pieza lo mismo. Mismo fallo que el de
  // los assets de uso, un nivel más arriba: declarar un mapa nuevo en el catálogo sin sellarlo lo deja
  // fuera de todo gate.
  for (const [clave, persona] of Object.entries(PERSONAS)) {
    for (const ref of persona.refs) rutas.set(ref, `persona:${clave}`)

    for (const mapa of ['vistas', 'expresiones', 'vestuario']) {
      for (const [nombre, ref] of Object.entries(persona[mapa] ?? {})) rutas.set(ref, `persona:${clave}/${nombre}`)
    }
  }

  for (const [clave, objeto] of Object.entries(OBJETOS)) {
    const patrones = { '': objeto.patron, ...(objeto.patronPorColor ?? {}) }

    for (const [color, patron] of Object.entries(patrones)) {
      for (const [vista, sufijo] of Object.entries(objeto.vistas)) {
        const etiqueta = color ? `kit:${clave}/${color}/${vista}` : `kit:${clave}/${vista}`

        rutas.set(objeto.base + patron.replace('<V>', sufijo), etiqueta)
      }
    }

    for (const [vista, nombre] of Object.entries(objeto.vistasPorNombre ?? {})) {
      rutas.set(path.normalize(objeto.base + nombre), `kit:${clave}/${vista}`)
    }

    for (const [etiqueta, nombre] of assetsDeUso(objeto)) {
      rutas.set(path.normalize(objeto.base + nombre), `uso:${clave}/${etiqueta}`)
    }
  }

  return rutas
}

/**
 * Las CUATRO formas de declarar la pieza PUESTA: una sola, por persona, por color o por vista.
 *
 * `usoPorVista` entró el 2026-09-21 con las espaldas y los cuerpos B, y sellarla acá no es opcional:
 * es exactamente el hueco del que ya nos quemamos con `assetDeUso` y `usoPorColor` — un mapa nuevo en
 * el catálogo que nadie sella queda fuera de todo gate, y sustituir uno de esos archivos no despierta
 * nada. La pieza PUESTA es la que viaja a la escena: es la que más importa que esté sellada.
 */
function* assetsDeUso(objeto) {
  if (objeto.assetDeUso) yield ['defecto', objeto.assetDeUso]
  for (const [persona, nombre] of Object.entries(objeto.usoPorPersona ?? {})) yield [`persona:${persona}`, nombre]
  for (const [color, nombre] of Object.entries(objeto.usoPorColor ?? {})) yield [`color:${color}`, nombre]
  for (const [vista, nombre] of Object.entries(objeto.usoPorVista ?? {})) yield [`puesta:${vista}`, nombre]
}

const huella = ruta => createHash('sha256').update(readFileSync(path.join(raiz, ruta))).digest('hex')

export function leerLock() {
  return existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, 'utf8')) : null
}

/** Compara el lock contra el disco. Devuelve qué falta, qué sobra y qué cambió. */
export function verificar() {
  const lock = leerLock()

  if (!lock) return { sinLock: true, faltanEnDisco: [], cambiados: [], sinDeclarar: [] }

  const declaradas = rutasDeclaradas()
  const faltanEnDisco = []
  const cambiados = []

  for (const [ruta, entrada] of Object.entries(lock.assets)) {
    if (!existsSync(path.join(raiz, ruta))) {
      faltanEnDisco.push(ruta)
      continue
    }

    if (huella(ruta) !== entrada.sha256) cambiados.push(ruta)
  }

  // Una vista declarada en el catálogo que el lock no conoce: el catálogo creció sin regenerarlo.
  const sinDeclarar = [...declaradas.keys()].filter(r => !lock.assets[r])

  return { sinLock: false, faltanEnDisco, cambiados, sinDeclarar }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const verificarSolo = process.argv.includes('--check')
  const declaradas = rutasDeclaradas()

  if (verificarSolo) {
    const r = verificar()

    if (r.sinLock) {
      console.error('✗ No existe scripts/foto/assets.lock.json. Genéralo con `pnpm foto:assets:lock`.')
      process.exit(1)
    }

    // Faltar en disco NO es error: en CI los assets no están, y es esperado.
    if (r.faltanEnDisco.length) {
      console.log(`  ${r.faltanEnDisco.length} asset(s) no están en esta máquina (esperado en CI y sin assets).`)
    }

    if (r.sinDeclarar.length) {
      console.error(`✗ ${r.sinDeclarar.length} vista(s) del catálogo no están en el lock — el catálogo creció y el lock no:`)
      for (const s of r.sinDeclarar) console.error(`    ${s}`)
      console.error('  Corre `pnpm foto:assets:lock` y commitea el resultado.')
      process.exit(1)
    }

    if (r.cambiados.length) {
      console.error(`✗ ${r.cambiados.length} asset(s) de esta máquina NO coinciden con el aprobado:`)
      for (const c of r.cambiados) console.error(`    ${c}`)
      console.error('  Generar con ellos usaría una referencia distinta de la que el equipo aprobó.')
      process.exit(1)
    }

    console.log(`✓ Catálogo y lock coinciden · ${Object.keys(leerLock().assets).length} assets declarados.`)
    process.exit(0)
  }

  const assets = {}
  const ausentes = []

  for (const [ruta, rol] of declaradas) {
    if (!existsSync(path.join(raiz, ruta))) {
      ausentes.push(`${rol} → ${ruta}`)
      continue
    }

    assets[ruta] = { rol, sha256: huella(ruta) }
  }

  if (ausentes.length) {
    console.error(`✗ No puedo sellar el lock: ${ausentes.length} asset(s) declarados por el catálogo no están en disco:`)
    for (const a of ausentes) console.error(`    ${a}`)
    console.error('  El lock debe sellarse en una máquina que tenga el set completo (local u OneDrive montado).')
    process.exit(1)
  }

  writeFileSync(
    LOCK,
    `${JSON.stringify(
      {
        _comentario:
          'Huellas de los assets que el catálogo de foto:prompt declara. Los binarios viven fuera de git (640 MB); esto los verifica sin descargarlos. Regenerar con `pnpm foto:assets:lock` y commitear.',
        sellado: new Date().toISOString().slice(0, 10),
        assets
      },
      null,
      2
    )}\n`
  )
  console.log(`✓ ${Object.keys(assets).length} assets sellados en scripts/foto/assets.lock.json`)
}
