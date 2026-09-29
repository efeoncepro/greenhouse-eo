// pnpm pieza:subir projects/<cliente>/<slug> [--modelo <modelo>]
//
// Sube cada archivo de salidas/ al bucket de trabajo del cliente y lo registra en pieza.json.
// La ruta lleva la huella del contenido (<slug>/<sha12>/<archivo>): subir dos veces lo mismo no
// duplica, y una versión nueva nunca pisa a la anterior (el bucket no permite sobrescribir).
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { config, fail, gcloudAsync, loadPieza, savePieza, sha256File } from './lib.mjs'

const args = process.argv.slice(2)
const modelo = args.includes('--modelo') ? args[args.indexOf('--modelo') + 1] : undefined
let ctx

try {
  ctx = loadPieza(args.find(a => !a.startsWith('--') && a !== modelo))
} catch (e) {
  fail(e.message)
}

const { dir, file, cliente, slug, pieza } = ctx
const { workBucket } = config()
const salidas = path.join(dir, 'salidas')

let files = []

try {
  files = readdirSync(salidas, { recursive: true })
    .map(String)
    .filter(f => statSync(path.join(salidas, f)).isFile() && !f.endsWith('.DS_Store'))
} catch {
  fail(`No existe ${path.relative(process.cwd(), salidas)}. Guarda ahí lo que produjiste.`)
}

if (!files.length) fail('salidas/ está vacía: no hay nada que subir.')

const known = new Set((pieza.entregables ?? []).map(e => e.sha256))
let subidos = 0

for (const rel of files.sort()) {
  const abs = path.join(salidas, rel)
  const sha256 = await sha256File(abs)

  if (known.has(sha256)) {
    console.log(`  = ${rel} (ya registrado)`)
    continue
  }

  const ruta = `gs://${workBucket}/${cliente}/${slug}/${sha256.slice(0, 12)}/${rel.split(path.sep).join('/')}`
  const r = await gcloudAsync(['storage', 'cp', '--no-clobber', abs, ruta])

  if (r.code !== 0) {
    console.log(`  ✗ ${rel}: ${r.stderr.trim().split('\n').pop()}`)
    if (/403|denied/i.test(r.stderr))
      console.log(`    Tu cuenta no tiene acceso de escritura a ${cliente}: pídelo a Julio.`)
    continue
  }

  pieza.entregables.push({
    archivo: rel.split(path.sep).join('/'),
    ruta,
    sha256,
    bytes: statSync(abs).size,
    subidoEl: new Date().toISOString(),
    ...(modelo ? { modelo } : {})
  })
  known.add(sha256)
  subidos++
  console.log(`  ✓ ${rel}`)
}

savePieza(file, pieza)
console.log(`\n${subidos} entregable(s) nuevo(s) registrados en pieza.json. Inclúyelo en tu PR.`)
