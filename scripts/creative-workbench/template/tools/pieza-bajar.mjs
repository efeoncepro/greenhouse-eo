// pnpm pieza:bajar projects/<cliente>/<slug> — baja a salidas/ los entregables registrados en
// pieza.json y verifica cada huella. Sirve para revisar una pieza que produjo otra persona.
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import { fail, gcloudAsync, loadPieza, sha256File } from './lib.mjs'

let ctx

try {
  ctx = loadPieza(process.argv[2])
} catch (e) {
  fail(e.message)
}

const { dir, pieza } = ctx

if (!pieza.entregables?.length) fail('Esta pieza no tiene entregables registrados.')

let errores = 0

for (const e of pieza.entregables) {
  const dest = path.join(dir, 'salidas', e.archivo)

  if (existsSync(dest) && (await sha256File(dest)) === e.sha256) {
    console.log(`  = ${e.archivo}`)
    continue
  }

  mkdirSync(path.dirname(dest), { recursive: true })
  const r = await gcloudAsync(['storage', 'cp', e.ruta, dest])

  if (r.code !== 0 || (await sha256File(dest)) !== e.sha256) {
    errores++
    rmSync(dest, { force: true })
    console.log(`  ✗ ${e.archivo}: ${r.code !== 0 ? r.stderr.trim().split('\n').pop() : 'la huella no coincide'}`)
    continue
  }

  console.log(`  ✓ ${e.archivo}`)
}

process.exit(errores ? 1 : 0)
