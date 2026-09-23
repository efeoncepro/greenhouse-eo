// `pnpm foto:componer:cta:regresion [--ref <git-ref>] [--candidato <archivo>] [--solo <texto>] [--jobs <n>]`
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
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import sharp from 'sharp'

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
const TOL_PX = 0.05
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

// 1 · El compositor de referencia se extrae de git JUNTO al canónico: sus imports relativos y la caché de
//     máscaras dependen de vivir en scripts/foto/. El archivo es temporal y está en .gitignore.
const refSha = execFileSync('git', ['rev-parse', '--short', REF], { cwd: ROOT, encoding: 'utf8' }).trim()
const REF_FILE = path.join(ROOT, `scripts/foto/.componer-cta@${refSha}.regresion.mjs`)

fs.writeFileSync(REF_FILE, execFileSync('git', ['show', `${REF}:scripts/foto/componer-cta.mjs`], { cwd: ROOT }))

const limpiar = () => fs.rmSync(REF_FILE, { force: true })

process.on('exit', limpiar)
process.on('SIGINT', () => process.exit(130))

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

for (const plan of planes.sort()) {
  let piezas

  try { piezas = JSON.parse(fs.readFileSync(plan, 'utf8')) } catch { continue }
  if (!Array.isArray(piezas) || !piezas.some(p => p?.cta)) continue
  const rel = path.relative(ROOT, plan)

  if (SOLO && !rel.includes(SOLO)) continue

  for (const p of piezas) {
    if (!p?.plate) continue
    const plate = path.resolve(path.dirname(plan), p.plate)

    if (!fs.existsSync(plate)) continue
    if (!plateSha.has(plate)) plateSha.set(plate, sha(fs.readFileSync(plate)))
    const pieza = { ...p, plate }
    const clave = sha(JSON.stringify({ ...p, plate: plateSha.get(plate) })).slice(0, 16)

    if (!casos.has(clave)) casos.set(clave, { clave, planes: [], pieza, plateSha: plateSha.get(plate) })
    casos.get(clave).planes.push(`${rel}#${p.id}`)
  }
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'foto-regresion-'))

console.log(`Regresión del compositor de CTA — referencia ${REF} (${refSha}) contra ${path.relative(ROOT, CANDIDATO)}`)
console.log(`${casos.size} piezas únicas de ${new Set([...casos.values()].flatMap(c => c.planes.map(x => x.split('#')[0]))).size} planes · ${JOBS} en paralelo · ${TMP}`)

// 3 · Componer una pieza sola con un compositor dado, en su propio directorio.
async function componer(compositor, dir, pieza) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'piezas.json'), JSON.stringify([pieza], null, 2))

  try {
    await run(process.execPath, [compositor, path.join(dir, 'piezas.json')], { cwd: ROOT, timeout: 15 * 60e3, maxBuffer: 64e6 })
  } catch (e) {
    const texto = String(e.stderr || '') + String(e.message || '')

    return { estado: 'aborta', error: (texto.match(/Error: ([^\n]+)/) ?? [null, texto.split('\n')[0]])[1].trim() }
  }

  const out = path.join(dir, 'out')
  const png = path.join(out, `${pieza.id}.png`)

  return {
    estado: 'compone',
    layout: JSON.parse(fs.readFileSync(path.join(out, `${pieza.id}-layout.json`), 'utf8')),
    qa: JSON.parse(fs.readFileSync(path.join(out, 'qa.json'), 'utf8'))[0],
    png,
    pngSha: sha(fs.readFileSync(png))
  }
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
    // Una clave que la referencia no tenía es QA NUEVO (el contrato creció), no un cambio de la pieza.
    const nuevas = todas.filter(x => /: undefined → /.test(x))
    const d = todas.filter(x => !nuevas.includes(x))

    if (d.length) { r.tipo = 'layout'; r.diferencias = d }
    else r.tipo = ref.pngSha === cand.pngSha ? (nuevas.length ? 'qa-nuevo' : 'igual') : 'pixeles'
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
const orden = ['estado', 'layout', 'pixeles', 'mensaje', 'qa-nuevo']

fs.writeFileSync(path.join(TMP, 'reporte.json'), JSON.stringify({ ref: REF, refSha, candidato: path.relative(ROOT, CANDIDATO), resultados }, null, 2))

console.log(`\nIguales: ${cuenta('igual').length} de ${resultados.length} (${resultados.filter(r => r.ref === 'compone').length} componen en la referencia, ${resultados.filter(r => r.ref === 'aborta').length} abortan)`)

for (const t of orden) {
  const lista = cuenta(t)

  if (!lista.length) continue
  console.log(`\n${{ estado: '🔴 Cambia el ESTADO', layout: '🟠 Cambia el LAYOUT o el QA', pixeles: '🟡 Sólo cambian PÍXELES', mensaje: '⚪ Cambia el mensaje de error', 'qa-nuevo': '🔵 El QA suma claves (la pieza no cambia)' }[t]} (${lista.length})`)

  for (const r of lista) {
    console.log(`  · ${r.id}  [${r.planes[0]}${r.planes.length > 1 ? ` +${r.planes.length - 1}` : ''}]`)
    if (t === 'estado') console.log(`      ${r.ref} → ${r.cand}${r.errorRef ? `\n      antes: ${r.errorRef}` : ''}${r.errorCand ? `\n      ahora: ${r.errorCand}` : ''}`)
    if (t === 'mensaje') console.log(`      antes: ${r.errorRef}\n      ahora: ${r.errorCand}`)
    for (const d of (r.diferencias ?? r.qaNuevo ?? []).slice(0, 4)) console.log(`      ${d}`)
    if ((r.diferencias?.length ?? 0) > 4) console.log(`      … y ${r.diferencias.length - 4} más`)
    if (r.pixeles) console.log(`      píxeles: ${JSON.stringify(r.pixeles)}`)
  }
}

console.log(`\nReporte: ${path.join(TMP, 'reporte.json')}`)
// Claves nuevas en el QA no dañan nada: informan, no fallan. Todo lo demás es una diferencia a aprobar mirando.
process.exitCode = resultados.every(r => r.tipo === 'igual' || r.tipo === 'qa-nuevo') ? 0 : 1
