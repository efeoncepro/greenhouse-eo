// pnpm ai-gen:archive plan|apply [--folder <carpeta>]... [--keep-local] [--min-age-days 3] [--jobs 4]
//
// Libera el disco de `ai-generations/` archivando los BINARIOS de las carpetas que no se usan. Extiende
// el primitive `pnpm media:archive-ai-generation` (mismo bucket, misma ruta de objeto, mismo
// `artifacts.remote.json`, misma sincronización): no es un segundo sistema de archivo.
//
// Candidatas = todas las carpetas MENOS las protegidas (`pnpm ai-gen:protected`, derivadas), MENOS las
// que tienen algún archivo modificado hace menos de --min-age-days, MENOS las que empiezan con `.`,
// MENOS las que ya no tienen binarios en disco.
//
// `apply`, por carpeta y en este orden — si un paso falla, los siguientes NO corren:
//   1. foto del estado de los binarios (ruta, tamaño, mtime) y hash local (sha256 + md5);
//   2. si al bucket le falta algo (o la carpeta nunca se archivó), sincroniza con el primitive;
//   3. READBACK: relista el bucket y exige, por binario, tamaño y hash del SERVIDOR (md5, o crc32c si el
//      objeto es compuesto) iguales al local, y sha256 + tamaño iguales al inventario; lo que el
//      inventario anterior declaraba y ya no está en disco tiene que seguir en el bucket;
//   4. escribe `artifacts.remote.json` (unido con el anterior: lo ya archivado no sale del inventario);
//   5. re-verifica que los binarios no cambiaron desde el paso 1, que la carpeta no entró a la lista
//      protegida y que nada se modificó en la ventana de edad — la ACCIÓN falla si el estado se movió —
//      y recién entonces borra los binarios locales. Los .md/.json/.mjs se quedan, y nunca se borra un
//      archivo que git versiona.
//
// Nunca borra en el bucket. Con --keep-local sólo sube, verifica e inventaría.
import { existsSync, readdirSync, renameSync, rmdirSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { gcloudJson } from '../creative-workbench/gcp.mjs'
import {
  ARTIFACTS_MANIFEST_NAME,
  buildArtifactsManifest,
  collectFiles,
  DEFAULT_PREFIX,
  describeFile,
  objectPrefixFor,
  resolveArchiveBucket,
  syncBinaries
} from '../media/ai-generation-artifacts.mjs'

import {
  AI_GEN,
  compareReadback,
  computeProtected,
  crc32c,
  DAY_MS,
  formatBytes,
  listFolders,
  mergeArtifactFiles,
  missingRemote,
  normalizeRemote,
  parseFlag,
  parseMulti,
  pool,
  readArtifacts,
  ROOT,
  selectCandidates,
  snapshotDiff,
  trackedFiles,
  walkFolder
} from './lib.mjs'

const argv = process.argv.slice(2)
const mode = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'plan'

if (!['plan', 'apply'].includes(mode)) {
  console.error(
    'Uso: pnpm ai-gen:archive plan|apply [--folder <carpeta>]... [--keep-local] [--min-age-days 3] [--jobs 4]'
  )
  process.exit(1)
}

const minAgeDays = Number(parseFlag(argv, '--min-age-days', 3))
const jobs = Math.max(1, Number(parseFlag(argv, '--jobs', 4)) || 4)
const keepLocal = argv.includes('--keep-local')

const onlyFolders = parseMulti(argv, '--folder').map(f =>
  f.replace(new RegExp(`^${AI_GEN}/`), '').replace(/\/+$/, '')
)

if (!Number.isFinite(minAgeDays) || minAgeDays < 0) {
  console.error('✗ --min-age-days debe ser un número ≥ 0')
  process.exit(1)
}

const defaultBucket = resolveArchiveBucket()
const protectedMap = computeProtected()
const folders = listFolders()
let { candidates, skipped } = selectCandidates({ folders, protectedSet: new Set(protectedMap.keys()), minAgeDays })
let failed = 0

if (onlyFolders.length) {
  for (const name of onlyFolders) {
    const s = skipped.find(x => x.name === name)

    if (s) {
      console.error(`✗ ${name}: no es candidata (${s.reason})`)
      failed++
    } else if (!folders.some(f => f.name === name)) {
      console.error(`✗ ${name}: no existe en ${AI_GEN}/`)
      failed++
    }
  }

  candidates = candidates.filter(c => onlyFolders.includes(c.name))
  skipped = []
}

const tracked = trackedFiles()

const rows = candidates.map(c => {
  const freeable = walkFolder(c.name, { onlyBinaries: true })
    .filter(f => !tracked.has(f.rel))
    .reduce((s, f) => s + f.bytes, 0)

  return { ...c, freeable }
})

const totalBinary = rows.reduce((s, r) => s + r.binaryBytes, 0)
const totalFree = rows.reduce((s, r) => s + r.freeable, 0)
const withManifest = rows.filter(r => r.archived).length

console.log(
  `${mode === 'plan' ? 'Plan' : 'Aplicando'} — bucket por defecto gs://${defaultBucket} · mínimo ${minAgeDays} días sin cambios${keepLocal ? ' · --keep-local' : ''}\n`
)

for (const r of rows) {
  const extra = r.freeable === r.binaryBytes ? '' : ` · libera ${formatBytes(r.freeable)} (resto versionado en git)`

  console.log(
    `  ${r.name}  ·  ${formatBytes(r.binaryBytes)} en ${r.binaries} binarios${extra}${r.archived ? ' · ya tiene artifacts.remote.json (re-verifica y completa)' : ''}`
  )
}

console.log(
  `\n  Candidatas: ${rows.length} carpetas · ${formatBytes(totalBinary)} en binarios · ${formatBytes(totalFree)} a liberar en disco · ${withManifest} ya con artifacts.remote.json`
)

if (skipped.length) {
  const byReason = new Map()

  for (const s of skipped) {
    const prev = byReason.get(s.reason) ?? { n: 0, bytes: 0 }

    byReason.set(s.reason, { n: prev.n + 1, bytes: prev.bytes + s.binaryBytes })
  }

  console.log('  Fuera:')
  for (const [k, v] of byReason) console.log(`    ${k}: ${v.n} carpetas · ${formatBytes(v.bytes)} en binarios`)
}

if (mode === 'plan') {
  if (rows.length) console.log('\nPara ejecutarlo: pnpm ai-gen:archive apply [--folder <carpeta>]')
  process.exit(failed ? 1 : 0)
}

// ── apply ─────────────────────────────────────────────────────────────────────────────────────────

function listRemote(bucket, objectPrefix) {
  const list = gcloudJson(['storage', 'objects', 'list', `gs://${bucket}/${objectPrefix}/**`])

  return list === null ? null : list.map(normalizeRemote)
}

/** Borra directorios vacíos de abajo hacia arriba (un `.DS_Store` solo no cuenta como contenido). */
function pruneEmptyDirs(dir) {
  if (!existsSync(dir)) return

  for (const d of readdirSync(dir, { withFileTypes: true })) if (d.isDirectory()) pruneEmptyDirs(path.join(dir, d.name))

  const left = readdirSync(dir)

  if (left.every(n => n === '.DS_Store')) {
    for (const n of left) rmSync(path.join(dir, n), { force: true })
    rmdirSync(dir)
  }
}

let freedTotal = 0

for (const row of rows) {
  const folder = row.name
  const rootDir = path.join(ROOT, AI_GEN, folder)
  const prev = readArtifacts(folder)
  const bucket = prev?.bucket ?? defaultBucket
  const objectPrefix = prev?.prefix ?? objectPrefixFor(DEFAULT_PREFIX, folder)

  console.log(`\n▸ ${folder}  →  gs://${bucket}/${objectPrefix}/`)

  // 1. Foto + hash (con el describeFile del primitive, más md5 para el readback).
  const before = walkFolder(folder, { onlyBinaries: true })
  const files = await collectFiles(rootDir)
  const described = await pool(files, jobs, f => describeFile(f, { verification: true }))
  const local = new Map(described.map(d => [d.path, { sha256: d.sha256, md5: d.md5, bytes: d.sizeBytes }]))

  // 2. Sincronizar sólo si falta algo.
  const remoteBefore = listRemote(bucket, objectPrefix)

  if (remoteBefore === null) {
    console.log(`  ✗ no pude listar gs://${bucket}/${objectPrefix}/ — no se toca nada`)
    failed++
    continue
  }

  const missing = missingRemote(local, remoteBefore, objectPrefix)

  if (missing.length) {
    console.log(`  sincronizando ${missing.length} de ${local.size} binarios con el primitive…`)

    try {
      syncBinaries({ rootDir, bucket, objectPrefix })
    } catch (e) {
      console.log(`  ✗ ${e.message.split('\n')[0]} — no se escribe el inventario ni se borra nada`)
      failed++
      continue
    }
  } else console.log(`  ${local.size} binarios ya estaban en el bucket`)

  // 3. Readback.
  const remote = listRemote(bucket, objectPrefix)

  if (remote === null) {
    console.log('  ✗ no pude relistar el bucket — no se escribe el inventario ni se borra nada')
    failed++
    continue
  }

  const byName = new Map(remote.map(o => [o.name, o]))

  // Objetos compuestos no traen md5: para esos (y sólo esos) se calcula el crc32c local.
  await pool(
    [...local].filter(([rel]) => byName.get(`${objectPrefix}/${rel}`) && !byName.get(`${objectPrefix}/${rel}`).md5),
    jobs,
    async ([rel, l]) => {
      l.crc32c = crc32c(await readFile(path.join(rootDir, rel)))
    }
  )

  const current = described.map(d => ({
    path: d.path,
    sizeBytes: d.sizeBytes,
    sha256: d.sha256,
    gsUri: `gs://${bucket}/${objectPrefix}/${d.path}`
  }))

  const merged = mergeArtifactFiles(prev?.files, current)
  const manifestMap = new Map(merged.map(f => [f.path, f]))
  const check = compareReadback({ local, remote, manifest: manifestMap, objectPrefix })

  for (const f of merged) {
    if (local.has(f.path)) continue
    const r = byName.get(`${objectPrefix}/${f.path}`)

    if (!r) check.problems.push(`${f.path}: el inventario anterior lo declara y ya no está en el bucket`)
    else if (r.bytes !== f.sizeBytes) check.problems.push(`${f.path}: tamaño en el bucket ≠ inventario anterior`)
  }

  if (check.problems.length) {
    for (const p of check.problems.slice(0, 10)) console.log(`  ✗ ${p}`)
    console.log(`  ✗ readback falló (${check.problems.length}) — no se escribe el inventario ni se borra nada`)
    failed++
    continue
  }

  console.log(`  ✓ readback: ${local.size} binarios calzan (tamaño + hash del servidor + sha256 del inventario)`)

  // 4. Inventario (escritura atómica: un corte a mitad no deja un JSON truncado).
  const manifest = buildArtifactsManifest({ run: `${AI_GEN}/${folder}`, bucket, objectPrefix, files: merged })
  const manifestPath = path.join(rootDir, ARTIFACTS_MANIFEST_NAME)
  const tmp = `${manifestPath}.tmp-${process.pid}`

  writeFileSync(tmp, `${JSON.stringify(manifest, null, 2)}\n`)
  renameSync(tmp, manifestPath)
  console.log(`  ✓ ${AI_GEN}/${folder}/${ARTIFACTS_MANIFEST_NAME} (${merged.length} binarios inventariados)`)

  if (keepLocal) continue

  // 5. Guardas justo antes de borrar: si el estado se movió, la acción falla.
  const diff = snapshotDiff(before, walkFolder(folder, { onlyBinaries: true }))

  if (diff.length) {
    for (const d of diff.slice(0, 10)) console.log(`  ✗ ${d}`)
    console.log('  ✗ los binarios cambiaron desde el hash — no se borra nada (vuelve a correr apply)')
    failed++
    continue
  }

  const newest = walkFolder(folder)
    .filter(f => f.relInFolder !== ARTIFACTS_MANIFEST_NAME)
    .reduce((m, f) => Math.max(m, f.mtimeMs), 0)

  if (newest > Date.now() - minAgeDays * DAY_MS) {
    console.log(`  ✗ algo en la carpeta se modificó hace < ${minAgeDays} días — no se borra nada`)
    failed++
    continue
  }

  if (computeProtected().has(folder)) {
    console.log('  ✗ la carpeta entró a la lista protegida mientras se archivaba — no se borra nada')
    failed++
    continue
  }

  const trackedNow = trackedFiles()
  let freed = 0
  let kept = 0

  for (const f of before) {
    if (trackedNow.has(f.rel)) {
      kept++
      continue
    }

    rmSync(path.join(ROOT, f.rel), { force: true })
    freed += f.bytes
  }

  pruneEmptyDirs(rootDir)
  freedTotal += freed
  console.log(
    `  ✓ binarios locales borrados: ${formatBytes(freed)} liberados${kept ? ` · ${kept} versionados en git quedan` : ''}`
  )
}

console.log(`\nLiberado: ${formatBytes(freedTotal)}${failed ? ` · ${failed} con error` : ''}`)
if (failed) process.exit(1)
