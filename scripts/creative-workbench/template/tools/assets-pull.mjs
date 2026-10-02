// pnpm assets:pull — baja del bucket canon las referencias aprobadas que declara el catálogo de foto
// (scripts/foto/assets.lock.json) y verifica cada huella. Sólo baja lo que falta o difiere.
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'

import { config, fail, gcloudAsync, pool, ROOT, sha256File } from './lib.mjs'

const { canonBucket } = config()
const lockFile = path.join(ROOT, 'scripts/foto/assets.lock.json')

if (!existsSync(lockFile)) fail('No existe scripts/foto/assets.lock.json: el workbench no está sincronizado.')

const assets = Object.entries(JSON.parse(readFileSync(lockFile, 'utf8')).assets)
const pending = []

for (const [ruta, { sha256 }] of assets) {
  const abs = path.join(ROOT, ruta)

  if (!existsSync(abs) || (await sha256File(abs)) !== sha256) pending.push({ ruta, sha256, abs })
}

console.log(
  `${assets.length} referencias declaradas · ${assets.length - pending.length} al día · ${pending.length} por bajar`
)

const results = await pool(pending, 6, async ({ ruta, sha256, abs }) => {
  mkdirSync(path.dirname(abs), { recursive: true })
  const r = await gcloudAsync(['storage', 'cp', `gs://${canonBucket}/${ruta}`, abs])

  if (r.code !== 0) return `${ruta}: ${r.stderr.trim().split('\n').pop()}`

  if ((await sha256File(abs)) !== sha256) {
    rmSync(abs, { force: true })

    return `${ruta}: la huella no coincide con la aprobada (archivo descartado)`
  }

  console.log(`  ✓ ${ruta}`)

  return null
})

const errors = results.filter(Boolean)

if (errors.length) {
  console.log(`\n✗ ${errors.length} sin bajar:`)
  for (const e of errors.slice(0, 20)) console.log(`  ${e}`)
  console.log('\nSi dice 403, tu cuenta todavía no tiene acceso al bucket canon: pídelo a Julio.')
  process.exit(1)
}

console.log('\n✓ Referencias al día.')
