// `pnpm foto:componer:cta:regresion [--ref <git-ref>] [--candidato <archivo>] [--solo <texto>] [--jobs <n>] [--conservar]
//                                   [--cobertura <archivo>] [--actualizar-cobertura]`
//
// Red de seguridad del compositor de CTA. Compone TODAS las piezas de TODOS los planes con CTA del repo con dos
// versiones del compositor —la de referencia (`--ref`, HEAD por defecto) y la candidata (`--candidato`, el
// archivo del árbol de trabajo por defecto)— y compara pieza por pieza:
//
//   · estado      compone / aborta, y con qué mensaje
//   · layout      cada caja de texto, CTA y descriptor (tolerancia 0,05 px)
//   · QA          contraste por voz, escala elegida, guarda de sujeto, líneas del dominante
//   · píxeles     sha256 del PNG final; si difiere, cuántos píxeles cambian y cuánto
//
// Nada se compone dentro de las carpetas reales: cada pieza corre sola, en una copia de su plan dentro de un
// directorio temporal, con la ruta del plate absoluta. Las carpetas aprobadas no se tocan.
//
// Existe porque el compositor tiene decenas de planes aprobados encima y cualquier mejora puede mover uno sin
// que nadie lo vea [operador, 2026-09-22: «asegúrate de que no se dañe porque hoy funciona y funciona bien»].
// Un cambio que no debería alterar nada tiene que salir con CERO diferencias. Uno que sí, muestra exactamente
// qué piezas mueve y cuánto, para aprobarlo mirando — no suponiendo.
//
// Sale con código 1 si hay cualquier diferencia. El reporte completo queda en `<tmp>/reporte.json`.
//
// Tramo 5 de la certificación (auditoría 2026-09-23, hallazgo 13) — la red de seguridad tenía agujeros:
//   · la referencia corría con las dependencias del árbol de trabajo → ahora se extrae COMPLETA de git (regresion-ref.mjs);
//   · 0 casos salía en verde → ahora falla;
//   · las piezas sin plate se saltaban en silencio → se cuentan, y las del manifiesto de cobertura FALLAN si faltan;
//   · los avisos no se comparaban → ahora un aviso nuevo o perdido es una diferencia;
//   · una clave nueva sólo informa si es del QA (`qa.…`); en el layout es un cambio a aprobar.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import sharp from 'sharp'

import { extraerReferencia } from './regresion-ref.mjs'

const run = promisify(execFile)
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const args = process.argv.slice(2)

const opt = (name, fallback) => {
  const i = args.indexOf(name)

  return i >= 0 ? args[i + 1] : fallback
}

const REF = opt('--ref', 'HEAD')
const CANDIDATO = path.resolve(ROOT, opt('--candidato', 'scripts/foto/componer-cta.mjs'))
const SOLO = opt('--solo', null)
const JOBS = Number(opt('--jobs', Math.max(2, Math.min(6, os.cpus().length - 2))))
// Por defecto se borran las carpetas de las piezas IGUALES al terminar: cada corrida completa dejaba ~535 MB en el
// temporal y diez corridas llevaron el disco al 97 % (2026-09-22). `--conservar` las guarda todas.
const CONSERVAR = args.includes('--conservar')
// Manifiesto de cobertura: las piezas que esta red DEBE verificar. Si una falta (plan movido, plate que ya no está), la
// corrida falla en vez de achicarse en silencio. `--actualizar-cobertura` lo reescribe con lo que hay hoy.
const COBERTURA = path.resolve(ROOT, opt('--cobertura', 'scripts/foto/componer-cta.cobertura.json'))
const ACTUALIZAR_COBERTURA = args.includes('--actualizar-cobertura')
const TOL_PX = 0.05
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

// 1 · La referencia se extrae de git COMPLETA —el compositor y todas sus dependencias locales, como estaban en REF—,
//     cada archivo junto a su original con nombre `.ref-<sha>-<pid>--<nombre>` (regresion-ref.mjs). Única por PROCESO:
//     dos regresiones en paralelo no se pisan. Los archivos son temporales y están en .gitignore.
const refSha = execFileSync('git', ['rev-parse', '--short', REF], { cwd: ROOT, encoding: 'utf8' }).trim()
const { entrada: REF_FILE, archivos: REF_ARCHIVOS, dependencias: REF_DEPS } = extraerReferencia({ raiz: ROOT, ref: REF, entrada: 'scripts/foto/componer-cta.mjs', etiqueta: `${refSha}-${process.pid}` })

const limpiar = () => { for (const f of REF_ARCHIVOS) fs.rmSync(f, { force: true }) }

process.on('exit', limpiar)
process.on('SIGINT', () => process.exit(130))
process.on('SIGTERM', () => process.exit(143))

// 2 · Casos: toda pieza de todo `piezas*.json` bajo ai-generations/ que lleve CTA y cuyo plate exista.
//     Las piezas idénticas (mismo contenido y mismo plate, p. ej. las copias de reproducción) corren una vez.
const planes = []

const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'out' || e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)

    if (e.isDirectory()) walk(p)
    else if (/^piezas.*\.json$/.test(e.name)) planes.push(p)
  }
}

walk(path.join(ROOT, 'ai-generations'))

const casos = new Map()
const plateSha = new Map()
const omitidas = []
const sinPlate = []

// Un plate que no se puede leer (p. ej. un archivo de iCloud/OneDrive evictado con el disco lleno: ETIMEDOUT) se
// reintenta y, si sigue fallando, la pieza queda OMITIDA con su causa. Antes tumbaba la corrida entera; y una pieza
// omitida nunca cuenta como verde.
function leerPlate(plate) {
  for (let intento = 1; intento <= 3; intento++) {
    try {
      return fs.readFileSync(plate)
    } catch (e) {
      if (intento === 3) throw e
    }
  }
}

for (const plan of planes.sort()) {
  let piezas

  try { piezas = JSON.parse(fs.readFileSync(plan, 'utf8')) } catch { continue }
  if (!Array.isArray(piezas) || !piezas.some(p => p?.cta)) continue
  const rel = path.relative(ROOT, plan)

  if (SOLO && !rel.includes(SOLO)) continue

  for (const p of piezas) {
    if (!p?.plate) continue
    const plate = path.resolve(path.dirname(plan), p.plate)

    if (!fs.existsSync(plate)) {
      sinPlate.push(`${rel}#${p.id}`)
      continue
    }

    if (!plateSha.has(plate)) {
      try {
        plateSha.set(plate, sha(leerPlate(plate)))
      } catch (e) {
        omitidas.push(`${rel}#${p.id}: no se pudo leer el plate (${e.code ?? e.message})`)
        continue
      }
    }

    const pieza = { ...p, plate }
    const clave = sha(JSON.stringify({ ...p, plate: plateSha.get(plate) })).slice(0, 16)

    if (!casos.has(clave)) casos.set(clave, { clave, planes: [], pieza, plateSha: plateSha.get(plate) })
    casos.get(clave).planes.push(`${rel}#${p.id}`)
  }
}

// Cero casos NO es un verde: es que la red no encontró qué verificar (un --solo mal escrito, una carpeta movida).
if (!casos.size) {
  console.error(`✗ 0 piezas que verificar${SOLO ? ` con --solo «${SOLO}»` : ''}: una regresión vacía no prueba nada.`)
  process.exit(1)
}

const presentes = new Set([...casos.values()].flatMap(c => c.planes))
let faltantes = []

if (ACTUALIZAR_COBERTURA) {
  fs.writeFileSync(COBERTURA, `${JSON.stringify({ nota: 'Piezas con CTA que la regresión DEBE verificar en esta máquina. Se regenera con --actualizar-cobertura.', generado: new Date().toISOString().slice(0, 10), piezas: [...presentes].sort() }, null, 2)}\n`)
  console.log(`Cobertura actualizada: ${presentes.size} piezas en ${path.relative(ROOT, COBERTURA)}`)
} else if (!fs.existsSync(COBERTURA) && (!SOLO || args.includes('--cobertura'))) {
  // Tramo 9 (auditoría de arquitectura, hallazgo 13): sin manifiesto, la red no sabe cuánto debía verificar y antes
  // salía con 0 sin mencionarlo.
  console.error(`✗ no existe el manifiesto de cobertura ${path.relative(ROOT, COBERTURA)}: la red no sabe qué piezas debía verificar. Genéralo con --actualizar-cobertura.`)
  process.exit(1)
} else if (fs.existsSync(COBERTURA) && !SOLO) {
  faltantes = JSON.parse(fs.readFileSync(COBERTURA, 'utf8')).piezas.filter(k => !presentes.has(k))
} else if (SOLO && fs.existsSync(COBERTURA) && args.includes('--cobertura')) {
  faltantes = JSON.parse(fs.readFileSync(COBERTURA, 'utf8')).piezas.filter(k => k.includes(SOLO) && !presentes.has(k))
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'foto-regresion-'))

console.log(`Regresión del compositor de CTA — referencia ${REF} (${refSha}, ${REF_DEPS.length} archivos extraídos de git) contra ${path.relative(ROOT, CANDIDATO)}`)
console.log(`${casos.size} piezas únicas de ${new Set([...casos.values()].flatMap(c => c.planes.map(x => x.split('#')[0]))).size} planes · ${JOBS} en paralelo · ${TMP}`)

// El VEREDICTO del gate también es comportamiento (tramo 9; auditoría de arquitectura, hallazgo 13): un candidato que
// agrega una voz que falla sólo sumaba claves al QA («🔵», no falla) y su salida no pasaba el gate. Se corre el gate
// vigente sobre las dos salidas —cada una contra SU compositor— y se comparan las líneas de falla y de «no
// certificable». Se ignora la de «otra versión del comando», que difiere por construcción entre referencia y candidato.
const GATE = path.join(ROOT, 'scripts/foto/componer-cta.gate.mjs')

async function veredicto(compositor, dir) {
  const r = await run(process.execPath, [GATE, path.join(dir, 'piezas.json'), '--comando', compositor], { cwd: ROOT, maxBuffer: 16e6, timeout: 10 * 60e3 }).then(x => x.stdout + x.stderr, e => String(e.stdout ?? '') + String(e.stderr ?? ''))

  return [...new Set(r.split('\n').map(l => l.trim()).filter(l => /^✗ |^· /.test(l) && !/otra versión del comando/.test(l)).map(l => l.replaceAll(dir, '<dir>')))].sort()
}

// Activos fuera de la referencia hermética: fuentes, logos y paquetes se leen del árbol de trabajo en los DOS lados,
// así que un cambio en ellos no aparece como diferencia. Se avisa.
const ACTIVOS_REF = ['src/assets/fonts', 'public/branding/logo-full.svg', 'public/branding/logo-negative.svg', 'src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg', 'pnpm-lock.yaml']
const activosCambiados = execFileSync('git', ['diff', '--name-only', refSha, '--', ...ACTIVOS_REF], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean)

// 3 · Componer una pieza sola con un compositor dado, en su propio directorio.
async function componer(compositor, dir, pieza) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'piezas.json'), JSON.stringify([pieza], null, 2))

  let salida = ''

  try {
    const r = await run(process.execPath, [compositor, path.join(dir, 'piezas.json')], { cwd: ROOT, timeout: 15 * 60e3, maxBuffer: 64e6 })

    salida = `${r.stdout}\n${r.stderr}`
  } catch (e) {
    const texto = String(e.stderr || '') + String(e.message || '')

    return { estado: 'aborta', error: (texto.match(/Error: ([^\n]+)/) ?? [null, texto.split('\n')[0]])[1].trim() }
  }

  const out = path.join(dir, 'out')
  const png = path.join(out, `${pieza.id}.png`)

  // Los avisos del compositor también son comportamiento: uno nuevo o uno perdido es una diferencia (antes no se miraban).
  const avisos = [...new Set(salida.split('\n').filter(l => l.includes('⚠')).map(l => l.trim().replaceAll(dir, '<dir>')))].sort()

  return {
    estado: 'compone',
    avisos,
    layout: JSON.parse(fs.readFileSync(path.join(out, `${pieza.id}-layout.json`), 'utf8')),
    // El QA es POR PLAN desde 2026-09-23 (`qa-<plan>.json`); una referencia anterior escribe `qa.json`. Las huellas
    // no se comparan: la del comando difiere por construcción y la del PNG ya la juzga la comparación de píxeles.
    qa: sinHuellas(JSON.parse(fs.readFileSync([path.join(out, 'qa-piezas.json'), path.join(out, 'qa.json')].find(f => fs.existsSync(f)), 'utf8'))[0]),
    png,
    pngSha: sha(fs.readFileSync(png))
  }
}

const sinHuellas = r => {
  if (!r || typeof r !== 'object') return r
  const resto = { ...r }

  delete resto.huellas

  return resto
}

function diferencias(a, b, ruta = '', out = []) {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > TOL_PX) out.push(`${ruta}: ${+a.toFixed(3)} → ${+b.toFixed(3)}`)

    return out
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diferencias(a[k], b[k], ruta ? `${ruta}.${k}` : k, out)

    return out
  }

  if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${ruta}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`)

  return out
}

async function pixeles(a, b) {
  const [A, B] = await Promise.all([a, b].map(f => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })))

  if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
    return { tamano: `${A.info.width}×${A.info.height} → ${B.info.width}×${B.info.height}` }
  }

  let distintos = 0
  let max = 0

  for (let i = 0; i < A.data.length; i += 3) {
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]))

    if (d > 8) distintos++
    if (d > max) max = d
  }

  return { pctDistintos: +((distintos * 300) / A.data.length).toFixed(3), maxDelta: max }
}

async function evaluar(caso) {
  const dir = path.join(TMP, caso.clave)
  const [ref, cand] = [await componer(REF_FILE, path.join(dir, 'ref'), caso.pieza), await componer(CANDIDATO, path.join(dir, 'cand'), caso.pieza)]
  const r = { clave: caso.clave, id: caso.pieza.id, planes: caso.planes, ref: ref.estado, cand: cand.estado }

  if (ref.estado !== cand.estado) r.tipo = 'estado'
  else if (ref.estado === 'aborta') r.tipo = ref.error === cand.error ? 'igual' : 'mensaje'
  else {
    const todas = [...diferencias(ref.layout, cand.layout, 'layout'), ...diferencias(ref.qa, cand.qa, 'qa')]
    // Una clave que la referencia no tenía en el QA es QA NUEVO (el contrato creció), no un cambio de la pieza. En el
    // LAYOUT, en cambio, una clave nueva es un cambio de la maquetación y se aprueba mirando.
    const nuevas = todas.filter(x => /^qa\..*: undefined → /.test(x))
    const d = todas.filter(x => !nuevas.includes(x))
    const avisosNuevos = ref.avisos.filter(a => !cand.avisos.includes(a))
    const avisosPerdidos = cand.avisos.filter(a => !ref.avisos.includes(a))

    const [gRef, gCand] = await Promise.all([veredicto(REF_FILE, path.join(dir, 'ref')), veredicto(CANDIDATO, path.join(dir, 'cand'))])
    const gateNuevas = gCand.filter(l => !gRef.includes(l))
    const gateQuitadas = gRef.filter(l => !gCand.includes(l))

    if (d.length) { r.tipo = 'layout'; r.diferencias = d }
    else if (ref.pngSha !== cand.pngSha) r.tipo = 'pixeles'
    else if (avisosNuevos.length || avisosPerdidos.length) r.tipo = 'avisos'
    else if (gateNuevas.length || gateQuitadas.length) r.tipo = 'gate'
    else r.tipo = nuevas.length ? 'qa-nuevo' : 'igual'
    if (gateNuevas.length || gateQuitadas.length) r.gate = { nuevas: gateNuevas, quitadas: gateQuitadas }
    if (avisosNuevos.length || avisosPerdidos.length) r.avisos = { antes: avisosNuevos, ahora: avisosPerdidos }
    if (nuevas.length) r.qaNuevo = nuevas
    if (ref.pngSha !== cand.pngSha) r.pixeles = await pixeles(ref.png, cand.png)
  }

  if (ref.error) r.errorRef = ref.error
  if (cand.error) r.errorCand = cand.error
  r.dir = dir

  return r
}

// 4 · Primero una pieza por plate, en paralelo entre plates distintos: calienta la caché de máscaras sin que
//     dos procesos escriban la misma entrada a la vez. Después, el resto.
const porPlate = new Map()

for (const c of casos.values()) if (!porPlate.has(c.plateSha)) porPlate.set(c.plateSha, c)
const primeros = [...porPlate.values()]
const resto = [...casos.values()].filter(c => !primeros.includes(c))
const resultados = []
let hechos = 0

async function pool(lista) {
  const cola = [...lista]

  await Promise.all(Array.from({ length: JOBS }, async () => {
    for (let c = cola.shift(); c; c = cola.shift()) {
      resultados.push(await evaluar(c))
      hechos++
      if (hechos % 10 === 0 || hechos === casos.size) console.log(`  ${hechos}/${casos.size}`)
    }
  }))
}

await pool(primeros)
await pool(resto)

// 5 · Reporte.
const cuenta = t => resultados.filter(r => r.tipo === t)
const orden = ['estado', 'layout', 'pixeles', 'avisos', 'gate', 'mensaje', 'qa-nuevo']

fs.writeFileSync(path.join(TMP, 'reporte.json'), JSON.stringify({ ref: REF, refSha, candidato: path.relative(ROOT, CANDIDATO), resultados }, null, 2))

console.log(`\nIguales: ${cuenta('igual').length} de ${resultados.length} (${resultados.filter(r => r.ref === 'compone').length} componen en la referencia, ${resultados.filter(r => r.ref === 'aborta').length} abortan)`)

for (const t of orden) {
  const lista = cuenta(t)

  if (!lista.length) continue

  // Las claves nuevas del QA se resumen: listar 76 piezas idénticas tapa las diferencias que sí importan.
  if (t === 'qa-nuevo') {
    const claves = [...new Set(lista.flatMap(r => r.qaNuevo.map(d => d.split(':')[0].replace(/^qa\./, '').split('.')[0])))]

    console.log(`\n🔵 El QA suma claves en ${lista.length} piezas que no cambian: ${claves.join(', ')}`)
    continue
  }

  console.log(`\n${{ estado: '🔴 Cambia el ESTADO', layout: '🟠 Cambia el LAYOUT o el QA', pixeles: '🟡 Sólo cambian PÍXELES', avisos: '🟣 Cambian los AVISOS del compositor', gate: '⛔ Cambia el VEREDICTO del gate (la pieza no cambia)', mensaje: '⚪ Cambia el mensaje de error', 'qa-nuevo': '🔵 El QA suma claves (la pieza no cambia)' }[t]} (${lista.length})`)

  for (const r of lista) {
    console.log(`  · ${r.id}  [${r.planes[0]}${r.planes.length > 1 ? ` +${r.planes.length - 1}` : ''}]`)
    if (t === 'estado') console.log(`      ${r.ref} → ${r.cand}${r.errorRef ? `\n      antes: ${r.errorRef}` : ''}${r.errorCand ? `\n      ahora: ${r.errorCand}` : ''}`)
    if (t === 'mensaje') console.log(`      antes: ${r.errorRef}\n      ahora: ${r.errorCand}`)
    for (const d of (r.diferencias ?? r.qaNuevo ?? []).slice(0, 4)) console.log(`      ${d}`)
    if ((r.diferencias?.length ?? 0) > 4) console.log(`      … y ${r.diferencias.length - 4} más`)
    if (r.pixeles) console.log(`      píxeles: ${JSON.stringify(r.pixeles)}`)
    for (const a of r.avisos?.antes ?? []) console.log(`      aviso que ya no sale: ${a}`)
    for (const a of r.avisos?.ahora ?? []) console.log(`      aviso nuevo: ${a}`)
    for (const l of r.gate?.nuevas ?? []) console.log(`      el gate suma: ${l}`)
    for (const l of r.gate?.quitadas ?? []) console.log(`      el gate ya no dice: ${l}`)
  }
}

if (omitidas.length) console.log(`\n⛔ Piezas OMITIDAS — no se verificaron, así que la corrida no puede dar verde (${omitidas.length}):\n${omitidas.map(o => `  · ${o}`).join('\n')}`)
if (faltantes.length) console.log(`\n⛔ Faltan piezas del manifiesto de COBERTURA (${faltantes.length}) — la red se achicó; si fue a propósito, --actualizar-cobertura:\n${faltantes.map(o => `  · ${o}`).join('\n')}`)
if (sinPlate.length) console.log(`\nℹ️  ${sinPlate.length} pieza(s) con CTA no tienen plate en esta máquina y no se verificaron.`)
if (activosCambiados.length) console.log(`\n⚠ Cambiaron activos que la referencia hermética no cubre (fuentes, logos o paquetes) desde ${REF}: ${activosCambiados.join(', ')}. Los dos lados los leen del árbol de trabajo, así que esa diferencia NO aparece arriba: compara esas piezas a ojo.`)

// Limpieza: se conservan sólo las piezas con diferencias (son la evidencia a mirar) y el reporte.
if (!CONSERVAR) for (const r of resultados.filter(x => x.tipo === 'igual' || x.tipo === 'qa-nuevo')) fs.rmSync(r.dir, { recursive: true, force: true })

console.log(`\nReporte: ${path.join(TMP, 'reporte.json')}${CONSERVAR ? '' : ' (se borraron las carpetas de las piezas iguales; --conservar las guarda)'}`)
// Claves nuevas en el QA no dañan nada: informan, no fallan. Todo lo demás es una diferencia a aprobar mirando.
process.exitCode = omitidas.length === 0 && faltantes.length === 0 && resultados.every(r => r.tipo === 'igual' || r.tipo === 'qa-nuevo') ? 0 : 1
