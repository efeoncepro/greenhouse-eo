// pnpm creative:assets:publish plan|apply
//
// Publica en el bucket canon las referencias aprobadas que el catálogo de foto declara en
// `scripts/foto/assets.lock.json` (identidades, kits, poses). Es el único camino por el que esas
// referencias llegan al equipo: el workbench las baja con `pnpm assets:pull` y verifica su sha256.
//
// Sube sólo lo que falta o cambió (la huella viaja como metadata `sha256` del objeto). Nunca borra.
import { existsSync } from 'node:fs'
import path from 'node:path'

import { planPublicacion, prefijosDeLock } from './assets-plan.mjs'
import { gcloud, gcloudJson } from './gcp.mjs'
import { loadControl, readJson, ROOT } from './lib.mjs'

const mode = process.argv[2] ?? 'plan'

if (!['plan', 'apply'].includes(mode)) {
  console.error('Uso: pnpm creative:assets:publish plan|apply')
  process.exit(1)
}

const { gcp } = loadControl()
const lock = readJson(path.join(ROOT, 'scripts/foto/assets.lock.json'))
const declared = Object.entries(lock.assets)

// Se lista CADA prefijo que el lock declara, no sólo `ai-generations/`: el lock también sella referencias que vienen
// de un paquete npm (`node_modules/…`, los Sparks) y, sin listarlas, cada corrida las daba por faltantes. Detalle en
// `assets-plan.mjs`. Un prefijo sin objetos vuelve `[]`; `null` es un fallo real de gcloud.
const remote = []

for (const prefijo of prefijosDeLock(declared.map(([ruta]) => ruta))) {
  const objetos = gcloudJson(['storage', 'objects', 'list', `gs://${gcp.canonBucket}/${prefijo}/**`, `--project=${gcp.project}`])

  if (objetos === null) {
    console.error(`✗ No pude listar gs://${gcp.canonBucket}/${prefijo}. ¿Existe el bucket? → pnpm creative:provision plan`)
    process.exit(1)
  }

  remote.push(...objetos)
}

const remoteHash = new Map(remote.map(o => [o.name, o.metadata?.sha256 ?? o.custom_fields?.sha256]))

const { aSubir: toUpload, faltanLocal: missingLocal } = planPublicacion({
  declared,
  remoteHash,
  existe: ruta => existsSync(path.join(ROOT, ruta))
})

console.log(
  `Canon gs://${gcp.canonBucket}: ${declared.length} declarados · ${declared.length - toUpload.length - missingLocal.length} al día · ${toUpload.length} a subir`
)

if (missingLocal.length) {
  console.log(
    `  ⚠ ${missingLocal.length} declarados en el lock pero ausentes en este disco (no se pueden publicar desde acá):`
  )
  for (const r of missingLocal.slice(0, 10)) console.log(`    ${r}`)
}

let failed = 0

for (const { ruta, sha256 } of toUpload) {
  if (mode === 'plan') {
    console.log(`  · ${ruta}`)
    continue
  }

  const r = gcloud([
    'storage',
    'cp',
    path.join(ROOT, ruta),
    `gs://${gcp.canonBucket}/${ruta}`,
    `--custom-metadata=sha256=${sha256}`,
    `--project=${gcp.project}`
  ])

  if (r.status === 0) console.log(`  ✓ ${ruta}`)
  else {
    failed++
    console.log(`  ✗ ${ruta}: ${(r.stderr || '').trim().split('\n').pop()}`)
  }
}

if (mode === 'plan' && toUpload.length) console.log('\nPara publicarlos: pnpm creative:assets:publish apply')
if (failed) process.exit(1)
