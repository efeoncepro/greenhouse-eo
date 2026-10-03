// Referencias de foto desde el bucket CANON, a demanda [operador, 2026-10-03].
//
// «Encuentra una manera de que el CLI hale esto de un bucket de GCP, porque al ser tantas imágenes es una locura el
// peso»; y «más que las referencias faltantes, también más nuevas: ¿necesitas sí o sí que estén en local?». El modelo
// recibe los BYTES de cada referencia, así que el archivo tiene que pasar por la máquina al generar, pero no tiene que
// vivir en el repo: el lock (`scripts/foto/assets.lock.json`) dice qué versión está aprobada y el canon
// (`gs://efeonce-creative-canon`, misma ruta que la local) la guarda. Antes de usar una referencia sellada:
//   · falta en disco → se baja del canon;
//   · está, pero su sha256 no es el del lock (hay una versión más nueva aprobada) → se baja y reemplaza;
//   · la copia local distinta se APARTA como `<archivo>.local-<sha8>.<ext>`, nunca se pisa: puede ser trabajo nuevo
//     sin sellar.
// Siempre verifica el sha256 de lo bajado contra el lock antes de dejarlo en su lugar (`.part` + rename).
//
// Encendido sólo en los CLI (`foto:prompt`, `foto:generar`) con `activarCanon()`; las pruebas no tocan la red.
// `FOTO_SIN_CANON=1` lo apaga (sin red, o para trabajar con copias locales a propósito).
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const LOCK = path.join(RAIZ, 'scripts/foto/assets.lock.json')
const CONTROL = path.join(RAIZ, 'scripts/creative-workbench/control.json')

let activo = false
let lock = null
let bucket = null
const vistas = new Map() // ruta → resultado ya resuelto en esta corrida (no re-hashear ni re-bajar)

/** Enciende la sincronización con el canon para este proceso (salvo `FOTO_SIN_CANON=1`). */
export const activarCanon = () => {
  activo = process.env.FOTO_SIN_CANON !== '1'

  return activo
}

const sha256De = abs => createHash('sha256').update(readFileSync(abs)).digest('hex')

const cargar = () => {
  if (!lock) lock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, 'utf8')).assets ?? {} : {}
  if (!bucket) bucket = JSON.parse(readFileSync(CONTROL, 'utf8')).gcp.canonBucket

  return { lock, bucket }
}

/** Baja `rel` del canon a su ruta local verificando el sha256. Devuelve { ok, motivo }. */
export const bajarDelCanon = (rel, esperado, { gcloud = args => spawnSync('gcloud', [...args, '--quiet'], { encoding: 'utf8' }) } = {}) => {
  const { bucket: b } = cargar()
  const abs = path.join(RAIZ, rel)
  const tmp = `${abs}.part-${process.pid}`

  mkdirSync(path.dirname(abs), { recursive: true })
  const r = gcloud(['storage', 'cp', `gs://${b}/${rel.split(path.sep).join('/')}`, tmp])

  if (r.status !== 0 || !existsSync(tmp)) {
    rmSync(tmp, { force: true })

    return { ok: false, motivo: `gcloud: ${String(r.stderr || '').trim().split('\n').pop() || `salió ${r.status}`}` }
  }

  const got = sha256De(tmp)

  if (got !== esperado) {
    rmSync(tmp, { force: true })

    return { ok: false, motivo: `lo bajado no calza con el lock (${got.slice(0, 12)}… ≠ ${esperado.slice(0, 12)}…)` }
  }

  if (existsSync(abs)) {
    const ext = path.extname(abs)
    const apartado = `${abs.slice(0, -ext.length)}.local-${sha256De(abs).slice(0, 8)}${ext}`

    renameSync(abs, apartado)
    console.error(`  ↺ ${rel}: la copia local no era la aprobada; quedó aparte en ${path.basename(apartado)}`)
  }

  renameSync(tmp, abs)
  console.error(`  ⇣ ${rel} (canon)`)

  return { ok: true, motivo: 'bajada del canon' }
}

/**
 * Asegura que la referencia `rel` (ruta relativa al repo) esté en disco y sea la versión del lock. Devuelve true si
 * el archivo existe al terminar. Sin sincronización activa, o si la ruta no está sellada, sólo mira el disco.
 */
export const asegurarReferencia = (rel, opciones = {}) => {
  const norm = path.normalize(rel)

  if (vistas.has(norm)) return vistas.get(norm)

  const abs = path.join(RAIZ, norm)

  if (!activo) return existsSync(abs)

  const esperado = cargar().lock[norm.split(path.sep).join('/')]?.sha256

  if (!esperado) {
    vistas.set(norm, existsSync(abs))

    return vistas.get(norm)
  }

  if (existsSync(abs) && sha256De(abs) === esperado) {
    vistas.set(norm, true)

    return true
  }

  const r = bajarDelCanon(norm, esperado, opciones)

  if (!r.ok) console.error(`  ⚠ ${norm}: no se pudo traer del canon (${r.motivo})`)
  vistas.set(norm, existsSync(abs))

  return vistas.get(norm)
}

/**
 * Sólo para pruebas: reinicia el estado del módulo.
 * @param {{ activoInicial?: boolean, lockFijo?: Record<string, { sha256: string }> | null, bucketFijo?: string | null }} [opciones]
 */
export const _reiniciar = ({ activoInicial = false, lockFijo = null, bucketFijo = null } = {}) => {
  activo = activoInicial
  lock = lockFijo
  bucket = bucketFijo
  vistas.clear()
}
