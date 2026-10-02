// pnpm ai-gen:where <ruta|carpeta>
//
// Dice dónde vive una ruta de `ai-generations/`: en este disco, en el canon (lock de foto), en el
// archivo (`artifacts.remote.json` de la carpeta) o en ninguno conocido. Imprime el gs:// y el comando
// para bajarla.
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'

import { AI_GEN, canonBucket, gsUrl, loadLockAssets, normalizeTarget, readArtifacts, ROOT, walkFolder } from './lib.mjs'

const arg = process.argv[2]

if (!arg) {
  console.error('Uso: pnpm ai-gen:where ai-generations/<carpeta>[/<archivo>]')
  process.exit(1)
}

let target

try {
  target = normalizeTarget(arg)
} catch (e) {
  console.error(`✗ ${e.message}`)
  process.exit(1)
}

const { folder, sub } = target
const rel = sub ? `${AI_GEN}/${folder}/${sub}` : `${AI_GEN}/${folder}`
const inScope = r => r === rel || r.startsWith(`${rel}/`)
const abs = path.join(ROOT, rel)

const local = existsSync(abs)
  ? statSync(abs).isDirectory()
    ? walkFolder(folder).filter(f => inScope(f.rel))
    : [abs]
  : []

const canon = Object.keys(loadLockAssets()).filter(inScope)
const artifacts = readArtifacts(folder)
const archived = (artifacts?.files ?? []).filter(f => inScope(`${AI_GEN}/${folder}/${f.path}`))
const plural = n => (n === 1 ? '' : 's')

console.log(`${rel}\n`)
console.log(`  Disco local:  ${local.length ? `sí (${local.length} archivo${plural(local.length)})` : 'no'}`)
console.log(`  Canon:        ${canon.length ? `sí (${canon.length} en el lock) → ${gsUrl(canonBucket(), rel)}` : 'no'}`)
console.log(
  `  Archivo:      ${
    archived.length
      ? `sí (${archived.length} binario${plural(archived.length)}, ${artifacts.generatedAt}) → ${gsUrl(artifacts.bucket, rel)}`
      : 'no'
  }`
)

if (!local.length && !canon.length && !archived.length) {
  console.log('\n  Desconocida: no está en disco, ni en el lock de foto, ni en un artifacts.remote.json.')
  process.exit(2)
}

if (canon.length || archived.length) console.log(`\n  Para bajarla: pnpm ai-gen:pull ${rel}`)
