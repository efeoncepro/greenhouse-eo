// pnpm ai-gen:pull <carpeta|ruta> [...] [--jobs 8]
//
// Rehidrata desde el bucket a la MISMA ruta local:
//   · si la ruta está en `scripts/foto/assets.lock.json` → desde el canon (es la versión aprobada);
//   · si no, desde el archivo según el `artifacts.remote.json` de la carpeta (su `gsUri` por archivo).
// Acepta la carpeta con o sin el prefijo `ai-generations/`, o un archivo dentro de ella.
//
// Verifica el sha256 de cada archivo antes de dejarlo en su lugar (baja a un `.part` y renombra sólo si
// calza). Idempotente: lo que ya está en disco con el hash correcto se salta. Una copia local DISTINTA
// de la inventariada no se pisa (puede ser trabajo nuevo): se reporta y el comando sale ≠ 0.
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'

import { describeFile } from '../media/ai-generation-artifacts.mjs'

import {
  AI_GEN,
  canonBucket,
  gcloudAsync,
  gsUrl,
  loadLockAssets,
  normalizeTarget,
  parseFlag,
  pool,
  readArtifacts,
  ROOT
} from './lib.mjs'

const argv = process.argv.slice(2)
const jobs = Math.max(1, Number(parseFlag(argv, '--jobs', 8)) || 8)
const targets = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--jobs')

if (!targets.length) {
  console.error('Uso: pnpm ai-gen:pull ai-generations/<carpeta>[/<archivo>] [...] [--jobs 8]')
  process.exit(1)
}

const lock = loadLockAssets()
const canon = canonBucket()
const wanted = new Map()
let failed = 0

for (const arg of targets) {
  let t

  try {
    t = normalizeTarget(arg)
  } catch (e) {
    console.error(`✗ ${e.message}`)
    failed++
    continue
  }

  const rel = t.sub ? `${AI_GEN}/${t.folder}/${t.sub}` : `${AI_GEN}/${t.folder}`
  const inScope = r => r === rel || r.startsWith(`${rel}/`)
  let found = 0

  for (const [r, { sha256 }] of Object.entries(lock)) {
    if (!inScope(r)) continue
    wanted.set(r, { sha256, uri: gsUrl(canon, r) })
    found++
  }

  for (const f of readArtifacts(t.folder)?.files ?? []) {
    const full = `${AI_GEN}/${t.folder}/${f.path}`

    if (!inScope(full) || wanted.has(full)) continue
    wanted.set(full, { sha256: f.sha256, uri: f.gsUri })
    found++
  }

  if (!found) {
    console.error(`✗ ${rel}: no está ni en el lock de foto ni en un artifacts.remote.json (pnpm ai-gen:where ${rel})`)
    failed++
  }
}

const items = [...wanted]
let skipped = 0
let pulled = 0
const conflicts = []
const errors = []
const sha = async abs => (await describeFile({ fullPath: abs, relativePath: path.basename(abs) })).sha256

await pool(items, jobs, async ([rel, { sha256, uri }]) => {
  const abs = path.join(ROOT, rel)

  if (existsSync(abs)) {
    if ((await sha(abs)) === sha256) skipped++
    else conflicts.push(rel)

    return
  }

  mkdirSync(path.dirname(abs), { recursive: true })
  const tmp = `${abs}.part-${process.pid}`
  const r = await gcloudAsync(['storage', 'cp', uri, tmp])

  if (r.status !== 0) {
    rmSync(tmp, { force: true })
    errors.push(`${rel}: ${(r.stderr || '').trim().split('\n').pop()}`)

    return
  }

  const got = await sha(tmp)

  if (got !== sha256) {
    rmSync(tmp, { force: true })
    errors.push(`${rel}: el sha256 bajado no calza con el inventario (${got.slice(0, 12)}… ≠ ${sha256.slice(0, 12)}…)`)

    return
  }

  renameSync(tmp, abs)
  pulled++
  console.log(`  ✓ ${rel}`)
})

console.log(`\n${items.length} archivos · ${pulled} bajados · ${skipped} ya estaban con el hash correcto`)

if (conflicts.length) {
  console.log(
    `\n  ⚠ ${conflicts.length} existen en disco con OTRO contenido (no se pisan; muévelos si quieres la versión del bucket):`
  )
  for (const c of conflicts.slice(0, 20)) console.log(`    ${c}`)
}

if (errors.length) {
  console.log(`\n  ✗ ${errors.length} no se pudieron bajar o no calzaron:`)
  for (const e of errors.slice(0, 20)) console.log(`    ${e}`)
}

if (failed || conflicts.length || errors.length) process.exit(1)
