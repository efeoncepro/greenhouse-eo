// Núcleo de `pnpm ai-gen:protected|where|pull|archive`: liberar el disco de `ai-generations/` sin romper
// la composición creativa.
//
// El archivo NO es un sistema nuevo: reusa el primitive `pnpm media:archive-ai-generation`
// (scripts/media/archive-ai-generation.mjs + ai-generation-artifacts.mjs): mismo bucket por defecto
// (`GREENHOUSE_AI_GENERATIONS_BUCKET`), misma ruta de objeto (`ai-generations/<carpeta>/<archivo>`) y el
// mismo inventario por carpeta, `artifacts.remote.json` (versionado en git). Encima agrega lo que ese
// primitive no hace: lista protegida derivada, readback contra el bucket, guardas y borrado local de los
// BINARIOS (los .md/.json/.mjs de la carpeta se quedan).
//
// 🔴 La lista protegida se DERIVA, nunca se escribe a mano: lo que el lock de foto sella, lo que las
// recetas de deck citan y lo que el código cita no se archiva. Una lista literal envejece en silencio y
// el día que una receta nueva apunte a una carpeta archivada, la composición se rompe sin aviso.
//
// La lógica pura (derivación, filtros, readback, crc32c, rutas) vive arriba y se prueba sin red en
// `lib.test.mjs`. La entrada/salida (disco, git, gcloud) vive abajo.
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { loadControl, readJson, ROOT, run } from '../creative-workbench/lib.mjs'
import { ARTIFACTS_MANIFEST_NAME, isBinary } from '../media/ai-generation-artifacts.mjs'

export { ROOT, run }

export const AI_GEN = 'ai-generations'
export const LOCK_REL = 'scripts/foto/assets.lock.json'
export const RECIPES_REL = 'docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json'

// Directorios de código cuyas citas protegen una carpeta (contrato: `src/**` y `scripts/**`).
export const CODE_ROOTS = ['src', 'scripts']

// Nombre de carpeta: empieza con letra, dígito o `_` (las `.` son temporales y no se archivan ni protegen).
const FOLDER_CHARS = '[A-Za-z0-9_][A-Za-z0-9._-]*'

// `scripts/ai-generations/…` es ESTE directorio (los scripts del archivo), no una carpeta de assets.
const CITATION_RE = new RegExp(`(?<!scripts/)${AI_GEN}/(${FOLDER_CHARS})(\\$\\{)?`, 'g')

export const DAY_MS = 24 * 60 * 60 * 1000

const toPosix = p => p.split(path.sep).join('/')

// ── Lógica pura ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Carpetas citadas en un texto. `exact` = nombre completo; `prefixes` = cita truncada por una
 * interpolación (p. ej. `<raíz>/2026-09-20_palancas-${r}`): protege toda carpeta que empiece así.
 */
export function extractCitedFolders(text) {
  const exact = new Set()
  const prefixes = new Set()

  for (const m of String(text).matchAll(CITATION_RE)) {
    if (m[2]) prefixes.add(m[1])
    else exact.add(m[1])
  }

  return { exact, prefixes }
}

/** Carpeta (segundo segmento) de una ruta `ai-generations/<carpeta>/...`; null si no es de ahí. */
export function folderOfRel(rel) {
  const parts = toPosix(rel).split('/')

  if (parts[0] !== AI_GEN || parts.length < 2 || !parts[1]) return null

  return parts[1]
}

/**
 * Acepta `ai-generations/<carpeta>[/sub]`, `<carpeta>[/sub]` o una ruta absoluta dentro del repo.
 * Devuelve `{ folder, sub }` (sub = ruta relativa a la carpeta, '' si es la carpeta entera).
 */
export function normalizeTarget(arg, root = ROOT) {
  let rel = toPosix(String(arg).trim())

  if (path.isAbsolute(rel)) rel = toPosix(path.relative(root, rel))
  rel = rel.replace(/^\.\//, '').replace(/\/+$/, '')
  if (!rel.startsWith(`${AI_GEN}/`)) rel = `${AI_GEN}/${rel}`

  const [, folder, ...rest] = rel.split('/')

  if (!folder || folder.startsWith('.') || folder === '..' || rest.includes('..')) {
    throw new Error(`Ruta fuera de ${AI_GEN}/: ${arg}`)
  }

  return { folder, sub: rest.join('/') }
}

/** gs:// de una ruta relativa al repo en un bucket. La ruta del objeto es la MISMA que la local. */
export function gsUrl(bucket, rel) {
  return `gs://${bucket}/${toPosix(rel).replace(/^\/+/, '')}`
}

/**
 * Lista protegida derivada.
 *   lockPaths:   claves de `assets.lock.json` (rutas `ai-generations/...`);
 *   recipesText: texto de las recetas de deck;
 *   codeHits:    [{ file, text }] con líneas de src/ y scripts/ que citan `ai-generations/`;
 *   folders:     carpetas existentes en disco (para expandir prefijos).
 * Devuelve Map<carpeta, string[] motivos>.
 */
export function deriveProtected({ lockPaths = [], recipesText = '', codeHits = [], folders = [] }) {
  const out = new Map()

  const add = (folder, motivo) => {
    if (!folder || folder.startsWith('.')) return
    if (!out.has(folder)) out.set(folder, new Set())
    out.get(folder).add(motivo)
  }

  for (const rel of lockPaths) add(folderOfRel(rel), 'lock de foto (scripts/foto/assets.lock.json)')

  const recipes = extractCitedFolders(recipesText)

  for (const f of recipes.exact) add(f, 'recetas de deck')

  for (const p of recipes.prefixes)
    for (const f of folders) if (f.startsWith(p)) add(f, `recetas de deck (prefijo ${p}…)`)

  const byFolder = new Map()

  const cite = (f, file) => {
    if (!byFolder.has(f)) byFolder.set(f, new Set())
    byFolder.get(f).add(file)
  }

  for (const { file, text } of codeHits) {
    const cited = extractCitedFolders(text)

    for (const f of cited.exact) cite(f, file)
    for (const p of cited.prefixes) for (const f of folders) if (f.startsWith(p)) cite(f, `${file} (prefijo ${p}…)`)
  }

  for (const [f, files] of byFolder) {
    const list = [...files].sort()

    add(f, `código: ${list.slice(0, 3).join(', ')}${list.length > 3 ? ` (+${list.length - 3})` : ''}`)
  }

  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)).map(([f, s]) => [f, [...s]]))
}

/** Salida de `git grep -I -E --untracked <patrón>` (línea completa, `archivo:línea`) → [{ file, text }]. */
export function parseGitGrep(output, excludeFiles = []) {
  const hits = []

  for (const line of String(output).split('\n')) {
    const i = line.indexOf(':')

    if (i <= 0) continue
    const file = line.slice(0, i)

    if (excludeFiles.includes(file)) continue
    hits.push({ file, text: line.slice(i + 1) })
  }

  return hits
}

/**
 * Candidatas a archivar: todas las carpetas, MENOS las que empiezan con `.`, MENOS las protegidas,
 * MENOS las que tienen algún archivo modificado hace menos de `minAgeDays`, MENOS las que ya no tienen
 * binarios en disco (no hay nada que liberar).
 *   folders: [{ name, newestMtimeMs, binaries, binaryBytes, ... }]
 */
export function selectCandidates({ folders, protectedSet, now = Date.now(), minAgeDays = 3 }) {
  const candidates = []
  const skipped = []
  const limit = now - minAgeDays * DAY_MS

  for (const f of folders) {
    if (f.name.startsWith('.')) skipped.push({ ...f, reason: 'oculta' })
    else if (protectedSet.has(f.name)) skipped.push({ ...f, reason: 'protegida' })
    else if (f.newestMtimeMs > limit) skipped.push({ ...f, reason: `modificada hace < ${minAgeDays} días` })
    else if (!f.binaries) skipped.push({ ...f, reason: 'sin binarios en disco' })
    else candidates.push(f)
  }

  return { candidates, skipped }
}

// CRC-32C (Castagnoli), el que GCS calcula de todo objeto. Sólo se usa cuando el objeto no trae md5
// (los compuestos de una subida paralela no lo tienen): sin él no habría cómo probar el contenido.
const CRC32C_TABLE = (() => {
  const t = new Uint32Array(256)

  for (let i = 0; i < 256; i++) {
    let c = i

    for (let k = 0; k < 8; k++) c = c & 1 ? 0x82f63b78 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }

  return t
})()

export function crc32c(buf) {
  let c = 0xffffffff

  for (let i = 0; i < buf.length; i++) c = CRC32C_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)

  return (c ^ 0xffffffff) >>> 0
}

const b64ToHex = b64 => (b64 ? Buffer.from(b64, 'base64').toString('hex') : null)
const b64ToUint32 = b64 => (b64 ? Buffer.from(b64, 'base64').readUInt32BE(0) : null)

/** Objeto de `gcloud storage objects list --format=json` → forma comparable. */
export function normalizeRemote(o) {
  return {
    name: o.name,
    bytes: Number(o.size),
    md5: b64ToHex(o.md5_hash ?? o.md5Hash),
    crc32c: b64ToUint32(o.crc32c_hash ?? o.crc32c)
  }
}

/**
 * Readback. Cada binario local debe estar en el bucket con el mismo tamaño y el mismo contenido según el
 * hash que calculó el SERVIDOR (md5; crc32c si el objeto es compuesto), y su sha256 + tamaño tienen que
 * ser los que el inventario `artifacts.remote.json` declara para esa ruta.
 *   local:        Map<ruta relativa a la carpeta, { sha256, md5, bytes, crc32c? }>
 *   remote:       [{ name, bytes, md5, crc32c }] (normalizados) — `name` es la ruta del objeto
 *   manifest:     Map<ruta relativa a la carpeta, { sha256, sizeBytes }> (el inventario a escribir)
 *   objectPrefix: `ai-generations/<carpeta>`
 */
export function compareReadback({ local, remote, manifest, objectPrefix }) {
  const byName = new Map(remote.map(o => [o.name, o]))
  const problems = []

  for (const [rel, l] of local) {
    const r = byName.get(`${objectPrefix}/${rel}`)
    const m = manifest.get(rel)

    if (!m) problems.push(`${rel}: no está en el inventario`)
    else if (m.sha256 !== l.sha256 || m.sizeBytes !== l.bytes) problems.push(`${rel}: el inventario no calza con el disco`)
    else if (!r) problems.push(`${rel}: no está en el bucket`)
    else if (r.bytes !== l.bytes) problems.push(`${rel}: tamaño ${r.bytes} en el bucket ≠ ${l.bytes} local`)
    else if (r.md5) {
      if (r.md5 !== l.md5) problems.push(`${rel}: md5 del servidor ≠ local (contenido distinto)`)
    } else if (r.crc32c === null || l.crc32c === undefined) {
      problems.push(`${rel}: el objeto no trae md5 y no hay crc32c que comparar — no se puede verificar`)
    } else if (r.crc32c !== l.crc32c) problems.push(`${rel}: crc32c del servidor ≠ local (contenido distinto)`)
  }

  return { ok: problems.length === 0, problems }
}

/** Rutas locales que el bucket no tiene con el mismo tamaño y md5: hay que sincronizar. */
export function missingRemote(local, remote, objectPrefix) {
  const byName = new Map(remote.map(o => [o.name, o]))

  return [...local].filter(([rel, l]) => {
    const r = byName.get(`${objectPrefix}/${rel}`)

    return !r || r.bytes !== l.bytes || (r.md5 && r.md5 !== l.md5)
  })
}

/**
 * `files` del inventario, UNIDO con el anterior: si la carpeta se archivó antes, sus binarios se borraron
 * y luego se rehidrató o creció en parte, lo que ya estaba en el bucket no puede salir del inventario.
 * (El primitive `media:archive-ai-generation` reescribe `files` sólo con lo que hay en disco.)
 */
export function mergeArtifactFiles(prevFiles = [], currentFiles = []) {
  const byPath = new Map(prevFiles.map(f => [f.path, f]))

  for (const f of currentFiles) byPath.set(f.path, f)

  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path))
}

/** Diferencias entre dos fotos del estado de una carpeta ([{ rel, bytes, mtimeMs }]). [] = no cambió. */
export function snapshotDiff(before, after) {
  const a = new Map(before.map(f => [f.rel, f]))
  const b = new Map(after.map(f => [f.rel, f]))
  const out = []

  for (const [rel, f] of a) {
    const g = b.get(rel)

    if (!g) out.push(`${rel}: desapareció`)
    else if (g.bytes !== f.bytes || g.mtimeMs !== f.mtimeMs) out.push(`${rel}: cambió`)
  }

  for (const rel of b.keys()) if (!a.has(rel)) out.push(`${rel}: archivo nuevo`)

  return out
}

export function formatBytes(n) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`

  return `${n} B`
}

// ── Entrada/salida ──────────────────────────────────────────────────────────────────────────────────

/** Bucket canon (refs aprobadas selladas en el lock), de `scripts/creative-workbench/control.json`. */
export const canonBucket = () => loadControl().gcp.canonBucket

/**
 * Archivos de una carpeta: [{ rel (relativa al repo), relInFolder, bytes, mtimeMs, binary }], sin
 * `.DS_Store`. Con `onlyBinaries` sólo los binarios (lo único que se archiva y se borra).
 */
export function walkFolder(folder, { root = ROOT, onlyBinaries = false } = {}) {
  const dir = path.join(root, AI_GEN, folder)

  if (!existsSync(dir)) return []

  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(d => d.isFile() && d.name !== '.DS_Store' && (!onlyBinaries || isBinary(d.name)))
    .map(d => {
      const abs = path.join(d.parentPath, d.name)
      const st = statSync(abs)
      const relInFolder = toPosix(path.relative(dir, abs))

      return {
        rel: `${AI_GEN}/${folder}/${relInFolder}`,
        relInFolder,
        bytes: st.size,
        mtimeMs: st.mtimeMs,
        binary: isBinary(d.name)
      }
    })
    .sort((x, y) => x.rel.localeCompare(y.rel))
}

/**
 * Carpetas de primer nivel con tamaño, binarios y archivo más reciente. El propio `artifacts.remote.json`
 * no cuenta para la edad: archivar no debe volver "reciente" a la carpeta que acaba de archivar.
 */
export function listFolders(root = ROOT) {
  const base = path.join(root, AI_GEN)

  if (!existsSync(base)) return []

  return readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const files = walkFolder(d.name, { root })
      const bins = files.filter(f => f.binary)

      return {
        name: d.name,
        files: files.length,
        bytes: files.reduce((s, f) => s + f.bytes, 0),
        binaries: bins.length,
        binaryBytes: bins.reduce((s, f) => s + f.bytes, 0),
        newestMtimeMs: files
          .filter(f => f.relInFolder !== ARTIFACTS_MANIFEST_NAME)
          .reduce((m, f) => Math.max(m, f.mtimeMs), 0),
        archived: existsSync(path.join(base, d.name, ARTIFACTS_MANIFEST_NAME))
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** `artifacts.remote.json` de la carpeta, o null. */
export function readArtifacts(folder, root = ROOT) {
  const file = path.join(root, AI_GEN, folder, ARTIFACTS_MANIFEST_NAME)

  return existsSync(file) ? readJson(file) : null
}

/** Archivos de ai-generations/ que git versiona: NUNCA se borran localmente (dejarían una baja en git). */
export function trackedFiles(root = ROOT) {
  const r = run('git', ['ls-files', '-z', '--', AI_GEN], { cwd: root, allowFail: true })

  return new Set((r.stdout || '').split('\0').filter(Boolean))
}

export function loadLockAssets(root = ROOT) {
  const file = path.join(root, LOCK_REL)

  return existsSync(file) ? (readJson(file).assets ?? {}) : {}
}

/** Lista protegida derivada desde el estado ACTUAL del repo (se llama otra vez justo antes de borrar). */
export function computeProtected(root = ROOT) {
  const recipesFile = path.join(root, RECIPES_REL)

  const grep = run('git', ['grep', '-I', '-E', '--untracked', `${AI_GEN}/${FOLDER_CHARS}`, '--', ...CODE_ROOTS], {
    cwd: root,
    allowFail: true
  })

  // git grep sale 1 cuando no hay coincidencias; > 1 es un error real y no se puede seguir a ciegas.
  if (grep.status > 1) throw new Error(`git grep falló: ${grep.stderr}`)

  return deriveProtected({
    lockPaths: Object.keys(loadLockAssets(root)),
    recipesText: existsSync(recipesFile) ? readFileSync(recipesFile, 'utf8') : '',
    codeHits: parseGitGrep(grep.stdout),
    folders: listFolders(root).map(f => f.name)
  })
}

/** gcloud asíncrono (para bajar en paralelo). Sin shell: argv directo. */
export function gcloudAsync(args) {
  return new Promise(resolve => {
    const child = spawn('gcloud', [...args, '--quiet'])
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', d => (stdout += d))
    child.stderr.on('data', d => (stderr += d))
    child.on('error', e => resolve({ status: -1, stdout, stderr: String(e) }))
    child.on('close', status => resolve({ status, stdout, stderr }))
  })
}

/** Corre `fn` sobre `items` con a lo más `limit` en vuelo. */
export async function pool(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0

  const worker = async () => {
    while (next < items.length) {
      const i = next++

      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))

  return results
}

export function parseFlag(argv, name, fallback) {
  const i = argv.indexOf(name)

  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}

export function parseMulti(argv, name) {
  const out = []

  argv.forEach((a, i) => {
    if (a === name && argv[i + 1] !== undefined) out.push(argv[i + 1])
  })

  return out
}
